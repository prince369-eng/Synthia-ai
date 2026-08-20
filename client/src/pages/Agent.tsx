import { Bot, CheckCircle2, CircleAlert, Cpu, Loader2, SearchCheck, ShieldCheck, TerminalSquare } from "lucide-react";
import React from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export function agentTaskStateCopy({ isLoading, isError, activeCount }: { isLoading: boolean; isError: boolean; activeCount: number }) {
  if (isLoading) return "Checking task state…";
  if (isError) return "Task state is unavailable until the data store is configured.";
  return `${activeCount} active or awaiting input`;
}

export function runtimeCapabilityCopy({ isLoading, configuredModels, configuredSearch, configuredSandboxes }: { isLoading: boolean; configuredModels: number; configuredSearch: number; configuredSandboxes: number }) {
  if (isLoading) return { models: "Checking configuration…", search: "Checking configuration…", sandbox: "Checking configuration…" };
  return {
    models: `${configuredModels} configured provider${configuredModels === 1 ? "" : "s"}`,
    search: `${configuredSearch} configured search provider${configuredSearch === 1 ? "" : "s"}`,
    sandbox: configuredSandboxes ? `${configuredSandboxes} sandbox provider${configuredSandboxes === 1 ? "" : "s"} configured for isolated execution` : "E2B or Bunnyshell HopX sandbox credentials are required",
  };
}

export function AgentNavigationControls({ onCreateTask, onOpenServices }: { onCreateTask: () => void; onOpenServices: () => void }) {
  return <><button className="synthia-page-link" type="button" onClick={onCreateTask}>Create task</button><button className="synthia-inline-link" type="button" onClick={onOpenServices}>Service connections</button></>;
}

export default function Agent() {
  const readiness = trpc.catalog.executionReadiness.useQuery();
  const tasks = trpc.tasks.list.useQuery(undefined, { retry: false });
  const services = trpc.workspace.serviceReadiness.useQuery(undefined, { retry: false });
  const [, setLocation] = useLocation();
  const active = tasks.data?.filter(task => ["queued", "booting", "planning", "running", "needs_input", "paused"].includes(task.status)) ?? [];
  const executionReady = readiness.data?.queueConfigured ?? false;
  const configuredModels = services.data?.filter(service => service.category === "model" && service.configured).length ?? 0;
  const configuredSearch = services.data?.filter(service => service.category === "search" && service.configured).length ?? 0;
  const configuredSandboxes = services.data?.filter(service => service.category === "sandbox" && service.configured).length ?? 0;
  const runtimeCopy = runtimeCapabilityCopy({ isLoading: services.isLoading, configuredModels, configuredSearch, configuredSandboxes });
  return <section className="synthia-page"><header className="synthia-page-head"><div><p className="synthia-eyebrow">Autonomous control plane</p><h1>Agent</h1><p>Monitor the live task queue, runtime prerequisites, and autonomous safeguards behind each Synthia workspace.</p></div><AgentNavigationControls onCreateTask={() => setLocation("/")} onOpenServices={() => setLocation("/settings/services")} /></header>
    <div className="synthia-compact-grid"><article className="synthia-compact-card"><div><b>Execution readiness</b><p>{executionReady ? "The durable execution queue is configured." : "Connect the execution queue before live work can begin."}</p></div>{executionReady ? <CheckCircle2 className="text-emerald-400" size={18} /> : <CircleAlert className="text-amber-300" size={18} />}</article><article className="synthia-compact-card"><div><b>Active tasks</b><p>{agentTaskStateCopy({ isLoading: tasks.isLoading, isError: tasks.isError, activeCount: active.length })}</p></div>{tasks.isLoading ? <Loader2 className="animate-spin" size={17} /> : <Bot size={17} />}</article><article className="synthia-compact-card"><div><b>Approval gates</b><p>High-risk external actions require a recorded approval before execution.</p></div><ShieldCheck className="text-cyan-200" size={18} /></article></div>
    <section className="mt-5"><div className="synthia-section-heading"><div><p className="synthia-eyebrow">Runtime capabilities</p><h2>What the current agent can use</h2></div><AgentNavigationControls onCreateTask={() => setLocation("/")} onOpenServices={() => setLocation("/settings/services")} /></div><div className="synthia-compact-grid mt-3"><article className="synthia-compact-card"><Cpu className="text-cyan-200" size={17} /><div><b>Models</b><p>{runtimeCopy.models}</p></div></article><article className="synthia-compact-card"><SearchCheck className="text-cyan-200" size={17} /><div><b>Web research</b><p>{runtimeCopy.search}</p></div></article><article className="synthia-compact-card"><TerminalSquare className="text-cyan-200" size={17} /><div><b>Sandbox</b><p>{runtimeCopy.sandbox}</p></div></article></div></section>
    {!tasks.isLoading && !tasks.isError && active.length > 0 ? <section className="mt-5"><div className="synthia-section-heading"><div><p className="synthia-eyebrow">Live work</p><h2>Active task workspaces</h2></div></div><div className="mt-3 grid gap-2">{active.slice(0, 6).map(task => <button type="button" key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="synthia-agent-task"><span><b>{task.title}</b><small>{task.currentStepSummary || task.status}</small></span><span className="synthia-status-pill">{task.status.replaceAll("_", " ")}</span></button>)}</div></section> : null}
  </section>;
}
