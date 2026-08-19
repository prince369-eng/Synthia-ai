import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { settingsPath } from "@/lib/workspaceLayout";
import { startLogin } from "@/const";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  Gauge,
  Keyboard,
  KeyRound,
  Loader2,
  Palette,
  PlugZap,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

type Preferences = Record<string, unknown>;
type TaskDefaults = {
  mode: "ask_before_risky" | "supervised";
  allowWebSearch: boolean;
  allowCodeExecution: boolean;
  allowFileWrites: boolean;
};

const sectionAliases: Record<string, string> = { profile: "account", billing: "usage" };

const sectionGroups = [
  { label: "Workspace", sections: [
    { id: "general", label: "General", icon: Settings2 },
    { id: "account", label: "Account", icon: UserRound },
    { id: "usage", label: "Usage & credits", icon: CreditCard },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  ] },
  { label: "Agent capabilities", sections: [
    { id: "services", label: "Service connections", icon: ServerCog },
    { id: "model-keys", label: "Model providers", icon: KeyRound },
    { id: "integrations", label: "Integrations", icon: PlugZap },
    { id: "memory", label: "Personalization", icon: Database },
  ] },
  { label: "Data & safeguards", sections: [{ id: "security", label: "Security", icon: ShieldCheck }] },
];

function asRecord(value: unknown): Preferences {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Preferences : {};
}

function readTaskDefaults(preferences: Preferences): TaskDefaults {
  const value = asRecord(preferences.taskDefaults);
  return {
    mode: value.mode === "supervised" ? "supervised" : "ask_before_risky",
    allowWebSearch: value.allowWebSearch !== false,
    allowCodeExecution: value.allowCodeExecution !== false,
    allowFileWrites: value.allowFileWrites !== false,
  };
}

export default function Settings() {
  const [location, setLocation] = useLocation();
  const rawSection = location.split("/")[2] ?? "general";
  const section = sectionAliases[rawSection] ?? rawSection;
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const settings = trpc.settings.get.useQuery(undefined, { retry: false });
  const needsReadiness = ["services", "integrations", "model-keys"].includes(section);
  const readiness = trpc.workspace.serviceReadiness.useQuery(undefined, { enabled: needsReadiness, retry: false });
  const integrations = trpc.workspace.integrations.useQuery(undefined, { enabled: section === "integrations", retry: false });
  const memory = trpc.workspace.memory.useQuery(undefined, { enabled: section === "memory", retry: false });
  const usage = trpc.workspace.usage.useQuery(undefined, { enabled: section === "usage", retry: false });
  const utils = trpc.useUtils();
  const updatePreferences = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => void utils.settings.get.invalidate(),
  });
  const removeIntegration = trpc.integrations.remove.useMutation({
    onSuccess: () => void integrations.refetch(),
  });
  const preferences = asRecord(settings.data?.preferences);
  const savePreferences = (patch: Preferences) => updatePreferences.mutate({ preferences: { ...preferences, ...patch } });

  return (
    <main className="synthia-utility-page">
      <header className="synthia-utility-header synthia-settings-header">
        <div>
          <p>Settings</p>
          <h1>Control your Synthia workspace</h1>
          <span>Compact settings for task defaults, identity, usage, connected capabilities, and security boundaries.</span>
        </div>
        <SettingsCloseButton onClose={() => setLocation("/")} />
      </header>
      <div className="mt-5 grid gap-4 xl:grid-cols-[184px_minmax(0,960px)] xl:justify-start">
        <SettingsSectionNav section={section} onNavigate={setLocation} />
        <section className="synthia-settings-panel" aria-live="polite">
          {settings.isLoading ? <div className="flex items-center gap-2 text-xs text-[#a9998a]"><Loader2 className="animate-spin" size={14} />Loading workspace settings…</div> : null}
          {settings.isError ? <SettingsUnavailable message="Workspace preferences will be available when the external Synthia data store is configured." /> : null}
          {updatePreferences.isError ? <p role="alert" className="mb-4 text-xs text-rose-300">{updatePreferences.error.message}</p> : null}
          {section === "general" ? <SettingsGeneral preferences={preferences} theme={theme} onToggleTheme={toggleTheme} onSave={savePreferences} saving={updatePreferences.isPending} persistenceAvailable={!settings.isError} /> : null}
          {section === "account" ? <SettingsAccount user={user} hasCompletedOnboarding={Boolean(settings.data?.hasCompletedOnboarding)} onManageAccount={() => startLogin()} /> : null}
          {section === "usage" ? <SettingsUsage usage={usage.data} loading={usage.isLoading} error={usage.isError} /> : null}
          {section === "shortcuts" ? <SettingsShortcuts enabled={preferences.keyboardShortcutsEnabled !== false} onChange={enabled => savePreferences({ keyboardShortcutsEnabled: enabled })} saving={updatePreferences.isPending || settings.isError} /> : null}
          {section === "services" ? <SettingsServices readiness={readiness.data ?? []} loading={readiness.isLoading} error={readiness.isError} /> : null}
          {section === "integrations" ? <SettingsIntegrations readiness={readiness.data ?? []} integrations={integrations.data ?? []} loading={readiness.isLoading || integrations.isLoading} error={readiness.isError || integrations.isError} removeIntegration={removeIntegration} /> : null}
          {section === "model-keys" ? <SettingsModels readiness={readiness.data ?? []} loading={readiness.isLoading} error={readiness.isError} /> : null}
          {section === "memory" ? <SettingsMemory memory={memory.data ?? []} loading={memory.isLoading} error={memory.isError} /> : null}
          {section === "security" ? <SettingsSecurity /> : null}
        </section>
      </div>
    </main>
  );
}

