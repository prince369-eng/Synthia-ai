import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskComposerAttachments } from "../client/src/components/TaskComposerAttachments";
import { LibraryPicker } from "../client/src/components/LibraryPicker";
import TaskDashboard, { buildTaskAttachmentRefs } from "../client/src/pages/TaskDashboard";

const dashboardState = vi.hoisted(() => ({
  authenticated: true,
  taskHistory: { data: [] as unknown[] | undefined, isLoading: false, isError: false },
  taskQueryOptions: undefined as { enabled?: boolean } | undefined,
  models: [] as Array<{ id: string; provider: string; model: string; label: string; capabilities: string[] }>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tasks: {
      list: { useQuery: (_input: unknown, options: { enabled?: boolean }) => {
        dashboardState.taskQueryOptions = options;
        return dashboardState.taskHistory;
      } },
      uploadAttachment: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      transcribeVoice: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    projects: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    settings: { get: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    workspace: { usage: { useQuery: () => ({ data: { creditsBalance: 25 }, isLoading: false, isError: false }) } },
    catalog: {
      estimateTask: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) },
      models: { useQuery: () => ({ data: { models: dashboardState.models }, isLoading: false, isError: false }) },
      media: { useQuery: () => ({ data: { image: { models: ["flux"], configured: true }, video: { models: ["ltx"], configured: true }, audio: { models: ["tracks"], configured: true } }, isLoading: false, isError: false }) },
    },
    library: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: dashboardState.authenticated }),
}));

afterEach(() => {
  cleanup();
  dashboardState.authenticated = true;
  dashboardState.taskHistory = { data: [], isLoading: false, isError: false };
  dashboardState.taskQueryOptions = undefined;
  dashboardState.models = [];
});

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
    await user.click(screen.getByRole("button", { name: "View media capabilities" }));
    expect(screen.getByText("Image generation")).toBeTruthy();
    expect(screen.getByText("Video generation")).toBeTruthy();
    expect(screen.getByText("Audio generation")).toBeTruthy();
    expect(screen.getByText("Ready · flux")).toBeTruthy();
    expect(screen.getByText("Ready · ltx")).toBeTruthy();
    expect(screen.getByText("Ready · tracks")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start voice instruction" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Usage summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open task files" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "More workspace actions" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "More task modes" }));
    expect(screen.getByTestId("center-capability-menu")).toBeTruthy();
    expect(screen.getByText("Develop apps")).toBeTruthy();
    expect(screen.getByText("Wide Research")).toBeTruthy();
    expect(screen.getByText("Scheduled task")).toBeTruthy();
    expect(screen.getByText("Playbook")).toBeTruthy();
  });

  it("keeps long configured model catalogs in a bounded scrollable selector with model names and capabilities only", async () => {
    const user = userEvent.setup();
    dashboardState.models = [
      { id: "aihubmix:glm-5.2-free", provider: "aihubmix", model: "glm-5.2-free", label: "Primary", capabilities: ["text", "vision"] },
      { id: "agnes:agnes-2.0-flash", provider: "agnes", model: "agnes-2.0-flash", label: "Configured", capabilities: ["text", "audio"] },
    ];
    render(<TaskDashboard />);

    await user.click(screen.getByRole("button", { name: "Choose model" }));
    const menu = screen.getByTestId("composer-model-menu");
    expect(menu.getAttribute("data-scrollable")).toBe("true");
    expect(within(menu).getByText("glm-5.2-free")).toBeTruthy();
    expect(within(menu).getByText("agnes-2.0-flash")).toBeTruthy();
    expect(within(menu).getByText("Text · Vision")).toBeTruthy();
    expect(within(menu).getByText("Text · Audio")).toBeTruthy();
    expect(within(menu).queryByText(/AIHubMix|Agnes AI|Configured/)).toBeNull();
  });

  it("loads task history only for an authenticated workspace and renders a calm empty state", () => {
    render(<TaskDashboard />);
    expect(dashboardState.taskQueryOptions?.enabled).toBe(true);
    expect(screen.getByText("Start with the prompt above. Tasks you create will appear here with their live execution state.")).toBeTruthy();
    expect(screen.queryByText("Loading your tasks…")).toBeNull();
  });

  it("does not present task-history loading, empty, or unavailable copy before authentication", () => {
    dashboardState.authenticated = false;
    dashboardState.taskHistory = { data: undefined, isLoading: false, isError: false };
    render(<TaskDashboard />);
    expect(dashboardState.taskQueryOptions?.enabled).toBe(false);
    expect(screen.queryByText("Loading your tasks…")).toBeNull();
    expect(screen.queryByText(/Tasks you create will appear here/)).toBeNull();
    expect(screen.queryByText(/Task history could not be loaded/)).toBeNull();
  });

  it("renders an accurate unavailable state instead of blaming unconfigured data storage", () => {
    dashboardState.taskHistory = { data: undefined, isLoading: false, isError: true };
    render(<TaskDashboard />);
    expect(screen.getByText("Task history could not be loaded. Reload the workspace and try again.")).toBeTruthy();
    expect(screen.queryByText(/external Synthia data store/)).toBeNull();
  });
});
