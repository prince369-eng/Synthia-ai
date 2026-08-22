import React, { useState } from "react";
import { ArrowRight, FolderPlus, Loader2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function ProjectCreateForm({ pending, onCreate }: { pending: boolean; onCreate: (input: { name: string; description?: string }) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return <form className="synthia-inline-form" onSubmit={event => { event.preventDefault(); onCreate({ name, description: description || undefined }); }}><input aria-label="Project name" value={name} onChange={e => setName(e.target.value)} placeholder="Project name" minLength={2} maxLength={120} required /><input aria-label="Project description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional context" maxLength={2000} /><button disabled={pending}>{pending ? <Loader2 className="animate-spin" size={14} /> : "Create"}</button></form>;
}

export function ProjectWorkspaceLink({ onOpen }: { onOpen: () => void }) {
  return <button type="button" onClick={onOpen}>Open tasks</button>;
}

export function ProjectsEmptyState({ onOpenTasks }: { onOpenTasks: () => void }) {
  return <section className="synthia-empty-state synthia-project-empty" aria-labelledby="projects-empty-heading"><FolderPlus size={18} /><div><h2 id="projects-empty-heading">No projects yet</h2><span>Create a focused context when it helps, then start tasks from your dashboard.</span></div><button type="button" className="synthia-button-secondary" onClick={onOpenTasks}>Open tasks <ArrowRight size={13} /></button></section>;
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const projects = trpc.projects.list.useQuery(undefined, { retry: false });
  const create = trpc.projects.create.useMutation({ onSuccess: () => { void utils.projects.list.invalidate(); setShowForm(false); } });
  return <section className="synthia-page"><header className="synthia-page-head"><div><p className="synthia-eyebrow">Workspace context</p><h1>Projects</h1><p>Keep related autonomous tasks together without losing their individual replay history.</p></div><button className="synthia-compact-action" onClick={() => setShowForm(v => !v)}><Plus size={15} /> New project</button></header>
    {showForm ? <ProjectCreateForm pending={create.isPending} onCreate={input => create.mutate(input)} /> : null}
    {projects.isLoading ? <div className="synthia-empty-state"><Loader2 className="animate-spin" size={16} /> Loading projects…</div> : null}
    {projects.isError ? <div className="synthia-empty-state">Projects are temporarily unavailable. Refresh the workspace or try again shortly.</div> : null}
    {!projects.isLoading && !projects.isError && projects.data?.length === 0 ? <ProjectsEmptyState onOpenTasks={() => setLocation("/")} /> : null}
    <div className="synthia-compact-grid">{projects.data?.map(project => <article className="synthia-compact-card" key={project.id}><div><b>{project.name}</b><p>{project.description || "No project context added."}</p></div><ProjectWorkspaceLink onOpen={() => setLocation("/")} /></article>)}</div>
  </section>;
}
