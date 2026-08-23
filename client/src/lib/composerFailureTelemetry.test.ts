import { describe, expect, it } from "vitest";
import { classifyComposerFailure } from "./composerFailureTelemetry";

describe("classifyComposerFailure", () => {
  it("retains only an allow-listed tRPC code and never returns a message or cause", () => {
    const error = { name: "TRPCClientError", data: { code: "PRECONDITION_FAILED" }, message: "postgres://operator:credential@database.internal" };
    expect(classifyComposerFailure(error)).toEqual({ kind: "trpc", trpcCode: "PRECONDITION_FAILED" });
  });

  it("classifies unavailable transports without retaining connection details", () => {
    expect(classifyComposerFailure(new TypeError("network detail"))).toEqual({ kind: "network", trpcCode: null });
    expect(classifyComposerFailure({ name: "TRPCClientError", data: { code: "UNSAFE_CODE" } })).toEqual({ kind: "trpc", trpcCode: null });
  });
});
