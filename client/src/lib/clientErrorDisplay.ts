import { TRPCClientError } from "@trpc/client";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { isTrpcLikeError, safeTrpcErrorCode } from "./trpcErrorShape";

const genericGuidance = "We could not complete that request. Please try again.";

/**
 * Returns stable recovery guidance for client UI without exposing arbitrary
 * transport, provider, or server exception text.
 */
export function clientErrorMessage(error: unknown, fallback = genericGuidance): string {
  if (error instanceof TypeError) {
    return "The workspace connection is unavailable. Check your connection and try again.";
  }

  if (error instanceof TRPCClientError || isTrpcLikeError(error)) {
    if (error.message === UNAUTHED_ERR_MSG) {
      return "Your session has expired. Sign in again to continue.";
    }

    switch (safeTrpcErrorCode(error)) {
      case "BAD_REQUEST":
        return "Review the information provided and try again.";
      case "FORBIDDEN":
        return "You do not have permission to complete that request.";
      case "NOT_FOUND":
        return "The requested item is no longer available.";
      case "TOO_MANY_REQUESTS":
        return "Too many requests were made. Wait a moment, then try again.";
      case "PRECONDITION_FAILED":
        return "This workspace is temporarily unavailable. Please try again shortly.";
      case "INTERNAL_SERVER_ERROR":
        return "The workspace encountered a temporary server error before task execution. Refresh the page, then try again.";
      case "UNAUTHORIZED":
        return "Your session has expired. Sign in again to continue.";
      default:
        return "The workspace returned an unrecognized response. Refresh the page, then try again.";
    }
  }

  return fallback;
}
