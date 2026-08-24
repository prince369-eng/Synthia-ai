import { describe, expect, it } from "vitest";
import { heartbeatTransportError, mapForgeError } from "./heartbeat";

describe("Heartbeat error mapping", () => {
  it("maps a transport failure to a bounded message", () => {
    const error = heartbeatTransportError();

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.message).toBe("The scheduled-work service is temporarily unavailable. Try again later.");
    expect(error.message).not.toContain("http");
  });

  it("maps provider statuses without reflecting endpoint or response details", () => {
    const invalidRequest = mapForgeError({ status: 422 });
    const rateLimited = mapForgeError({ status: 429 });
    const unavailable = mapForgeError({ status: 503 });

    expect(invalidRequest.code).toBe("BAD_REQUEST");
    expect(invalidRequest.message).toBe("The scheduled-work request was rejected.");
    expect(rateLimited.code).toBe("TOO_MANY_REQUESTS");
    expect(rateLimited.message).toBe("Scheduled-work rate limit reached. Try again later.");
    expect(unavailable.code).toBe("INTERNAL_SERVER_ERROR");
    expect(unavailable.message).not.toContain("503");
  });
});
