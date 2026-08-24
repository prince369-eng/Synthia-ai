import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { responseSecurityHeaders } from "./_core/httpSecurity";

describe("document response security header contract", () => {
  it("limits browser connections to same-origin APIs and secure sockets without sending a request", () => {
    const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const developmentHeaders = responseSecurityHeaders(false);
    const productionHeaders = responseSecurityHeaders(true);

    expect(developmentHeaders["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(developmentHeaders["Content-Security-Policy"]).toContain("connect-src 'self' wss:");
    expect(developmentHeaders["Content-Security-Policy"]).not.toContain("connect-src 'self' https: wss:");
    expect(developmentHeaders["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(developmentHeaders["Content-Security-Policy"]).toContain("form-action 'self'");
    expect(developmentHeaders["Referrer-Policy"]).toBe("no-referrer");
    expect(developmentHeaders["Permissions-Policy"]).toBe("camera=(), microphone=(self), geolocation=(), payment=()");
    expect(developmentHeaders["Strict-Transport-Security"]).toBeUndefined();
    expect(productionHeaders["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(source).toContain("responseSecurityHeaders(ENV.isProduction)");
    expect(source).toContain("corsAllowedOrigins({ publicAppUrl: ENV.publicAppUrl, isProduction: ENV.isProduction })");
  });
});
