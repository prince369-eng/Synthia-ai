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
  Plus,
  PlugZap,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

function PersonalityGraph({ dimensions }: { dimensions: PersonalityDimensions }) {
  const axes = personalityDimensionMeta.map((dimension, index) => {
    const angle = (-90 + index * 72) * Math.PI / 180;
    const value = dimensions[dimension.key] / 100;
    return { ...dimension, x: 50 + Math.cos(angle) * 37 * value, y: 50 + Math.sin(angle) * 37 * value, labelX: 50 + Math.cos(angle) * 45, labelY: 50 + Math.sin(angle) * 45 };
  });
  return <div className="rounded-xl border border-white/8 bg-black/10 p-3" data-testid="personality-graph"><svg viewBox="0 0 100 100" className="mx-auto block h-44 w-full max-w-[280px]" role="img" aria-label="Personality web graph"><circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".6" /><circle cx="50" cy="50" r="18.5" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".6" />{axes.map(axis => <line key={axis.key} x1="50" y1="50" x2={axis.labelX} y2={axis.labelY} stroke="rgba(34,211,238,.28)" strokeWidth=".6" />)}<polygon points={axes.map(axis => `${axis.x},${axis.y}`).join(" ")} fill="rgba(20,184,166,.22)" stroke="#22d3ee" strokeWidth="1.2" />{axes.map(axis => <g key={axis.key}><circle cx={axis.x} cy={axis.y} r="2" fill="#14b8a6" /><text x={axis.labelX} y={axis.labelY + 2} textAnchor="middle" fontSize="5.4" fill="#b7ddd7">{axis.label}</text></g>)}</svg><p className="mt-1 text-center text-xs leading-5 text-[#839792]">A summary of your chosen preferences, not an inferred personality score.</p></div>;
}

function MemoryPanel({ title, detail, memories, editingId, editingText, onEdit, onText, onUpdate, onDelete, saving, action }: { title: string; detail: string; memories: PersonalizationMemory[]; editingId: string | null; editingText: string; onEdit: (id: string | null, content?: string) => void; onText: (text: string) => void; onUpdate: (input: { id: string; content: string; enabled: boolean }) => void; onDelete: (id: string) => void; saving: boolean; action?: React.ReactNode }) {
  return <SettingsCard title={title} detail={detail}>{action ? <div className="mb-3 flex justify-end">{action}</div> : null}{memories.length ? <div className="space-y-2">{memories.map(memory => <div key={memory.id} className="rounded-lg border border-white/8 bg-black/10 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1">{editingId === memory.id ? <textarea aria-label={`Edit memory ${memory.id}`} value={editingText} onChange={event => onText(event.target.value)} maxLength={1200} className="min-h-16 w-full rounded-md border border-white/10 bg-black/15 p-2 text-sm text-[#e5f2ef] outline-none focus:border-cyan-300/60" /> : <p className="whitespace-pre-wrap break-words text-sm text-[#e5f2ef]">{memory.content}</p>}<p className="mt-1 text-xs text-[#839792]">{memory.enabled ? "Available to Synthia" : "Disabled"}{memory.expiresAt ? ` · Expires ${new Date(memory.expiresAt).toLocaleString()}` : ""}</p></div><div className="flex shrink-0 flex-col gap-1">{editingId === memory.id ? <Button size="sm" variant="outline" onClick={() => { const content = editingText.trim(); if (content) onUpdate({ id: memory.id, content, enabled: memory.enabled }); onEdit(null); }} disabled={saving}>Save</Button> : <Button size="sm" variant="ghost" onClick={() => onEdit(memory.id, memory.content)} disabled={saving}>Edit</Button>}<Button size="sm" variant="ghost" className={memory.enabled ? "text-[#b7ddd7]" : "text-[#8fa39d]"} onClick={() => onUpdate({ id: memory.id, content: memory.content, enabled: !memory.enabled })} disabled={saving}>{memory.enabled ? "Disable" : "Enable"}</Button><Button size="sm" variant="ghost" className="text-rose-300" aria-label={`Delete memory ${memory.id}`} onClick={() => onDelete(memory.id)} disabled={saving}><Trash2 size={14} /></Button></div></div></div>)}</div> : <div className="rounded-lg border border-dashed border-white/12 px-4 py-4 text-sm text-[#839792]">No {title.toLowerCase()} notes yet.</div>}</SettingsCard>;
}

