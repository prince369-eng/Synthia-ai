import { isTrpcLikeError, safeTrpcErrorCode } from "./trpcErrorShape";

export type ComposerFailureReport = {
  kind: "trpc" | "network" | "decode" | "client" | "unknown";
  trpcCode: string | null;
};

/** Converts a client mutation error to a bounded telemetry payload without using its message or cause. */
export function classifyComposerFailure(error: unknown): ComposerFailureReport {
  if (error instanceof TypeError) return { kind: "network", trpcCode: null };
  if (isTrpcLikeError(error)) return { kind: "trpc", trpcCode: safeTrpcErrorCode(error) };
  if (error instanceof SyntaxError || (error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "SyntaxError")) {
    return { kind: "decode", trpcCode: null };
  }
  if (error instanceof Error || (error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "Error")) {
    return { kind: "client", trpcCode: null };
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