export function SettingsSectionNav({ section, onNavigate }: { section: string; onNavigate: (path: string) => void }) {
  return <nav className="synthia-settings-nav" aria-label="Settings sections">{sectionGroups.map(group => <div key={group.label} className="synthia-settings-group"><p>{group.label}</p>{group.sections.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => onNavigate(settingsPath(item.id))} className={cn(section === item.id && "active")}><Icon size={14} />{item.label}</button>; })}</div>)}</nav>;
}

export function SettingsCloseButton({ onClose }: { onClose: () => void }) {
  return <button type="button" className="synthia-settings-close" onClick={onClose} aria-label="Close settings and return to tasks" title="Close settings"><X size={17} aria-hidden="true" /></button>;
}

export function SettingsGeneral({ preferences, theme, onToggleTheme, onSave, saving, persistenceAvailable }: { preferences: Preferences; theme: "light" | "dark"; onToggleTheme?: () => void; onSave: (patch: Preferences) => void; saving: boolean; persistenceAvailable: boolean }) {
  const defaults = readTaskDefaults(preferences);
  const saveDefaults = (patch: Partial<TaskDefaults>) => onSave({ taskDefaults: { ...defaults, ...patch } });
  return <div><SectionHeading icon={Settings2} title="General" description="Choose the default conditions Synthia applies when you begin a new autonomous task." /><div className="mt-6 grid gap-3 lg:grid-cols-2"><SettingsCard title="Appearance" detail="Your chosen display mode is stored locally on this device."><PreferenceSwitch label="Dark appearance" description={theme === "dark" ? "Radiant orange dark workspace is active." : "Light workspace is active."} enabled={theme === "dark"} onChange={() => { onToggleTheme?.(); if (persistenceAvailable) onSave({ appearanceTheme: theme === "dark" ? "light" : "dark" }); }} disabled={saving || !onToggleTheme} /></SettingsCard><SettingsCard title="Default review mode" detail="Applied to each new task, before its first action."><div className="grid grid-cols-2 gap-2"><Button size="sm" className={cn("mt-0 w-full", defaults.mode === "ask_before_risky" ? "synthia-primary-button" : "bg-white/5 text-[#d9c9ba]")} onClick={() => saveDefaults({ mode: "ask_before_risky" })} disabled={saving || !persistenceAvailable}>Ask before risky</Button><Button size="sm" className={cn("mt-0 w-full", defaults.mode === "supervised" ? "synthia-primary-button" : "bg-white/5 text-[#d9c9ba]")} onClick={() => saveDefaults({ mode: "supervised" })} disabled={saving || !persistenceAvailable}>Supervised</Button></div></SettingsCard></div><div className="mt-4"><SettingsCard title="Default task capabilities" detail="These defaults are sent with new task requests. Each task remains subject to server-side approval and provider availability."><div className="grid min-w-0 gap-3 md:grid-cols-3">{[
    { label: "Web research", description: "Allow configured search tools.", enabled: defaults.allowWebSearch, key: "allowWebSearch" as const },
    { label: "Code execution", description: "Permit sandboxed code work.", enabled: defaults.allowCodeExecution, key: "allowCodeExecution" as const },
    { label: "File writes", description: "Permit sandbox artifact writes.", enabled: defaults.allowFileWrites, key: "allowFileWrites" as const },
  ].map(capability => <div key={capability.key} data-testid="settings-capability-card" className="min-w-0 rounded-lg border border-white/8 bg-black/10 px-3 py-3"><PreferenceSwitch label={capability.label} description={capability.description} enabled={capability.enabled} onChange={enabled => saveDefaults({ [capability.key]: enabled })} disabled={saving || !persistenceAvailable} /></div>)}</div></SettingsCard></div></div>;
}

