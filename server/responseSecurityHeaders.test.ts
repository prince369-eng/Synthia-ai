import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("document response security header contract", () => {
  it("limits browser connections to same-origin APIs and secure sockets without sending a request", () => {
    const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");

    expect(source).toContain("object-src 'none'");
    expect(source).toContain("connect-src 'self' wss:");
    expect(source).not.toContain("connect-src 'self' https: wss:");
    expect(source).toContain("frame-ancestors 'none'");
    expect(source).toContain("form-action 'self'");
    expect(source).toContain('res.setHeader("Referrer-Policy", "no-referrer")');
    expect(source).not.toContain("strict-origin-when-cross-origin");
    expect(source).toContain('res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=()")');
    expect(source).toContain("corsAllowedOrigins({ publicAppUrl: ENV.publicAppUrl, isProduction: ENV.isProduction })");
  });
});
