export type PromptGuidanceSuggestion = {
  id: "deliverable" | "audience" | "constraints";
  label: string;
  detail: string;
  addition: string;
};

function normalizedGoal(goal: string) {
  return goal.trim().replace(/\s+/g, " ").toLowerCase();
}

export function promptGuidanceForGoal(goal: string): PromptGuidanceSuggestion[] {
  const normalized = normalizedGoal(goal);
  if (normalized.length < 4) return [];

  const suggestions: PromptGuidanceSuggestion[] = [];
  const hasDeliverable = /\b(deliver|deliverable|report|brief|plan|presentation|slides|spreadsheet|website|application|artifact|file|output)\b/.test(normalized);
  const hasAudience = /\b(for|audience|customer|user|team|stakeholder|reader|client)\b/.test(normalized);
  const hasConstraints = /\b(by|before|deadline|budget|limit|must|avoid|do not|without|only|scope)\b/.test(normalized);

  if (!hasDeliverable) suggestions.push({
    id: "deliverable",
    label: "Name the deliverable",
    detail: "State what finished work should be handed back.",
    addition: "Deliverable: a concise, reviewable result with clear acceptance criteria.",
  });
  if (!hasAudience) suggestions.push({
    id: "audience",
    label: "Add the audience",
    detail: "Say who will use or review the result.",
    addition: "Audience: specify the people who will use or review this result.",
  });
  if (!hasConstraints) suggestions.push({
    id: "constraints",
    label: "Set boundaries",
    detail: "Add scope, timing, source, or approval constraints.",
    addition: "Constraints: state the scope, timing, sources, and approvals that matter.",
  });

  return suggestions.slice(0, 2);
}

export function applyPromptGuidance(goal: string, suggestion: PromptGuidanceSuggestion) {
  const trimmed = goal.trimEnd();
  if (!trimmed) return suggestion.addition;
  if (normalizedGoal(trimmed).includes(normalizedGoal(suggestion.addition))) return trimmed;
  return `${trimmed}\n\n${suggestion.addition}`;
}
