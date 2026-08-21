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

  it("keeps a visible dashboard Live Voice entry that opens the task-scoped consent dialog only after an explicit task start", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/TaskDashboard.tsx", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(dashboard).toContain('aria-label="Start a live voice task"');
    expect(dashboard).toContain('title="Create a task and open Live Voice"');
    expect(dashboard).toContain('startTask(true)');
    expect(dashboard).toContain('setLocation(`/tasks/${task.id}${openVoice ? "?voice=1" : ""}`)');
    expect(workspace).toContain('new URLSearchParams(window.location.search).get("voice") === "1"');
    expect(workspace).toContain('setVoiceModeOpen(true)');
    expect(css).toContain('.synthia-live-voice-toggle');
  });

  it("keeps Smart suggestions local and makes the Live Voice prerequisite notice dismissible", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/TaskDashboard.tsx", import.meta.url), "utf8");
    const guidance = readFileSync(new URL("../client/src/lib/promptGuidance.ts", import.meta.url), "utf8");

    expect(dashboard).toContain('aria-label="Smart prompt suggestions"');
    expect(dashboard).toContain('applyPromptGuidance(current, suggestion)');
    expect(dashboard).toContain('setLiveVoiceHint("Add a task goal first');
    expect(dashboard).toContain('aria-label="Dismiss Live Voice guidance"');
    expect(guidance).not.toContain("trpc");
    expect(guidance).not.toContain("fetch(");
  });

  it("shows prospective connected apps as consent-first routes rather than connected execution authority", () => {
    const plugins = readFileSync(new URL("../client/src/pages/Plugins.tsx", import.meta.url), "utf8");
    const catalog = readFileSync(new URL("../client/src/lib/governedConnectedApps.ts", import.meta.url), "utf8");

    expect(plugins).toContain('Governed connected apps');
    expect(plugins).toContain('Actions stay approval-gated');
    expect(plugins).toContain('setLocation("/settings/integrations")');
    expect(catalog).toContain('"zapier" | "pipedream" | "composio" | "github"');
    expect(catalog).toContain("Synthia must still show an action proposal before any tool call.");
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

  it("keeps the Docs resource actions balanced and reachable across responsive widths", () => {
    const docs = readFileSync(new URL("../client/src/pages/Docs.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(docs).toContain('className="synthia-docs-grid"');
    expect(docs).toContain('className="synthia-compact-card synthia-docs-card"');
    expect(docs).toContain('href="/docs/environment-reference.md"');
    expect(docs).toContain('setLocation("/settings/integrations")');
    expect(docs).toContain('setLocation("/")');
    expect(css).toContain(".synthia-docs-grid { @apply grid gap-2 md:grid-cols-2 xl:grid-cols-3; }");
    expect(css).toContain(".synthia-docs-card { @apply h-full; }");
  });

  it("provides a keyboard skip link that targets the public landing page main content", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(home).toContain('className="synthia-skip-link" href="#synthia-main-content"');
    expect(home).toContain('<main id="synthia-main-content" className="synthia-marketing">');
    expect(css).toContain(".synthia-skip-link");
    expect(css).toContain(".synthia-skip-link:focus-visible");
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
    expect(css).toContain(".synthia-settings-nav > .synthia-settings-group:first-of-type");
    expect(css).toContain("grid-column: 1 / -1;");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
  });

  it("keeps an explicit logout on the public entry state instead of restarting OAuth from an in-flight unauthorized request", () => {
    const authHook = readFileSync(new URL("../client/src/_core/hooks/useAuth.ts", import.meta.url), "utf8");
    const bootstrap = readFileSync(new URL("../client/src/main.tsx", import.meta.url), "utf8");
    const authEntry = readFileSync(new URL("../client/src/const.ts", import.meta.url), "utf8");

    expect(authHook).toContain('EXPLICIT_SIGNED_OUT_STORAGE_KEY');
    expect(authHook).toContain('sessionStorage.setItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY, "1")');
    expect(authHook).toContain('sessionStorage.removeItem("manus-cookie")');
    expect(authHook).toContain('enabled: !isExplicitlySignedOut');
    expect(authHook).toContain('user: isExplicitlySignedOut ? null : meQuery.data ?? null');
    expect(authHook).toContain('if (isExplicitlySignedOut) return;');
    expect(bootstrap).toContain('sessionStorage.getItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY) === "1"');
    expect(bootstrap).toContain('if (sessionStorage.getItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY) === "1") return;');
    expect(authEntry).toContain('clearExplicitSignedOutState();');
  });

  it("keeps user-authored Skills reviewed, separate from Connectors, and discoverable in Settings", () => {
    const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const taskRunner = readFileSync(new URL("../server/agent/taskRunner.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");

    expect(settings).toContain('data-testid="settings-skills-library"');
    expect(settings).toContain("Skills are separate from Connectors");
    expect(settings).toContain("Review every instruction before saving");
    expect(settings).toContain("New Skills are disabled until you explicitly enable them");
    expect(settings).toContain("Generate draft");
    expect(router).toContain("skills: router({");
    expect(router).toContain("createDraft:");
    expect(db).toContain('type: "skill_loaded"');
    expect(taskRunner).toContain("skillPlanningContext");
  });

  it("keeps example and completed-task Skill drafts explicit, private, and review-gated", () => {
    const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const matcher = readFileSync(new URL("../server/agent/skillMatching.ts", import.meta.url), "utf8");

    expect(settings).toContain("Create from an example");
    expect(settings).toContain("Create from a completed task");
    expect(settings).toContain("Do not include credentials, private keys, or confidential data");
    expect(settings).toContain("Draft from task");
    expect(router).toContain("createDraftFromExample:");
    expect(router).toContain("createDraftFromTask:");
    expect(router).toContain("uploadResource:");
    expect(router).toContain('visibility: "private"');
    expect(settings).toContain("Shared marketplace Skills are not enabled in this workspace yet");
    expect(matcher).toContain("matchingTerms");
    expect(workspace).toContain("Reviewed Skills available for this task");
  });

  it("keeps schedules deployment-gated, user-owned, and safe from preview job creation", () => {
    const scheduled = readFileSync(new URL("../client/src/pages/Scheduled.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const callback = readFileSync(new URL("../server/scheduledWorkflows.ts", import.meta.url), "utf8");

    expect(scheduled).toContain("Schedules are ready after publishing");
    expect(scheduled).toContain("Creation is disabled in preview.");
    expect(scheduled).toContain("Creates an owned Synthia task");
    expect(scheduled).toContain('className="synthia-schedule-form"');
    expect(scheduled).toContain("grid grid-cols-1 gap-3 md:grid-cols-2");
    expect(styles).toContain(".synthia-schedule-form { @apply my-3 flex w-full flex-col gap-3");
    expect(styles).toContain(".synthia-input { @apply block min-h-9 w-full");
    expect(router).toContain("function requireScheduleDeployment");
    expect(router).toContain("Preview never creates Heartbeat jobs.");
    expect(router).toContain("createHeartbeatJob");
    expect(router).toContain("deleteHeartbeatJob(heartbeat.taskUid, session).catch");
    expect(callback).toContain("if (!user.isCron || !user.taskUid)");
    expect(callback).toContain("claimScheduledWorkflowRun");
    expect(callback).toContain("isQueueConfigured()");
    expect(callback).toContain("roundedMinute");
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
    const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(library).toContain("export function LibraryArtifactOpenButton");
    expect(library).toContain("trpc.tasks.artifactUrl.useQuery");
    expect(library).toContain("<LibraryArtifactOpenButton taskId={item.taskId} deliverable={item} />");
    expect(library).toContain("Open task workspace →");
    expect(library).toContain("export function LibraryEmptyState");
    expect(library).toContain('aria-label="Search deliverables"');
    expect(library).toContain('className="synthia-input h-9 pl-9 text-xs"');
    expect(library).toContain('onStartTask={() => setLocation("/")}');
    expect(library).toContain("Start a task");
    expect(styles).toContain(".synthia-library-empty { @apply mt-7 flex min-h-28");
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

  it("keeps evaluation packs owner-scoped, review-driven, and unable to execute or self-modify the agent", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const controls = readFileSync(new URL("../client/src/components/TaskOfficeControls.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");

    expect(workspace).toContain('id: "evaluation", label: "Evaluate", icon: ClipboardCheck');
    expect(workspace).toContain('<TaskEvaluationPanel taskId={taskId} evaluationPacks={data.evaluationPacks} evaluationResults={data.evaluationResults} readOnly={replayMode} />');
    expect(controls).toContain('Evaluation packs are an owner-authored review contract.');
    expect(controls).toContain('This panel does not run an evaluation or alter prompts, models, Skills, tools, permissions, or execution policy.');
    expect(controls).toContain('Replay mode is read-only. Open the live task to create a pack or record a reviewer outcome.');
    expect(controls).toContain('requires separate reviewed-learning approval');
    expect(controls).toContain('trpc.tasks.createEvaluationPack.useMutation');
    expect(controls).toContain('trpc.tasks.recordEvaluationResult.useMutation');
    expect(router).toContain('createEvaluationPack: protectedProcedure');
    expect(router).toContain('recordEvaluationResult: protectedProcedure');
    expect(db).toContain('Creates only a declarative owner-authored review contract.');
    expect(db).toContain('Persists a reviewer outcome. A proposed lesson stays informational');
    expect(db).not.toContain('evaluation_auto_execute');
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
    expect(agent.match(/<AgentNavigationControls/g)).toHaveLength(1);
    expect(settings).toContain('title="Connectors"');
    expect(settings).toContain('title="Skills"');
    expect(settings).toContain("Add the apps you want Synthia to use for your tasks");
    expect(settings).not.toContain("server-side configuration but never exposes credential values");
    expect(settings).not.toContain("Task notifications use configured server-side mail providers");
  });

  it("keeps the Plugins search control within the shared teal and cyan workspace system", () => {
    const plugins = readFileSync(new URL("../client/src/pages/Plugins.tsx", import.meta.url), "utf8");

    expect(plugins).toContain('aria-label="Search connectors"');
    expect(plugins).toContain('className="synthia-input h-9 pl-9 text-xs"');
    expect(plugins).toContain('text-[#6c817c]');
    expect(plugins).not.toContain('bg-[#1d1611]');
    expect(plugins).not.toContain('text-[#f3e6d7]');
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
    expect(home).toContain("Delegate the work.");
    expect(home).toContain("Capability availability");
    expect(home).toContain("Connect to enable");
    expect(home).toContain("Research candidate");
    expect(home).toContain('aria-controls="synthia-public-navigation"');
    expect(home).toContain('id="synthia-public-navigation"');
    expect(home).toContain('event.key === "Escape"');
    expect(css).toContain(".synthia-marketing{min-height:100vh");
    expect(css).toContain(".synthia-marketing-feature-grid{display:grid;grid-template-columns:repeat(3,1fr)");
    expect(css).toContain(".synthia-marketing-availability-grid{display:grid;grid-template-columns:1fr 1fr");
    expect(css).toContain(".synthia-marketing-roadmap{width:min(1120px");
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

  it("keeps Voice Mode user-started, task-scoped, and safe for local screen sharing", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const realtime = readFileSync(new URL("../server/realtime/voiceMode.ts", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(workspace).toContain('onClick={() => setVoiceModeOpen(true)}');
    expect(workspace).toContain('aria-label="Open Voice Mode from task chat"');
    expect(workspace).toContain('role="dialog"');
    expect(workspace).toContain('aria-modal="true"');
    expect(workspace).toContain("getDisplayMedia({ video: { frameRate: { ideal: 5, max: 10 } }, audio: false })");
    expect(workspace).toContain("Track.Source.ScreenShare");
    expect(workspace).toContain("screenStream?.getTracks().forEach(mediaTrack => mediaTrack.stop())");
    expect(workspace).toContain("RoomEvent.TranscriptionReceived");
    expect(workspace).toContain("segment.final");
    expect(workspace).toContain("recordTranscript.mutate");
    expect(workspace).toContain("Do not share passwords, recovery codes, payment details");
    expect(workspace).toContain("synthia-voice-live-indicator");
    expect(workspace).toContain("synthia-voice-active-control");
    expect(workspace).toContain("synthia-screen-share-live-label");
    expect(workspace).toContain("synthia-screen-share-active-control");
    expect(router).toContain("voiceModeAvailability: protectedProcedure");
    expect(router).toContain("startVoiceMode: protectedProcedure");
    expect(router).toContain("recordVoiceTranscript: protectedProcedure");
    expect(router).toContain('await requireOwnedTask(input.taskId, ctx.user.id)');
    expect(router).toContain('enforceUserMutationLimit(ctx.user.id, "voice-mode-start", 8, 3_600)');
    expect(realtime).toContain("source.realtimeVoiceEnabled");
    expect(realtime).toContain("Voice Mode is disabled until");
    expect(css).toContain(".synthia-voice-dialog");
    expect(css).toContain(".synthia-chat-voice-entry");
    expect(css).toContain("@keyframes synthia-live-signal");
    expect(css).toContain("prefers-reduced-motion: no-preference");
  });

  it("keeps Proof-Carrying Tasks user-authored, task-owned, and explicit about provenance", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

    expect(workspace).toContain('id: "proof", label: "Proof", icon: ShieldCheck');
    expect(workspace).toContain("Proof-Carrying Tasks");
    expect(workspace).toContain("Synthia never creates, fetches, or overstates evidence here");
    expect(workspace).toContain('aria-label="Record task proof"');
    expect(workspace).toContain("What would recover confidence?");
    expect(workspace).toContain("No proof records yet");
    expect(router).toContain("recordProof: protectedProcedure");
    expect(router).toContain('enforceUserMutationLimit(ctx.user.id, "task-proof-record", 40, 3_600)');
    expect(router).toContain('await requireOwnedTask(input.taskId, ctx.user.id)');
    expect(db).toContain("createTaskProofRecordForUser");
    expect(db).toContain('type: "proof_record"');
    expect(db).toContain("It deliberately stores no provider output, audio, screen frames, artifact bytes, or model-generated evidence.");
    expect(schema).toContain("taskProofRecords");
    expect(schema).toContain('"proof_record"');
  });

  it("keeps pipeline repair proposals and specialist delegation explicit, task-owned, and non-executing", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

    expect(workspace).toContain('id: "operations", label: "Operations", icon: AlertTriangle');
    expect(workspace).toContain("Governed operations");
    expect(workspace).toContain("These controls never monitor a source, run a repair, or start an agent automatically.");
    expect(workspace).toContain('aria-label="Record pipeline health"');
    expect(workspace).toContain('aria-label="Propose governed remediation"');
    expect(workspace).toContain('aria-label="Delegate specialist work"');
    expect(workspace).toContain("Save proposal — no repair runs");
    expect(workspace).toContain("Save delegation proposal — no agent starts");
    expect(router).toContain("recordPipelineHealth: protectedProcedure");
    expect(router).toContain("proposeRemediation: protectedProcedure");
    expect(router).toContain("proposeDelegation: protectedProcedure");
    expect(router).toContain('await requireOwnedTask(input.taskId, ctx.user.id)');
    expect(router).toContain('enforceUserMutationLimit(ctx.user.id, "pipeline-health-record", 60, 3_600)');
    expect(db).toContain("createTaskPipelineHealthSignalForUser");
    expect(db).toContain("createTaskRemediationProposalForUser");
    expect(db).toContain("createTaskDelegationForUser");
    expect(schema).toContain("taskPipelineHealthSignals");
    expect(schema).toContain("taskRemediationProposals");
    expect(schema).toContain("taskDelegations");
  });

  it("keeps Office exports task-owned and future-task lessons explicitly user-reviewed", () => {
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const controls = readFileSync(new URL("../client/src/components/TaskOfficeControls.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");
    const runner = readFileSync(new URL("../server/agent/taskRunner.ts", import.meta.url), "utf8");

    expect(workspace).toContain('id: "learning", label: "Review", icon: BookOpenText');
    expect(workspace).toContain("<TaskOfficeExportMenu taskId={taskId} />");
    expect(controls).toContain("Export audited PDF brief");
    expect(controls).toContain("Export editable presentation");
    expect(controls).toContain("Export task timeline spreadsheet");
    expect(controls).toContain("No model run is started.");
    expect(controls).toContain("Review before Synthia learns");
    expect(controls).toContain("Approve for future tasks");
    expect(controls).toContain("Synthia does not infer or activate cross-task learning automatically.");
    expect(router).toContain("exportOffice: protectedProcedure");
    expect(router).toContain("proposeTaskLesson: protectedProcedure");
    expect(router).toContain("reviewTaskLesson: protectedProcedure");
    expect(router).toContain("await requireOwnedTask(input.taskId, ctx.user.id)");
    expect(router).toContain('enforceUserMutationLimit(ctx.user.id, "task-office-export", 20, 3_600)');
    expect(db).toContain("listPendingTaskLessonsForUser");
    expect(db).toContain("reviewPendingTaskLessonForUser");
    expect(runner).not.toContain("createMemoryFact(");
  });

  it("keeps the compact dashboard and workspace hierarchy in cool Synthia neutrals", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/TaskDashboard.tsx", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../client/src/pages/TaskWorkspace.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(dashboard).toContain('text-[#e5f2ef]">Synthia AI');
    expect(workspace).toContain('text-[#91a7a1]"><Loader2');
    expect(css).toContain(".synthia-chat-stage h1");
    expect(css).toContain("text-[#e5f2ef]");
    expect(css).not.toContain(".synthia-chat-stage h1 { font-family: Georgia, \"Times New Roman\", serif; @apply text-center text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-.035em] text-[#f6ecdf]");
  });
});
