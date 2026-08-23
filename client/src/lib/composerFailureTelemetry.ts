export type ComposerFailureReport = {
  kind: "trpc" | "network" | "unknown";
  trpcCode: string | null;
};

const allowedTrpcCodes = new Set([
  "BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "TOO_MANY_REQUESTS",
  "PRECONDITION_FAILED", "INTERNAL_SERVER_ERROR", "TIMEOUT", "CLIENT_CLOSED_REQUEST",
]);

/** Converts a client mutation error to a bounded telemetry payload without using its message or cause. */
export function classifyComposerFailure(error: unknown): ComposerFailureReport {
  if (error instanceof TypeError) return { kind: "network", trpcCode: null };
  if (error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "TRPCClientError") {
    const code = "data" in error && error.data && typeof error.data === "object" && "code" in error.data
      ? error.data.code
      : null;
    return { kind: "trpc", trpcCode: typeof code === "string" && allowedTrpcCodes.has(code) ? code : null };
  }
  return { kind: "unknown", trpcCode: null };
}

/** Best-effort, same-origin diagnostic; intentionally excludes task text, request data, error messages, and credentials. */
export function reportComposerFailure(error: unknown): void {
  const report = classifyComposerFailure(error);
  void fetch("/__synthia__/composer-client-diagnostic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined);
}
