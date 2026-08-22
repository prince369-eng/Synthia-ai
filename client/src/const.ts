import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";
import { isPublicHostname } from "@shared/externalReference";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

declare global {
  interface Window {
    __SYNTHIA_PUBLIC_CONFIG__?: {
      appId?: string;
      oauthPortalUrl?: string;
    };
  }
}

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export type AuthEntryIntent = "signIn" | "signUp" | "google";
export const EXPLICIT_SIGNED_OUT_STORAGE_KEY = "synthia:explicit-signed-out";

export function clearExplicitSignedOutState() {
  try {
    sessionStorage.removeItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }
}

/**
 * Manus uses one verified `/app-auth?type=signIn` entry mode for SSO. Its
 * account page explicitly offers "Sign in or sign up" and "Continue with
 * Google". Synthia keeps the user-facing intent for clarity, but never invents
 * unsupported provider parameters or handles Google tokens itself.
 */
export const AUTH_ENTRY_PORTAL_MODE: Record<AuthEntryIntent, "signIn"> = {
  signIn: "signIn",
  signUp: "signIn",
  google: "signIn",
};

export function normalizeAccountPortalBaseUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2_048) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !isPublicHostname(hostname)
    ) return null;

    url.hostname = hostname;
    return url;
  } catch {
    return null;
  }
}

export function buildAccountPortalUrl({ appId, oauthPortalUrl, origin, nonce, intent }: { appId: string; oauthPortalUrl: string; origin: string; nonce: string; intent: AuthEntryIntent }) {
  const redirectUri = `${origin}/api/oauth/callback`;
  const url = normalizeAccountPortalBaseUrl(oauthPortalUrl);
  if (!url) throw new Error("Synthia sign-in configuration is unavailable.");

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/app-auth`;
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", encodeOAuthState({ redirectUri, nonce }));
  url.searchParams.set("type", AUTH_ENTRY_PORTAL_MODE[intent]);
  return url;
}

export const startLogin = (intent: AuthEntryIntent = "signIn") => {
  const { appId, oauthPortalUrl } = window.__SYNTHIA_PUBLIC_CONFIG__ ?? {};
  if (!oauthPortalUrl || !appId) {
    throw new Error("Synthia sign-in configuration is unavailable.");
  }

  // A new OAuth flow is always an explicit user action. Allow it to replace
  // the signed-out public state, but never let failed background requests do so.
  clearExplicitSignedOutState();
  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  window.location.href = buildAccountPortalUrl({ appId, oauthPortalUrl, origin: window.location.origin, nonce, intent }).toString();
};

export const startSignup = () => startLogin("signUp");
export const startGoogleLogin = () => startLogin("google");
