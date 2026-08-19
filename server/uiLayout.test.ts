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
      { label: "Account & preferences", path: "/settings/profile" },
      { label: "Providers & integrations", path: "/settings/integrations" },
      { label: "Usage & credits", path: "/settings/billing" },
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
    expect(settings).toContain('label: "Agent workspace"');
    expect(settings).toContain('label: "Controls"');
    expect(workspace).toContain("synthia-workspace-return-nav");
    expect(workspace).toContain("WORKSPACE_RETURN_ROUTES.dashboard");
    expect(workspace).toContain("WORKSPACE_RETURN_ROUTES.library");
    expect(css).toContain(".synthia-account-trigger .synthia-account-copy b");
    expect(css).toContain(".synthia-nav.collapsed .synthia-account-copy");
  });
});
