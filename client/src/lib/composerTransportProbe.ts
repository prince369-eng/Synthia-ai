import { safeTrpcErrorCode } from "./trpcErrorShape";

export type ComposerTransportProbeOutcome = "started" | "success" | "failure" | "timeout";

export type ComposerTransportProbePayload = {
  outcome: ComposerTransportProbeOutcome;
  trpcCode: string | null;
};

const probeStatusLabels: Record<ComposerTransportProbeOutcome, string> = {
  started: "Checking workspace connection…",
  success: "Workspace connection check completed.",
  failure: "Workspace connection check needs attention.",
  timeout: "Workspace connection check is taking longer than expected.",
};

/** Creates the fixed, privacy-preserving payload used only by the preview transport probe. */
export function composerTransportProbePayload(outcome: ComposerTransportProbeOutcome, error?: unknown): ComposerTransportProbePayload {
  return { outcome, trpcCode: outcome === "failure" ? safeTrpcErrorCode(error) : null };
}

/** Returns a fixed, detail-free label shown only for an explicitly enabled preview probe. */
export function composerTransportProbeStatusLabel(outcome: ComposerTransportProbeOutcome) {
  return probeStatusLabels[outcome];
}
