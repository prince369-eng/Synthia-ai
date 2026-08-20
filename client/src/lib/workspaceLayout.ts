export const SIDEBAR_COLLAPSE_STORAGE_KEY = "synthia-sidebar-collapsed";

export const TASK_ENTRY_SUGGESTIONS = [
  { label: "Create slides", goal: "Create a concise, well-structured presentation for this objective:" },
  { label: "Build website", goal: "Plan and build a production-ready website for this objective:" },
  { label: "Design", goal: "Create a polished visual design deliverable for this objective:" },
  { label: "Create games", goal: "Design and build a playable browser game for this objective:" },
] as const;

const WORKSPACE_WELCOMES = [
  { lead: "What would you like to do?", detail: "Describe the outcome. Synthia will plan the work and keep you in control." },
  { lead: "What can we move forward today?", detail: "Start with an outcome, and Synthia will select the appropriate available route." },
  { lead: "Ready to make progress?", detail: "Give Synthia the goal. It will plan the work and ask before sensitive actions." },
  { lead: "Where should Synthia begin?", detail: "Write the result you want. Synthia will coordinate the right tools after you start." },
] as const;

export function workspaceWelcome(displayName: string | null | undefined, now = new Date()) {
  const firstName = displayName?.trim().split(/\s+/, 1)[0] || "there";
  const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
  const index = Array.from(`${firstName}-${dayKey}`).reduce((total, character) => total + character.charCodeAt(0), 0) % WORKSPACE_WELCOMES.length;
  const welcome = WORKSPACE_WELCOMES[index];
  return { greeting: `Hi ${firstName}`, ...welcome };
}

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
