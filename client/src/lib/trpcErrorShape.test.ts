import { describe, expect, it } from "vitest";
import { isTrpcLikeError, safeTrpcErrorCode } from "./trpcErrorShape";

describe("safeTrpcErrorCode", () => {
  it("recognizes a serialized tRPC error without depending on a shared constructor identity", () => {
    const crossBundleError = { name: "TRPCClientError", data: { code: "PRECONDITION_FAILED" }, message: "never surface this" };
    expect(isTrpcLikeError(crossBundleError)).toBe(true);
    expect(safeTrpcErrorCode(crossBundleError)).toBe("PRECONDITION_FAILED");
  });

  it("rejects unrecognized names and codes", () => {
    expect(safeTrpcErrorCode({ name: "Error", data: { code: "PRECONDITION_FAILED" } })).toBeNull();
    expect(safeTrpcErrorCode({ name: "TRPCClientError", data: { code: "RAW_DATABASE_ERROR" } })).toBeNull();
  });

  it("retains standard protocol codes that can occur before application code runs", () => {
    expect(safeTrpcErrorCode({ name: "TRPCClientError", data: { code: "PARSE_ERROR" } })).toBe("PARSE_ERROR");
    expect(safeTrpcErrorCode({ name: "TRPCClientError", data: { code: "PAYLOAD_TOO_LARGE" } })).toBe("PAYLOAD_TOO_LARGE");
  });
});
