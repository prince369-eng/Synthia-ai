import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useTaskEventStream } from "@/hooks/useTaskEventStream";
import { AlertTriangle, Archive, AudioLines, BookOpenText, Bot, CalendarClock, Check, ChevronLeft, CirclePause, Code2, ExternalLink, FileCode2, FileText, FolderTree, Globe2, ImagePlus, ListTree, Loader2, Maximize2, Minimize2, MoreHorizontal, MonitorDot, Pencil, Pin, Play, Send, Square, Star, TerminalSquare, Trash2, Video, Wand2, X } from "lucide-react";
import { WORKSPACE_RETURN_ROUTES } from "@/lib/workspaceLayout";
import React, { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

type WorkspaceTab = "screen" | "website" | "code" | "terminal" | "files" | "timeline" | "plan";

const statusColor: Record<string, string> = { queued: "text-teal-300", booting: "text-teal-300", planning: "text-cyan-300", running: "text-cyan-300", needs_input: "text-rose-300", paused: "text-[#a5b6b1]", completed: "text-emerald-300", failed: "text-rose-300", cancelled: "text-[#a5b6b1]" };

function localTime(value: Date | string | number | null | undefined) { return value ? new Date(value).toLocaleString() : "—"; }
function asRecord(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function timelinePayload(event: { type: string; payload: unknown }) {
  const payload = asRecord(event.payload);
  if (event.type === "skill_loaded") {
    const names = Array.isArray(payload.skillNames) ? payload.skillNames.filter((value): value is string => typeof value === "string") : [];
    const count = typeof payload.count === "number" ? payload.count : names.length;
    return names.length ? `Reviewed Skills available for this task: ${names.join(", ")}.` : `${count} reviewed Skill${count === 1 ? "" : "s"} made available for this task.`;
  }
  return JSON.stringify(payload);
}

export default function TaskWorkspace({ replayMode = false }: { replayMode?: boolean }) {
  const route = replayMode ? useRoute("/tasks/:taskId/replay") : useRoute("/tasks/:taskId");
  const taskId = route[1]?.taskId;
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<WorkspaceTab>("code");
  const [computerMode, setComputerMode] = useState<"split" | "focus">("split");
  const [panelPending, setPanelPending] = useState(false);
  const [message, setMessage] = useState("");
  const [replayCursor, setReplayCursor] = useState<number | undefined>();
  const snapshot = trpc.tasks.get.useQuery({ taskId: taskId ?? "00000000-0000-4000-8000-000000000000" }, { enabled: Boolean(taskId), refetchInterval: 10_000 });
  const { connected } = useTaskEventStream(taskId);
  const utils = trpc.useUtils();
  const addMessage = trpc.tasks.addMessage.useMutation({ onSuccess: () => { setMessage(""); void utils.tasks.get.invalidate({ taskId }); } });
  const pause = trpc.tasks.pause.useMutation({ onSuccess: () => void utils.tasks.get.invalidate({ taskId }) });
  const resume = trpc.tasks.resume.useMutation({ onSuccess: () => void utils.tasks.get.invalidate({ taskId }) });
  const cancel = trpc.tasks.cancel.useMutation({ onSuccess: () => void utils.tasks.get.invalidate({ taskId }) });
  const resolveApproval = trpc.approvals.resolve.useMutation({ onSuccess: () => void utils.tasks.get.invalidate({ taskId }) });
  const data = snapshot.data;
  const task = data?.task;
  const events = useMemo(() => replayCursor === undefined ? data?.events ?? [] : (data?.events ?? []).filter(event => event.sequenceNumber <= replayCursor), [data?.events, replayCursor]);

  function sendMessage(event: FormEvent) { event.preventDefault(); if (taskId && message.trim()) addMessage.mutate({ taskId, content: message.trim() }); }
  if (snapshot.isLoading) return <div className="grid min-h-screen place-items-center text-sm text-[#91a7a1]"><Loader2 className="mr-2 animate-spin" size={16} />Loading task workspace…</div>;
  if (snapshot.isError || !task || !taskId) return <main className="p-8"><Link href={WORKSPACE_RETURN_ROUTES.dashboard} className="text-sm text-cyan-300">← Back to tasks</Link><p role="alert" className="mt-5 text-rose-300">{snapshot.error?.message ?? "The requested task is unavailable."}</p></main>;

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Code2 }> = [{ id: "screen", label: "Screen", icon: MonitorDot }, { id: "website", label: "Website", icon: Globe2 }, { id: "code", label: "Code", icon: Code2 }, { id: "terminal", label: "Terminal", icon: TerminalSquare }, { id: "files", label: "Files", icon: FolderTree }, { id: "timeline", label: "Timeline", icon: ListTree }, { id: "plan", label: "Plan", icon: FileText }];
  const activeApprovals = data.approvals.filter(approval => approval.status === "pending");
  const planSteps = Array.isArray(task.plan) ? task.plan.filter(step => step && typeof step === "object") as Array<{ state?: string; title?: string }> : [];
  const completedPlanSteps = planSteps.filter(step => step.state === "completed" || step.state === "done").length;
  const selectTab = (nextTab: WorkspaceTab) => {
    if (nextTab === tab) return;
    setPanelPending(true);
    setTab(nextTab);
    window.setTimeout(() => setPanelPending(false), 180);
  };
  const focusMode = computerMode === "focus" && (tab === "code" || tab === "website");

  return <div className={cn("synthia-workspace", focusMode && "synthia-workspace-focus")}>
    <header className="synthia-workspace-header"><div className="min-w-0"><WorkspaceReturnNavigation onNavigate={setLocation} /><h1 className="mt-1 truncate text-sm font-semibold text-[#e5f2ef]">{task.title}</h1></div><div className="flex items-center gap-2"><span className={cn("hidden text-[11px] font-medium sm:inline", statusColor[task.status])}>{task.status.replace(/_/g, " ")}</span><span title={connected ? "Live task stream connected" : "Reconnecting task stream"} className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />{task.status === "running" || task.status === "planning" || task.status === "booting" ? <Button size="sm" variant="outline" onClick={() => pause.mutate({ taskId })} disabled={pause.isPending} className="h-7 border-white/12 bg-transparent px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5"><CirclePause size={13} />Pause</Button> : null}{task.status === "paused" || task.status === "needs_input" ? <Button size="sm" onClick={() => resume.mutate({ taskId })} disabled={resume.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300"><Play size={13} />Resume</Button> : null}{!["completed", "failed", "cancelled"].includes(task.status) ? <Button size="sm" variant="ghost" onClick={() => cancel.mutate({ taskId })} disabled={cancel.isPending} className="h-7 px-2 text-[11px] text-[#91a7a1] hover:text-rose-300"><Square size={12} />Stop</Button> : null}<TaskMediaMenu taskId={taskId} attachments={data.attachments} /><TaskOverflowMenu task={task} taskId={taskId} onDeleted={() => setLocation(WORKSPACE_RETURN_ROUTES.dashboard)} /></div></header>
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(320px,.9fr)_minmax(480px,1.2fr)]">
      <section className="flex min-h-0 flex-col border-r border-white/8">
        <div className="border-b border-white/8 px-4 py-4 sm:px-5"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-cyan-300">Task objective</p><p className="mt-1.5 max-w-3xl text-xs leading-5 text-[#c7ddd7]">{task.goal}</p>{planSteps.length > 0 ? <div className="mt-3 rounded-lg border border-cyan-300/12 bg-cyan-300/[.035] p-2.5" aria-label="Task progress"><div className="flex items-center justify-between text-[10px]"><span className="font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">Task progress</span><span className="text-cyan-200">{completedPlanSteps}/{planSteps.length}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-[width] duration-300" style={{ width: `${Math.round((completedPlanSteps / planSteps.length) * 100)}%` }} /></div></div> : null}{replayMode ? <div className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/5 px-2.5 py-1.5 text-[11px] text-cyan-100">Replay mode — move through the durable event record without changing task execution.</div> : null}</div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {data.messages.length === 0 ? <div className="rounded-lg border border-dashed border-white/12 p-4 text-xs text-[#968678]">No narrated messages have been recorded yet. Status and tool events remain visible in the Agent’s Computer.</div> : null}
          {data.messages.map(entry => <article key={entry.id} className={cn("max-w-[92%] rounded-xl px-3 py-2.5", entry.role === "user" ? "ml-auto bg-teal-400/12 text-cyan-50" : "border border-white/8 bg-white/[.035] text-[#dcece7]")}><p className="mb-1 text-[9px] font-semibold uppercase tracking-[.13em] text-[#91a7a1]">{entry.role === "agent" ? "Synthia" : entry.role}</p><p className="whitespace-pre-wrap text-xs leading-5">{entry.content}</p><time className="mt-1.5 block text-[9px] text-[#718580]">{localTime(entry.createdAt)}</time></article>)}
          {activeApprovals.map(approval => <article key={approval.id} className="rounded-xl border border-amber-300/25 bg-amber-300/[.07] p-3"><div className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 text-amber-300" size={16} /><div><p className="text-xs font-semibold text-amber-100">Approval required</p><p className="mt-1 text-xs leading-5 text-[#dccdb8]">{approval.description}</p><p className="mt-1.5 text-[11px] text-[#a89983]">Tool: {approval.toolName} · Risk: {approval.riskLevel}</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => resolveApproval.mutate({ taskId, approvalId: approval.id, decision: "approved" })} disabled={resolveApproval.isPending} className="h-7 bg-amber-300 px-2 text-[11px] text-[#2c1b0d] hover:bg-amber-200"><Check size={13} />Approve</Button><Button size="sm" variant="outline" onClick={() => resolveApproval.mutate({ taskId, approvalId: approval.id, decision: "rejected" })} disabled={resolveApproval.isPending} className="h-7 border-amber-200/25 bg-transparent px-2 text-[11px] text-amber-100 hover:bg-amber-300/10"><X size={13} />Reject</Button></div></div></div></article>)}
        </div>
        {!replayMode ? <form onSubmit={sendMessage} className="border-t border-white/8 p-3"><label className="sr-only" htmlFor="task-message">Send a message to Synthia</label><div className="flex gap-2"><Input id="task-message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Add a constraint or answer Synthia…" className="h-8 border-white/10 bg-[#14201e] text-xs text-[#e5f2ef] placeholder:text-[#69807a]" /><Button type="submit" size="icon" disabled={!message.trim() || addMessage.isPending} className="h-8 w-8 shrink-0 bg-teal-400 text-[#072a27] hover:bg-cyan-300"><Send size={14} /></Button></div>{addMessage.isError ? <p role="alert" className="mt-2 text-[11px] text-rose-300">{addMessage.error.message}</p> : null}</form> : null}
      </section>
      <aside className="flex min-h-0 flex-col bg-[#101b19]" aria-label="Agent's Computer">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3"><div><p className="flex items-center gap-2 text-xs font-semibold text-[#e5f2ef]"><Bot size={15} className="text-cyan-300" />Agent’s Computer</p><p className="mt-0.5 text-[10px] text-[#778985]">Task progress · {tabs.find(item => item.id === tab)?.label ?? "Workspace"} selected</p></div><div className="flex items-center gap-1.5">{tab === "code" || tab === "website" ? <button type="button" onClick={() => setComputerMode(mode => mode === "split" ? "focus" : "split")} aria-label={computerMode === "split" ? `Open ${tab} in full screen` : `Return ${tab} to split screen`} title={computerMode === "split" ? "Full-screen view" : "Split-screen view"} className="synthia-computer-mode-button">{computerMode === "split" ? <Maximize2 size={13} /> : <Minimize2 size={13} />}</button> : null}{data.sandboxes[0] ? <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-300">Sandbox {data.sandboxes[0].status}</span> : <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-[#91a7a1]">No sandbox yet</span>}</div></div>
        <div className="flex overflow-x-auto border-b border-white/8 px-2" role="tablist" aria-label="Agent workspace panels">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => selectTab(item.id)} className={cn("flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[11px]", tab === item.id ? "border-teal-400 text-cyan-200" : "border-transparent text-[#778985] hover:text-[#c7ddd7]")}><Icon size={13} />{item.label}</button>; })}</div>
        <div className={cn("synthia-computer-panel min-h-0 flex-1 overflow-y-auto p-3", panelPending && "synthia-computer-panel-pending")} aria-busy={panelPending}>
          {panelPending ? <div className="synthia-computer-skeleton" aria-label="Loading workspace panel"><span /><span /><span /><span /></div> : null}
          {!panelPending && tab === "code" ? <CodePanel taskId={taskId} deliverables={data.deliverables} events={events} onOpenTab={selectTab} /> : null}
          {!panelPending && tab === "screen" ? <ScreenPanel taskId={taskId} deliverables={data.deliverables} /> : null}
          {!panelPending && tab === "website" ? <WebsitePanel taskId={taskId} deliverables={data.deliverables} /> : null}
          {!panelPending && tab === "terminal" ? <TerminalPanel events={events} /> : null}
          {!panelPending && tab === "files" ? <FilesPanel taskId={taskId} deliverables={data.deliverables} /> : null}
          {!panelPending && tab === "timeline" ? <TimelinePanel events={events} replayMode={replayMode} replayCursor={replayCursor} setReplayCursor={setReplayCursor} allEvents={data.events} /> : null}
          {!panelPending && tab === "plan" ? <PlanPanel plan={task.plan as Array<any>} /> : null}
        </div>
      </aside>
    </div>
  </div>;
}

export function WorkspaceReturnNavigation({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <div className="synthia-workspace-return-nav" aria-label="Workspace return navigation"><button type="button" onClick={() => onNavigate(WORKSPACE_RETURN_ROUTES.dashboard)}><ChevronLeft size={13} />Dashboard</button><button type="button" onClick={() => onNavigate(WORKSPACE_RETURN_ROUTES.library)}><BookOpenText size={13} />Library</button></div>;
}

export function TaskMediaMenu({ taskId, attachments }: { taskId: string; attachments: Array<{ id: string; filename: string; fileType: string }> }) {
  const utils = trpc.useUtils();
  const media = trpc.catalog.media.useQuery();
  const [kind, setKind] = useState<"image" | "video" | "audio" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [referenceAttachmentId, setReferenceAttachmentId] = useState<string>("");
  const generate = trpc.tasks.generateMedia.useMutation({
    onSuccess: () => {
      setKind(null);
      setPrompt("");
      setReferenceAttachmentId("");
      void utils.tasks.get.invalidate({ taskId });
    },
  });
  const capability = kind ? media.data?.[kind] : undefined;
  const imageAttachments = attachments.filter(attachment => ["image/png", "image/jpeg", "image/webp"].includes(attachment.fileType));
  const unavailableLabel = (type: "image" | "video" | "audio") => media.data?.[type]?.reason ?? `${type[0].toUpperCase()}${type.slice(1)} generation is unavailable until its provider is configured.`;
  const open = (type: "image" | "video" | "audio") => { if (media.data?.[type]?.configured) setKind(type); };

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Open media generation" title="Media generation" className="h-7 w-7 text-[#91a7a1] hover:bg-white/5 hover:text-cyan-200"><Wand2 size={15} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-white/10 bg-[#14201e] text-[#e5f2ef]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-[#91a7a1]">Task media</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => open("image")} disabled={!media.data?.image.configured} title={unavailableLabel("image")} className="gap-2"><ImagePlus size={14} />Generate image <span className="ml-auto text-[9px] text-[#9c8c7d]">{media.data?.image.configured ? media.data.image.models[0] : "Unavailable"}</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("video")} disabled={!media.data?.video.configured} title={unavailableLabel("video")} className="gap-2"><Video size={14} />Generate video <span className="ml-auto text-[9px] text-[#9c8c7d]">{media.data?.video.configured ? media.data.video.models[0] : "Unavailable"}</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("audio")} disabled={!media.data?.audio?.configured} title={unavailableLabel("audio")} className="gap-2"><AudioLines size={14} />Generate audio <span className="ml-auto text-[9px] text-[#9c8c7d]">{media.data?.audio?.configured ? media.data.audio.models[0] : "Unavailable"}</span></DropdownMenuItem>
        {!media.isLoading && !media.data?.image.configured && !media.data?.video.configured && !media.data?.audio?.configured ? <p className="px-2 py-2 text-[10px] leading-4 text-[#778985]">Generation is shown only after secure provider configuration passes its readiness check.</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
    {kind ? <div role="dialog" aria-modal="true" aria-label={`Generate ${kind}`} className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"><form onSubmit={event => { event.preventDefault(); if (prompt.trim()) generate.mutate({ taskId, kind, prompt: prompt.trim(), referenceAttachmentId: kind === "audio" ? undefined : referenceAttachmentId || undefined }); }} className="w-full max-w-md rounded-xl border border-white/10 bg-[#14201e] p-4 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#e5f2ef]">Generate {kind}</p><p className="mt-1 text-[11px] leading-4 text-[#91a7a1]">{capability?.provider} · {capability?.models[0]}</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setKind(null)} className="h-7 w-7 text-[#91a7a1]"><X size={14} /></Button></div><label className="mt-4 block text-[11px] font-medium text-[#c7ddd7]" htmlFor="media-prompt">Prompt</label><Input id="media-prompt" autoFocus value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={kind === "audio" ? 4_096 : 4_000} placeholder={kind === "audio" ? "Enter the text to narrate…" : `Describe the ${kind} to generate…`} className="mt-1.5 border-white/10 bg-[#101b19] text-[#e5f2ef]" />{kind !== "audio" && imageAttachments.length ? <label className="mt-3 block text-[11px] font-medium text-[#c7ddd7]" htmlFor="media-reference">Image reference <span className="font-normal text-[#778985]">(optional)</span><select id="media-reference" value={referenceAttachmentId} onChange={event => setReferenceAttachmentId(event.target.value)} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#101b19] px-2 text-xs text-[#e5f2ef]"><option value="">No reference image</option>{imageAttachments.map(attachment => <option key={attachment.id} value={attachment.id}>{attachment.filename}</option>)}</select></label> : null}{generate.isError ? <p role="alert" className="mt-3 text-[11px] text-rose-300">{generate.error.message}</p> : null}<div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setKind(null)}>Cancel</Button><Button type="submit" disabled={!prompt.trim() || generate.isPending} className="bg-teal-400 text-[#072a27] hover:bg-cyan-300">{generate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}Generate</Button></div></form></div> : null}
  </>;
}

export function TaskOverflowMenu({ task, taskId, onDeleted }: { task: { title: string; isPinned: boolean; isFavorite: boolean; isArchived: boolean }; taskId: string; onDeleted: () => void }) {
  const utils = trpc.useUtils();
  const [renameDraft, setRenameDraft] = useState("");
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const refresh = async () => { await utils.tasks.get.invalidate({ taskId }); await utils.tasks.list.invalidate(); };
  const rename = trpc.tasks.rename.useMutation({ onSuccess: () => { setShowRename(false); void refresh(); } });
  const setPinned = trpc.tasks.setPinned.useMutation({ onSuccess: () => void refresh() });
  const setFavorite = trpc.tasks.setFavorite.useMutation({ onSuccess: () => void refresh() });
  const setArchived = trpc.tasks.setArchived.useMutation({ onSuccess: () => void refresh() });
  const remove = trpc.tasks.delete.useMutation({ onSuccess: onDeleted });
  const busy = rename.isPending || setPinned.isPending || setFavorite.isPending || setArchived.isPending || remove.isPending;

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Open task actions" title="Task actions" className="h-7 w-7 text-[#a89889] hover:bg-white/5 hover:text-[#f5e9da]"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#14201e] text-[#e5f2ef]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-[#91a7a1]">Task actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => { setRenameDraft(task.title); setShowRename(true); }} className="gap-2"><Pencil size={14} />Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void setPinned.mutate({ taskId, isPinned: !task.isPinned })} disabled={busy} className="gap-2"><Pin size={14} />{task.isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void setFavorite.mutate({ taskId, isFavorite: !task.isFavorite })} disabled={busy} className="gap-2"><Star size={14} />{task.isFavorite ? "Remove from favorites" : "Add to favorites"}</DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 text-[#837466]"><CalendarClock size={14} />Schedule a task <span className="ml-auto text-[9px]">Unavailable</span></DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onSelect={() => void setArchived.mutate({ taskId, isArchived: !task.isArchived })} disabled={busy} className="gap-2"><Archive size={14} />{task.isArchived ? "Restore from archive" : "Archive"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} disabled={busy} className="gap-2 text-rose-300 focus:text-rose-200"><Trash2 size={14} />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {showRename ? <div role="dialog" aria-modal="true" aria-label="Rename task" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"><form onSubmit={event => { event.preventDefault(); if (renameDraft.trim()) rename.mutate({ taskId, title: renameDraft.trim() }); }} className="w-full max-w-sm rounded-xl border border-white/10 bg-[#14201e] p-4 shadow-2xl"><p className="text-sm font-semibold text-[#e5f2ef]">Rename task</p><Input autoFocus value={renameDraft} onChange={event => setRenameDraft(event.target.value)} maxLength={180} className="mt-3 border-white/10 bg-[#101b19] text-[#e5f2ef]" /><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowRename(false)}>Cancel</Button><Button type="submit" disabled={!renameDraft.trim() || rename.isPending} className="bg-teal-400 text-[#072a27] hover:bg-cyan-300">Save</Button></div></form></div> : null}
    {showDeleteConfirm ? <div role="alertdialog" aria-modal="true" aria-label="Delete task" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"><div className="w-full max-w-sm rounded-xl border border-rose-300/20 bg-[#201913] p-4 shadow-2xl"><p className="text-sm font-semibold text-[#f5e9da]">Delete this task?</p><p className="mt-2 text-xs leading-5 text-[#b9aa9a]">The task is removed from your workspace and cancelled if it is still active. This action cannot be undone from the interface.</p><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button><Button type="button" disabled={remove.isPending} onClick={() => remove.mutate({ taskId })} className="bg-rose-500 text-white hover:bg-rose-400">Delete task</Button></div></div></div> : null}
  </>;
}

function CodePanel({ taskId, deliverables, events, onOpenTab }: { taskId: string; deliverables: Array<any>; events: Array<any>; onOpenTab: (tab: WorkspaceTab) => void }) {
  const [selectedPath, setSelectedPath] = useState<string>();
  const computer = trpc.tasks.liveComputer.useQuery({ taskId }, { retry: false });
  const files = trpc.tasks.liveComputerFiles.useQuery({ taskId }, { enabled: Boolean(computer.data?.available), retry: false });
  const source = trpc.tasks.liveComputerSource.useQuery({ taskId, path: selectedPath ?? "/workspace/.unselected" }, { enabled: Boolean(selectedPath), retry: false });
  React.useEffect(() => {
    if (!selectedPath && files.data?.files[0]?.path) setSelectedPath(files.data.files[0].path);
  }, [files.data?.files, selectedPath]);
  const terminalEvents = events.filter(event => ["tool_call", "tool_result", "error"].includes(event.type));
  const latestEvent = events.at(-1);
  const fallback = events.filter(event => event.type === "tool_result").map(event => JSON.stringify(asRecord(event.payload), null, 2)).join("\n\n");
  return <div className="grid h-full min-h-[440px] grid-rows-[minmax(250px,1fr)_auto] overflow-hidden rounded-lg border border-white/8 bg-[#101b19]"><div className="grid min-h-0 grid-cols-[156px_minmax(0,1fr)]"><div className="overflow-y-auto border-r border-white/8 p-3"><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.15em] text-[#778985]">Task workspace</p>{computer.isLoading ? <p className="text-[11px] text-[#91a7a1]">Checking task computer…</p> : computer.data?.available ? <>{files.isLoading ? <p className="text-[11px] text-[#91a7a1]">Loading files…</p> : files.data?.files.map(file => <button key={file.path} type="button" onClick={() => setSelectedPath(file.path)} title={file.path} className={cn("mb-1 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px]", selectedPath === file.path ? "bg-teal-300/10 text-cyan-100" : "text-[#c7ddd7] hover:bg-white/[.04]")} style={{ paddingLeft: `${6 + Math.min(file.depth, 4) * 8}px` }}><FileCode2 size={12} className="shrink-0 text-cyan-300" /><span className="truncate">{file.name}</span></button>)}</> : <p className="text-[11px] leading-5 text-[#91a7a1]">{computer.data?.reason ?? "No active task computer is available."}</p>}{deliverables.length > 0 ? <><p className="mb-2 mt-4 text-[9px] font-semibold uppercase tracking-[.15em] text-[#778985]">Published</p>{deliverables.map(item => <div key={item.id} className="mb-1.5 flex items-center gap-1.5 text-[11px] text-[#c7ddd7]"><FileText size={12} className="text-cyan-300" /><span className="truncate">{item.filename}</span></div>)}</> : null}</div><div className="min-w-0 overflow-y-auto p-3"><p className="font-mono text-[11px] text-teal-300">{selectedPath ? `// ${selectedPath}` : "// Editor context · agent tool output"}</p>{source.isLoading ? <p className="mt-3 text-[11px] text-[#91a7a1]">Opening task file…</p> : source.data ? <><pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#c7ddd7]">{source.data.content}</pre>{source.data.truncated ? <p className="mt-3 text-[10px] text-[#91a7a1]">Preview truncated to keep Live Computer responsive.</p> : null}</> : <pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#c7ddd7]">{fallback || "Start a task to see agent tool output. Task-scoped source inspection appears when an active sandbox emits workspace files."}</pre>}</div></div><div className="grid grid-cols-3 gap-px border-t border-white/8 bg-white/8"><button onClick={() => onOpenTab("terminal")} className="min-w-0 bg-[#14201e] p-2.5 text-left hover:bg-white/[.035]"><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.13em] text-cyan-300"><TerminalSquare size={11} />Terminal</span><p className="mt-1.5 truncate font-mono text-[10px] text-[#91a7a1]">{terminalEvents.length ? `${terminalEvents.length} recorded tool event${terminalEvents.length === 1 ? "" : "s"}` : "No terminal output"}</p></button><button onClick={() => onOpenTab("timeline")} className="min-w-0 bg-[#14201e] p-2.5 text-left hover:bg-white/[.035]"><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.13em] text-cyan-300"><ListTree size={11} />Timeline</span><p className="mt-1.5 truncate text-[10px] text-[#91a7a1]">{latestEvent ? `#${latestEvent.sequenceNumber} · ${latestEvent.type}` : "No events yet"}</p></button><button onClick={() => onOpenTab("files")} className="min-w-0 bg-[#14201e] p-2.5 text-left hover:bg-white/[.035]"><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.13em] text-cyan-300"><FileText size={11} />Artifacts</span><p className="mt-1.5 truncate text-[10px] text-[#91a7a1]">{deliverables.length ? `${deliverables.length} published` : "No artifacts"}</p></button></div></div>;
}
export function isScreenCapture(deliverable: { fileType?: unknown }) { return typeof deliverable.fileType === "string" && deliverable.fileType.startsWith("image/"); }
export function isWebsiteArtifact(deliverable: { fileType?: unknown; filename?: unknown }) { return deliverable.fileType === "text/html" || (typeof deliverable.filename === "string" && /\.html?$/i.test(deliverable.filename)); }

function ScreenPanel({ taskId, deliverables }: { taskId: string; deliverables: Array<any> }) {
  const [requested, setRequested] = useState(false);
  const computer = trpc.tasks.liveComputer.useQuery({ taskId }, { retry: false });
  const liveFrame = trpc.tasks.liveComputerScreen.useQuery({ taskId }, { enabled: requested, retry: false });
  const frame = deliverables.find(isScreenCapture);
  return <div className="grid min-h-[480px] place-items-center rounded-xl border border-white/8 bg-[#11100e] p-6 text-center">{liveFrame.data?.dataUrl ? <div><img src={liveFrame.data.dataUrl} alt="Current task sandbox screen" className="max-h-[520px] rounded-lg" /><p className="mt-3 text-[10px] text-[#778985]">Captured {localTime(liveFrame.data.capturedAt)}</p><Button size="sm" variant="outline" onClick={() => void liveFrame.refetch()} className="mt-3 h-7 border-white/12 bg-transparent px-2 text-[11px] text-cyan-100">Refresh screen</Button></div> : frame ? <ArtifactPreview taskId={taskId} deliverable={frame} /> : <div><MonitorDot className="mx-auto text-[#736559]" size={32} /><p className="mt-3 text-sm text-[#a59686]">Task screen is available when the active sandbox supports capture.</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#78695d]">{computer.data?.reason ?? "Checking the task computer…"}</p>{computer.data?.canCaptureScreen ? <Button size="sm" onClick={() => setRequested(true)} disabled={liveFrame.isFetching} className="mt-4 h-8 bg-teal-400 px-3 text-xs text-[#072a27] hover:bg-cyan-300">{liveFrame.isFetching ? <><Loader2 className="animate-spin" size={13} />Capturing</> : <><MonitorDot size={13} />View live screen</>}</Button> : null}{liveFrame.isError ? <p role="alert" className="mt-3 text-[11px] text-rose-300">{liveFrame.error.message}</p> : null}</div>}</div>;
}
function WebsitePanel({ taskId, deliverables }: { taskId: string; deliverables: Array<any> }) {
  const website = deliverables.find(isWebsiteArtifact);
  const artifact = trpc.tasks.artifactUrl.useQuery({ taskId, deliverableId: website?.id ?? "" }, { enabled: Boolean(website), retry: false });
  if (!website) return <div className="grid min-h-[480px] place-items-center rounded-xl border border-dashed border-white/12 bg-[#11100e] p-6 text-center"><div><Globe2 className="mx-auto text-cyan-300/70" size={32} /><p className="mt-3 text-sm text-[#c7ddd7]">No task website is available yet.</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#778985]">When Synthia publishes an HTML website for this task, it will appear here as a task-owned preview.</p></div></div>;
  if (artifact.isLoading) return <div className="grid min-h-[480px] place-items-center rounded-xl border border-white/8 bg-[#11100e] text-xs text-[#91a7a1]"><Loader2 className="mr-2 animate-spin" size={15} />Preparing the task website…</div>;
  if (artifact.isError || !artifact.data?.url) return <div className="grid min-h-[480px] place-items-center rounded-xl border border-white/8 bg-[#11100e] p-6 text-center"><p role="alert" className="text-xs text-rose-300">This task website preview is unavailable.</p></div>;
  return <div className="overflow-hidden rounded-xl border border-white/8 bg-[#11100e]"><div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-2"><span className="min-w-0 truncate text-[11px] text-[#c7ddd7]">{website.filename}</span><a href={artifact.data.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-teal-300/20 px-2 py-1 text-[10px] font-medium text-cyan-200 hover:bg-teal-300/10"><ExternalLink size={12} />Open website</a></div><iframe title={`Task website preview: ${website.filename}`} src={artifact.data.url} sandbox="allow-forms allow-modals allow-popups allow-scripts" className="h-[440px] w-full bg-white" /></div>;
}
function TerminalPanel({ events }: { events: Array<any> }) { const output = events.filter(event => ["tool_call", "tool_result", "error"].includes(event.type)); return <div className="min-h-[480px] rounded-xl border border-white/8 bg-[#101b19] p-4 font-mono text-xs leading-6">{output.length === 0 ? <span className="text-[#778985]">No terminal or tool output has been produced for this task.</span> : output.map(event => <div key={event.id} className="mb-3"><span className="text-cyan-300">[{event.type}]</span><pre className="whitespace-pre-wrap text-[#c7ddd7]">{JSON.stringify(asRecord(event.payload), null, 2)}</pre></div>)}</div>; }
function ArtifactPreview({ taskId, deliverable }: { taskId: string; deliverable: { id: string; filename: string } }) {
  const artifact = trpc.tasks.artifactUrl.useQuery({ taskId, deliverableId: deliverable.id }, { retry: false });
  if (artifact.isLoading) return <div className="text-xs text-[#a59686]"><Loader2 className="mx-auto mb-2 animate-spin" size={16} />Loading secure screen capture…</div>;
  if (artifact.isError || !artifact.data?.url) return <div className="text-xs text-[#a59686]">The latest secure screen capture is unavailable.</div>;
  return <img src={artifact.data.url} alt={`Sandbox capture ${deliverable.filename}`} className="max-h-[520px] rounded-lg" />;
}

export function ArtifactOpenButton({ taskId, deliverable }: { taskId: string; deliverable: { id: string; filename: string } }) {
  const artifact = trpc.tasks.artifactUrl.useQuery({ taskId, deliverableId: deliverable.id }, { enabled: false, retry: false });
  async function openArtifact() {
    const result = await artifact.refetch();
    if (!result.data?.url) return;
    const link = document.createElement("a");
    link.href = result.data.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }
  return <span className="shrink-0 text-right"><button type="button" aria-label={`Open ${deliverable.filename}`} onClick={() => void openArtifact()} disabled={artifact.isFetching} className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-[#778985]">{artifact.isFetching ? <Loader2 className="animate-spin" size={13} /> : <ExternalLink size={13} />}{artifact.isFetching ? "Preparing" : "Open"}</button>{artifact.isError ? <small role="alert" className="mt-1 block text-[10px] text-rose-300">File unavailable</small> : null}</span>;
}

function FilesPanel({ taskId, deliverables }: { taskId: string; deliverables: Array<any> }) { return <div>{deliverables.length === 0 ? <div className="rounded-xl border border-dashed border-white/12 p-6 text-sm text-[#91a7a1]">No deliverables have been published by this task.</div> : <div className="space-y-2">{deliverables.map(item => <article key={item.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 hover:border-teal-300/25"><FileText className="text-cyan-300" size={17} /><span className="min-w-0 flex-1"><b className="block truncate text-sm text-[#e5f2ef]">{item.filename}</b><small className="text-xs text-[#778985]">{item.fileType}</small></span><ArtifactOpenButton taskId={taskId} deliverable={item} /></article>)}</div>}</div>; }
function TimelinePanel({ events, allEvents, replayMode, replayCursor, setReplayCursor }: { events: Array<any>; allEvents: Array<any>; replayMode: boolean; replayCursor: number | undefined; setReplayCursor: (value: number | undefined) => void }) { return <div>{replayMode && allEvents.length > 0 ? <div className="mb-5 rounded-xl border border-teal-300/15 bg-teal-300/[.04] p-3"><label className="text-xs text-cyan-100">Replay through event {replayCursor ?? allEvents.at(-1)?.sequenceNumber}</label><input className="mt-3 w-full accent-teal-400" type="range" min={allEvents[0]?.sequenceNumber} max={allEvents.at(-1)?.sequenceNumber} value={replayCursor ?? allEvents.at(-1)?.sequenceNumber} onChange={event => setReplayCursor(Number(event.target.value))} /></div> : null}{events.length === 0 ? <div className="rounded-xl border border-dashed border-white/12 p-6 text-sm text-[#91a7a1]">No task events are available yet.</div> : <ol className="relative ml-2 border-l border-white/10 pl-5">{events.map(event => <li key={event.id} className="relative pb-5"><span className="absolute -left-[1.63rem] top-1.5 h-2 w-2 rounded-full bg-teal-400" /><p className="text-xs font-medium text-[#e5f2ef]">#{event.sequenceNumber} · {event.type.replace(/_/g, " ")}</p><p className="mt-1 text-xs leading-5 text-[#91a7a1]">{timelinePayload(event)}</p><time className="mt-1 block text-[10px] text-[#778985]">{localTime(event.createdAt)}</time></li>)}</ol>}</div>; }
function PlanPanel({ plan }: { plan: Array<any> }) { return <ol className="space-y-3">{plan.map((step, index) => <li key={step.id} className="flex gap-3 rounded-xl border border-white/8 bg-white/[.02] p-3"><span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs", step.state === "done" ? "bg-emerald-400/15 text-emerald-300" : step.state === "active" ? "bg-teal-400/15 text-cyan-200" : "bg-white/5 text-[#91a7a1]")}>{index + 1}</span><span><b className="block text-sm font-medium text-[#e5f2ef]">{step.title}</b><small className="mt-1 block text-xs text-[#91a7a1]">{step.state}</small></span></li>)}</ol>; }
