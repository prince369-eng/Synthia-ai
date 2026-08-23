import { describe, expect, it } from "vitest";
import { clientErrorMessage } from "./clientErrorDisplay";

describe("clientErrorMessage", () => {
  it("shows bounded recovery guidance for a tRPC-shaped error from a separate classic bundle", () => {
    const crossBundleError = {
      name: "TRPCClientError",
      data: { code: "PRECONDITION_FAILED" },
      message: "postgres://operator:credential@database.internal",
    };

    expect(clientErrorMessage(crossBundleError, "The task could not be created. Please try again.")).toBe(
      "This workspace is temporarily unavailable. Please try again shortly.",
    );
  });

  it("does not expose an unrecognized cross-bundle error message", () => {
    const crossBundleError = {
      name: "TRPCClientError",
      data: { code: "UNKNOWN" },
      message: "postgres://operator:credential@database.internal",
    };

    expect(clientErrorMessage(crossBundleError, "The task could not be created. Please try again.")).toBe(
      "The workspace returned an unrecognized response. Refresh the page, then try again.",
    );
  });

  it("keeps internal and transport failures actionable without exposing raw error details", () => {
    const internal = { name: "TRPCClientError", data: { code: "INTERNAL_SERVER_ERROR" }, message: "postgres://operator:credential@database.internal" };
    expect(clientErrorMessage(internal, "fallback")).toBe("The workspace encountered a temporary server error before task execution. Refresh the page, then try again.");
    expect(clientErrorMessage(new TypeError("network detail"), "fallback")).toBe("The workspace connection is unavailable. Check your connection and try again.");
  });
});