export function SettingsPersonalization({ profile, memories, loading, error, onSaveProfile, onAddMemory, onUpdateMemory, onDeleteMemory, onClearSession, saving, mutationError }: { profile: PersonalizationProfile | null; memories: PersonalizationMemory[]; loading: boolean; error: boolean; onSaveProfile: (input: { dimensions: PersonalityDimensions; enabled: boolean; sessionMemoryEnabled: boolean; longTermMemoryEnabled: boolean }) => void; onAddMemory: (input: { memoryType: "session" | "long_term"; content: string; sessionExpiresInHours?: number }) => void; onUpdateMemory: (input: { id: string; content: string; enabled: boolean }) => void; onDeleteMemory: (id: string) => void; onClearSession: () => void; saving: boolean; mutationError?: string }) {
  const [draft, setDraft] = React.useState<PersonalizationProfile>({ dimensions: defaultPersonalityDimensions, enabled: true, sessionMemoryEnabled: true, longTermMemoryEnabled: true, updatedAt: null });
  const [memoryType, setMemoryType] = React.useState<"session" | "long_term">("long_term");
  const [memoryText, setMemoryText] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  React.useEffect(() => { if (profile) setDraft(profile); }, [profile]);
  const sessionMemories = memories.filter(memory => memory.memoryType === "session");
  const longTermMemories = memories.filter(memory => memory.memoryType === "long_term");
  const addMemory = () => { const content = memoryText.trim(); if (!content) return; onAddMemory({ memoryType, content, ...(memoryType === "session" ? { sessionExpiresInHours: 24 } : {}) }); setMemoryText(""); };
  return <div><SectionHeading icon={Sparkles} title="Personalization" description="Choose how Synthia communicates and manage notes you explicitly allow it to use between interactions." />{loading ? <LoadingRow label="Loading your personalization controls…" /> : null}{error ? <SettingsUnavailable message="Personalization controls will be available after the external Synthia data store is configured." /> : null}{mutationError ? <p role="alert" className="mt-4 text-xs text-rose-300">{mutationError}</p> : null}{!loading && !error ? <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-4"><SettingsCard title="Interaction preferences" detail="Used only when personalization is enabled. Your current task and safety controls always take priority."><div className="space-y-3">{personalityDimensionMeta.map(dimension => <label key={dimension.key} className="block rounded-lg border border-white/8 bg-black/10 px-3 py-2.5"><div className="flex items-baseline justify-between gap-3"><span className="text-sm text-[#e5f2ef]">{dimension.label}</span><span className="font-mono text-xs text-cyan-200">{draft.dimensions[dimension.key]}</span></div><p className="mt-0.5 text-xs text-[#839792]">{dimension.detail}</p><input aria-label={`${dimension.label} preference`} type="range" min="0" max="100" value={draft.dimensions[dimension.key]} onChange={event => setDraft(current => ({ ...current, dimensions: { ...current.dimensions, [dimension.key]: Number(event.target.value) } }))} className="mt-2 h-1.5 w-full accent-teal-400" /></label>)}</div><div className="mt-4 grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-3"><PreferenceSwitch label="Personalization" description="Use these preferences." enabled={draft.enabled} onChange={enabled => setDraft(current => ({ ...current, enabled }))} disabled={saving} /><PreferenceSwitch label="Session memory" description="Use temporary notes." enabled={draft.sessionMemoryEnabled} onChange={sessionMemoryEnabled => setDraft(current => ({ ...current, sessionMemoryEnabled }))} disabled={saving || !draft.enabled} /><PreferenceSwitch label="Long-term memory" description="Use saved notes later." enabled={draft.longTermMemoryEnabled} onChange={longTermMemoryEnabled => setDraft(current => ({ ...current, longTermMemoryEnabled }))} disabled={saving || !draft.enabled} /></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-[#839792]">Synthia never creates or infers these notes automatically.</p><Button size="sm" className="synthia-primary-button" onClick={() => onSaveProfile({ dimensions: draft.dimensions, enabled: draft.enabled, sessionMemoryEnabled: draft.sessionMemoryEnabled, longTermMemoryEnabled: draft.longTermMemoryEnabled })} disabled={saving}>Save preferences</Button></div></SettingsCard><SettingsCard title="Remember something" detail="Add a note yourself. Synthia treats memory as reference context, not instructions."><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className={cn(memoryType === "long_term" && "border-cyan-300/60 text-cyan-100")} onClick={() => setMemoryType("long_term")}>Long-term</Button><Button size="sm" variant="outline" className={cn(memoryType === "session" && "border-cyan-300/60 text-cyan-100")} onClick={() => setMemoryType("session")}>24-hour session</Button></div><textarea aria-label="New memory" value={memoryText} onChange={event => setMemoryText(event.target.value)} maxLength={1200} placeholder={memoryType === "session" ? "A temporary preference for this session" : "A preference you want Synthia to remember"} className="mt-3 min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-[#e5f2ef] outline-none placeholder:text-[#718580] focus:border-cyan-300/60" /><div className="mt-3 flex justify-between gap-3"><p className="text-xs text-[#839792]">{memoryText.length}/1200</p><Button size="sm" variant="outline" onClick={addMemory} disabled={saving || !memoryText.trim()}><Plus size={14} />Add note</Button></div></SettingsCard><MemoryPanel title="Long-term memory" detail="Persists until you edit, disable, or erase it." memories={longTermMemories} editingId={editingId} editingText={editingText} onEdit={(id, content) => { setEditingId(id); setEditingText(content ?? ""); }} onText={setEditingText} onUpdate={onUpdateMemory} onDelete={onDeleteMemory} saving={saving} /><MemoryPanel title="Session memory" detail="Expires after 24 hours unless you clear it earlier." memories={sessionMemories} editingId={editingId} editingText={editingText} onEdit={(id, content) => { setEditingId(id); setEditingText(content ?? ""); }} onText={setEditingText} onUpdate={onUpdateMemory} onDelete={onDeleteMemory} saving={saving} action={sessionMemories.length ? <Button size="sm" variant="ghost" className="text-[#b7ddd7]" onClick={onClearSession} disabled={saving}>Clear session</Button> : undefined} /></div><div className="space-y-4"><SettingsCard title="Your personality web" detail="A compact view of your selected communication preferences."><PersonalityGraph dimensions={draft.dimensions} /></SettingsCard><SettingsCard title="Memory boundaries" detail="Your notes remain within your authenticated Synthia workspace."><ul className="space-y-2 text-xs leading-5 text-[#91a7a1]"><li>Only notes you add are stored.</li><li>Session notes expire after 24 hours.</li><li>Turn memory off without deleting it.</li><li>Disable or erase any note at any time.</li></ul></SettingsCard></div></div> : null}</div>;
}

type Preferences = Record<string, unknown>;
type TaskDefaults = {
  mode: "ask_before_risky" | "supervised";
  allowWebSearch: boolean;
  allowCodeExecution: boolean;
  allowFileWrites: boolean;
};
type PersonalityDimension = "warmth" | "directness" | "detail" | "creativity" | "initiative";
type PersonalityDimensions = Record<PersonalityDimension, number>;
type PersonalizationProfile = { dimensions: PersonalityDimensions; enabled: boolean; sessionMemoryEnabled: boolean; longTermMemoryEnabled: boolean; updatedAt: Date | null };
type PersonalizationMemory = { id: string; memoryType: string; content: string; enabled: boolean; expiresAt: Date | null; updatedAt: Date };
const defaultPersonalityDimensions: PersonalityDimensions = { warmth: 55, directness: 60, detail: 62, creativity: 58, initiative: 50 };
const personalityDimensionMeta: Array<{ key: PersonalityDimension; label: string; detail: string }> = [
  { key: "warmth", label: "Warmth", detail: "Supportive and considerate wording" },
  { key: "directness", label: "Directness", detail: "Concise, decisive recommendations" },
  { key: "detail", label: "Detail", detail: "Depth in plans and explanations" },
  { key: "creativity", label: "Creativity", detail: "Novel options and framing" },
  { key: "initiative", label: "Initiative", detail: "Proactive task planning" },
];

const sectionAliases: Record<string, string> = { profile: "account", billing: "usage" };

const sectionGroups = [
  { label: "Workspace", sections: [
    { id: "general", label: "General", icon: Settings2 },
    { id: "account", label: "Account", icon: UserRound },
    { id: "usage", label: "Usage & billing", icon: CreditCard },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  ] },
  { label: "Agent capabilities", sections: [
    { id: "services", label: "Connectors", icon: ServerCog },
    { id: "model-keys", label: "Models", icon: KeyRound },
    { id: "skills", label: "Skills", icon: Sparkles },
    { id: "mail", label: "Mail", icon: PlugZap },
    { id: "computer", label: "Computer", icon: Database },
  ] },
  { label: "Data & delivery", sections: [
    { id: "data-controls", label: "Data controls", icon: ShieldCheck },
    { id: "deployments", label: "Deployments", icon: ServerCog },
    { id: "integrations", label: "Integrations", icon: PlugZap },
    { id: "developer", label: "Developer", icon: KeyRound },
    { id: "memory", label: "Personalization", icon: Database },
    { id: "security", label: "Security", icon: ShieldCheck },
  ] },
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
  const needsReadiness = ["services", "integrations", "model-keys", "skills", "mail", "computer"].includes(section);
  const readiness = trpc.workspace.serviceReadiness.useQuery(undefined, { enabled: needsReadiness, retry: false });
  const integrations = trpc.workspace.integrations.useQuery(undefined, { enabled: ["services", "integrations"].includes(section), retry: false });
  const personalizationProfile = trpc.personalization.profile.useQuery(undefined, { enabled: section === "memory", retry: false });
  const personalizationMemories = trpc.personalization.memories.useQuery(undefined, { enabled: section === "memory", retry: false });
  const usage = trpc.workspace.usage.useQuery(undefined, { enabled: section === "usage", retry: false });
  const configuredModels = trpc.catalog.models.useQuery(undefined, { enabled: section === "model-keys", retry: false });
  const utils = trpc.useUtils();
  const updatePreferences = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => void utils.settings.get.invalidate(),
  });
  const removeIntegration = trpc.integrations.remove.useMutation({
    onSuccess: () => void integrations.refetch(),
  });
  const invalidatePersonalization = () => Promise.all([
    utils.personalization.profile.invalidate(),
    utils.personalization.memories.invalidate(),
  ]);
  const updatePersonalization = trpc.personalization.updateProfile.useMutation({ onSuccess: () => void invalidatePersonalization() });
  const addPersonalizationMemory = trpc.personalization.addMemory.useMutation({ onSuccess: () => void invalidatePersonalization() });
  const updatePersonalizationMemory = trpc.personalization.updateMemory.useMutation({ onSuccess: () => void invalidatePersonalization() });
  const deletePersonalizationMemory = trpc.personalization.deleteMemory.useMutation({ onSuccess: () => void invalidatePersonalization() });
  const clearSessionPersonalization = trpc.personalization.clearSession.useMutation({ onSuccess: () => void invalidatePersonalization() });
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
      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[184px_minmax(0,960px)] xl:justify-start">
        <SettingsSectionNav section={section} onNavigate={setLocation} />
        <section className="synthia-settings-panel" aria-live="polite">
          {settings.isLoading ? <div className="flex items-center gap-2 text-xs text-[#a9998a]"><Loader2 className="animate-spin" size={14} />Loading workspace settings…</div> : null}
          {settings.isError ? <SettingsUnavailable message="Workspace preferences will be available when the external Synthia data store is configured." /> : null}
          {updatePreferences.isError ? <p role="alert" className="mb-4 text-xs text-rose-300">{updatePreferences.error.message}</p> : null}
          {section === "general" ? <SettingsGeneral preferences={preferences} theme={theme} onToggleTheme={toggleTheme} onSave={savePreferences} saving={updatePreferences.isPending} persistenceAvailable={!settings.isError} /> : null}
          {section === "account" ? <SettingsAccount user={user} hasCompletedOnboarding={Boolean(settings.data?.hasCompletedOnboarding)} onManageAccount={() => startLogin()} /> : null}
          {section === "usage" ? <SettingsUsage usage={usage.data} loading={usage.isLoading} error={usage.isError} /> : null}
          {section === "shortcuts" ? <SettingsShortcuts enabled={preferences.keyboardShortcutsEnabled !== false} onChange={enabled => savePreferences({ keyboardShortcutsEnabled: enabled })} saving={updatePreferences.isPending || settings.isError} /> : null}
          {section === "services" ? <SettingsServices readiness={readiness.data ?? []} integrations={integrations.data ?? []} loading={readiness.isLoading || integrations.isLoading} error={readiness.isError || integrations.isError} /> : null}
          {section === "integrations" ? <SettingsIntegrations readiness={readiness.data ?? []} integrations={integrations.data ?? []} loading={readiness.isLoading || integrations.isLoading} error={readiness.isError || integrations.isError} removeIntegration={removeIntegration} /> : null}
          {section === "model-keys" ? <SettingsModels readiness={readiness.data ?? []} models={configuredModels.data?.models ?? []} loading={readiness.isLoading || configuredModels.isLoading} error={readiness.isError || configuredModels.isError} /> : null}
          {section === "skills" ? <SettingsSkills readiness={readiness.data ?? []} loading={readiness.isLoading} error={readiness.isError} /> : null}
          {section === "mail" ? <SettingsMail readiness={readiness.data ?? []} loading={readiness.isLoading} error={readiness.isError} /> : null}
          {section === "computer" ? <SettingsComputer readiness={readiness.data ?? []} loading={readiness.isLoading} error={readiness.isError} /> : null}
          {section === "data-controls" ? <SettingsDataControls /> : null}
          {section === "deployments" ? <SettingsDeployments /> : null}
          {section === "developer" ? <SettingsDeveloper /> : null}
          {section === "memory" ? <SettingsPersonalization profile={personalizationProfile.data ?? null} memories={personalizationMemories.data ?? []} loading={personalizationProfile.isLoading || personalizationMemories.isLoading} error={personalizationProfile.isError || personalizationMemories.isError} onSaveProfile={input => updatePersonalization.mutate(input)} onAddMemory={input => addPersonalizationMemory.mutate(input)} onUpdateMemory={input => updatePersonalizationMemory.mutate(input)} onDeleteMemory={id => deletePersonalizationMemory.mutate({ id })} onClearSession={() => clearSessionPersonalization.mutate()} saving={updatePersonalization.isPending || addPersonalizationMemory.isPending || updatePersonalizationMemory.isPending || deletePersonalizationMemory.isPending || clearSessionPersonalization.isPending} mutationError={updatePersonalization.error?.message || addPersonalizationMemory.error?.message || updatePersonalizationMemory.error?.message || deletePersonalizationMemory.error?.message || clearSessionPersonalization.error?.message} /> : null}
          {section === "security" ? <SettingsSecurity /> : null}
        </section>
      </div>
    </main>
  );
}

