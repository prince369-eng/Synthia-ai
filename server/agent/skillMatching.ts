import type { SkillCandidate } from "../db";

export type RankedSkill = SkillCandidate & { relevanceScore: number };

const STOP_WORDS = new Set([
  "about", "after", "agent", "also", "an", "and", "are", "build", "can", "create", "for", "from", "have", "into", "make", "need", "please", "that", "the", "this", "use", "with", "write", "your",
]);

function stem(token: string) {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(ing|edly|ed|ies|s)$/g, value => value === "ies" ? "y" : "")
    .slice(0, 42);
}

export function skillTokens(value: string | null | undefined) {
  return (value ?? "")
    .split(/\s+/)
    .map(stem)
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token));
}

/**
 * Scores meaningful word overlap between a user goal and approved Skill metadata.
 * The content of a Skill is deliberately not used to score itself, preventing broad
 * instructions from gaming task selection. Only the reviewed name/description and its
 * persisted lexical index govern matching. The index keeps fallback matching deterministic
 * when an embedding service is not configured.
 */
export function rankSkillsForGoal(goal: string, candidates: SkillCandidate[], limit = 3): RankedSkill[] {
  const goalTokens = Array.from(new Set(skillTokens(goal)));
  if (!goalTokens.length) return [];
  const goalSet = new Set(goalTokens);
  return candidates
    .map(candidate => {
      const nameTokens = new Set(skillTokens(candidate.name));
      const descriptionTokens = new Set(skillTokens(candidate.description));
      const indexTokens = new Set(skillTokens(candidate.matchingTerms));
      let score = 0;
      for (const token of Array.from(goalSet)) {
        if (nameTokens.has(token)) score += 3;
        else if (descriptionTokens.has(token)) score += 1;
        else if (indexTokens.has(token)) score += 0.75;
      }
      const normalized = Number(Math.min(1, score / Math.max(3, goalSet.size * 1.5)).toFixed(3));
      return { ...candidate, relevanceScore: normalized };
    })
    .filter(candidate => candidate.relevanceScore >= 0.2)
    .sort((left, right) => right.relevanceScore - left.relevanceScore || left.name.localeCompare(right.name))
    .slice(0, Math.max(0, Math.min(limit, 3)));
}

export function skillPlanningContext(selections: Array<{ skillName: string; skillMdContent: string }>) {
  let remaining = 24_000;
  const blocks = selections.slice(0, 3).flatMap(selection => {
    const bounded = selection.skillMdContent.trim().slice(0, Math.min(8_000, remaining));
    remaining -= bounded.length;
    return bounded ? [`### Approved Skill: ${selection.skillName}\n${bounded}`] : [];
  });
  return blocks.length ? `\n\n## Approved task skills\n${blocks.join("\n\n")}` : "";
}
