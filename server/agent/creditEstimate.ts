export type EstimateBand = "quick" | "standard" | "extensive";

export function estimateTaskCredits(input: { goal: string; planSteps: number; involvesCode: boolean }) {
  const goalComplexity = Math.ceil(input.goal.trim().length / 1_500);
  const planComplexity = Math.max(1, input.planSteps);
  const base = Math.max(1, goalComplexity + planComplexity + (input.involvesCode ? 2 : 0));
  const estimatedCreditsMin = base;
  const estimatedCreditsMax = Math.max(base + 1, base * 4);
  const estimateBand: EstimateBand = estimatedCreditsMax <= 8 ? "quick" : estimatedCreditsMax <= 24 ? "standard" : "extensive";
  return { estimateBand, estimatedCreditsMin, estimatedCreditsMax };
}
