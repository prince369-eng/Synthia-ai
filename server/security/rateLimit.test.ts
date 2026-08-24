import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("rate-limit logging boundary", () => {
  it("logs Redis connection failures by stable error classification rather than the raw error object", () => {
    const source = readFileSync(new URL("./rateLimit.ts", import.meta.url), "utf8");

    expect(source).toContain('event: "rate_limit_redis_error", errorKind');
    expect(source).not.toContain('event: "rate_limit_redis_error", err: error');
  });
});
