const knownTrpcCodes = new Set([
  "BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "TOO_MANY_REQUESTS",
  "PRECONDITION_FAILED", "INTERNAL_SERVER_ERROR", "TIMEOUT", "CLIENT_CLOSED_REQUEST",
]);

type TrpcLikeError = { name?: unknown; message?: unknown; data?: { code?: unknown } | null };

/** Reads only an allow-listed tRPC code and supports duplicate classic-bundle error constructors. */
export function safeTrpcErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as TrpcLikeError;
  if (candidate.name !== "TRPCClientError") return null;
  const code = candidate.data?.code;
  return typeof code === "string" && knownTrpcCodes.has(code) ? code : null;
}

export function isTrpcLikeError(error: unknown): error is TrpcLikeError {
  return Boolean(error && typeof error === "object" && (error as TrpcLikeError).name === "TRPCClientError");
}
