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
import { isScreenCapture, isWebsiteArtifact } from "../client/src/pages/TaskWorkspace";

describe("compact workspace layout contract", () => {
  it("restores only an explicit collapsed navigation preference", () => {
    expect(SIDEBAR_COLLAPSE_STORAGE_KEY).toBe("synthia-sidebar-collapsed");
    expect(isSidebarCollapsed("true")).toBe(true);
    expect(isSidebarCollapsed("false")).toBe(false);
    expect(isSidebarCollapsed(null)).toBe(false);
  });

  it("keeps concise, user-visible capability starters with real task goals for the chat-first composer", () => {
    expect(TASK_ENTRY_SUGGESTIONS).toHaveLength(4);
    expect(new Set(TASK_ENTRY_SUGGESTIONS.map(item => item.label)).size).toBe(TASK_ENTRY_SUGGESTIONS.length);
    expect(TASK_ENTRY_SUGGESTIONS.map(item => item.label)).toEqual(["Create slides", "Build website", "Design", "Create games"]);
    expect(TASK_ENTRY_SUGGESTIONS.every(item => item.goal.length > 20)).toBe(true);
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
    expect(settings).toContain('label: "Data & delivery"');
    expect(settings).toContain('grid items-start gap-4 xl:grid-cols-[184px_minmax(0,960px)]');
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

  it("recognizes only task-owned HTML deliverables for the Live Computer website preview", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");

    expect(isWebsiteArtifact({ fileType: "text/html", filename: "index.html" })).toBe(true);
    expect(isWebsiteArtifact({ fileType: "application/octet-stream", filename: "prototype.htm" })).toBe(true);
    expect(isWebsiteArtifact({ fileType: "text/markdown", filename: "notes.md" })).toBe(false);
    expect(workspace).toContain('label: "Website", icon: Globe2');
    expect(workspace).toContain("<WebsitePanel taskId={taskId} deliverables={data.deliverables} />");
    expect(workspace).toContain('sandbox="allow-forms allow-modals allow-popups allow-scripts"');
    expect(workspace).toContain("Open website");
    expect(workspace).toContain("No task website is available yet.");
  });

  it("refreshes workspace artifact links through the owned task-artifact contract instead of persisting direct URLs", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");

    expect(workspace).toContain("trpc.tasks.artifactUrl.useQuery");
    expect(workspace).toContain("<ArtifactOpenButton taskId={taskId} deliverable={item} />");
    expect(workspace).not.toContain("href={item.url}");
    expect(workspace).toContain("item.fileType");
  });

  it("keeps Live Computer task-scoped, read-only, and explicit about unavailable screens", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");

    expect(workspace).toContain("trpc.tasks.liveComputer.useQuery");
    expect(workspace).toContain("trpc.tasks.liveComputerFiles.useQuery");
    expect(workspace).toContain("trpc.tasks.liveComputerSource.useQuery");
    expect(workspace).toContain("View live screen");
    expect(workspace).toContain("Task-scoped source inspection");
    expect(router).toContain("liveComputerFiles: protectedProcedure");
    expect(router).toContain("liveComputerSource: protectedProcedure");
    expect(router).toContain("liveComputerScreen: protectedProcedure");
    expect(router).toContain("await requireOwnedTask(input.taskId, ctx.user.id)");
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

  it("keeps the attachment option surface directly adjacent to the composer plus trigger", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain(".synthia-attachment-menu { @apply absolute bottom-full left-0");
    expect(css).not.toContain(".synthia-attachment-menu { @apply absolute bottom-[calc(100%+.4rem)]");
  });

  it("keeps the model selector bounded and scrollable while showing user-facing model capabilities only", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/TaskDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain(".synthia-model-menu { @apply absolute bottom-[calc(100%+.4rem)] right-0 z-20 grid w-57 max-h-[min(16rem,calc(100dvh-8rem))] overflow-y-auto overscroll-contain");
    expect(dashboard).toContain('data-scrollable="true"');
    expect(dashboard).toContain("<b>{model.model}</b><small>{composerModelCapabilityLabel(model)}</small>");
    expect(dashboard).not.toContain("{model.provider} · {model.model}");
  });

  it("keeps the center workspace calm with a dynamic welcome and progressively disclosed secondary controls", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/TaskDashboard.tsx", import.meta.url), "utf8");
    const workspaceLayout = readFileSync(new URL("../client/src/lib/workspaceLayout.ts", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(workspaceLayout).toContain("WORKSPACE_WELCOMES");
    expect(workspaceLayout).toContain("Hi ${firstName}");
    expect(dashboard).toContain("workspaceWelcome(user?.name)");
    expect(dashboard).toContain("synthia-workspace-kicker");
    expect(dashboard).toContain("synthia-task-controls-menu");
    expect(dashboard).toContain('data-testid="automatic-route-preview"');
    expect(dashboard).toContain("Task controls");
    expect(dashboard).not.toContain("Agent workspace");
    expect(css).toContain(".synthia-task-controls-menu { @apply absolute bottom-[calc(100%+.4rem)] left-0");
    expect(css).toContain(".synthia-workspace-kicker");
    expect(css).toContain(".synthia-capability-menu { @apply absolute bottom-[calc(100%+.45rem)] right-0 z-30 grid w-[min(32rem,calc(100vw-2.5rem))] max-h-[min(19rem,calc(100dvh-9rem))] grid-cols-2");
    expect(css).toContain(".synthia-capability-menu::-webkit-scrollbar-thumb");
    expect(css).toContain(".synthia-mobile-nav { @apply sticky top-0 z-40 flex h-13 gap-1 overflow-x-auto");
  });

  it("uses a calm teal and cyan signal palette instead of orange-heavy primary interface states", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain("--primary: oklch(.69 .12 184);");
    expect(css).toContain(".synthia-logo-mark { @apply inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-400");
    expect(css).toContain(".synthia-send-button { @apply h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-teal-300 to-cyan-400");
    expect(css).toContain(".synthia-settings-nav button.active { @apply bg-teal-400/10 text-cyan-200; }");
    expect(css).not.toContain("from-orange-200 to-orange-500");
  });

  it("limits amber to deliberate approval and visual-input decision points while neutralizing legacy orange utilities", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain("Palette bridge: legacy task-workspace utilities inherit Synthia's calm signal colors");
    expect(css).toContain('[class~="text-orange-300"] { color: #67e8f9 !important; }');
    expect(css).toContain('[class~="bg-orange-400"] { background-color: #14b8a6 !important; }');
    expect(css).toContain(".synthia-workspace article:has(.text-amber-100)");
    expect(css).toContain('p[role="alert"].text-amber-200');
  });

  it("uses teal and cyan for standard Agent’s Computer controls while retaining amber approval affordances", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");

    expect(workspace).toContain('className="bg-teal-400 text-[#072a27] hover:bg-cyan-300"');
    expect(workspace).toContain('className="text-cyan-300"');
    expect(workspace).toContain('border border-teal-300/15 bg-teal-300/[.04]');
    expect(workspace).toContain('bg-teal-400/15 text-cyan-200');
    expect(workspace).toContain('border border-amber-300/25 bg-amber-300/[.07]');
    expect(workspace).not.toContain('text-orange-');
    expect(workspace).not.toContain('bg-orange-');
    expect(workspace).not.toContain('border-orange-');
  });

  it("describes task-screen availability without overstating local Docker capability", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const liveComputer = readFileSync(new URL("../server/agent/liveComputer.ts", import.meta.url), "utf8");

    expect(workspace).toContain("Task screen is available when the active sandbox supports capture.");
    expect(workspace).toContain("View live screen");
    expect(liveComputer).toContain("Docker does not provide a graphical task screen.");
  });

  it("presents Agent capabilities as user-facing task abilities rather than backend provider configuration", () => {
    const agent = readFileSync(new URL("../client/src/pages/Agent.tsx", import.meta.url), "utf8");
    const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");

    expect(agent).toContain("What Synthia can use for a task");
    expect(agent).toContain("Agent’s Computer");
    expect(agent).toContain("Computer setup is needed");
    expect(agent).not.toContain("Bunnyshell");
    expect(agent).not.toContain("E2B");
    expect(agent).not.toContain("configured provider");
    expect(settings).toContain('title="Connectors"');
    expect(settings).toContain('title="Skills"');
    expect(settings).toContain("Add the apps you want Synthia to use for your tasks");
    expect(settings).not.toContain("server-side configuration but never exposes credential values");
    expect(settings).not.toContain("Task notifications use configured server-side mail providers");
  });

  it("keeps ordinary shared-shell task states in the teal signal family", () => {
    const shell = readFileSync(new URL("../client/src/components/SynthiaAppShell.tsx", import.meta.url), "utf8");

    expect(shell).toContain('queued: "bg-teal-500"');
    expect(shell).toContain('booting: "bg-teal-500"');
    expect(shell).not.toContain('bg-amber-500');
  });

  it("uses cyan rather than legacy orange for usage-ledger values", () => {
    const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");

    expect(settings).toContain('text-cyan-200');
    expect(settings).not.toContain('text-orange-200');
  });

  it("keeps the public landing page behind the unauthenticated root route and preserves the authenticated task dashboard", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(app).toContain("function PublicHomeRoute()");
    expect(app).toContain("return user ? <SynthiaRoute><TaskDashboard /></SynthiaRoute> : <Home />");
    expect(home).toContain("Autonomous work, made inspectable");
    expect(home).toContain("Agent’s Computer");
    expect(home).toContain("Automatic routing");
    expect(css).toContain(".synthia-marketing{min-height:100vh");
    expect(css).toContain(".synthia-marketing-feature-grid{display:grid;grid-template-columns:repeat(3,1fr)");
    expect(css).toContain("@media(max-width:880px)");
    expect(css).toContain(".synthia-marketing *{animation:none!important");
  });

  it("retains official OAuth actions while presenting a branded, responsive sign-in workspace frame", () => {
    const shell = readFileSync(new URL("../client/src/components/SynthiaAppShell.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(shell).toContain('onSignIn={() => startLogin("signIn")}');
    expect(shell).toContain("onSignUp={startSignup}");
    expect(shell).toContain("onGoogle={startGoogleLogin}");
    expect(shell).toContain("synthia-auth-frame");
    expect(shell).toContain("Work that stays reviewable");
    expect(css).toContain(".synthia-auth-frame{position:relative");
    expect(css).toContain(".synthia-auth-aside{position:relative");
    expect(css).toContain("@media(max-width:720px)");
  });

  it("retains smooth, bounded Live Computer tab transitions and focus controls", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(workspace).toContain("const selectTab = (nextTab: WorkspaceTab)");
    expect(workspace).toContain("synthia-computer-panel-pending");
    expect(workspace).toContain("synthia-computer-skeleton");
    expect(workspace).toContain("focusMode");
    expect(css).toContain(".synthia-computer-skeleton");
    expect(css).toContain("@keyframes synthia-skeleton-shimmer");
  });
});
