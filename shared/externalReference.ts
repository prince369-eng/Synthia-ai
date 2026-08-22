const BLOCKED_PUBLIC_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

const DOMAIN_LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const PUBLIC_DOMAIN_NAME = new RegExp(`^(?:${DOMAIN_LABEL}\\.)+${DOMAIN_LABEL}$`);

/**
 * Pure, DNS-free public-domain predicate shared by configuration and browser-rendered
 * references. It deliberately rejects local, metadata, and literal-IP destinations.
 */
export function isPublicHostname(host: string) {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  if (!PUBLIC_DOMAIN_NAME.test(normalized)) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;
  if (BLOCKED_PUBLIC_HOSTS.has(normalized)) return false;
  return !normalized.endsWith(".localhost") && !normalized.endsWith(".local") && !normalized.endsWith(".internal");
}

/**
 * Returns a canonical, safe-to-render external evidence URL without initiating any
 * network activity. Evidence references are intentionally narrower than general web
 * URLs: public HTTPS only, with no credentials, port, query, or fragment state.
 */
export function normalizeExternalReferenceUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate || candidate.length > 2_048) return null;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
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
    return url.toString();
  } catch {
    return null;
  }
}
