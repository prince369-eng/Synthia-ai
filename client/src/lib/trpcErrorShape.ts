const knownTrpcCodes = new Set([
  "PARSE_ERROR", "BAD_REQUEST", "INTERNAL_SERVER_ERROR", "UNAUTHORIZED", "FORBIDDEN",
  "NOT_FOUND", "METHOD_NOT_SUPPORTED", "TIMEOUT", "CONFLICT", "GONE", "PAYLOAD_TOO_LARGE",
  "UNPROCESSABLE_CONTENT", "TOO_MANY_REQUESTS", "CLIENT_CLOSED_REQUEST", "PRECONDITION_FAILED",
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
