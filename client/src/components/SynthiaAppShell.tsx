import { useAuth } from "@/_core/hooks/useAuth";
/**
 * Authenticated workspace shell. Owns navigation, profile affordances, density,
 * and escape routes; it must not imply an unavailable capability is active.
 */
import { startGoogleLogin, startLogin, startSignup } from "@/const";
import { isSidebarCollapsed, PROFILE_MENU_DESTINATIONS, SIDEBAR_COLLAPSE_STORAGE_KEY } from "@/lib/workspaceLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BookOpenText, Bot, Cable, CalendarClock, ChevronRight, Command, CreditCard, FolderKanban, Home, Loader2, LogOut, Network, Orbit, PanelLeftClose, PanelLeftOpen, Plus, Settings2, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import React, { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

const navItems = [
  { label: "Tasks", path: "/", icon: Command },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Scheduled", path: "/scheduled", icon: CalendarClock },
  { label: "Agent", path: "/agent", icon: Bot },
  { label: "Plugins", path: "/plugins", icon: Cable },
  { label: "Network Labs", path: "/network-labs", icon: Network },
  { label: "Library", path: "/library", icon: BookOpenText },
  { label: "Settings", path: "/settings", icon: Settings2 },
];

const stateDot: Record<string, string> = {
  queued: "bg-teal-500",
  booting: "bg-teal-500",
  planning: "bg-teal-500",
  running: "bg-teal-500 animate-pulse",
  needs_input: "bg-rose-500",
  paused: "bg-zinc-400",
  completed: "bg-emerald-500",
  failed: "bg-rose-500",
  cancelled: "bg-zinc-400",
};

