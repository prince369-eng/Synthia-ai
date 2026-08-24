import { describe, expect, it } from "vitest";
import { isDebugLogPayloadTooLarge, MAX_DEBUG_LOG_PAYLOAD_BYTES, redactDebugLogEntries } from "./debugDiagnostics";

describe("redactDebugLogEntries", () => {
  it("rejects malformed, negative, and oversized diagnostic payload lengths", () => {
    expect(isDebugLogPayloadTooLarge(MAX_DEBUG_LOG_PAYLOAD_BYTES)).toBe(false);
    expect(isDebugLogPayloadTooLarge(MAX_DEBUG_LOG_PAYLOAD_BYTES + 1)).toBe(true);
    expect(isDebugLogPayloadTooLarge(-1)).toBe(true);
    expect(isDebugLogPayloadTooLarge(Number.NaN)).toBe(true);
    expect(isDebugLogPayloadTooLarge("1024")).toBe(true);
  });

  it("keeps console diagnostics structural without retaining arguments or stack details", () => {
    expect(redactDebugLogEntries("browserConsole", [{
      timestamp: 1700000000000,
      level: "ERROR",
      args: ["private input", { authorization: "Bearer value" }],
      stack: "Error: private input\n at internal",
    }])).toEqual([{
      timestamp: 1700000000000,
      level: "ERROR",
      argumentCount: 2,
      hasStack: true,
    }]);
  });

  it("classifies network metadata without retaining URLs, headers, bodies, or error details", () => {
    expect(redactDebugLogEntries("networkRequests", [{
      timestamp: 1700000000000,
      type: "fetch",
      method: "post",
      url: "/api/trpc/tasks.create?access_token=value",
      request: { headers: { authorization: "Bearer value" }, body: { prompt: "private input" } },
      response: { status: 429, body: { message: "provider detail" } },
      duration: 12,
      error: { stack: "private" },
    }])).toEqual([{
      timestamp: 1700000000000,
      type: "fetch",
      method: "POST",
      endpoint: "api",
      status: 429,
      durationMs: 12,
      failed: true,
    }]);
  });

  it("retains only structural UI event metadata", () => {
    expect(redactDebugLogEntries("sessionReplay", [{
      timestamp: 1700000000000,
      kind: "change",
      url: "https://workspace.example/tasks/private-task",
      payload: { value: "private input", target: { tag: "textarea", role: "textbox", text: "private input" } },
    }])).toEqual([{
      timestamp: 1700000000000,
      kind: "change",
      route: "other",
      target: { tag: "textarea", type: null, role: "textbox" },
    }]);
  });
});
