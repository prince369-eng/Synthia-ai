import { AppWindow, Cable, CheckCircle2, ChevronRight, Link2Off, Loader2, Search, Settings2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppConnectorCard, type AppConnectorState } from "@/components/AppConnectorCard";
import { trpc } from "@/lib/trpc";

export type PluginService = { id: string; label: string; category: string; configured: boolean; status: string };

export function providerStatusCopy(status: string) {
  if (status === "ready_to_connect" || status === "connected") return "Available to connect";
  return "Not available in this workspace";
}

export function filterPluginServices(services: PluginService[], query: string, view: "all" | "configured" | "connected") {
  const normalized = query.trim().toLowerCase();
  return services.filter(service => {
    const matchesQuery = `${service.label} ${service.category} ${service.status}`.toLowerCase().includes(normalized);
    const matchesView = view === "all" || (view === "configured" && service.configured) || (view === "connected" && service.status === "connected");
    return matchesQuery && matchesView;
  });
}

export function ConnectedIntegrationRow({ integration, pending, onDisconnect }: { integration: { id: string; label: string; provider: string; availableToAllTasks: boolean }; pending: boolean; onDisconnect: (integrationId: string) => void }) {
  return <article className="synthia-connected-integration"><span className="synthia-connected-app-mark"><CheckCircle2 size={15} /></span><div><b>{integration.label}</b><p>{integration.availableToAllTasks ? "Available for approved task proposals" : "Select when proposing an app action"}</p></div><Button variant="ghost" size="sm" disabled={pending} onClick={() => onDisconnect(integration.id)} className="text-rose-300"><Link2Off size={14} />Disconnect</Button></article>;
}

function appIsConnected(app: AppConnectorState, integrations: Array<{ label: string }>) {
  const normalizedName = app.name.trim().toLowerCase();
  return integrations.some(integration => integration.label.trim().toLowerCase() === normalizedName);
}

