import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildTaskOfficeExport } from "./taskOfficeExport";

describe("task office spreadsheet export", () => {
  it("round-trips the task summary and timeline through ExcelJS", async () => {
    const exported = await buildTaskOfficeExport({
      taskId: "task-export-contract",
      title: "Network planning brief",
      goal: "Create an auditable two-router planning brief.",
      status: "needs_input",
      createdAt: new Date("2026-08-24T00:00:00.000Z"),
      completedAt: null,
      events: [
        {
          sequenceNumber: 1,
          type: "task_created",
          payload: { category: "planning", safe: true },
          createdAt: new Date("2026-08-24T00:01:00.000Z"),
        },
        {
          sequenceNumber: 2,
          type: "task_paused",
          payload: { reason: "approval_required" },
          createdAt: new Date("2026-08-24T00:02:00.000Z"),
        },
      ],
    }, "xlsx");

    expect(exported.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(exported.filename).toBe("network-planning-brief-task-data.xlsx");
    expect(exported.bytes.byteLength).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exported.bytes));

    const summary = workbook.getWorksheet("Task summary");
    const timeline = workbook.getWorksheet("Task timeline");
    expect(summary).toBeDefined();
    expect(timeline).toBeDefined();
    expect(summary?.getCell("B1").value).toBe("Network planning brief");
    expect(summary?.getCell("B2").value).toBe("Create an auditable two-router planning brief.");
    expect(summary?.getCell("B3").value).toBe("needs input");
    expect(summary?.getCell("B6").value).toBe("task-export-contract");
    expect(summary?.getCell("A1").font?.bold).toBe(true);

    expect(timeline?.getCell("A1").value).toBe("Sequence");
    expect(timeline?.getCell("D1").value).toBe("Recorded payload");
    expect(timeline?.getCell("A2").value).toBe(1);
    expect(timeline?.getCell("C3").value).toBe("task_paused");
    expect(timeline?.getCell("D3").value).toContain("approval_required");
    expect(timeline?.views[0]?.state).toBe("frozen");
  });
});
