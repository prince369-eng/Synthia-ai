import { describe, expect, it } from "vitest";
import { composerTransportProbePayload, composerTransportProbeStatusLabel } from "./composerTransportProbe";

describe("composerTransportProbePayload", () => {
  it("reports fixed lifecycle outcomes without task data", () => {
    expect(composerTransportProbePayload("started")).toEqual({ outcome: "started", trpcCode: null });
    expect(composerTransportProbePayload("success")).toEqual({ outcome: "success", trpcCode: null });
    expect(composerTransportProbePayload("timeout")).toEqual({ outcome: "timeout", trpcCode: null });
  });

  it("preserves only an allow-listed protocol code on a failure", () => {
    expect(composerTransportProbePayload("failure", { name: "TRPCClientError", data: { code: "PRECONDITION_FAILED" }, message: "private context" })).toEqual({
      outcome: "failure",
      trpcCode: "PRECONDITION_FAILED",
    });
    expect(JSON.stringify(composerTransportProbePayload("failure", { message: "private context" }))).not.toContain("private context");
  });

  it("uses fixed, detail-free labels for browser-visible probe outcomes", () => {
    expect(composerTransportProbeStatusLabel("started")).toBe("Checking workspace connection…");
    expect(composerTransportProbeStatusLabel("success")).toBe("Workspace connection check completed.");
    expect(composerTransportProbeStatusLabel("failure")).toBe("Workspace connection check needs attention.");
    expect(composerTransportProbeStatusLabel("timeout")).toBe("Workspace connection check is taking longer than expected.");
  });
});
