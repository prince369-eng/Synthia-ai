const SENSITIVE_FIELD_NAME = /^(?:api[_-]?key|access[_-]?key|auth(?:orization)?|bearer|client[_-]?secret|cookie|credential|id[_-]?token|key|password|private[_-]?key|secret|session(?:[_-]?token)?|set[_-]?cookie|token)$/i;
const SENSITIVE_QUERY_KEY = /(?:api[_-]?key|access[_-]?key|access_token|auth(?:orization)?|client[_-]?secret|credential|id_token|password|secret|session(?:[_-]?token)?|token)/i;
const MAX_REDACTION_DEPTH = 8;
const MAX_REDACTION_ARRAY_ITEMS = 100;
const MAX_REDACTION_OBJECT_KEYS = 100;

function redactCredentialLikeText(value: string) {
  return value
    .replace(/\b(https?):\/\/[^\s/:@]+:[^\s@/]+@/gi, "$1://[redacted]@")
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/\b(api[_-]?key|access[_-]?key|access_token|auth(?:orization)?|client[_-]?secret|credential|id[_-]?token|password|private[_-]?key|secret|session(?:[_-]?token)?|token)\b(\s*[:=]\s*)([^\s,;]+)/gi, "$1$2[redacted]")
    .replace(/([?&]([A-Za-z0-9_-]+)=)([^&#\s]+)/g, (match, prefix: string, key: string) => SENSITIVE_QUERY_KEY.test(key) ? `${prefix}[redacted]` : match);
}

/**
 * Produces a bounded, display-only view of task event data. The persisted task
 * event is not changed, so task replay and provenance remain faithful while
 * terminal rendering does not disclose credential-shaped content.
 */
export function redactTaskEventPayload(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactCredentialLikeText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_REDACTION_DEPTH || seen.has(value)) return "[redacted nested value]";

  seen.add(value);
  if (Array.isArray(value)) {
    const visible = value.slice(0, MAX_REDACTION_ARRAY_ITEMS).map(item => redactTaskEventPayload(item, depth + 1, seen));
    return value.length > MAX_REDACTION_ARRAY_ITEMS ? [...visible, `[${value.length - MAX_REDACTION_ARRAY_ITEMS} additional items omitted]`] : visible;
  }

  const output: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, MAX_REDACTION_OBJECT_KEYS);
  for (const [key, nested] of entries) output[key] = SENSITIVE_FIELD_NAME.test(key) ? "[redacted]" : redactTaskEventPayload(nested, depth + 1, seen);
  if (Object.keys(value).length > MAX_REDACTION_OBJECT_KEYS) output.__truncated = `[${Object.keys(value).length - MAX_REDACTION_OBJECT_KEYS} additional fields omitted]`;
  return output;
}
