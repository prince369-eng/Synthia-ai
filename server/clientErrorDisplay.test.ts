import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";
import { clientErrorMessage } from "../client/src/lib/clientErrorDisplay";
import { UNAUTHED_ERR_MSG } from "../shared/const";

describe("clientErrorMessage", () => {
  it("returns bounded guidance for local and unknown failure values", () => {
    expect(clientErrorMessage(new TypeError("network detail that must not reach the UI"))).toBe("The workspace connection is unavailable. Check your connection and try again.");
    expect(clientErrorMessage(new Error("credential=value"), "A safe fallback.")).toBe("A safe fallback.");
  });

  it("keeps the authentication recovery path generic", () => {
    expect(clientErrorMessage(new TRPCClientError(UNAUTHED_ERR_MSG))).toBe("Your session has expired. Sign in again to continue.");
  });
});
