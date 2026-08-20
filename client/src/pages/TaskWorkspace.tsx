import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useTaskEventStream } from "@/hooks/useTaskEventStream";
import { AlertTriangle, Archive, BookOpenText, Bot, CalendarClock, Check, ChevronLeft, CirclePause, Code2, ExternalLink, FileCode2, FileText, FolderTree, ImagePlus, ListTree, Loader2, MoreHorizontal, MonitorDot, Pencil, Pin, Play, Send, Square, Star, TerminalSquare, Trash2, Video, Wand2, X } from "lucide-react";
import { WORKSPACE_RETURN_ROUTES } from "@/lib/workspaceLayout";
import React, { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

type WorkspaceTab = "screen" | "code" | "terminal" | "files" | "timeline" | "plan";

const statusColor: Record<string, string> = { queued: "text-amber-300", booting: "text-amber-300", planning: "text-cyan-300", running: "text-cyan-300", needs_input: "text-rose-300", paused: "text-[#a5b6b1]", completed: "text-emerald-300", failed: "text-rose-300", cancelled: "text-[#a5b6b1]" };

function localTime(value: Date | string | number | null | undefined) { return value ? new Date(value).toLocaleString() : "—"; }
function asRecord(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }

export default function TaskWorkspace({ replayMode = false }: { replayMode?: boolean }) {
  const route = replayMode ? useRoute("/tasks/:taskId/replay") : useRoute("/tasks/:taskId");
  const taskId = route[1]?.taskId;
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<WorkspaceTab>("code");
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
  if (snapshot.isLoading) return <div className="grid min-h-screen place-items-center text-sm text-[#a89889]"><Loader2 className="mr-2 animate-spin" size={16} />Loading task workspace…</div>;
  if (snapshot.isError || !task || !taskId) return <main className="p-8"><Link href={WORKSPACE_RETURN_ROUTES.dashboard} className="text-sm text-cyan-300">← Back to tasks</Link><p role="alert" className="mt-5 text-rose-300">{snapshot.error?.message ?? "The requested task is unavailable."}</p></main>;

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Code2 }> = [{ id: "screen", label: "Screen", icon: MonitorDot }, { id: "code", label: "Code", icon: Code2 }, { id: "terminal", label: "Terminal", icon: TerminalSquare }, { id: "files", label: "Files", icon: FolderTree }, { id: "timeline", label: "Timeline", icon: ListTree }, { id: "plan", label: "Plan", icon: FileText }];
  const activeApprovals = data.approvals.filter(approval => approval.status === "pending");

  return <div className="synthia-workspace">
    <header className="synthia-workspace-header"><div className="min-w-0"><WorkspaceReturnNavigation onNavigate={setLocation} /><h1 className="mt-1 truncate text-sm font-semibold text-[#e5f2ef]">{task.title}</h1></div><div className="flex items-center gap-2"><span className={cn("hidden text-[11px] font-medium sm:inline", statusColor[task.status])}>{task.status.replace(/_/g, " ")}</span><span title={connected ? "Live task stream connected" : "Reconnecting task stream"} className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />{task.status === "running" || task.status === "planning" || task.status === "booting" ? <Button size="sm" variant="outline" onClick={() => pause.mutate({ taskId })} disabled={pause.isPending} className="h-7 border-white/12 bg-transparent px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5"><CirclePause size={13} />Pause</Button> : null}{task.status === "paused" || task.status === "needs_input" ? <Button size="sm" onClick={() => resume.mutate({ taskId })} disabled={resume.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300"><Play size={13} />Resume</Button> : null}{!["completed", "failed", "cancelled"].includes(task.status) ? <Button size="sm" variant="ghost" onClick={() => cancel.mutate({ taskId })} disabled={cancel.isPending} className="h-7 px-2 text-[11px] text-[#91a7a1] hover:text-rose-300"><Square size={12} />Stop</Button> : null}<TaskMediaMenu taskId={taskId} attachments={data.attachments} /><TaskOverflowMenu task={task} taskId={taskId} onDeleted={() => setLocation(WORKSPACE_RETURN_ROUTES.dashboard)} /></div></header>
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(320px,.9fr)_minmax(480px,1.2fr)]">
      <section className="flex min-h-0 flex-col border-r border-white/8">
        <div className="border-b border-white/8 px-4 py-4 sm:px-5"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-cyan-300">Task objective</p><p className="mt-1.5 max-w-3xl text-xs leading-5 text-[#c7ddd7]">{task.goal}</p>{replayMode ? <div className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/5 px-2.5 py-1.5 text-[11px] text-cyan-100">Replay mode — move through the durable event record without changing task execution.</div> : null}</div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {data.messages.length === 0 ? <div className="rounded-lg border border-dashed border-white/12 p-4 text-xs text-[#968678]">No narrated messages have been recorded yet. Status and tool events remain visible in the Agent’s Computer.</div> : null}
          {data.messages.map(entry => <article key={entry.id} className={cn("max-w-[92%] rounded-xl px-3 py-2.5", entry.role === "user" ? "ml-auto bg-teal-400/12 text-cyan-50" : "border border-white/8 bg-white/[.035] text-[#dcece7]")}><p className="mb-1 text-[9px] font-semibold uppercase tracking-[.13em] text-[#91a7a1]">{entry.role === "agent" ? "Synthia" : entry.role}</p><p className="whitespace-pre-wrap text-xs leading-5">{entry.content}</p><time className="mt-1.5 block text-[9px] text-[#718580]">{localTime(entry.createdAt)}</time></article>)}
          {activeApprovals.map(approval => <article key={approval.id} className="rounded-xl border border-amber-300/25 bg-amber-300/[.07] p-3"><div className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 text-amber-300" size={16} /><div><p className="text-xs font-semibold text-amber-100">Approval required</p><p className="mt-1 text-xs leading-5 text-[#dccdb8]">{approval.description}</p><p className="mt-1.5 text-[11px] text-[#a89983]">Tool: {approval.toolName} · Risk: {approval.riskLevel}</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => resolveApproval.mutate({ taskId, approvalId: approval.id, decision: "approved" })} disabled={resolveApproval.isPending} className="h-7 bg-amber-300 px-2 text-[11px] text-[#2c1b0d] hover:bg-amber-200"><Check size={13} />Approve</Button><Button size="sm" variant="outline" onClick={() => resolveApproval.mutate({ taskId, approvalId: approval.id, decision: "rejected" })} disabled={resolveApproval.isPending} className="h-7 border-amber-200/25 bg-transparent px-2 text-[11px] text-amber-100 hover:bg-amber-300/10"><X size={13} />Reject</Button></div></div></div></article>)}
        </div>
        {!replayMode ? <form onSubmit={sendMessage} className="border-t border-white/8 p-3"><label className="sr-only" htmlFor="task-message">Send a message to Synthia</label><div className="flex gap-2"><Input id="task-message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Add a constraint or answer Synthia…" className="h-8 border-white/10 bg-[#14201e] text-xs text-[#e5f2ef] placeholder:text-[#69807a]" /><Button type="submit" size="icon" disabled={!message.trim() || addMessage.isPending} className="h-8 w-8 shrink-0 bg-teal-400 text-[#072a27] hover:bg-cyan-300"><Send size={14} /></Button></div>{addMessage.isError ? <p role="alert" className="mt-2 text-[11px] text-rose-300">{addMessage.error.message}</p> : null}</form> : null}
      </section>
      <aside className="flex min-h-0 flex-col bg-[#101b19]" aria-label="Agent's Computer">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3"><div><p className="flex items-center gap-2 text-xs font-semibold text-[#e5f2ef]"><Bot size={15} className="text-cyan-300" />Agent’s Computer</p><p className="mt-0.5 text-[10px] text-[#778985]">Open workspace · <span className="text-cyan-200">Code</span> selected</p></div>{data.sandboxes[0] ? <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-300">Sandbox {data.sandboxes[0].status}</span> : <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-[#91a7a1]">No sandbox yet</span>}</div>
        <div className="flex overflow-x-auto border-b border-white/8 px-2" role="tablist" aria-label="Agent workspace panels">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn("flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[11px]", tab === item.id ? "border-teal-400 text-cyan-200" : "border-transparent text-[#778985] hover:text-[#c7ddd7]")}><Icon size={13} />{item.label}</button>; })}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "code" ? <CodePanel deliverables={data.deliverables} events={events} onOpenTab={setTab} /> : null}
          {tab === "screen" ? <ScreenPanel taskId={taskId} deliverables={data.deliverables} /> : null}
          {tab === "terminal" ? <TerminalPanel events={events} /> : null}
          {tab === "files" ? <FilesPanel taskId={taskId} deliverables={data.deliverables} /> : null}
          {tab === "timeline" ? <TimelinePanel events={events} replayMode={replayMode} replayCursor={replayCursor} setReplayCursor={setReplayCursor} allEvents={data.events} /> : null}
          {tab === "plan" ? <PlanPanel plan={task.plan as Array<any>} /> : null}
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
  const [kind, setKind] = useState<"image" | "video" | null>(null);
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
  const unavailableLabel = (type: "image" | "video") => media.data?.[type]?.reason ?? `${type === "image" ? "Image" : "Video"} generation is unavailable until its provider is configured.`;
  const open = (type: "image" | "video") => { if (media.data?.[type]?.configured) setKind(type); };

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Open media generation" title="Media generation" className="h-7 w-7 text-[#a89889] hover:bg-white/5 hover:text-orange-200"><Wand2 size={15} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-white/10 bg-[#201913] text-[#eadbca]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-[#9c8c7d]">Task media</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => open("image")} disabled={!media.data?.image.configured} title={unavailableLabel("image")} className="gap-2"><ImagePlus size={14} />Generate image <span className="ml-auto text-[9px] text-[#9c8c7d]">{media.data?.image.configured ? media.data.image.models[0] : "Unavailable"}</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("video")} disabled={!media.data?.video.configured} title={unavailableLabel("video")} className="gap-2"><Video size={14} />Generate video <span className="ml-auto text-[9px] text-[#9c8c7d]">{media.data?.video.configured ? media.data.video.models[0] : "Unavailable"}</span></DropdownMenuItem>
        {!media.isLoading && !media.data?.image.configured && !media.data?.video.configured ? <p className="px-2 py-2 text-[10px] leading-4 text-[#8d7c6c]">Generation is shown only after secure provider configuration passes its readiness check.</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
    {kind ? <div role="dialog" aria-modal="true" aria-label={`Generate ${kind}`} className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"><form onSubmit={event => { event.preventDefault(); if (prompt.trim()) generate.mutate({ taskId, kind, prompt: prompt.trim(), referenceAttachmentId: referenceAttachmentId || undefined }); }} className="w-full max-w-md rounded-xl border border-white/10 bg-[#201913] p-4 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#f5e9da]">Generate {kind}</p><p className="mt-1 text-[11px] leading-4 text-[#9f8e7e]">{capability?.provider} · {capability?.models[0]}</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setKind(null)} className="h-7 w-7 text-[#a89889]"><X size={14} /></Button></div><label className="mt-4 block text-[11px] font-medium text-[#cdbdab]" htmlFor="media-prompt">Prompt</label><Input id="media-prompt" autoFocus value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={4_000} placeholder={`Describe the ${kind} to generate…`} className="mt-1.5 border-white/10 bg-[#17120e] text-[#f5e9da]" />{imageAttachments.length ? <label className="mt-3 block text-[11px] font-medium text-[#cdbdab]" htmlFor="media-reference">Image reference <span className="font-normal text-[#89796b]">(optional)</span><select id="media-reference" value={referenceAttachmentId} onChange={event => setReferenceAttachmentId(event.target.value)} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#17120e] px-2 text-xs text-[#f5e9da]"><option value="">No reference image</option>{imageAttachments.map(attachment => <option key={attachment.id} value={attachment.id}>{attachment.filename}</option>)}</select></label> : null}{generate.isError ? <p role="alert" className="mt-3 text-[11px] text-rose-300">{generate.error.message}</p> : null}<div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setKind(null)}>Cancel</Button><Button type="submit" disabled={!prompt.trim() || generate.isPending} className="bg-orange-400 text-[#2b170c] hover:bg-orange-300">{generate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}Generate</Button></div></form></div> : null}
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
      <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#201913] text-[#eadbca]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-[#9c8c7d]">Task actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => { setRenameDraft(task.title); setShowRename(true); }} className="gap-2"><Pencil size={14} />Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void setPinned.mutate({ taskId, isPinned: !task.isPinned })} disabled={busy} className="gap-2"><Pin size={14} />{task.isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void setFavorite.mutate({ taskId, isFavorite: !task.isFavorite })} disabled={busy} className="gap-2"><Star size={14} />{task.isFavorite ? "Remove from favorites" : "Add to favorites"}</DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 text-[#837466]"><CalendarClock size={14} />Schedule a task <span className="ml-auto text-[9px]">Unavailable</span></DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onSelect={() => void setArchived.mutate({ taskId, isArchived: !task.isArchived })} disabled={busy} className="gap-2"><Archive size={14} />{task.isArchived ? "Restore from archive" : "Archive"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} disabled={busy} className="gap-2 text-rose-300 focus:text-rose-200"><Trash2 size={14} />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {showRename ? <div role="dialog" aria-modal="true" aria-label="Rename task" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"><form onSubmit={event => { event.preventDefault(); if (renameDraft.trim()) rename.mutate({ taskId, title: renameDraft.trim() }); }} className="w-full max-w-sm rounded-xl border border-white/10 bg-[#201913] p-4 shadow-2xl"><p className="text-sm font-semibold text-[#f5e9da]">Rename task</p><Input autoFocus value={renameDraft} onChange={event => setRenameDraft(event.target.value)} maxLength={180} className="mt-3 border-white/10 bg-[#17120e] text-[#f5e9da]" /><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowRename(false)}>Cancel</Button><Button type="submit" disabled={!renameDraft.trim() || rename.isPending} className="bg-orange-400 text-[#2b170c] hover:bg-orange-300">Save</Button></div></form></div> : null}
    {showDeleteConfirm ? <div role="alertdialog" aria-modal="true" aria-label="Delete task" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"><div className="w-full max-w-sm rounded-xl border border-rose-300/20 bg-[#201913] p-4 shadow-2xl"><p className="text-sm font-semibold text-[#f5e9da]">Delete this task?</p><p className="mt-2 text-xs leading-5 text-[#b9aa9a]">The task is removed from your workspace and cancelled if it is still active. This action cannot be undone from the interface.</p><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button><Button type="button" disabled={remove.isPending} onClick={() => remove.mutate({ taskId })} className="bg-rose-500 text-white hover:bg-rose-400">Delete task</Button></div></div></div> : null}
  </>;
}

function CodePanel({ deliverables, events, onOpenTab }: { deliverables: Array<any>; events: Array<any>; onOpenTab: (tab: WorkspaceTab) => void }) {
  const terminalEvents = events.filter(event => ["tool_call", "tool_result", "error"].includes(event.type));
  const latestEvent = events.at(-1);
  return <div className="grid h-full min-h-[440px] grid-rows-[minmax(250px,1fr)_auto] overflow-hidden rounded-lg border border-white/8 bg-[#12100e]"><div className="grid min-h-0 grid-cols-[140px_minmax(0,1fr)]"><div className="border-r border-white/8 p-3"><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.15em] text-[#76675a]">Workspace files</p>{deliverables.length === 0 ? <p className="text-[11px] leading-5 text-[#887869]">No files emitted by this task yet.</p> : deliverables.map(item => <div key={item.id} className="mb-1.5 flex items-center gap-1.5 text-[11px] text-[#d5c5b3]"><FileCode2 size={12} className="text-orange-300" /><span className="truncate">{item.filename}</span></div>)}</div><div className="min-w-0 overflow-y-auto p-3"><p className="font-mono text-[11px] text-[#6f9d6e]">// Editor context · agent tool output</p><pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#c9c0b7]">{events.filter(event => event.type === "tool_result").map(event => JSON.stringify(asRecord(event.payload), null, 2)).join("\n\n") || "Waiting for the agent to emit workspace files or code-tool output."}</pre></div></div><div className="grid grid-cols-3 gap-px border-t border-white/8 bg-white/8"><button onClick={() => onOpenTab("terminal")} className="min-w-0 bg-[#15110d] p-2.5 text-left hover:bg-white/[.035]"><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.13em] text-orange-300"><TerminalSquare size={11} />Terminal</span><p className="mt-1.5 truncate font-mono text-[10px] text-[#bdae9e]">{terminalEvents.length ? `${terminalEvents.length} recorded tool event${terminalEvents.length === 1 ? "" : "s"}` : "No terminal output"}</p></button><button onClick={() => onOpenTab("timeline")} className="min-w-0 bg-[#15110d] p-2.5 text-left hover:bg-white/[.035]"><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.13em] text-orange-300"><ListTree size={11} />Timeline</span><p className="mt-1.5 truncate text-[10px] text-[#bdae9e]">{latestEvent ? `#${latestEvent.sequenceNumber} · ${latestEvent.type}` : "No events yet"}</p></button><button onClick={() => onOpenTab("files")} className="min-w-0 bg-[#15110d] p-2.5 text-left hover:bg-white/[.035]"><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.13em] text-orange-300"><FileText size={11} />Artifacts</span><p className="mt-1.5 truncate text-[10px] text-[#bdae9e]">{deliverables.length ? `${deliverables.length} published` : "No artifacts"}</p></button></div></div>;
}
export function isScreenCapture(deliverable: { fileType?: unknown }) { return typeof deliverable.fileType === "string" && deliverable.fileType.startsWith("image/"); }

function ScreenPanel({ taskId, deliverables }: { taskId: string; deliverables: Array<any> }) { const frame = deliverables.find(isScreenCapture); return <div className="grid min-h-[480px] place-items-center rounded-xl border border-white/8 bg-[#11100e] p-6 text-center">{frame ? <ArtifactPreview taskId={taskId} deliverable={frame} /> : <div><MonitorDot className="mx-auto text-[#736559]" size={32} /><p className="mt-3 text-sm text-[#a59686]">A sandbox screen frame appears here when capture is available.</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#78695d]">Live browser interaction and screen capture require an E2B desktop sandbox. The local Docker fallback is intentionally code-only and does not include a graphical browser.</p></div>}</div>; }
function TerminalPanel({ events }: { events: Array<any> }) { const output = events.filter(event => ["tool_call", "tool_result", "error"].includes(event.type)); return <div className="min-h-[480px] rounded-xl border border-white/8 bg-[#11100e] p-4 font-mono text-xs leading-6">{output.length === 0 ? <span className="text-[#796b5e]">No terminal or tool output has been produced for this task.</span> : output.map(event => <div key={event.id} className="mb-3"><span className="text-orange-300">[{event.type}]</span><pre className="whitespace-pre-wrap text-[#cfc5b9]">{JSON.stringify(asRecord(event.payload), null, 2)}</pre></div>)}</div>; }
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
  return <span className="shrink-0 text-right"><button type="button" aria-label={`Open ${deliverable.filename}`} onClick={() => void openArtifact()} disabled={artifact.isFetching} className="inline-flex items-center gap-1 text-xs text-orange-300 hover:text-orange-200 disabled:cursor-not-allowed disabled:text-[#8b7c6e]">{artifact.isFetching ? <Loader2 className="animate-spin" size={13} /> : <ExternalLink size={13} />}{artifact.isFetching ? "Preparing" : "Open"}</button>{artifact.isError ? <small role="alert" className="mt-1 block text-[10px] text-rose-300">File unavailable</small> : null}</span>;
}

function FilesPanel({ taskId, deliverables }: { taskId: string; deliverables: Array<any> }) { return <div>{deliverables.length === 0 ? <div className="rounded-xl border border-dashed border-white/12 p-6 text-sm text-[#988879]">No deliverables have been published by this task.</div> : <div className="space-y-2">{deliverables.map(item => <article key={item.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 hover:border-orange-300/25"><FileText className="text-orange-300" size={17} /><span className="min-w-0 flex-1"><b className="block truncate text-sm text-[#f0e3d4]">{item.filename}</b><small className="text-xs text-[#8b7c6e]">{item.fileType}</small></span><ArtifactOpenButton taskId={taskId} deliverable={item} /></article>)}</div>}</div>; }
function TimelinePanel({ events, allEvents, replayMode, replayCursor, setReplayCursor }: { events: Array<any>; allEvents: Array<any>; replayMode: boolean; replayCursor: number | undefined; setReplayCursor: (value: number | undefined) => void }) { return <div>{replayMode && allEvents.length > 0 ? <div className="mb-5 rounded-xl border border-orange-300/15 bg-orange-300/[.04] p-3"><label className="text-xs text-orange-100">Replay through event {replayCursor ?? allEvents.at(-1)?.sequenceNumber}</label><input className="mt-3 w-full accent-orange-400" type="range" min={allEvents[0]?.sequenceNumber} max={allEvents.at(-1)?.sequenceNumber} value={replayCursor ?? allEvents.at(-1)?.sequenceNumber} onChange={event => setReplayCursor(Number(event.target.value))} /></div> : null}{events.length === 0 ? <div className="rounded-xl border border-dashed border-white/12 p-6 text-sm text-[#988879]">No task events are available yet.</div> : <ol className="relative ml-2 border-l border-white/10 pl-5">{events.map(event => <li key={event.id} className="relative pb-5"><span className="absolute -left-[1.63rem] top-1.5 h-2 w-2 rounded-full bg-orange-400" /><p className="text-xs font-medium text-[#e7d9c8]">#{event.sequenceNumber} · {event.type.replace(/_/g, " ")}</p><p className="mt-1 text-xs leading-5 text-[#978779]">{JSON.stringify(asRecord(event.payload))}</p><time className="mt-1 block text-[10px] text-[#756658]">{localTime(event.createdAt)}</time></li>)}</ol>}</div>; }
function PlanPanel({ plan }: { plan: Array<any> }) { return <ol className="space-y-3">{plan.map((step, index) => <li key={step.id} className="flex gap-3 rounded-xl border border-white/8 bg-white/[.02] p-3"><span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs", step.state === "done" ? "bg-emerald-400/15 text-emerald-300" : step.state === "active" ? "bg-orange-400/15 text-orange-200" : "bg-white/5 text-[#948476]")}>{index + 1}</span><span><b className="block text-sm font-medium text-[#e9ddcf]">{step.title}</b><small className="mt-1 block text-xs text-[#958677]">{step.state}</small></span></li>)}</ol>; }
