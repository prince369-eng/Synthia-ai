/** A narrow, non-sensitive response shape for body-parser failures. */
export type RequestBodyErrorResponse = {
  status: 400 | 413;
  body: { error: "INVALID_REQUEST_BODY" | "PAYLOAD_TOO_LARGE" };
  event: "request_body_invalid" | "request_body_too_large";
};

type ParserErrorLike = {
  type?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

/**
 * Recognizes only Express/body-parser request-body failures. Other exceptions
 * continue to the normal application error flow unchanged.
 */
export function requestBodyErrorResponse(error: unknown): RequestBodyErrorResponse | null {
  if (!error || typeof error !== "object") return null;
  const parserError = error as ParserErrorLike;
  const status = parserError.status ?? parserError.statusCode;

  if (parserError.type === "entity.too.large" || status === 413) {
    return {
      status: 413,
      body: { error: "PAYLOAD_TOO_LARGE" },
      event: "request_body_too_large",
    };
  }

  if (parserError.type === "entity.parse.failed" || status === 400) {
    return {
      status: 400,
      body: { error: "INVALID_REQUEST_BODY" },
      event: "request_body_invalid",
    };
  }

  return null;
}
