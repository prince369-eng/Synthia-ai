import { describe, expect, it } from "vitest";
import { automaticModelRoutingStatus } from "./automaticModelStatus";

describe("automaticModelRoutingStatus", () => {
  it("makes a manual selection explicit", () => {
    expect(automaticModelRoutingStatus({ loading: false, manualModelSelected: true, includesVisualAttachment: false, involvesCode: false, models: [{ capabilities: ["text"] }] }))
      .toBe("Manual model selected. Automatic switching is off for this task.");
  });

  it("explains automatic fallback without exposing provider details", () => {
    const status = automaticModelRoutingStatus({ loading: false, manualModelSelected: false, includesVisualAttachment: false, involvesCode: false, models: [{ capabilities: ["text"] }] });
    expect(status).toContain("best compatible model");
    expect(status).toContain("another configured route");
    expect(status).not.toMatch(/api|key|provider/i);
  });

  it("requires a compatible vision model before an image task can start", () => {
    expect(automaticModelRoutingStatus({ loading: false, manualModelSelected: false, includesVisualAttachment: true, involvesCode: false, models: [{ capabilities: ["text"] }] }))
      .toBe("Automatic routing needs a vision-capable model for this image attachment.");
  });
});
