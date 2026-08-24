/**
 * Defines the client-safe response for an unexpected Express route failure.
 * The originating exception is deliberately not serialized to a client.
 */
export function unexpectedRequestErrorResponse() {
  return {
    status: 500,
    event: "unexpected_request_error",
    body: { error: "INTERNAL_SERVER_ERROR" },
  } as const;
}