export function SynthiaAppShell({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" && isSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY)),
  );
  const tasksQuery = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 8_000 });
  const usageQuery = trpc.workspace.usage.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const preferencesQuery = trpc.settings.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const preferences = preferencesQuery.data?.preferences && typeof preferencesQuery.data.preferences === "object" && !Array.isArray(preferencesQuery.data.preferences)
    ? preferencesQuery.data.preferences as Record<string, unknown>
    : {};
  const keyboardShortcutsEnabled = preferences.keyboardShortcutsEnabled !== false;
  const workspaceDensity = preferences.workspaceDensity === "compact" ? "compact" : "comfortable";

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.documentElement.dataset.synthiaDensity = workspaceDensity;
    return () => {
      delete document.documentElement.dataset.synthiaDensity;
    };
  }, [workspaceDensity]);

  useEffect(() => {
    if (!keyboardShortcutsEnabled) return;
    const openComposer = () => {
      setLocation("/");
      window.setTimeout(() => window.dispatchEvent(new Event("synthia:focus-task-composer")), 0);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (event.ctrlKey && event.shiftKey && key === "o") {
        event.preventDefault();
        openComposer();
      }
      if (event.ctrlKey && event.shiftKey && key === "b") {
        event.preventDefault();
        setSidebarCollapsed(value => !value);
      }
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openComposer();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardShortcutsEnabled, setLocation]);

  if (loading) {
    return (
      <main className="synthia-auth-shell" aria-busy="true" aria-live="polite">
        <div className="synthia-auth-frame synthia-auth-loading-frame"><section className="synthia-auth-card text-center"><div className="synthia-logo-mark mx-auto"><Sparkles size={20} /></div><p className="synthia-eyebrow">Synthia AI</p><h1>Opening your workspace</h1><p className="flex items-center justify-center gap-2"><Loader2 className="animate-spin text-cyan-300" size={15} />Checking your authenticated session…</p></section></div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="synthia-auth-shell">
        <div className="synthia-auth-frame">
          <section className="synthia-auth-card">
            <div className="synthia-auth-brand"><span className="synthia-logo-mark"><Sparkles size={20} /></span><span>Synthia <b>AI</b></span></div>
            <p className="synthia-eyebrow">Your task workspace</p>
            <h1>Autonomous work, under your control.</h1>
            <p>Sign in to create tasks, review agent decisions, and inspect every workspace artifact.</p>
            <AuthEntryActions onSignIn={() => startLogin("signIn")} onSignUp={startSignup} onGoogle={startGoogleLogin} />
          </section>
          <aside className="synthia-auth-aside" aria-label="Synthia task workspace overview">
            <p className="synthia-auth-aside-kicker"><Bot size={14} /> Work that stays reviewable</p>
            <h2>Give Synthia a goal. Keep every important choice in view.</h2>
            <div className="synthia-auth-trace"><div><span className="is-done">✓</span><p><b>Analyze the task</b><small>Context and constraints are gathered first.</small></p></div><div><span className="is-live" /><p><b>Carry out bounded work</b><small>Progress remains visible in the workspace.</small></p></div><div><span /><p><b>Review the result</b><small>Files, events, and approvals stay with the task.</small></p></div></div>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <div className={cn("synthia-shell", sidebarCollapsed && "synthia-shell-collapsed")}>
      <aside className={cn("synthia-nav", sidebarCollapsed && "collapsed")} aria-label="Primary navigation">
        <div className="synthia-nav-topline">
          <button className="synthia-brand" onClick={() => setLocation("/")} aria-label="Go to Synthia tasks">
          <span className="synthia-logo-mark"><Orbit size={17} strokeWidth={2.2} /></span>
            <span className="synthia-brand-copy">Synthia <b>AI</b></span>
          </button>
          <button className="synthia-collapse-button" type="button" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <Button className="synthia-new-task" onClick={() => { setLocation("/"); window.setTimeout(() => window.dispatchEvent(new Event("synthia:focus-task-composer")), 0); }} title="New task (Ctrl+Shift+O)"><Plus size={16} /><span>New task</span></Button>
        <nav className="synthia-nav-links">
          {navItems.map(item => {
            const active = item.path === "/" ? location === "/" || location.startsWith("/tasks/") : location.startsWith(item.path);
            const Icon = item.icon;
            return <button key={item.path} onClick={() => setLocation(item.path)} title={item.label} className={cn("synthia-nav-item", active && "active")}><Icon size={17} /><span>{item.label}</span></button>;
          })}
        </nav>
        <section className="synthia-task-rail" aria-label="Recent tasks">
          <p>Recent tasks</p>
          {tasksQuery.isLoading ? <span className="synthia-mini-status">Loading tasks…</span> : null}
          {tasksQuery.isError ? <span className="synthia-mini-status error">Tasks could not be loaded.</span> : null}
          {!tasksQuery.isLoading && !tasksQuery.isError && tasksQuery.data?.length === 0 ? <span className="synthia-mini-status">No tasks yet.</span> : null}
          {tasksQuery.data?.slice(0, 8).map(task => (
            <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className={cn("synthia-task-rail-item", location.includes(task.id) && "active")}>
              <span className={cn("synthia-state-dot", stateDot[task.status] ?? "bg-zinc-400")} />
              <span>{task.title}</span>
            </button>
          ))}
        </section>
        <ProfileMenu
          name={user.name ?? "Synthia user"}
          email={user.email ?? "Authenticated workspace"}
          creditsBalance={usageQuery.data?.creditsBalance}
          onNavigate={setLocation}
          onLogout={() => void logout()}
        />
      </aside>
      <nav className="synthia-mobile-nav lg:hidden" aria-label="Mobile navigation">
        {navItems.map(item => {
          const active = item.path === "/" ? location === "/" || location.startsWith("/tasks/") : location.startsWith(item.path);
          const Icon = item.icon;
          return <button key={item.path} onClick={() => setLocation(item.path)} className={cn(active && "active")}><Icon size={17} /><span>{item.label}</span></button>;
        })}
      </nav>
      <main className="synthia-main">{children}</main>
    </div>
  );
}

export function AuthEntryActions({ onSignIn, onSignUp, onGoogle }: { onSignIn: () => void; onSignUp: () => void; onGoogle: () => void }) {
  return <div className="synthia-auth-actions"><Button onClick={onSignIn} className="synthia-primary-button w-full">Sign in to Synthia AI <ChevronRight size={16} /></Button><Button variant="outline" onClick={onGoogle} className="synthia-google-button w-full"><span className="synthia-google-glyph" aria-hidden="true">G</span>Continue with Google</Button><p className="synthia-auth-create">New to Synthia? <button type="button" onClick={onSignUp}>Create an account</button></p><small>The verified Manus account portal supports sign-in, account creation, and Google identity selection. Synthia never receives provider tokens.</small></div>;
}

export function ProfileMenu({ name, email, creditsBalance, onNavigate, onLogout }: { name: string; email: string; creditsBalance?: number; onNavigate: (path: string) => void; onLogout: () => void }) {
  const initial = (name[0] ?? email[0] ?? "S").toUpperCase();
  const [open, setOpen] = useState(false);
  const pointerWithinMenu = useRef(false);
  const menuIcons = { credits: CreditCard, account: UserRound, personalization: SlidersHorizontal, settings: Settings2, home: Home, docs: BookOpenText };
  const accountItems = PROFILE_MENU_DESTINATIONS.filter(item => item.group === "account");
  const navigationItems = PROFILE_MENU_DESTINATIONS.filter(item => item.group === "navigate");

  return <DropdownMenu open={open} onOpenChange={nextOpen => setOpen(nextOpen || pointerWithinMenu.current)}>
    <DropdownMenuTrigger asChild>
      <button className="synthia-account-trigger" type="button" aria-label="Open account menu" title="Account menu" onPointerEnter={() => { pointerWithinMenu.current = true; setOpen(true); }} onPointerLeave={() => { pointerWithinMenu.current = false; }}>
        <span className="synthia-avatar">{initial}</span>
        <span className="synthia-account-copy"><b>{name}</b><small>{email}</small></span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" side="right" sideOffset={10} className="synthia-account-menu" onPointerEnter={() => { pointerWithinMenu.current = true; setOpen(true); }} onPointerLeave={() => { pointerWithinMenu.current = false; setOpen(false); }}>
      <DropdownMenuLabel className="synthia-account-menu-label"><b>{name}</b><span>{email}</span><small>{creditsBalance === undefined ? "Credits unavailable" : `${creditsBalance} available credits`}</small></DropdownMenuLabel>
      <DropdownMenuSeparator />
      {accountItems.map(item => {
        const Icon = menuIcons[item.icon];
        return <DropdownMenuItem key={item.path} onSelect={() => { setOpen(false); onNavigate(item.path); }} className="synthia-account-menu-item"><Icon size={14} />{item.label}</DropdownMenuItem>;
      })}
      <DropdownMenuSeparator />
      {navigationItems.map(item => {
        const Icon = menuIcons[item.icon];
        return <DropdownMenuItem key={item.path} onSelect={() => { setOpen(false); onNavigate(item.path); }} className="synthia-account-menu-item"><Icon size={14} />{item.label}</DropdownMenuItem>;
      })}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => { setOpen(false); onLogout(); }} className="synthia-account-menu-item synthia-account-menu-signout"><LogOut size={14} />Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
