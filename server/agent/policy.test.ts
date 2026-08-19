import { describe, expect, it } from "vitest";
import { DEFAULT_AUTONOMY_SETTINGS } from "../db";
import { evaluateActionPolicy, isAgentAction } from "./policy";

describe("Synthia action policy", () => {
  it("requires a server-side approval gate for every external effect", () => {
    const decision = evaluateActionPolicy(
      { kind: "external_effect", toolName: "email.send", description: "Send a message", input: { to: "person@example.com" } },
      DEFAULT_AUTONOMY_SETTINGS,
    );
    expect(decision).toEqual({
      allowed: false,
      requiresApproval: true,
      riskLevel: "high",
      reason: "External effects always require explicit user approval.",
    });
  });

  it("denies disabled capabilities before a tool action can be executed", () => {
    const autonomy = { ...DEFAULT_AUTONOMY_SETTINGS, allowCodeExecution: false, allowWebSearch: false, allowFileWrites: false };
    expect(evaluateActionPolicy({ kind: "run_command", command: "pwd" }, autonomy)).toMatchObject({ allowed: false, requiresApproval: false });
    expect(evaluateActionPolicy({ kind: "web_search", query: "Synthia AI" }, autonomy)).toMatchObject({ allowed: false, requiresApproval: false });
    expect(evaluateActionPolicy({ kind: "write_file", path: "/workspace/a.txt", content: "x" }, autonomy)).toMatchObject({ allowed: false, requiresApproval: false });
  });

  it("only recognizes known action kinds", () => {
    expect(isAgentAction({ kind: "complete", summary: "Done" })).toBe(true);
    expect(isAgentAction({ kind: "delete_production_database" })).toBe(false);
    expect(isAgentAction({ kind: "run_command" })).toBe(false);
    expect(isAgentAction({ kind: "open_url", url: "file:///etc/passwd" })).toBe(false);
    expect(isAgentAction(null)).toBe(false);
  });
});
