import { safeTrpcErrorCode } from "./trpcErrorShape";

export type ComposerTransportProbeOutcome = "started" | "success" | "failure" | "timeout";

export type ComposerTransportProbePayload = {
  outcome: ComposerTransportProbeOutcome;
  trpcCode: string | null;
};

/** Creates the fixed, privacy-preserving payload used only by the preview transport probe. */
export function composerTransportProbePayload(outcome: ComposerTransportProbeOutcome, error?: unknown): ComposerTransportProbePayload {
  return { outcome, trpcCode: outcome === "failure" ? safeTrpcErrorCode(error) : null };
}
