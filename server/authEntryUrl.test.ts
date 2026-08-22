import { describe, expect, it } from "vitest";
import { AUTH_ENTRY_PORTAL_MODE, buildAccountPortalUrl, normalizeAccountPortalBaseUrl, type AuthEntryIntent } from "../client/src/const";
import { decodeOAuthState } from "../shared/const";

describe("Synthia Manus account portal entries", () => {
  it.each(["signIn", "signUp", "google"] as const)("uses the verified unified portal mode for %s", (intent: AuthEntryIntent) => {
    const url = buildAccountPortalUrl({
      appId: "synthia-app",
      oauthPortalUrl: "https://manus.im",
      origin: "https://synthia.example.test",
      nonce: "test-nonce",
      intent,
    });

    expect(AUTH_ENTRY_PORTAL_MODE[intent]).toBe("signIn");
    expect(url.origin + url.pathname).toBe("https://manus.im/app-auth");
    expect(url.searchParams.get("type")).toBe("signIn");
    expect(url.searchParams.get("appId")).toBe("synthia-app");
    expect(decodeOAuthState(url.searchParams.get("state") ?? "")).toEqual({
      nonce: "test-nonce",
      redirectUri: "https://synthia.example.test/api/oauth/callback",
    });
  });

  it("rejects unsafe account-portal configuration before a login destination is built", () => {
    for (const hostileValue of [
      "http://manus.im",
      "https://manus.im:8443",
      "https://user:password@manus.im",
      "https://localhost",
      "https://metadata.google.internal",
      "https://127.0.0.1",
      "https://manus.im?state=unsafe",
      "javascript:alert(1)",
    ]) {
      expect(normalizeAccountPortalBaseUrl(hostileValue)).toBeNull();
    }

    expect(normalizeAccountPortalBaseUrl("https://MANUS.IM./portal/")?.toString()).toBe("https://manus.im/portal/");
    expect(() => buildAccountPortalUrl({
      appId: "synthia-app",
      oauthPortalUrl: "http://manus.im",
      origin: "https://synthia.example.test",
      nonce: "test-nonce",
      intent: "signIn",
    })).toThrow("Synthia sign-in configuration is unavailable.");
  });
});
