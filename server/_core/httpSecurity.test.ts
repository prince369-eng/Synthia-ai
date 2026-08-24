import { describe, expect, it } from "vitest";
import { responseSecurityHeaders } from "./httpSecurity";

describe("responseSecurityHeaders", () => {
  it("applies restrictive baseline headers in every environment", () => {
    const headers = responseSecurityHeaders(false);

    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self' 'unsafe-inline'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(self), geolocation=(), payment=()");
  });

  it("enables strict transport security only for production HTTPS deployment", () => {
    expect(responseSecurityHeaders(false)["Strict-Transport-Security"]).toBeUndefined();

    const productionHeaders = responseSecurityHeaders(true);
    expect(productionHeaders["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(productionHeaders["Content-Security-Policy"]).toContain("script-src 'self'");
    expect(productionHeaders["Content-Security-Policy"]).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
