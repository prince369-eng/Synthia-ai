import { describe, expect, it } from "vitest";

const shouldRunReadOnlyCheck = process.env.SYNTHIA_ENABLE_WORKOS_READINESS_CHECK === "true";

describe("optional WorkOS authentication readiness", () => {
  it.runIf(shouldRunReadOnlyCheck)("validates the configured API key with a read-only organization listing", async () => {
    const apiKey = process.env.WORKOS_API_KEY;
    const clientId = process.env.WORKOS_CLIENT_ID;
    const redirectUri = process.env.WORKOS_REDIRECT_URI;
    const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD;

    expect(apiKey, "WORKOS_API_KEY must be configured for the explicit readiness check").toBeTruthy();
    expect(clientId, "WORKOS_CLIENT_ID must be configured for the explicit readiness check").toBeTruthy();
    expect(redirectUri, "WORKOS_REDIRECT_URI must be configured before WorkOS activation").toMatch(/^https?:\/\//);
    expect(typeof cookiePassword, "WORKOS_COOKIE_PASSWORD must be a private high-entropy value").toBe("string");
    expect(cookiePassword!.length).toBeGreaterThanOrEqual(32);

    const response = await fetch("https://api.workos.com/organizations?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status, "WorkOS read-only organization listing should authorize").toBe(200);
  }, 15_000);
});
