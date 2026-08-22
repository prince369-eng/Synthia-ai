const internalNavigationOrigin = "https://synthia.invalid";

/** Returns a canonical same-origin application path, or null for unsafe input. */
export function normalizeInternalNavigationPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;

  try {
    const url = new URL(value, internalNavigationOrigin);
    if (url.origin !== internalNavigationOrigin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
