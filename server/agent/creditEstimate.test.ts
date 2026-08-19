import { describe, expect, it } from "vitest";
import { estimateTaskCredits } from "./creditEstimate";

describe("trusted task credit estimate", () => {
  it("returns a deterministic bounded estimate for a concise non-code task", () => {
    expect(estimateTaskCredits({ goal: "Summarize this report", planSteps: 2, involvesCode: false })).toEqual({
      estimateBand: "standard",
      estimatedCreditsMin: 3,
      estimatedCreditsMax: 12,
    });
  });

  it("increases the estimate for code-heavy multi-step work", () => {
    const estimate = estimateTaskCredits({ goal: "Build a secure production application".repeat(240), planSteps: 12, involvesCode: true });
    expect(estimate.estimatedCreditsMin).toBeGreaterThan(12);
    expect(estimate.estimatedCreditsMax).toBeGreaterThan(estimate.estimatedCreditsMin);
    expect(["standard", "extensive"]).toContain(estimate.estimateBand);
  });
});
