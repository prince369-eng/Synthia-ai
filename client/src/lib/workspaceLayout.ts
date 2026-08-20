export const SIDEBAR_COLLAPSE_STORAGE_KEY = "synthia-sidebar-collapsed";

export const TASK_ENTRY_SUGGESTIONS = [
  { label: "Create slides", goal: "Create a concise, well-structured presentation for this objective:" },
  { label: "Build website", goal: "Plan and build a production-ready website for this objective:" },
  { label: "Design", goal: "Create a polished visual design deliverable for this objective:" },
  { label: "Create games", goal: "Design and build a playable browser game for this objective:" },
] as const;

export const TASK_HISTORY_QUERY_OPTIONS = { retry: false } as const;

export const PROFILE_MENU_DESTINATIONS = [
  { label: "Credits", path: "/settings/billing", icon: "credits", group: "account" },
  { label: "Account", path: "/settings/profile", icon: "account", group: "account" },
  { label: "Personalization", path: "/settings/personalization", icon: "personalization", group: "account" },
  { label: "Settings", path: "/settings", icon: "settings", group: "navigate" },
  { label: "Homepage", path: "/", icon: "home", group: "navigate" },
  { label: "Docs", path: "/docs", icon: "docs", group: "navigate" },
] as const;

export const WORKSPACE_RETURN_ROUTES = {
  dashboard: "/",
  library: "/library",
} as const;

export function settingsPath(sectionId: string): string {
  return `/settings/${sectionId}`;
}

export function isSidebarCollapsed(value: string | null | undefined): boolean {
  return value === "true";
}
