export const SIDEBAR_COLLAPSE_STORAGE_KEY = "synthia-sidebar-collapsed";

export const TASK_ENTRY_SUGGESTIONS = [
  "Research a topic and produce a cited brief",
  "Plan and build a web application",
  "Analyze a document or data set",
  "Create an execution plan for a project",
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