export function SettingsAccount({ user, hasCompletedOnboarding, onManageAccount }: { user: { id: number; name?: string | null; email?: string | null; role?: string } | null | undefined; hasCompletedOnboarding: boolean; onManageAccount?: () => void }) {
  return <div><SectionHeading icon={UserRound} title="Account" description="Identity and session data are managed through Synthia’s secure account boundary." /><div className="mt-6 grid gap-3 sm:grid-cols-2"><SettingSummary label="Signed-in identity" value={user?.name || user?.email || "Authenticated Synthia user"} /><SettingSummary label="Account email" value={user?.email || "Not provided by the identity provider"} /><SettingSummary label="Workspace role" value={user?.role === "admin" ? "Administrator" : "Workspace member"} /><SettingSummary label="Onboarding" value={hasCompletedOnboarding ? "Completed" : "Not yet completed"} /></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.025] px-4 py-3"><p className="max-w-xl text-xs leading-5 text-[#a99a8a]">Account changes and sign-in methods remain within the verified authentication portal. Synthia does not store identity-provider passwords or tokens.</p><Button size="sm" variant="outline" onClick={onManageAccount}>Manage account</Button></div></div>;
}

export function SettingsUsage({ usage, loading, error }: { usage: any; loading: boolean; error: boolean }) {
  return <div><SectionHeading icon={Gauge} title="Usage & credits" description="All figures are calculated from Synthia’s durable execution ledger, never from a browser-side estimate." />{loading ? <LoadingRow label="Loading ledger summary…" /> : null}{error ? <SettingsUnavailable message="Usage history will appear when the external Synthia data store is configured." /> : null}{!loading && !error ? <><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Available credits" value={usage?.creditsBalance ?? 0} /><Metric label="Consumed" value={Number(usage?.creditsConsumed ?? 0).toFixed(2)} /><Metric label="Tasks" value={usage?.taskCount ?? 0} /></div><div className="mt-5"><SettingsCard title="Recent ledger events" detail="Costs are recorded after agent activity; a credit balance is not a payment method or billing account.">{usage?.recentEvents?.length ? <div className="mt-3 space-y-2">{usage.recentEvents.map((event: any) => <div key={event.id} className="flex items-center justify-between gap-4 border-t border-white/8 py-2.5 first:border-t-0 first:pt-0"><div className="min-w-0"><p className="truncate text-sm text-[#eee2d3]">{event.taskTitle || event.reason.replace(/_/g, " ")}</p><p className="mt-0.5 text-xs text-[#8d7d6e]">{event.reason.replace(/_/g, " ")} · {new Date(event.createdAt).toLocaleString()}</p></div><span className="shrink-0 text-sm font-medium text-orange-200">{Number(event.creditsDelta).toFixed(2)}</span></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-white/12 px-4 py-5 text-sm text-[#968677]">No execution ledger events have been recorded.</div>}</SettingsCard></div><p className="mt-4 text-xs leading-5 text-[#8f7f70]">Billing and credit purchases are intentionally not shown until Synthia has a configured payment provider and a verified server-side billing contract.</p></> : null}</div>;
}

export function SettingsShortcuts({ enabled, onChange, saving }: { enabled: boolean; onChange: (enabled: boolean) => void; saving: boolean }) {
  const rows = [["New task", "Ctrl + Shift + O", "Opens the task composer."], ["Focus task composer", "Ctrl/⌘ + K", "Returns to and focuses the composer."], ["Toggle sidebar", "Ctrl + Shift + B", "Collapses or expands primary navigation."]];
  return <div><SectionHeading icon={Keyboard} title="Shortcuts" description="Keyboard controls apply throughout the authenticated Synthia workspace." /><div className="mt-6"><SettingsCard title="Keyboard navigation" detail="Turning this off disables Synthia’s global task and sidebar shortcuts."><PreferenceSwitch label="Enable keyboard shortcuts" description={enabled ? "Global shortcuts are active." : "Global shortcuts are disabled."} enabled={enabled} onChange={onChange} disabled={saving} /></SettingsCard></div><div className="mt-4 overflow-hidden rounded-xl border border-white/8">{rows.map(([label, key, description]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-3 last:border-b-0"><div><p className="text-sm text-[#eee2d3]">{label}</p><p className="mt-0.5 text-xs text-[#8f7f70]">{description}</p></div><kbd className="shrink-0 rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-[11px] text-[#cfc0b0]">{key}</kbd></div>)}</div></div>;
}

function SettingsIntegrations({ readiness, integrations, loading, error, removeIntegration }: { readiness: Array<any>; integrations: Array<any>; loading: boolean; error: boolean; removeIntegration: any }) { const connections = readiness.filter(item => item.category === "integration"); return <div><SectionHeading icon={PlugZap} title="Integrations" description="Connected services are listed separately from configured connection options. Tokens are never displayed." />{loading ? <LoadingRow label="Loading integration state…" /> : null}{error ? <SettingsUnavailable message="Integration state will be available after the external Synthia data store is configured." /> : null}{!loading && !error ? <><div className="mt-6 grid gap-2 sm:grid-cols-2">{connections.map(item => <ServiceConnectionCard key={item.id} item={item} />)}</div><div className="mt-5"><SettingsCard title="Authorized connections" detail="Removing a connection revokes Synthia’s encrypted stored token for that service.">{integrations.length ? <div className="mt-3 space-y-2">{integrations.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 px-3 py-2.5"><div><p className="text-sm text-[#eee2d3]">{item.label}</p><p className="mt-0.5 text-xs text-[#8f7f70]">{item.provider} · {item.availableToAllTasks ? "Available to all tasks" : "Restricted"}</p></div><Button variant="ghost" size="sm" onClick={() => removeIntegration.mutate({ integrationId: item.id })} disabled={removeIntegration.isPending} className="text-rose-300">Disconnect</Button></div>)}</div> : <p className="mt-3 text-sm text-[#968677]">No authorized user integrations are connected.</p>}</SettingsCard></div></> : null}</div>; }
function SettingsServices({ readiness, loading, error }: { readiness: Array<any>; loading: boolean; error: boolean }) { const groups = [["Models", "model"], ["Search", "search"], ["Sandbox", "sandbox"], ["Storage", "storage"], ["Notifications", "notification"], ["OAuth integrations", "integration"]] as const; return <div><SectionHeading icon={ServerCog} title="Service connections" description="Synthia checks for server-side configuration but never exposes credential values." />{loading ? <LoadingRow label="Checking service readiness…" /> : null}{error ? <SettingsUnavailable message="Service readiness will be available after the external Synthia data store is configured." /> : null}{!loading && !error ? <div className="mt-6 space-y-5">{groups.map(([label, category]) => { const services = readiness.filter(item => item.category === category); return <section key={category}><h3 className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#938375]">{label}</h3><div className="grid gap-2 sm:grid-cols-2">{services.map(item => <ServiceConnectionCard key={item.id} item={item} />)}</div></section>; })}</div> : null}</div>; }
export function ServiceConnectionCard({ item }: { item: any }) { const status = item.status ?? (item.active ? "active" : item.configured ? "configured" : "credentials_required"); const statusCopy = status === "connected" ? "Connected" : status === "ready_to_connect" ? "Ready to connect" : status === "missing_credentials" ? "Missing credentials" : status === "active" ? "Active for Synthia" : status === "configured" ? "Configuration ready" : "Credentials required"; const color = ["active", "connected"].includes(status) ? "text-orange-200" : ["configured", "ready_to_connect"].includes(status) ? "text-emerald-300" : "text-[#9b8b7c]"; const needsCredentials = ["credentials_required", "missing_credentials"].includes(status); return <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#eee2d3]">{item.label}</p><span className={cn("text-xs", color)}>{statusCopy}</span></div>{needsCredentials ? <p className="mt-2 font-mono text-[11px] leading-5 text-[#8f7f70]">{item.requiredEnvironment?.join(" · ") ?? "Add the required server-side key"}</p> : <p className="mt-2 text-xs text-[#9e8e7f]">Credentials are stored server-side and are not exposed to the workspace.</p>}</div>; }
function SettingsModels({ readiness, loading, error }: { readiness: Array<any>; loading: boolean; error: boolean }) { const models = readiness.filter(item => item.category === "model"); return <div><SectionHeading icon={KeyRound} title="Model providers" description="Provider keys are read only by Synthia’s server-side runtime." />{loading ? <LoadingRow label="Checking model providers…" /> : null}{error ? <SettingsUnavailable message="Model-provider readiness will be available after the external Synthia data store is configured." /> : null}{!loading && !error ? <div className="mt-6 grid gap-2 sm:grid-cols-2">{models.map(item => <ServiceConnectionCard key={item.id} item={item} />)}</div> : null}</div>; }
function SettingsMemory({ memory, loading, error }: { memory: Array<any>; loading: boolean; error: boolean }) { return <div><SectionHeading icon={Sparkles} title="Personalization" description="Review durable task-relevant facts that Synthia may use to improve future work." />{loading ? <LoadingRow label="Loading durable memory…" /> : null}{error ? <SettingsUnavailable message="Personalization data will be available after the external Synthia data store is configured." /> : null}{!loading && !error ? <><p className="mt-5 text-sm text-[#a99a8a]">There are {memory.length} active memory records.</p><div className="mt-4 space-y-2">{memory.map(item => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[.025] p-3"><p className="text-sm text-[#eee2d3]">{item.fact}</p><p className="mt-1 text-xs text-[#8d7d6e]">{item.scope}</p></div>)}</div>{memory.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/12 p-5 text-sm text-[#968677]">No durable facts have been created.</div> : null}</> : null}</div>; }
function SettingsSecurity() { return <div><SectionHeading icon={ShieldCheck} title="Security" description="Controls enforced by Synthia’s server-side task, artifact, integration, and approval boundaries." /><div className="mt-5 space-y-3 text-sm leading-6 text-[#b2a293]"><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />Task ownership is enforced for task, event, approval, and artifact requests.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />High-risk external actions require a durable approval record before execution.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />Connected-service tokens use envelope encryption when saved through an enabled connection flow.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />Task and artifact data remains private to the authenticated workspace owner unless Synthia adds an ownership-checked sharing contract.</p></div></div>; }

function SectionHeading({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string }) { return <div><div className="flex items-center gap-2 text-orange-200"><Icon size={17} /><p className="text-xs font-semibold uppercase tracking-[.14em]">Settings</p></div><h2 className="mt-2 text-lg font-semibold text-[#f6ebdc]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#a99a8a]">{description}</p></div>; }
function SettingsCard({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) { return <section className="rounded-xl border border-white/8 bg-white/[.025] p-4"><h3 className="text-sm font-medium text-[#eee2d3]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#8f7f70]">{detail}</p><div className="mt-4">{children}</div></section>; }
export function PreferenceSwitch({ label, description, enabled, onChange, disabled = false }: { label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean }) { return <div className="flex min-w-0 w-full items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm text-[#eee2d3]">{label}</p><p className="mt-1 text-xs leading-5 text-[#8f7f70]">{description}</p></div><button type="button" role="switch" aria-label={label} aria-checked={enabled} onClick={() => onChange(!enabled)} disabled={disabled} className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors", enabled ? "border-orange-300/70 bg-orange-400" : "border-white/15 bg-white/8", disabled && "cursor-not-allowed opacity-50")}><span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform", enabled ? "translate-x-4" : "translate-x-0.5")} /></button></div>; }
function SettingsUnavailable({ message }: { message: string }) { return <div className="mt-5 rounded-xl border border-dashed border-white/12 bg-white/[.015] px-4 py-4 text-sm leading-6 text-[#a99a8a]">{message}</div>; }
function LoadingRow({ label }: { label: string }) { return <div className="mt-5 flex items-center gap-2 text-sm text-[#a99a8a]"><Loader2 className="animate-spin" size={15} />{label}</div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><p className="text-xs text-[#918172]">{label}</p><p className="mt-2 text-xl font-semibold text-orange-200">{value}</p></div>; }
function SettingSummary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><p className="text-xs text-[#918172]">{label}</p><p className="mt-2 break-words text-sm font-medium text-[#eee2d3]">{value}</p></div>; }
