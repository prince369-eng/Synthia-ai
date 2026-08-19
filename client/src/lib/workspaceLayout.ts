export const SIDEBAR_COLLAPSE_STORAGE_KEY = "synthia-sidebar-collapsed";

export const TASK_ENTRY_SUGGESTIONS = [
  "Research a topic and produce a cited brief",
  "Plan and build a web application",
  "Analyze a document or data set",
  "Create an execution plan for a project",
] as const;

export const TASK_HISTORY_QUERY_OPTIONS = { retry: false } as const;

export const PROFILE_MENU_DESTINATIONS = [
  { label: "Account & preferences", path: "/settings/profile" },
  { label: "Providers & integrations", path: "/settings/integrations" },
  { label: "Usage & credits", path: "/settings/billing" },
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
