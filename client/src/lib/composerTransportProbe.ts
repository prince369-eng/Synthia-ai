import { safeTrpcErrorCode } from "./trpcErrorShape";
import { classifyComposerFailure, type ComposerFailureReport } from "./composerFailureTelemetry";

export type ComposerTransportProbeOutcome = "started" | "success" | "failure" | "timeout";

export type ComposerTransportProbePayload = {
  outcome: ComposerTransportProbeOutcome;
  trpcCode: string | null;
};

export type ComposerTransportProbeDomMetadata = {
  outcome: ComposerTransportProbeOutcome;
  kind?: ComposerFailureReport["kind"];
  trpcCode?: string;
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

/** Returns the only lifecycle fields permitted in the preview probe's DOM metadata. */
export function composerTransportProbeDomMetadata(outcome: ComposerTransportProbeOutcome, error?: unknown): ComposerTransportProbeDomMetadata {
  const payload = composerTransportProbePayload(outcome, error);
  if (outcome !== "failure") return { outcome: payload.outcome };
  const report = classifyComposerFailure(error);
  return {
    outcome: payload.outcome,
    kind: report.kind,
    ...(payload.trpcCode ? { trpcCode: payload.trpcCode } : {}),
  };
}

/** Returns a fixed, detail-free label shown only for an explicitly enabled preview probe. */
export function composerTransportProbeStatusLabel(outcome: ComposerTransportProbeOutcome) {
  return probeStatusLabels[outcome];
}