export default function Plugins() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "configured" | "connected">("all");
  const [managerOpen, setManagerOpen] = useState(false);
  const [, setLocation] = useLocation();
  const appCatalog = trpc.integrations.appCatalog.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const integrations = trpc.workspace.integrations.useQuery(undefined, { retry: false });
  const removeIntegration = trpc.integrations.remove.useMutation({ onSuccess: () => void integrations.refetch() });
  const startAuthorization = trpc.integrations.startAuthorization.useMutation();
  const verifyApp = trpc.integrations.verifyPipedream.useMutation({ onSuccess: () => void integrations.refetch() });
  const search = query.trim().toLowerCase();
  const visibleIntegrations = useMemo(() => (integrations.data ?? []).filter(item => item.provider === "pipedream_connect" && !["pipedream connect", "composio"].includes(item.label.trim().toLowerCase())), [integrations.data]);
  const apps = appCatalog.data ?? [];
  const matchedApps = useMemo(() => apps.filter(app => {
    const connected = appIsConnected(app, visibleIntegrations);
    const searchText = `${app.name} ${app.description} ${app.categories.join(" ")} ${app.scopeOptions.join(" ")}`.toLowerCase();
    return (!search || searchText.includes(search)) && (view === "all" || view === "configured" || (view === "connected" && connected));
  }), [apps, search, view, visibleIntegrations]);
  const returnApp = new URLSearchParams(window.location.search).get("app");
  const returnCancelled = new URLSearchParams(window.location.search).get("authorization") === "cancelled";
  const connectorError = startAuthorization.error?.message || verifyApp.error?.message;
  const pending = startAuthorization.isPending || verifyApp.isPending;
  const begin = async (appSlug: string) => {
    const result = await startAuthorization.mutateAsync({ appSlug });
    if (result.mode === "redirect") window.location.assign(result.authorizationUrl);
  };

  return <section className="synthia-page synthia-connectors-page">
    <header className="synthia-page-head synthia-connectors-head">
      <div><p className="synthia-eyebrow">Plugins</p><h1>App connections</h1><p>Connect only the apps you want Synthia to use. Every consequential app action remains a reviewable task proposal.</p></div>
      <div className="flex shrink-0 items-center gap-2"><button type="button" className="synthia-page-link" onClick={() => setManagerOpen(true)}><SlidersHorizontal size={14} />Manage apps</button><button type="button" aria-label="Open connector settings" className="synthia-header-action" onClick={() => setLocation("/settings/integrations")}><Settings2 size={16} /></button></div>
    </header>
    <section className="synthia-connector-overview" aria-label="App connection overview">
      <article><span className="synthia-connector-overview-icon"><AppWindow size={16} /></span><div><b>{appCatalog.isLoading ? "…" : apps.length}</b><small>apps available to connect</small></div></article>
      <article><span className="synthia-connector-overview-icon"><CheckCircle2 size={16} /></span><div><b>{visibleIntegrations.length}</b><small>apps connected to this workspace</small></div></article>
      <article><span className="synthia-connector-overview-icon"><ShieldCheck size={16} /></span><div><b>Review first</b><small>before an app can change anything</small></div></article>
    </section>
    <section className="synthia-connector-discovery" aria-labelledby="connector-discovery-title">
      <div className="synthia-connector-discovery-heading"><div><p className="synthia-eyebrow">Discover</p><h2 id="connector-discovery-title">Available app connections</h2></div><span>Authorize an app directly; task actions still need your approval.</span></div>
      <div className="synthia-connector-toolbar"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 text-[#6c817c]" size={15} /><Input aria-label="Search app connectors" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search apps you can connect" className="synthia-input h-9 pl-9 text-xs" /></div><div className="synthia-plugin-tabs" role="tablist" aria-label="App connector filters">{([ ["all", "All"], ["configured", "Available"], ["connected", "Connected"] ] as const).map(([value, label]) => <button type="button" role="tab" aria-selected={view === value} key={value} onClick={() => setView(value)}>{label}</button>)}</div></div>
      {connectorError ? <p role="alert" className="mt-3 text-xs text-rose-300">{connectorError}</p> : null}{returnCancelled ? <p role="status" className="mt-3 text-xs text-[#91a7a1]">Authorization was cancelled. No app connection was added.</p> : null}
      {appCatalog.isLoading ? <div className="synthia-empty-state mt-3"><Loader2 className="animate-spin" size={16} /> Loading available apps…</div> : appCatalog.isError ? <div className="synthia-empty-state mt-3">Available apps are temporarily unavailable. Refresh to try again.</div> : matchedApps.length ? <div className="synthia-app-connector-grid">{matchedApps.map(app => { const connected = appIsConnected(app, visibleIntegrations); const returning = returnApp === app.slug && !returnCancelled; return <AppConnectorCard key={app.slug} app={app} connected={connected} returning={returning} pending={pending} onConnect={() => void begin(app.slug)} onVerify={() => verifyApp.mutate({ appSlug: app.slug })} />; })}</div> : <div className="synthia-empty-state mt-3">No apps match this filter.</div>}
    </section>
    <section className="synthia-connector-safety-note"><ShieldCheck size={15} /><div><b>Connection does not mean automatic control.</b><p>App access is owner-scoped. Synthia must show a task proposal and receive your approval before consequential work uses a connected app.</p></div><button type="button" onClick={() => setManagerOpen(true)}>Manage connections <ChevronRight size={13} /></button></section>
    {managerOpen ? <section className="synthia-connector-manager" aria-labelledby="connector-manager-title"><div className="synthia-connector-manager-head"><div><p className="synthia-eyebrow">Manage</p><h2 id="connector-manager-title">Your app connections</h2><p>Review or remove app access from this workspace.</p></div><button type="button" aria-label="Close app connection management" onClick={() => setManagerOpen(false)}><X size={16} /></button></div>{integrations.isLoading ? <div className="synthia-empty-state"><Loader2 className="animate-spin" size={16} /> Loading app connections…</div> : integrations.isError ? <div className="synthia-empty-state">App connections are temporarily unavailable.</div> : visibleIntegrations.length ? <div className="mt-3 grid gap-2">{visibleIntegrations.map(integration => <ConnectedIntegrationRow key={integration.id} integration={integration} pending={removeIntegration.isPending} onDisconnect={integrationId => removeIntegration.mutate({ integrationId })} />)}</div> : <div className="synthia-empty-state mt-3"><Cable size={17} /><b>No apps connected yet</b><span>Choose an available app above to start secure authorization.</span></div>}<button type="button" className="synthia-inline-link mt-4" onClick={() => setLocation("/settings/integrations")}>Open connector settings <ChevronRight size={13} /></button></section> : null}
  </section>;
}
