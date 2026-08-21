import { describe, expect, it } from "vitest";
import { buildTaskOfficeExport } from "./office/taskOfficeExport";

const source = {
  taskId: "e6fbe97b-2794-419f-8a4e-8959d93069f5",
  title: "Quarterly delivery review",
  goal: "Create an auditable delivery brief for the quarterly planning meeting.",
  status: "completed",
  createdAt: new Date("2026-08-21T06:00:00.000Z"),
  completedAt: new Date("2026-08-21T06:12:00.000Z"),
  events: [{ sequenceNumber: 1, type: "task_metadata", payload: { milestone: "planned" }, createdAt: new Date("2026-08-21T06:01:00.000Z") }],
};

describe("task-owned Office exports", () => {
  it("builds a real PDF brief without a model or provider call", async () => {
    const output = await buildTaskOfficeExport(source, "pdf");
    expect(output.filename).toBe("quarterly-delivery-review-task-brief.pdf");
    expect(output.contentType).toBe("application/pdf");
    expect(Buffer.from(output.bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("builds editable XLSX and PPTX task artifacts", async () => {
    const [sheet, deck] = await Promise.all([
      buildTaskOfficeExport(source, "xlsx"),
      buildTaskOfficeExport(source, "pptx"),
    ]);
    expect(sheet.filename).toBe("quarterly-delivery-review-task-data.xlsx");
    expect(deck.filename).toBe("quarterly-delivery-review-task-brief.pptx");
    expect(Buffer.from(sheet.bytes).subarray(0, 2).toString()).toBe("PK");
    expect(Buffer.from(deck.bytes).subarray(0, 2).toString()).toBe("PK");
  });
});
