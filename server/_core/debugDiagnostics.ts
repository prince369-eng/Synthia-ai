/**
 * Converts development debug-collector payloads into metadata-only records
 * before they are persisted locally. This boundary intentionally drops bodies,
 * headers, URLs, element text, console arguments, and exception details.
 */

type DiagnosticSource = "browserConsole" | "networkRequests" | "sessionReplay";

type UnknownRecord = Record<string, unknown>;

const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const CONSOLE_LEVELS = new Set(["LOG", "DEBUG", "INFO", "WARN", "ERROR"]);
const UI_KINDS = new Set(["click", "change", "focusin", "focusout", "keydown", "submit", "scroll", "navigate", "error", "unhandledrejection", "network_error"]);

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function finiteInteger(value: unknown, lowerBound: number, upperBound: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= lowerBound && value <= upperBound
    ? value
    : null;
}

function timestamp(value: unknown): number | null {
  return finiteInteger(value, 0, Number.MAX_SAFE_INTEGER);
}

function classifyEndpoint(value: unknown): "api" | "internal" | "asset" | "other" | "unknown" {
  if (typeof value !== "string") return "unknown";
  try {
    const pathname = new URL(value, "https://debug.invalid").pathname;
    if (pathname.startsWith("/api/")) return "api";
    if (pathname.startsWith("/__manus__/")) return "internal";
    if (/\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?)$/i.test(pathname)) return "asset";
    return "other";
  } catch {
    return "unknown";
  }
}

function safeMethod(value: unknown): string {
  const normalized = typeof value === "string" ? value.toUpperCase() : "";
  return HTTP_METHODS.has(normalized) ? normalized : "OTHER";
}

function safeTarget(value: unknown) {
  const target = asRecord(value);
  const tag = typeof target.tag === "string" && /^[a-z0-9-]{1,32}$/i.test(target.tag) ? target.tag.toLowerCase() : "unknown";
  const type = typeof target.type === "string" && /^[a-z0-9-]{1,32}$/i.test(target.type) ? target.type.toLowerCase() : null;
  const role = typeof target.role === "string" && /^[a-z0-9-]{1,32}$/i.test(target.role) ? target.role.toLowerCase() : null;
  return { tag, type, role };
}

function redactConsoleEntry(value: unknown) {
  const entry = asRecord(value);
  const level = typeof entry.level === "string" && CONSOLE_LEVELS.has(entry.level) ? entry.level : "OTHER";
  return {
    timestamp: timestamp(entry.timestamp),
    level,
    argumentCount: Array.isArray(entry.args) ? Math.min(entry.args.length, 100) : 0,
    hasStack: typeof entry.stack === "string" && entry.stack.length > 0,
  };
}

function redactNetworkEntry(value: unknown) {
  const entry = asRecord(value);
  const response = asRecord(entry.response);
  return {
    timestamp: timestamp(entry.timestamp),
    type: entry.type === "fetch" || entry.type === "xhr" ? entry.type : "other",
    method: safeMethod(entry.method),
    endpoint: classifyEndpoint(entry.url),
    status: finiteInteger(response.status, 100, 599),
    durationMs: finiteInteger(entry.duration, 0, 86_400_000),
    failed: entry.error !== null && entry.error !== undefined,
  };
}

function redactUiEntry(value: unknown) {
  const entry = asRecord(value);
  const payload = asRecord(entry.payload);
  const kind = typeof entry.kind === "string" && UI_KINDS.has(entry.kind) ? entry.kind : "other";
  return {
    timestamp: timestamp(entry.timestamp),
    kind,
    route: classifyEndpoint(entry.url),
    target: safeTarget(payload.target),
  };
}

/** Redact an untrusted collector batch before local persistence. */
export function redactDebugLogEntries(source: DiagnosticSource, entries: unknown[]): unknown[] {
  const recent = entries.slice(-500);
  if (source === "browserConsole") return recent.map(redactConsoleEntry);
  if (source === "networkRequests") return recent.map(redactNetworkEntry);
  return recent.map(redactUiEntry);
}
