import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAccountPortalUrl, normalizeAccountPortalBaseUrl } from "./const";
import { decodeOAuthState } from "@shared/const";

describe("OAuth client boundary", () => {
  it("accepts only a public HTTPS account portal without authority or request-state injection", () => {
    expect(normalizeAccountPortalBaseUrl("https://AUTH.Example.com./portal")).toMatchObject({
      protocol: "https:",
      hostname: "auth.example.com",
      pathname: "/portal",
    });

    for (const candidate of [
      "http://auth.example.com",
      "https://user:pass@auth.example.com",
      "https://auth.example.com:8443",
      "https://auth.example.com?target=other",
      "https://auth.example.com#other",
      "https://localhost",
      "https://127.0.0.1",
    ]) {
      expect(normalizeAccountPortalBaseUrl(candidate)).toBeNull();
    }
  });

  it("binds a generated nonce to the exact callback origin in the outbound state", () => {
    const portalUrl = buildAccountPortalUrl({
      appId: "public-app-id",
      oauthPortalUrl: "https://auth.example.com/account/",
      origin: "https://synthia.example.com",
      nonce: "nonce-for-regression",
      intent: "google",
    });

    expect(portalUrl.pathname).toBe("/account/app-auth");
    expect(portalUrl.searchParams.get("appId")).toBe("public-app-id");
    expect(portalUrl.searchParams.get("redirectUri")).toBe("https://synthia.example.com/api/oauth/callback");
    expect(portalUrl.searchParams.get("type")).toBe("signIn");
    expect(decodeOAuthState(portalUrl.searchParams.get("state") ?? "")).toEqual({
      redirectUri: "https://synthia.example.com/api/oauth/callback",
      nonce: "nonce-for-regression",
    });
  });

  it("keeps the host-only short-lived state cookie and callback nonce comparison in the source contract", () => {
    const clientSource = readFileSync(new URL("./const.ts", import.meta.url), "utf8");
    const oauthSource = readFileSync(new URL("../../server/_core/oauth.ts", import.meta.url), "utf8");

    expect(clientSource).toContain("const nonce = crypto.randomUUID();");
    expect(clientSource).toContain("Path=/; Max-Age=600; SameSite=None; Secure");
    expect(oauthSource).toContain("nonce !== expectedNonce");
    expect(oauthSource).toContain("res.clearCookie(OAUTH_STATE_COOKIE, { path: \"/\", secure: true, sameSite: \"none\" });");
  });
});
