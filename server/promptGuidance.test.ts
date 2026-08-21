import { describe, expect, it } from "vitest";
import { applyPromptGuidance, promptGuidanceForGoal } from "../client/src/lib/promptGuidance";
import { GOVERNED_CONNECTED_APPS, governedAppReadiness } from "../client/src/lib/governedConnectedApps";

describe("local prompt guidance", () => {
  it("offers bounded local suggestions without a provider request or automatic goal mutation", () => {
    const suggestions = promptGuidanceForGoal("Research reliable agent systems");

    expect(suggestions.map(suggestion => suggestion.id)).toEqual(["deliverable", "audience"]);
    expect(promptGuidanceForGoal("")).toEqual([]);
  });

  it("applies only the user-selected suggestion and does not duplicate it", () => {
    const suggestion = promptGuidanceForGoal("Research reliable agent systems")[0]!;
    const guided = applyPromptGuidance("Research reliable agent systems", suggestion);

    expect(guided).toContain("Research reliable agent systems");
    expect(guided).toContain(suggestion.addition);
    expect(applyPromptGuidance(guided, suggestion)).toBe(guided);
  });
});

describe("governed connected-app catalog", () => {
  it("keeps prospective providers distinct from connection and execution authority", () => {
    expect(GOVERNED_CONNECTED_APPS.map(app => app.id)).toEqual(["zapier", "pipedream", "composio", "github"]);
    expect(GOVERNED_CONNECTED_APPS.every(app => app.connectionBoundary.includes("Requires") || app.connectionBoundary.includes("requires"))).toBe(true);
    expect(governedAppReadiness(false)).toBe("Configuration required");
    expect(governedAppReadiness(true)).toBe("Ready for user authorization");
  });
});