export function SettingsSectionNav({ section, onNavigate }: { section: string; onNavigate: (path: string) => void }) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleGroups = sectionGroups.map(group => ({ ...group, sections: group.sections.filter(item => !normalizedQuery || item.label.toLocaleLowerCase().includes(normalizedQuery)) })).filter(group => group.sections.length > 0);
  return <nav className="synthia-settings-nav" aria-label="Settings sections"><label className="relative mb-3 block"><Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#718580]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search settings" aria-label="Search settings" className="h-8 w-full rounded-md border border-white/10 bg-black/15 pl-8 pr-2 text-xs text-[#e5f2ef] outline-none placeholder:text-[#69807a] focus:border-cyan-300/60" /></label>{visibleGroups.map(group => <div key={group.label} className="synthia-settings-group"><p>{group.label}</p>{group.sections.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => onNavigate(settingsPath(item.id))} className={cn(section === item.id && "active")}><Icon size={14} />{item.label}</button>; })}</div>)}{visibleGroups.length === 0 ? <p className="px-2 text-xs leading-5 text-[#718580]">No matching settings.</p> : null}</nav>;
}

export function SettingsCloseButton({ onClose }: { onClose: () => void }) {
  return <button type="button" className="synthia-settings-close" onClick={onClose} aria-label="Close settings and return to tasks" title="Close settings"><X size={17} aria-hidden="true" /></button>;
}

