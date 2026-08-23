import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyComposerFailure, reportComposerFailure } from "./composerFailureTelemetry";

afterEach(() => vi.unstubAllGlobals());

describe("classifyComposerFailure", () => {
  it("retains only an allow-listed tRPC code and never returns a message or cause across bundle boundaries", () => {
    const error = { name: "TRPCClientError", data: { code: "PRECONDITION_FAILED" }, message: "postgres://operator:credential@database.internal" };
    expect(classifyComposerFailure(error)).toEqual({ kind: "trpc", trpcCode: "PRECONDITION_FAILED" });
  });

  it("classifies unavailable transports without retaining connection details", () => {
    expect(classifyComposerFailure(new TypeError("network detail"))).toEqual({ kind: "network", trpcCode: null });
    expect(classifyComposerFailure({ name: "TRPCClientError", data: { code: "UNSAFE_CODE" } })).toEqual({ kind: "trpc", trpcCode: null });
  });

  it("distinguishes safe decoding and client-runtime categories without retaining messages", () => {
    expect(classifyComposerFailure(new SyntaxError("response body detail"))).toEqual({ kind: "decode", trpcCode: null });
    expect(classifyComposerFailure(new Error("client runtime detail"))).toEqual({ kind: "client", trpcCode: null });
  });

  it("posts only the bounded diagnostic payload to the same-origin endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    reportComposerFailure({ name: "TRPCClientError", data: { code: "PRECONDITION_FAILED" }, message: "task text and credential-shaped detail stay excluded" });
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith("/__synthia__/composer-client-diagnostic", expect.objectContaining({
      method: "POST",
      credentials: "omit",
      keepalive: true,
      body: JSON.stringify({ kind: "trpc", trpcCode: "PRECONDITION_FAILED" }),
    }));
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("task text and credential-shaped detail stay excluded");
  });
});
