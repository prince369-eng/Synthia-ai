import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isSidebarCollapsed,
  SIDEBAR_COLLAPSE_STORAGE_KEY,
  TASK_ENTRY_SUGGESTIONS,
  TASK_HISTORY_QUERY_OPTIONS,
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
});
