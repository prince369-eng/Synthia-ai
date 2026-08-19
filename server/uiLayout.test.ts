import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isSidebarCollapsed,
  PROFILE_MENU_DESTINATIONS,
  SIDEBAR_COLLAPSE_STORAGE_KEY,
  TASK_ENTRY_SUGGESTIONS,
  TASK_HISTORY_QUERY_OPTIONS,
  WORKSPACE_RETURN_ROUTES,
} from "../client/src/lib/workspaceLayout";
import { filterLibraryItems } from "../client/src/pages/Library";
import { normalizeScheduledJobs } from "../client/src/pages/Scheduled";
import { isScreenCapture } from "../client/src/pages/TaskWorkspace";

describe("compact workspace layout contract", () => {
  it("restores only an explicit collapsed navigation preference", () => {
    expect(SIDEBAR_COLLAPSE_STORAGE_KEY).toBe("synthia-sidebar-collapsed");
    expect(isSidebarCollapsed("true")).toBe(true);
    expect(isSidebarCollapsed("false")).toBe(false);
    expect(isSidebarCollapsed(null)).toBe(false);
  });

  it("keeps a concise set of task-entry suggestions for the chat-first composer", () => {
    expect(TASK_ENTRY_SUGGESTIONS).toHaveLength(4);
    expect(new Set(TASK_ENTRY_SUGGESTIONS).size).toBe(TASK_ENTRY_SUGGESTIONS.length);
    expect(TASK_ENTRY_SUGGESTIONS.every(item => item.length > 20)).toBe(true);
  });

  it("does not delay the unavailable state when the external task store is absent", () => {
    expect(TASK_HISTORY_QUERY_OPTIONS).toEqual({ retry: false });
  });

  it("turns the collapsed desktop navigation into an icon-only rail", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain(".synthia-nav.collapsed { @apply w-16 px-2; }");
    expect(css).toContain(".synthia-nav.collapsed .synthia-brand-copy");
    expect(css).toContain(".synthia-nav.collapsed .synthia-nav-item span");
    expect(css).toContain(".synthia-nav.collapsed .synthia-task-rail");
    expect(css).toContain(".synthia-nav.collapsed .synthia-account-copy");
    expect(css).toContain(".synthia-nav.collapsed .synthia-new-task, .synthia-nav.collapsed .synthia-nav-item { @apply justify-center px-0; }");
  });

  it("keeps account navigation and workspace returns explicit and route-safe", () => {
    expect(PROFILE_MENU_DESTINATIONS).toEqual([
      { label: "Credits", path: "/settings/billing", icon: "credits", group: "account" },
      { label: "Account", path: "/settings/profile", icon: "account", group: "account" },
      { label: "Personalization", path: "/settings/personalization", icon: "personalization", group: "account" },
      { label: "Settings", path: "/settings", icon: "settings", group: "navigate" },
      { label: "Homepage", path: "/", icon: "home", group: "navigate" },
      { label: "Docs", path: "/docs", icon: "docs", group: "navigate" },
    ]);
    expect(WORKSPACE_RETURN_ROUTES).toEqual({ dashboard: "/", library: "/library" });
  });

  it("renders the profile menu, grouped settings navigation, and both workspace return actions", () => {
    const shell = readFileSync(new URL("../client/src/components/SynthiaAppShell.tsx", import.meta.url), "utf8");
    const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(shell).toContain("<ProfileMenu");
    expect(shell).toContain("onLogout={() => void logout()}");
    expect(shell).toContain("Sign out");
    expect(settings).toContain("const sectionGroups");
    expect(settings).toContain('label: "Account"');
    expect(settings).toContain('label: "Workspace"');
    expect(settings).toContain('label: "Agent capabilities"');
    expect(settings).toContain('label: "Data & safeguards"');
    expect(workspace).toContain("synthia-workspace-return-nav");
    expect(workspace).toContain("WORKSPACE_RETURN_ROUTES.dashboard");
    expect(workspace).toContain("WORKSPACE_RETURN_ROUTES.library");
    expect(css).toContain(".synthia-account-trigger .synthia-account-copy b");
    expect(css).toContain(".synthia-nav.collapsed .synthia-account-copy");
  });

  it("normalizes an unavailable or malformed scheduled-job list into the compact empty state", () => {
    expect(normalizeScheduledJobs(undefined)).toEqual([]);
    expect(normalizeScheduledJobs({ jobs: "invalid" })).toEqual([]);
    expect(normalizeScheduledJobs({ jobs: [{ taskUid: "job-1", name: "Morning review" }] })).toEqual([{ taskUid: "job-1", name: "Morning review" }]);
  });

  it("filters real library items by task context and final-output state without inventing records", () => {
    const items = [
      { id: "artifact-1", taskId: "task-1", taskTitle: "Research workspace", taskGoal: "Prepare a research brief", filename: "brief.md", fileType: "text/markdown", isFinal: true, createdAt: new Date() },
      { id: "artifact-2", taskId: "task-2", taskTitle: "Build prototype", taskGoal: "Implement an interface", filename: "notes.txt", fileType: "text/plain", isFinal: false, createdAt: new Date() },
    ];

    expect(filterLibraryItems(items, "research", false)).toEqual([items[0]]);
    expect(filterLibraryItems(items, "", true)).toEqual([items[0]]);
    expect(filterLibraryItems(items, "missing", false)).toEqual([]);
  });

  it("recognizes persisted image deliverables using the actual fileType schema field", () => {
    expect(isScreenCapture({ fileType: "image/png" })).toBe(true);
    expect(isScreenCapture({ fileType: "text/markdown" })).toBe(false);
    expect(isScreenCapture({ mimeType: "image/png" })).toBe(false);
  });

  it("refreshes workspace artifact links through the owned task-artifact contract instead of persisting direct URLs", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");

    expect(workspace).toContain("trpc.tasks.artifactUrl.useQuery");
    expect(workspace).toContain("<ArtifactOpenButton taskId={taskId} deliverable={item} />");
    expect(workspace).not.toContain("href={item.url}");
    expect(workspace).toContain("item.fileType");
  });

  it("makes the same user-initiated secure artifact retrieval available from the Library", () => {
    const library = readFileSync(new URL("../client/src/pages/Library.tsx", import.meta.url), "utf8");

    expect(library).toContain("export function LibraryArtifactOpenButton");
    expect(library).toContain("trpc.tasks.artifactUrl.useQuery");
    expect(library).toContain("<LibraryArtifactOpenButton taskId={item.taskId} deliverable={item} />");
    expect(library).toContain("Open task workspace →");
  });

  it("keeps General Settings review buttons and capability switches inside bounded responsive grid cells", () => {
    const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");

    expect(settings).toContain('className="grid grid-cols-2 gap-2"');
    expect(settings).toContain('cn("mt-0 w-full", defaults.mode');
    expect(settings).toContain('className="grid min-w-0 gap-3 md:grid-cols-3"');
    expect(settings).toContain('className="min-w-0 rounded-lg border border-white/8 bg-black/10 px-3 py-3"');
    expect(settings).toContain('className="flex min-w-0 w-full items-start justify-between gap-3"');
    expect(settings).toContain("w-9 shrink-0 rounded-full");
  });
});
