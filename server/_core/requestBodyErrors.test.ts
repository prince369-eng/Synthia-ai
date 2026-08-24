import { describe, expect, it } from "vitest";
import { requestBodyErrorResponse } from "./requestBodyErrors";

describe("requestBodyErrorResponse", () => {
  it("maps malformed parser input to a bounded client error", () => {
    expect(requestBodyErrorResponse({ type: "entity.parse.failed", status: 400 })).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST_BODY" },
      event: "request_body_invalid",
    });
  });

  it("maps oversized parser input to a bounded payload error", () => {
    expect(requestBodyErrorResponse({ type: "entity.too.large", status: 413 })).toEqual({
      status: 413,
      body: { error: "PAYLOAD_TOO_LARGE" },
      event: "request_body_too_large",
    });
  });

  it("does not consume unrelated application errors", () => {
    expect(requestBodyErrorResponse(new Error("provider error"))).toBeNull();
    expect(requestBodyErrorResponse({ status: 500 })).toBeNull();
  });
});
