import type { AutonomySettings } from "../db";

export type AgentAction =
  | { kind: "respond"; content: string }
  | { kind: "web_search"; query: string }
  | { kind: "run_command"; command: string }
  | { kind: "write_file"; path: string; content: string }
  | { kind: "open_url"; url: string }
  | { kind: "capture_screen" }
  | { kind: "complete"; summary: string }
  | { kind: "external_effect"; toolName: string; description: string; input: Record<string, unknown> };

export type PolicyDecision = { allowed: true } | { allowed: false; requiresApproval: true; riskLevel: "medium" | "high"; reason: string } | { allowed: false; requiresApproval: false; reason: string };

export function evaluateActionPolicy(action: AgentAction, autonomy: AutonomySettings): PolicyDecision {
  if (action.kind === "web_search" && !autonomy.allowWebSearch) {
    return { allowed: false, requiresApproval: false, reason: "Web search is disabled for this task." };
  }
  if (action.kind === "run_command" && !autonomy.allowCodeExecution) {
    return { allowed: false, requiresApproval: false, reason: "Code execution is disabled for this task." };
  }
  if (action.kind === "write_file" && !autonomy.allowFileWrites) {
    return { allowed: false, requiresApproval: false, reason: "File writes are disabled for this task." };
  }
  if (action.kind === "external_effect") {
    return { allowed: false, requiresApproval: true, riskLevel: "high", reason: "External effects always require explicit user approval." };
  }
  return { allowed: true };
}

export function isAgentAction(value: unknown): value is AgentAction {
  if (!value || typeof value !== "object" || !("kind" in value)) return false;
  const action = value as Record<string, unknown>;
  if (typeof action.kind !== "string") return false;
  const nonEmpty = (field: string, limit: number) => typeof action[field] === "string" && action[field].trim().length > 0 && action[field].length <= limit;
  if (action.kind === "respond") return nonEmpty("content", 8_000);
  if (action.kind === "web_search") return nonEmpty("query", 500);
  if (action.kind === "run_command") return nonEmpty("command", 4_000);
  if (action.kind === "write_file") return nonEmpty("path", 1_024) && typeof action.content === "string" && action.content.length <= 1_000_000;
  if (action.kind === "open_url") {
    if (!nonEmpty("url", 2_048)) return false;
    try { return ["http:", "https:"].includes(new URL(action.url as string).protocol); } catch { return false; }
  }
  if (action.kind === "capture_screen") return Object.keys(action).every(key => key === "kind");
  if (action.kind === "complete") return nonEmpty("summary", 8_000);
  return action.kind === "external_effect" && nonEmpty("toolName", 128) && nonEmpty("description", 4_000) && Boolean(action.input) && typeof action.input === "object" && !Array.isArray(action.input);
}
