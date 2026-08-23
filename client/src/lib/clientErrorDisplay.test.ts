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
      "The task could not be created. Please try again.",
    );
  });
});
