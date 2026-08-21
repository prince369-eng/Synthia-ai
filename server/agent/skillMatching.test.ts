import { describe, expect, it } from "vitest";
import { rankSkillsForGoal, skillPlanningContext } from "./skillMatching";

const candidates = [
  { id: "release", name: "Secure release readiness", description: "Review TypeScript service release gates, migrations, and rollback evidence.", skillMdContent: "# Release readiness\nReview migration safety and rollback plans." },
  { id: "analysis", name: "Research analysis", description: "Compare public sources and synthesize a cited market analysis.", skillMdContent: "# Research\nUse credible sources and retain citations." },
  { id: "security", name: "Security review", description: "Assess authentication, authorization, and input validation risks.", skillMdContent: "# Security\nReview authorization and validation boundaries." },
  { id: "noise", name: "Illustration studio", description: "Create abstract visual art concepts.", skillMdContent: "# Art\nNever matches deployment goals." },
];

describe("Skills matching", () => {
  it("matches relevant reviewed metadata and never returns more than three Skills", () => {
    const selected = rankSkillsForGoal("Prepare a secure TypeScript service release with rollback and authorization review", candidates, 99);

    expect(selected.map(skill => skill.id)).toEqual(["release", "security"]);
    expect(selected).toHaveLength(2);
  });

  it("does not select a Skill solely because its private instructions contain task keywords", () => {
    const selected = rankSkillsForGoal("prepare deployment rollback evidence", [
      { id: "mismatched", name: "Writing assistance", description: "Improve plain-language prose.", skillMdContent: "deployment rollback migration production release" },
    ]);

    expect(selected).toEqual([]);
  });

  it("bounds approved planning context to three Skills and the configured content budget", () => {
    const longInstruction = "x".repeat(12_000);
    const context = skillPlanningContext([
      { skillName: "One", skillMdContent: longInstruction },
      { skillName: "Two", skillMdContent: longInstruction },
      { skillName: "Three", skillMdContent: longInstruction },
      { skillName: "Four", skillMdContent: "must not be included" },
    ]);

    expect(context).toContain("Approved Skill: One");
    expect(context).toContain("Approved Skill: Three");
    expect(context).not.toContain("Approved Skill: Four");
    expect(context.length).toBeLessThanOrEqual(24_250);
  });
});
