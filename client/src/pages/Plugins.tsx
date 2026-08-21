import { Cable, CheckCircle2, CircleDashed, Link2Off, Loader2, Search, Settings2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export function providerStatusCopy(status: string) {
  if (status === "connected") return "Connected for this account";
  if (status === "ready_to_connect") return "Available to connect";
  return "Not available in this workspace";
}

export type PluginService = { id: string; label: string; category: string; configured: boolean; status: string };

export function filterPluginServices(services: PluginService[], query: string, view: "all" | "configured" | "connected") {
  const normalized = query.trim().toLowerCase();
  return services.filter(service => {
    const matchesQuery = `${service.label} ${service.category} ${service.status}`.toLowerCase().includes(normalized);
    const matchesView = view === "all" || (view === "configured" && service.configured) || (view === "connected" && service.status === "connected");
    return matchesQuery && matchesView;
  });
}

export function ConnectedIntegrationRow({ integration, pending, onDisconnect }: { integration: { id: string; label: string; provider: string; availableToAllTasks: boolean }; pending: boolean; onDisconnect: (integrationId: string) => void }) {
  return <article className="synthia-connected-integration"><div><b>{integration.label}</b><p>{integration.provider} · {integration.availableToAllTasks ? "Available to all tasks" : "Select per task"}</p></div><Button variant="ghost" size="sm" disabled={pending} onClick={() => onDisconnect(integration.id)} className="text-rose-300"><Link2Off size={14} />Disconnect</Button></article>;
}

export default function Plugins() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "configured" | "connected">("all");
  const [, setLocation] = useLocation();
  const services = trpc.workspace.serviceReadiness.useQuery();
  const integrations = trpc.workspace.integrations.useQuery(undefined, { retry: false });
  const removeIntegration = trpc.integrations.remove.useMutation({ onSuccess: () => void integrations.refetch() });
  const connectorApps = useMemo(() => (services.data ?? []).filter(service => service.category === "integration"), [services.data]);
  const filteredServices = useMemo(() => filterPluginServices(connectorApps, query, view), [query, connectorApps, view]);
  return <section className="synthia-page"><header className="synthia-page-head"><div><p className="synthia-eyebrow">Connections</p><h1>Connectors</h1><p>Add the apps you want Synthia to use for approved task work, then review or remove them whenever you need.</p></div><button className="synthia-page-link" type="button" onClick={() => setLocation("/settings/services")}>Manage connectors</button></header><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-lg"><Search className="absolute left-3 top-2.5 text-[#6c817c]" size={15} /><Input aria-label="Search connectors" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search connectors" className="synthia-input h-9 pl-9 text-xs" /></div><div className="synthia-plugin-tabs" role="tablist" aria-label="Connector filters">{(["all", "configured", "connected"] as const).map(item => <button type="button" role="tab" aria-selected={view === item} key={item} onClick={() => setView(item)}>{item === "all" ? "All apps" : item === "configured" ? "Available" : "Connected"}</button>)}</div></div>
    {services.isLoading ? <div className="synthia-empty-state"><Loader2 className="animate-spin" size={16} /> Loading connectors…</div> : services.isError ? <div className="synthia-empty-state">Connectors are temporarily unavailable.</div> : <div className="synthia-compact-grid mt-4">{filteredServices.map(service => <article className="synthia-compact-card" key={service.id}><div><b>{service.label}</b><p>{providerStatusCopy(service.status)}</p></div>{service.status === "connected" ? <CheckCircle2 className="text-emerald-400" size={17} /> : <CircleDashed className="text-zinc-400" size={17} />}</article>)}</div>}
    {!services.isLoading && !services.isError && filteredServices.length === 0 ? <div className="synthia-empty-state">No connectors match this filter.</div> : null}
    <section className="mt-6"><div className="synthia-section-heading"><div><p className="synthia-eyebrow">Your apps</p><h2>Connected to this workspace</h2></div><button type="button" className="synthia-inline-link" onClick={() => setLocation("/settings/integrations")}><Settings2 size={14} />Connection settings</button></div>{integrations.isLoading ? <div className="synthia-empty-state mt-3"><Loader2 className="animate-spin" size={16} /> Loading connected apps…</div> : integrations.isError ? <div className="synthia-empty-state mt-3">Connected apps are temporarily unavailable.</div> : integrations.data?.length ? <div className="mt-3 grid gap-2">{integrations.data.map(integration => <ConnectedIntegrationRow key={integration.id} integration={integration} pending={removeIntegration.isPending} onDisconnect={integrationId => removeIntegration.mutate({ integrationId })} />)}</div> : <div className="synthia-empty-state mt-3"><Cable size={17} /> No apps are connected yet.</div>}</section>
  </section>;
}