export function SettingsGeneral({ preferences, theme, onToggleTheme, onSave, saving, persistenceAvailable }: { preferences: Preferences; theme: "light" | "dark"; onToggleTheme?: () => void; onSave: (patch: Preferences) => void; saving: boolean; persistenceAvailable: boolean }) {
  const defaults = readTaskDefaults(preferences);
  const saveDefaults = (patch: Partial<TaskDefaults>) => onSave({ taskDefaults: { ...defaults, ...patch } });
  return <div><SectionHeading icon={Settings2} title="General" description="Choose the default conditions Synthia applies when you begin a new autonomous task." /><div className="mt-6 grid gap-3 lg:grid-cols-2"><SettingsCard title="Appearance" detail="Your chosen display mode is stored locally on this device."><PreferenceSwitch label="Dark appearance" description={theme === "dark" ? "Teal and cyan dark workspace is active." : "Light workspace is active."} enabled={theme === "dark"} onChange={() => { onToggleTheme?.(); if (persistenceAvailable) onSave({ appearanceTheme: theme === "dark" ? "light" : "dark" }); }} disabled={saving || !onToggleTheme} /></SettingsCard><SettingsCard title="Default review mode" detail="Applied to each new task, before its first action."><div className="grid grid-cols-2 gap-2"><Button size="sm" className={cn("mt-0 w-full", defaults.mode === "ask_before_risky" ? "synthia-primary-button" : "bg-white/5 text-[#c7ded8]")} onClick={() => saveDefaults({ mode: "ask_before_risky" })} disabled={saving || !persistenceAvailable}>Ask before risky</Button><Button size="sm" className={cn("mt-0 w-full", defaults.mode === "supervised" ? "synthia-primary-button" : "bg-white/5 text-[#c7ded8]")} onClick={() => saveDefaults({ mode: "supervised" })} disabled={saving || !persistenceAvailable}>Supervised</Button></div></SettingsCard></div><div className="mt-4"><SettingsCard title="Default task capabilities" detail="These defaults are sent with new task requests. Each task remains subject to server-side approval and provider availability."><div className="grid min-w-0 gap-3 md:grid-cols-3">{[
    { label: "Web research", description: "Allow configured search tools.", enabled: defaults.allowWebSearch, key: "allowWebSearch" as const },
    { label: "Code execution", description: "Permit sandboxed code work.", enabled: defaults.allowCodeExecution, key: "allowCodeExecution" as const },
    { label: "File writes", description: "Permit sandbox artifact writes.", enabled: defaults.allowFileWrites, key: "allowFileWrites" as const },
  ].map(capability => <div key={capability.key} data-testid="settings-capability-card" className="min-w-0 rounded-lg border border-white/8 bg-black/10 px-3 py-3"><PreferenceSwitch label={capability.label} description={capability.description} enabled={capability.enabled} onChange={enabled => saveDefaults({ [capability.key]: enabled })} disabled={saving || !persistenceAvailable} /></div>)}</div></SettingsCard></div></div>;
}

