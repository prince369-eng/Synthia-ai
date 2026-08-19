import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskComposerAttachments } from "../client/src/components/TaskComposerAttachments";
import { LibraryPicker } from "../client/src/components/LibraryPicker";
import TaskDashboard, { buildTaskAttachmentRefs } from "../client/src/pages/TaskDashboard";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tasks: {
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      uploadAttachment: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      transcribeVoice: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    projects: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    settings: { get: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    workspace: { usage: { useQuery: () => ({ data: { creditsBalance: 25 }, isLoading: false, isError: false }) } },
    catalog: {
      estimateTask: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) },
      models: { useQuery: () => ({ data: { models: [] }, isLoading: false, isError: false }) },
    },
    library: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
  },
}));

afterEach(cleanup);

describe("task composer attachments", () => {
  it("renders an attachment chip and removes it with its explicit control", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<TaskComposerAttachments attachments={[{ id: "attachment-1", sourceType: "upload", filename: "brief.pdf", fileType: "application/pdf", storageKey: "task-inputs/1/brief.pdf", storageUrl: "/manus-storage/brief.pdf" }]} onRemove={onRemove} />);
    expect(screen.getByText("brief.pdf")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove brief.pdf" }));
    expect(onRemove).toHaveBeenCalledWith("attachment-1");
  });

  it("opens the Library picker and lets its dialog be dismissed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<LibraryPicker open onOpenChange={onOpenChange} selectedDeliverableIds={[]} onSelect={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Attach from Library")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("serializes uploads and Library selections into the task create contract", () => {
    expect(buildTaskAttachmentRefs([
      { id: "upload-1", sourceType: "upload", filename: "notes.txt", fileType: "text/plain", storageKey: "task-inputs/1/notes.txt", storageUrl: "/manus-storage/notes.txt" },
      { id: "library-1", sourceType: "library", filename: "output.csv", fileType: "text/csv", sourceDeliverableId: "a3f7b5e2-4218-41b1-98d4-dfbdde95c553" },
    ])).toEqual([
      { sourceType: "upload", filename: "notes.txt", fileType: "text/plain", storageKey: "task-inputs/1/notes.txt", storageUrl: "/manus-storage/notes.txt" },
      { sourceType: "library", sourceDeliverableId: "a3f7b5e2-4218-41b1-98d4-dfbdde95c553" },
    ]);
  });

  it("exposes the compact plus attachment menu and organized workspace controls", async () => {
    const user = userEvent.setup();
    render(<TaskDashboard />);
    const attachmentTrigger = screen.getByRole("button", { name: "Add a task attachment" });
    await user.hover(attachmentTrigger);
    expect(screen.getByText("Add from local files")).toBeTruthy();
    expect(screen.getByText("From Library")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose model" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start voice instruction" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Usage summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open task files" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "More workspace actions" })).toBeTruthy();
  });
});
