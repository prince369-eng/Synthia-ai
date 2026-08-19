import { useAuth } from "@/_core/hooks/useAuth";
import { startGoogleLogin, startLogin, startSignup } from "@/const";
import { isSidebarCollapsed, PROFILE_MENU_DESTINATIONS, SIDEBAR_COLLAPSE_STORAGE_KEY } from "@/lib/workspaceLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BookOpenText, ChevronRight, Command, CreditCard, Loader2, LogOut, PanelLeftClose, PanelLeftOpen, Plus, Settings2, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import React, { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

const navItems = [
  { label: "Tasks", path: "/", icon: Command },
  { label: "Library", path: "/library", icon: BookOpenText },
  { label: "Settings", path: "/settings", icon: Settings2 },
];

const stateDot: Record<string, string> = {
  queued: "bg-amber-500",
  booting: "bg-amber-500",
  planning: "bg-orange-500",
  running: "bg-orange-500 animate-pulse",
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

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  if (loading) {
    return (
      <main className="synthia-auth-shell" aria-busy="true" aria-live="polite">
        <section className="synthia-auth-card text-center">
          <div className="synthia-logo-mark mx-auto"><Sparkles size={20} /></div>
          <h1>Opening your workspace</h1>
          <p className="flex items-center justify-center gap-2"><Loader2 className="animate-spin text-orange-300" size={15} />Checking your authenticated session…</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="synthia-auth-shell">
        <section className="synthia-auth-card">
          <div className="synthia-logo-mark"><Sparkles size={20} /></div>
          <p className="synthia-eyebrow">Synthia AI</p>
          <h1>Autonomous work, under your control.</h1>
          <p>Sign in to create tasks, review agent decisions, and inspect every workspace artifact.</p>
          <AuthEntryActions onSignIn={() => startLogin("signIn")} onSignUp={startSignup} onGoogle={startGoogleLogin} />
        </section>
      </main>
    );
  }

  return (
    <div className={cn("synthia-shell", sidebarCollapsed && "synthia-shell-collapsed")}>
      <aside className={cn("synthia-nav", sidebarCollapsed && "collapsed")} aria-label="Primary navigation">
        <div className="synthia-nav-topline">
          <button className="synthia-brand" onClick={() => setLocation("/")} aria-label="Go to Synthia tasks">
          <span className="synthia-logo-mark"><Sparkles size={17} /></span>
            <span className="synthia-brand-copy">Synthia <b>AI</b></span>
          </button>
          <button className="synthia-collapse-button" type="button" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <Button className="synthia-new-task" onClick={() => setLocation("/")} title="New task"><Plus size={16} /><span>New task</span></Button>
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

export function ProfileMenu({ name, email, onNavigate, onLogout }: { name: string; email: string; onNavigate: (path: string) => void; onLogout: () => void }) {
  const initial = (name[0] ?? email[0] ?? "S").toUpperCase();
  const menuIcons = [UserRound, SlidersHorizontal, CreditCard];

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="synthia-account-trigger" type="button" aria-label="Open account menu" title="Account menu">
        <span className="synthia-avatar">{initial}</span>
        <span className="synthia-account-copy"><b>{name}</b><small>{email}</small></span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" side="right" sideOffset={10} className="synthia-account-menu">
      <DropdownMenuLabel className="synthia-account-menu-label"><b>{name}</b><span>{email}</span></DropdownMenuLabel>
      <DropdownMenuSeparator />
      {PROFILE_MENU_DESTINATIONS.map((item, index) => {
        const Icon = menuIcons[index];
        return <DropdownMenuItem key={item.path} onSelect={() => onNavigate(item.path)} className="synthia-account-menu-item"><Icon size={14} />{item.label}</DropdownMenuItem>;
      })}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onLogout} className="synthia-account-menu-item synthia-account-menu-signout"><LogOut size={14} />Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