export function SettingsAccount({ user, hasCompletedOnboarding, onManageAccount }: { user: { id: number; name?: string | null; email?: string | null; role?: string } | null | undefined; hasCompletedOnboarding: boolean; onManageAccount?: () => void }) {
  return <div><SectionHeading icon={UserRound} title="Account" description="Identity and session data are managed through Synthia’s secure account boundary." /><div className="mt-6 grid gap-3 sm:grid-cols-2"><SettingSummary label="Signed-in identity" value={user?.name || user?.email || "Authenticated Synthia user"} /><SettingSummary label="Account email" value={user?.email || "Not provided by the identity provider"} /><SettingSummary label="Workspace role" value={user?.role === "admin" ? "Administrator" : "Workspace member"} /><SettingSummary label="Onboarding" value={hasCompletedOnboarding ? "Completed" : "Not yet completed"} /></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.025] px-4 py-3"><p className="max-w-xl text-xs leading-5 text-[#a99a8a]">Account changes and sign-in methods remain within the verified authentication portal. Synthia does not store identity-provider passwords or tokens.</p><Button size="sm" variant="outline" onClick={onManageAccount}>Manage account</Button></div></div>;
}

export function SettingsUsage({ usage, loading, error }: { usage: any; loading: boolean; error: boolean }) {
  return <div><SectionHeading icon={Gauge} title="Usage & credits" description="All figures are calculated from Synthia’s durable execution ledger, never from a browser-side estimate." />{loading ? <LoadingRow label="Loading ledger summary…" /> : null}{error ? <SettingsUnavailable message="Usage history will appear when the external Synthia data store is configured." /> : null}{!loading && !error ? <><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Available credits" value={usage?.creditsBalance ?? 0} /><Metric label="Consumed" value={Number(usage?.creditsConsumed ?? 0).toFixed(2)} /><Metric label="Tasks" value={usage?.taskCount ?? 0} /></div><div className="mt-5"><SettingsCard title="Recent ledger events" detail="Costs are recorded after agent activity; a credit balance is not a payment method or billing account.">{usage?.recentEvents?.length ? <div className="mt-3 space-y-2">{usage.recentEvents.map((event: any) => <div key={event.id} className="flex items-center justify-between gap-4 border-t border-white/8 py-2.5 first:border-t-0 first:pt-0"><div className="min-w-0"><p className="truncate text-sm text-[#eee2d3]">{event.taskTitle || event.reason.replace(/_/g, " ")}</p><p className="mt-0.5 text-xs text-[#8d7d6e]">{event.reason.replace(/_/g, " ")} · {new Date(event.createdAt).toLocaleString()}</p></div><span className="shrink-0 text-sm font-medium text-cyan-200">{Number(event.creditsDelta).toFixed(2)}</span></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-white/12 px-4 py-5 text-sm text-[#968677]">No execution ledger events have been recorded.</div>}</SettingsCard></div><p className="mt-4 text-xs leading-5 text-[#8f7f70]">Billing and credit purchases are intentionally not shown until Synthia has a configured payment provider and a verified server-side billing contract.</p></> : null}</div>;
}

export function SettingsShortcuts({ enabled, onChange, saving }: { enabled: boolean; onChange: (enabled: boolean) => void; saving: boolean }) {
  const rows = [["New task", "Ctrl + Shift + O", "Opens the task composer."], ["Focus task composer", "Ctrl/⌘ + K", "Returns to and focuses the composer."], ["Toggle sidebar", "Ctrl + Shift + B", "Collapses or expands primary navigation."]];
  return <div><SectionHeading icon={Keyboard} title="Shortcuts" description="Keyboard controls apply throughout the authenticated Synthia workspace." /><div className="mt-6"><SettingsCard title="Keyboard navigation" detail="Turning this off disables Synthia’s global task and sidebar shortcuts."><PreferenceSwitch label="Enable keyboard shortcuts" description={enabled ? "Global shortcuts are active." : "Global shortcuts are disabled."} enabled={enabled} onChange={onChange} disabled={saving} /></SettingsCard></div><div className="mt-4 overflow-hidden rounded-xl border border-white/8">{rows.map(([label, key, description]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-3 last:border-b-0"><div><p className="text-sm text-[#eee2d3]">{label}</p><p className="mt-0.5 text-xs text-[#8f7f70]">{description}</p></div><kbd className="shrink-0 rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-[11px] text-[#cfc0b0]">{key}</kbd></div>)}</div></div>;
}

function SettingsIntegrations({ readiness, integrations, loading, error, removeIntegration }: { readiness: Array<any>; integrations: Array<any>; loading: boolean; error: boolean; removeIntegration: any }) { const connections = readiness.filter(item => item.category === "integration"); return <div><SectionHeading icon={PlugZap} title="Integrations" description="Connected services are listed separately from configured connection options. Tokens are never displayed." />{loading ? <LoadingRow label="Loading integration state…" /> : null}{error ? <SettingsUnavailable message="Integration state will be available after the external Synthia data store is configured." /> : null}{!loading && !error ? <><div className="mt-6 grid gap-2 sm:grid-cols-2">{connections.map(item => <ServiceConnectionCard key={item.id} item={item} />)}</div><div className="mt-5"><SettingsCard title="Authorized connections" detail="Removing a connection revokes Synthia’s encrypted stored token for that service.">{integrations.length ? <div className="mt-3 space-y-2">{integrations.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 px-3 py-2.5"><div><p className="text-sm text-[#eee2d3]">{item.label}</p><p className="mt-0.5 text-xs text-[#8f7f70]">{item.provider} · {item.availableToAllTasks ? "Available to all tasks" : "Restricted"}</p></div><Button variant="ghost" size="sm" onClick={() => removeIntegration.mutate({ integrationId: item.id })} disabled={removeIntegration.isPending} className="text-rose-300">Disconnect</Button></div>)}</div> : <p className="mt-3 text-sm text-[#968677]">No authorized user integrations are connected.</p>}</SettingsCard></div></> : null}</div>; }
const connectorDescriptions: Record<string, string> = {
  github: "Manage repositories, review code, and collaborate on software tasks.",
  google: "Find and work with files, documents, and workspace information.",
  notion: "Search workspace knowledge and update notes when you approve a task.",
  slack: "Find conversations and help prepare team updates.",
};

function connectorState(item: any) {
  if (item.status === "connected") return "Connected";
  if (item.status === "ready_to_connect") return "Available to connect";
  return "Not available in this workspace";
}

function CapabilityCard({ title, description, available }: { title: string; description: string; available: boolean }) { return <article className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-[#e5f2ef]">{title}</p><p className="mt-1 text-xs leading-5 text-[#91a7a1]">{description}</p></div><span className={cn("shrink-0 text-xs", available ? "text-cyan-200" : "text-[#8fa39d]")}>{available ? "Available" : "Set up needed"}</span></div></article>; }

function SettingsServices({ readiness, integrations, loading, error }: { readiness: Array<any>; integrations: Array<any>; loading: boolean; error: boolean }) { const apps = readiness.filter(item => item.category === "integration"); return <div><SectionHeading icon={ServerCog} title="Connectors" description="Add the apps you want Synthia to use for your tasks. Connected apps stay under your control." />{loading ? <LoadingRow label="Loading connectors…" /> : null}{error ? <SettingsUnavailable message="Connector options are temporarily unavailable." /> : null}{!loading && !error ? <><div className="mt-6 flex items-center justify-between gap-3"><div><h3 className="text-sm font-medium text-[#e5f2ef]">Added connectors</h3><p className="mt-1 text-xs text-[#839792]">Apps currently available to this workspace.</p></div><span className="text-xs text-[#91a7a1]">{integrations.length} connected</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{apps.map(item => <article key={item.id} className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-[#e5f2ef]">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#91a7a1]">{connectorDescriptions[item.id] ?? "Make this app available to Synthia tasks you approve."}</p></div><span className={cn("shrink-0 text-xs", item.status === "connected" ? "text-cyan-200" : "text-[#8fa39d]")}>{connectorState(item)}</span></div></article>)}</div>{apps.length === 0 ? <SettingsUnavailable message="No connector apps are available in this workspace yet." /> : null}<p className="mt-5 text-xs leading-5 text-[#839792]">Connections are used only for the task actions you approve. You can review connected apps in Integrations.</p></> : null}</div>; }
export function ServiceConnectionCard({ item }: { item: any }) { const status = item.status ?? (item.active ? "active" : item.configured ? "configured" : "credentials_required"); const statusCopy = status === "connected" ? "Connected" : status === "ready_to_connect" ? "Ready to connect" : status === "missing_credentials" ? "Missing credentials" : status === "active" ? "Active for Synthia" : status === "configured" ? "Configuration ready" : "Credentials required"; const color = ["active", "connected"].includes(status) ? "text-cyan-200" : ["configured", "ready_to_connect"].includes(status) ? "text-emerald-300" : "text-[#8fa39d]"; const needsCredentials = ["credentials_required", "missing_credentials"].includes(status); const detail = item.detail ?? (needsCredentials ? null : "Credentials are stored server-side and are not exposed to the workspace."); return <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#e5f2ef]">{item.label}</p><span className={cn("text-xs", color)}>{statusCopy}</span></div>{needsCredentials ? <p className="mt-2 font-mono text-[11px] leading-5 text-[#839792]">{item.requiredEnvironment?.join(" · ") ?? "Add the required server-side key"}</p> : <p className="mt-2 text-xs leading-5 text-[#91a7a1]">{detail}</p>}</div>; }
export function modelCapabilityLabel(model: { capabilities?: string[] }) { return model.capabilities?.includes("vision") ? "Text + vision" : "Text"; }
export function SettingsModels({ readiness, models: configuredModels, loading, error }: { readiness: Array<any>; models: Array<any>; loading: boolean; error: boolean }) { const modelsAvailable = readiness.some(item => item.category === "model" && item.configured); return <div><SectionHeading icon={KeyRound} title="Models" description="Choose a task model when you need a specific strength, or let Synthia choose automatically." />{loading ? <LoadingRow label="Loading task models…" /> : null}{error ? <SettingsUnavailable message="Task models are temporarily unavailable." /> : null}{!loading && !error ? <><div className="mt-6"><SettingsCard title="Task model choices" detail="Automatic selection is the default for new tasks.">{configuredModels.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{configuredModels.map(model => <div key={model.id} className="rounded-lg border border-white/8 bg-black/10 px-3 py-2.5"><p className="text-sm font-medium text-[#e5f2ef]">{model.model}</p><span className="mt-2 inline-flex rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] text-cyan-200">{modelCapabilityLabel(model)}</span></div>)}</div> : <p className="mt-3 text-sm leading-5 text-[#839792]">{modelsAvailable ? "Task models are being prepared for this workspace." : "Model choices will appear here when they are available for your workspace."}</p>}</SettingsCard></div><div className="mt-3"><SettingsCard title="Voice instructions" detail="Speak an instruction to start a task when voice input is available."><p className="text-xs leading-5 text-[#91a7a1]">Recorded instructions are added to your task before Synthia begins work.</p></SettingsCard></div></> : null}</div>; }
function SettingsSkills({ readiness, loading, error }: { readiness: Array<any>; loading: boolean; error: boolean }) { const researchAvailable = readiness.some(item => item.category === "search" && item.configured); const computerAvailable = readiness.some(item => item.category === "sandbox" && item.configured); return <div><SectionHeading icon={Sparkles} title="Skills" description="Choose the task abilities you want Synthia to use when they are helpful for your work." />{loading ? <LoadingRow label="Loading skills…" /> : null}{error ? <SettingsUnavailable message="Skills are temporarily unavailable." /> : null}{!loading && !error ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><CapabilityCard title="Web research" description="Find, compare, and summarize current public sources for your task." available={researchAvailable} /><CapabilityCard title="Agent’s Computer" description="Build, test, and organize task files in a dedicated task workspace." available={computerAvailable} /><CapabilityCard title="Create deliverables" description="Prepare reports, code, websites, and other task outputs for you to review." available={true} /><CapabilityCard title="Approvals" description="Ask for your confirmation before a task takes a high-impact external action." available={true} /></div> : null}</div>; }
function SettingsMail({ readiness, loading, error }: { readiness: Array<any>; loading: boolean; error: boolean }) { const available = readiness.some(item => item.category === "notification" && item.configured); return <div><SectionHeading icon={PlugZap} title="Mail" description="Keep task updates in one place and use email-based task workflows when they are available to your workspace." />{loading ? <LoadingRow label="Loading mail options…" /> : null}{error ? <SettingsUnavailable message="Mail options are temporarily unavailable." /> : null}{!loading && !error ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><CapabilityCard title="Task updates" description="Receive task updates in your workspace and through approved notification channels." available={available} /><CapabilityCard title="Create tasks by email" description="Send approved workflow email to start a task when this option is available." available={false} /></div> : null}</div>; }
function SettingsComputer({ readiness, loading, error }: { readiness: Array<any>; loading: boolean; error: boolean }) { const available = readiness.some(item => item.category === "sandbox" && item.configured); return <div><SectionHeading icon={Database} title="Computer" description="Give Synthia a dedicated task workspace for code, files, and web work without handing over your personal computer." />{loading ? <LoadingRow label="Loading computer options…" /> : null}{error ? <SettingsUnavailable message="Computer options are temporarily unavailable." /> : null}{!loading && !error ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><CapabilityCard title="Agent’s Computer" description="Use a dedicated task workspace for code, files, and approved web actions." available={available} /><CapabilityCard title="Personal computer" description="Work through a connected personal browser only when you choose to share that access." available={false} /></div> : null}</div>; }
function SettingsDataControls() { return <div><SectionHeading icon={ShieldCheck} title="Data controls" description="Synthia maintains an event-sourced task record and user-owned attachments in the configured external database and object storage." /><div className="mt-6 grid gap-3 sm:grid-cols-2"><SettingsCard title="Task data" detail="Task state, event replay, approvals, and usage records are persisted in PostgreSQL."><p className="text-xs leading-5 text-[#a99a8a]">Deletion and retention tooling is intentionally unavailable until a server-side data-lifecycle workflow is enabled.</p></SettingsCard><SettingsCard title="Files and artifacts" detail="Attachment and deliverable access is checked against the authenticated owner before a signed URL is issued."><p className="text-xs leading-5 text-[#a99a8a]">Storage provider credentials and raw object keys are not displayed in Settings.</p></SettingsCard></div></div>; }
function SettingsDeployments() { return <div><SectionHeading icon={ServerCog} title="Deployments" description="Synthia’s managed application runtime is operated from the project environment; deployment publishing is intentionally separate from task execution." /><div className="mt-6"><SettingsCard title="Managed deployment" detail="Build and release actions remain in the project management environment to preserve audited source and checkpoint history."><p className="text-xs leading-5 text-[#a99a8a]">No custom domain, repository, or release credentials are exposed inside the Synthia workspace.</p></SettingsCard></div></div>; }
function SettingsDeveloper() { return <div><SectionHeading icon={KeyRound} title="Developer" description="Developer integrations are server-controlled and require explicit authenticated contracts before they can access task data or actions." /><div className="mt-6 grid gap-3 sm:grid-cols-2"><SettingsCard title="Environment secrets" detail="Provider and infrastructure secrets are configured outside the browser session."><p className="text-xs leading-5 text-[#a99a8a]">Synthia shows readiness only; values are never returned by an API or rendered in the UI.</p></SettingsCard><SettingsCard title="API and webhooks" detail="A public developer-token or webhook-management surface has not been enabled."><p className="text-xs leading-5 text-[#a99a8a]">This prevents unscoped third-party access until an audited OAuth or API-key contract is implemented.</p></SettingsCard></div></div>; }
function SettingsMemory({ memory, loading, error }: { memory: Array<any>; loading: boolean; error: boolean }) { return <div><SectionHeading icon={Sparkles} title="Personalization" description="Review durable task-relevant facts that Synthia may use to improve future work." />{loading ? <LoadingRow label="Loading durable memory…" /> : null}{error ? <SettingsUnavailable message="Personalization data will be available after the external Synthia data store is configured." /> : null}{!loading && !error ? <><p className="mt-5 text-sm text-[#a99a8a]">There are {memory.length} active memory records.</p><div className="mt-4 space-y-2">{memory.map(item => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[.025] p-3"><p className="text-sm text-[#eee2d3]">{item.fact}</p><p className="mt-1 text-xs text-[#8d7d6e]">{item.scope}</p></div>)}</div>{memory.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/12 p-5 text-sm text-[#968677]">No durable facts have been created.</div> : null}</> : null}</div>; }
function SettingsSecurity() { return <div><SectionHeading icon={ShieldCheck} title="Security" description="Controls enforced by Synthia’s server-side task, artifact, integration, and approval boundaries." /><div className="mt-5 space-y-3 text-sm leading-6 text-[#b2a293]"><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />Task ownership is enforced for task, event, approval, and artifact requests.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />High-risk external actions require a durable approval record before execution.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />Connected-service tokens use envelope encryption when saved through an enabled connection flow.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />Task and artifact data remains private to the authenticated workspace owner unless Synthia adds an ownership-checked sharing contract.</p></div></div>; }

function SectionHeading({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string }) { return <div><div className="flex items-center gap-2 text-cyan-200"><Icon size={17} /><p className="text-xs font-semibold uppercase tracking-[.14em]">Settings</p></div><h2 className="mt-2 text-lg font-semibold text-[#e5f2ef]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#91a7a1]">{description}</p></div>; }
function SettingsCard({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) { return <section className="rounded-xl border border-white/8 bg-white/[.025] p-4"><h3 className="text-sm font-medium text-[#e5f2ef]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#839792]">{detail}</p><div className="mt-4">{children}</div></section>; }
export function PreferenceSwitch({ label, description, enabled, onChange, disabled = false }: { label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean }) { return <div className="flex min-w-0 w-full items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm text-[#e5f2ef]">{label}</p><p className="mt-1 text-xs leading-5 text-[#839792]">{description}</p></div><button type="button" role="switch" aria-label={label} aria-checked={enabled} onClick={() => onChange(!enabled)} disabled={disabled} className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors", enabled ? "border-cyan-300/70 bg-teal-400" : "border-white/15 bg-white/8", disabled && "cursor-not-allowed opacity-50")}><span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform", enabled ? "translate-x-4" : "translate-x-0.5")} /></button></div>; }
function SettingsUnavailable({ message }: { message: string }) { return <div className="mt-5 rounded-xl border border-dashed border-white/12 bg-white/[.015] px-4 py-4 text-sm leading-6 text-[#91a7a1]">{message}</div>; }
function LoadingRow({ label }: { label: string }) { return <div className="mt-5 flex items-center gap-2 text-sm text-[#91a7a1]"><Loader2 className="animate-spin" size={15} />{label}</div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><p className="text-xs text-[#839792]">{label}</p><p className="mt-2 text-xl font-semibold text-cyan-200">{value}</p></div>; }
function SettingSummary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><p className="text-xs text-[#839792]">{label}</p><p className="mt-2 break-words text-sm font-medium text-[#e5f2ef]">{value}</p></div>; }
