import { describe, expect, it } from "vitest";
import { agentCycleJobId } from "./queue";

describe("agent cycle job IDs", () => {
  it("uses a BullMQ-compatible custom ID without colon separators", () => {
    const jobId = agentCycleJobId("e7cb9215-69f1-4b3e-aa98-6b257ca8ef26", "cycle-1");

    expect(jobId).toBe("e7cb9215-69f1-4b3e-aa98-6b257ca8ef26-cycle-1");
    expect(jobId).not.toContain(":");
  });
});
