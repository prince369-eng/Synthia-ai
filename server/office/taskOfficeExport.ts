import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import pptxgen from "pptxgenjs";

export const OFFICE_EXPORT_FORMATS = ["pdf", "pptx", "xlsx"] as const;
export type OfficeExportFormat = (typeof OFFICE_EXPORT_FORMATS)[number];

export type TaskOfficeExportSource = {
  taskId: string;
  title: string;
  goal: string;
  status: string;
  createdAt: Date;
  completedAt?: Date | null;
  events: Array<{ sequenceNumber: number; type: string; payload: unknown; createdAt: Date }>;
};

export type TaskOfficeExport = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

function filenameStem(title: string) {
  const stem = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return stem || "synthia-task";
}

function date(value: Date | null | undefined) {
  return value ? value.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC") : "—";
}

function eventSummary(payload: unknown) {
  const serialized = JSON.stringify(payload);
  return serialized.length > 460 ? `${serialized.slice(0, 457)}…` : serialized;
}

function pdfBytes(source: TaskOfficeExportSource) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: source.title, Author: "Synthia AI" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));

    document.fillColor("#0e1716").fontSize(23).text(source.title, { width: 500 });
    document.moveDown(0.4).fillColor("#14b8a6").fontSize(9).text("SYNTHIA AI · TASK BRIEF", { characterSpacing: 1.3 });
    document.moveDown().fillColor("#1e3531").fontSize(11).text(source.goal, { lineGap: 5 });
    document.moveDown(1.1).fillColor("#475b56").fontSize(9);
    document.text(`Status: ${source.status.replace(/_/g, " ")}`);
    document.text(`Created: ${date(source.createdAt)}`);
    document.text(`Completed: ${date(source.completedAt)}`);
    document.moveDown(1.2).fillColor("#0e1716").fontSize(14).text("Auditable task timeline");
    document.moveDown(0.5);
    for (const event of source.events.slice(-40)) {
      document.fillColor("#0e1716").fontSize(9).text(`${String(event.sequenceNumber).padStart(3, "0")} · ${event.type.replace(/_/g, " ")} · ${date(event.createdAt)}`);
      document.moveDown(0.15).fillColor("#475b56").fontSize(8.5).text(eventSummary(event.payload), { lineGap: 2 });
      document.moveDown(0.45);
      if (document.y > 730) document.addPage();
    }
    document.end();
  });
}

async function xlsxBytes(source: TaskOfficeExportSource) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Synthia AI";
  workbook.created = new Date();
  workbook.title = source.title;
  const summary = workbook.addWorksheet("Task summary", { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 20 }, { width: 92 }];
  summary.addRows([
    ["Task", source.title],
    ["Goal", source.goal],
    ["Status", source.status.replace(/_/g, " ")],
    ["Created", date(source.createdAt)],
    ["Completed", date(source.completedAt)],
    ["Task ID", source.taskId],
  ]);
  summary.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "top", wrapText: true };
    row.height = rowNumber === 2 ? 58 : 23;
    row.getCell(1).font = { bold: true, color: { argb: "FF0F766E" } };
    row.getCell(2).font = { color: { argb: "FF17332E" } };
  });

  const timeline = workbook.addWorksheet("Task timeline", { views: [{ state: "frozen", ySplit: 1 }] });
  timeline.columns = [{ width: 11 }, { width: 22 }, { width: 26 }, { width: 92 }];
  timeline.addRow(["Sequence", "Timestamp", "Event", "Recorded payload"]);
  timeline.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  timeline.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  source.events.slice(-200).forEach(event => timeline.addRow([event.sequenceNumber, date(event.createdAt), event.type, eventSummary(event.payload)]));
  timeline.eachRow(row => { row.alignment = { vertical: "top", wrapText: true }; row.height = 34; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

async function pptxBytes(source: TaskOfficeExportSource) {
  const presentation = new pptxgen();
  presentation.layout = "LAYOUT_WIDE";
  presentation.author = "Synthia AI";
  presentation.subject = "Task brief";
  presentation.title = source.title;
  presentation.company = "Synthia AI";

  const title = presentation.addSlide();
  title.background = { color: "0E1716" };
  title.addText("SYNTHIA AI", { x: 0.7, y: 0.62, w: 2.2, h: 0.25, fontFace: "Aptos", fontSize: 9, bold: true, charSpacing: 2, color: "22D3EE" });
  title.addText(source.title, { x: 0.7, y: 1.25, w: 11.5, h: 1.15, fontFace: "Georgia", fontSize: 29, bold: true, color: "E5F2EF", breakLine: false, fit: "shrink" });
  title.addText(source.goal, { x: 0.7, y: 2.75, w: 8.4, h: 1.25, fontFace: "Aptos", fontSize: 15, color: "B7CCC6", breakLine: false, fit: "shrink", margin: 0 });
  title.addShape(presentation.ShapeType.roundRect, { x: 0.7, y: 5.65, w: 2.3, h: 0.5, rectRadius: 0.08, fill: { color: "12312C" }, line: { color: "22D3EE", transparency: 60 } });
  title.addText(source.status.replace(/_/g, " ").toUpperCase(), { x: 0.88, y: 5.81, w: 1.95, h: 0.16, fontFace: "Aptos", fontSize: 8, bold: true, align: "center", color: "67E8F9", charSpacing: 1.3, margin: 0 });
  title.addText(`Created ${date(source.createdAt)}`, { x: 9.35, y: 5.85, w: 2.7, h: 0.18, fontFace: "Aptos", fontSize: 8, align: "right", color: "78918A", margin: 0 });

  const timeline = presentation.addSlide();
  timeline.background = { color: "F7FBFA" };
  timeline.addText("Auditable task timeline", { x: 0.65, y: 0.5, w: 7.8, h: 0.4, fontFace: "Georgia", fontSize: 22, bold: true, color: "12312C" });
  const rows = source.events.slice(-10).map(event => [{ text: String(event.sequenceNumber) }, { text: date(event.createdAt) }, { text: event.type.replace(/_/g, " ") }, { text: eventSummary(event.payload) }]);
  timeline.addTable([[{ text: "#", options: { bold: true } }, { text: "Recorded", options: { bold: true } }, { text: "Event", options: { bold: true } }, { text: "Details", options: { bold: true } }], ...rows], {
    x: 0.65, y: 1.18, w: 12.0, h: 5.6, border: { type: "solid", color: "C9DEDA", pt: 0.5 },
    fill: { color: "FFFFFF" }, color: "17332E", fontFace: "Aptos", fontSize: 8.5, margin: 0.08,
    rowH: 0.42, colW: [0.55, 2.0, 1.65, 7.8],
  });
  const output = await presentation.write({ outputType: "arraybuffer" });
  return new Uint8Array(output as ArrayBuffer);
}

export async function buildTaskOfficeExport(source: TaskOfficeExportSource, format: OfficeExportFormat): Promise<TaskOfficeExport> {
  const stem = filenameStem(source.title);
  if (format === "pdf") return { filename: `${stem}-task-brief.pdf`, contentType: "application/pdf", bytes: await pdfBytes(source) };
  if (format === "xlsx") return { filename: `${stem}-task-data.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: await xlsxBytes(source) };
  return { filename: `${stem}-task-brief.pptx`, contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", bytes: await pptxBytes(source) };
}
