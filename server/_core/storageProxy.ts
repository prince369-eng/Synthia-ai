import type { Express } from "express";
import { canUserAccessStorageKey } from "../db";
import { logger } from "../security/logger";
import { ENV, isPublicConfiguredHostname } from "./env";
import { sdk } from "./sdk";

export function normalizeStorageKey(value: string): string | null {
  const key = value.trim();
  if (!key || key.length > 1_024 || key.startsWith("/") || key.includes("\\") || key.split("/").some(segment => !segment || segment === "." || segment === "..")) {
    return null;
  }
  return key;
}

export function normalizeSignedStorageRedirect(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !isPublicConfiguredHostname(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function errorKind(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "unknown";
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = normalizeStorageKey((req.params as Record<string, string>)[0] ?? "");
    if (!key) {
      res.status(404).send("Storage object unavailable");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    let user: { id: number };
    try {
      user = await sdk.authenticateRequest(req);
    } catch (err) {
      logger.warn({ event: "storage_proxy_authentication_denied", errorType: errorKind(err) }, "Storage proxy authentication was rejected");
      res.status(401).send("Authentication required");
      return;
    }
    try {
      const allowed = await canUserAccessStorageKey(user.id, key);
      if (!allowed) {
        res.status(404).send("Storage object unavailable");
        return;
      }
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        logger.error({ event: "storage_proxy_backend_error", status: forgeResp.status, userId: user.id }, "Storage backend rejected a signed-url request");
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url?: string };
      const signedUrl = typeof url === "string" ? normalizeSignedStorageRedirect(url) : null;
      if (!signedUrl) {
        logger.error({ event: "storage_proxy_invalid_signed_url", userId: user.id }, "Storage backend returned an invalid signed URL");
        res.status(502).send("Storage backend error");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.set("Referrer-Policy", "no-referrer");
      res.set("X-Content-Type-Options", "nosniff");
      res.redirect(307, signedUrl);
    } catch (err) {
      logger.error({ event: "storage_proxy_failed", userId: user.id, errorType: errorKind(err) }, "Storage proxy request failed");
      res.status(502).send("Storage proxy error");
    }
  });
}
