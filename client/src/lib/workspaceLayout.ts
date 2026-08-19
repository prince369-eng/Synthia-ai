export const SIDEBAR_COLLAPSE_STORAGE_KEY = "synthia-sidebar-collapsed";

export const TASK_ENTRY_SUGGESTIONS = [
  "Research a topic and produce a cited brief",
  "Plan and build a web application",
  "Analyze a document or data set",
  "Create an execution plan for a project",
] as const;

export const TASK_HISTORY_QUERY_OPTIONS = { retry: false } as const;

export function isSidebarCollapsed(value: string | null | undefined): boolean {
  return value === "true";
}
