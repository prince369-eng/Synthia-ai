import { trpc } from "@/lib/trpc";
import { ArrowUp, ArrowUpRight, Bot, Code2, FolderOpen, Loader2, Paperclip, Play, Sparkles, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TASK_ENTRY_SUGGESTIONS, TASK_HISTORY_QUERY_OPTIONS } from "@/lib/workspaceLayout";
import { LibraryPicker, type LibraryAttachmentSelection } from "@/components/LibraryPicker";
import { TaskComposerAttachments, type ComposerAttachment } from "@/components/TaskComposerAttachments";

export function buildTaskAttachmentRefs(attachments: ComposerAttachment[]) {
  return attachments.map(attachment => attachment.sourceType === "library"
    ? { sourceType: "library" as const, sourceDeliverableId: attachment.sourceDeliverableId! }
    : { sourceType: "upload" as const, filename: attachment.filename, fileType: attachment.fileType, storageKey: attachment.storageKey!, storageUrl: attachment.storageUrl! });
}

const modeLabels = {
  ask_before_risky: "Ask before risky actions",
  supervised: "Supervised execution",
} as const;

export default function TaskDashboard() {
  const [, setLocation] = useLocation();
  const [goal, setGoal] = useState("");
  const [involvesCode, setInvolvesCode] = useState(false);
  const [mode, setMode] = useState<"ask_before_risky" | "supervised">("ask_before_risky");
  const [capabilities, setCapabilities] = useState({ allowWebSearch: true, allowCodeExecution: true, allowFileWrites: true });
  const [preferencesApplied, setPreferencesApplied] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tasks = trpc.tasks.list.useQuery(undefined, TASK_HISTORY_QUERY_OPTIONS);
  const projects = trpc.projects.list.useQuery(undefined, { retry: false });
  const settings = trpc.settings.get.useQuery(undefined, { retry: false });
  const uploadAttachment = trpc.tasks.uploadAttachment.useMutation();
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: ({ task }) => setLocation(`/tasks/${task.id}`),
  });
  const estimate = trpc.catalog.estimateTask.useQuery(
    { goal, planSteps: 3, involvesCode },
    { enabled: goal.trim().length >= 8, staleTime: 8_000 },
  );

  useEffect(() => {
    if (preferencesApplied || !settings.data) return;
    const preferences = settings.data.preferences && typeof settings.data.preferences === "object" && !Array.isArray(settings.data.preferences)
      ? settings.data.preferences as Record<string, unknown>
      : {};
    const defaults = preferences.taskDefaults && typeof preferences.taskDefaults === "object" && !Array.isArray(preferences.taskDefaults)
      ? preferences.taskDefaults as Record<string, unknown>
      : {};
    if (defaults.mode === "ask_before_risky" || defaults.mode === "supervised") setMode(defaults.mode);
    setCapabilities({
      allowWebSearch: defaults.allowWebSearch !== false,
      allowCodeExecution: defaults.allowCodeExecution !== false,
      allowFileWrites: defaults.allowFileWrites !== false,
    });
    setPreferencesApplied(true);
  }, [preferencesApplied, settings.data]);

  useEffect(() => {
    const focusComposer = () => composerRef.current?.focus();
    window.addEventListener("synthia:focus-task-composer", focusComposer);
    return () => window.removeEventListener("synthia:focus-task-composer", focusComposer);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (goal.trim().length < 8 || createTask.isPending) return;
    createTask.mutate({
      goal: goal.trim(),
      projectId: projectId || undefined,
      involvesCode,
      autonomySettings: { mode, ...capabilities },
      attachments: buildTaskAttachmentRefs(attachments),
    });
  }

  function removeAttachment(id: string) {
    setAttachments(current => current.filter(attachment => attachment.id !== id));
  }

  async function chooseLocalFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAttachmentMenuOpen(false);
    if (!file) return;
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setAttachmentError("Choose a non-empty file smaller than 10 MB.");
      return;
    }
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("The selected file could not be read."));
        reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
        reader.readAsDataURL(file);
      });
      const stored = await uploadAttachment.mutateAsync({ filename: file.name, contentType: file.type || "application/octet-stream", dataBase64 });
      setAttachments(current => current.length >= 12 ? current : [...current, { id: crypto.randomUUID(), sourceType: "upload", ...stored }]);
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "The file could not be attached.");
    }
  }

  function addLibraryAttachment(item: LibraryAttachmentSelection) {
    setAttachments(current => current.some(attachment => attachment.sourceDeliverableId === item.id) || current.length >= 12 ? current : [...current, {
      id: crypto.randomUUID(), sourceType: "library", filename: item.filename, fileType: item.fileType, sourceDeliverableId: item.id,
    }]);
    setAttachmentError(null);
  }

  return (
    <div className="synthia-dashboard">
      <header className="synthia-dashboard-header">
        <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[#f5eadb]">Synthia AI</span><span className="hidden h-4 w-px bg-white/10 sm:block" /><span className="hidden text-xs text-[#8d7e70] sm:inline">Autonomous workspace</span></div>
        <div className="flex items-center gap-2 text-xs text-[#a99a8d]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Control plane online</div>
      </header>

      <section className="synthia-chat-stage" aria-labelledby="task-composer-title">
        <div className="synthia-plan-chip"><span>Agent workspace</span><span className="h-3 w-px bg-white/10" /><span className="text-orange-300">{tasks.data?.length ?? 0} tasks</span></div>
        <p className="synthia-eyebrow justify-center"><Sparkles size={13} /> New autonomous task</p>
        <h1 id="task-composer-title">What should Synthia accomplish?</h1>
        <p className="synthia-chat-intro">Describe the outcome. Synthia will plan, execute, and show every decision.</p>
        <form onSubmit={submit} className="synthia-chat-composer">
            <label className="sr-only" htmlFor="task-goal">Task goal</label>
            <Textarea ref={composerRef} id="task-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="Ask Synthia anything — no task runs until you start it" className="synthia-chat-input" />
            <TaskComposerAttachments attachments={attachments} onRemove={removeAttachment} />
            <div className="synthia-composer-actions">
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                <div className="relative"><button type="button" className={cn("synthia-composer-toggle", attachmentMenuOpen && "active")} aria-expanded={attachmentMenuOpen} aria-controls="attachment-menu" onClick={() => setAttachmentMenuOpen(value => !value)}><Paperclip size={14} /><span>Attach</span></button>{attachmentMenuOpen ? <div id="attachment-menu" className="synthia-attachment-menu"><button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={14} /><span>From computer</span></button><button type="button" onClick={() => { setAttachmentMenuOpen(false); setLibraryOpen(true); }}><FolderOpen size={14} /><span>From Library</span></button></div> : null}</div>
                <button type="button" onClick={() => setInvolvesCode(value => !value)} className={cn("synthia-composer-toggle", involvesCode && "active")}><Code2 size={14} /> <span>Code</span></button>
                {(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map(value => <button key={value} type="button" onClick={() => setMode(value)} className={cn("synthia-composer-toggle", mode === value && "active")}><span>{value === "ask_before_risky" ? "Ask first" : "Supervised"}</span></button>)}
              </div>
              <select aria-label="Project for task" value={projectId} onChange={event => setProjectId(event.target.value)} className="synthia-project-select"><option value="">No project</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
              <Button type="submit" size="icon" aria-label="Start task" title="Start task" disabled={goal.trim().length < 8 || createTask.isPending} className="synthia-send-button">{createTask.isPending ? <Loader2 className="animate-spin" size={17} /> : <ArrowUp size={18} />}</Button>
            </div>
            {estimate.data ? <p className="synthia-estimate">Estimated: <span>{estimate.data.estimatedCreditsMin}–{estimate.data.estimatedCreditsMax} credits</span></p> : null}
            {attachmentError ? <p role="alert" className="mt-2 px-1 text-xs text-rose-300">{attachmentError}</p> : null}
            {createTask.isError ? <p role="alert" className="mt-3 text-xs text-rose-300">{createTask.error.message}</p> : null}
            <input ref={fileInputRef} onChange={event => void chooseLocalFile(event)} className="sr-only" type="file" accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.zip,.7z,.tar,.png,.jpg,.jpeg,.webp" />
        </form>
        <div className="synthia-prompt-chips" aria-label="Suggested task prompts">{TASK_ENTRY_SUGGESTIONS.map(item => <button type="button" key={item} onClick={() => setGoal(item)}>{item}</button>)}</div>

        <section className="synthia-dashboard-tasks" aria-label="Task history">
          <div className="synthia-section-heading"><h2>Recent tasks</h2><span>{tasks.data?.length ?? 0} total</span></div>
          {!tasks.isError && tasks.isLoading ? <div className="synthia-loading-row"><Loader2 className="animate-spin" size={14} /> Loading your tasks…</div> : null}
          {tasks.isError ? <div className="synthia-unavailable-note"><Bot size={15} /> Task history will connect after the external Synthia data store is configured.</div> : null}
          {!tasks.isLoading && !tasks.isError && tasks.data?.length === 0 ? <div className="synthia-empty-tasks"><Bot size={17} /><span>Tasks you create will appear here with their live execution state.</span></div> : null}
          <div className="grid gap-1.5">{tasks.data?.map(task => <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="synthia-task-row"><span className={cn("grid h-7 w-7 place-items-center rounded-md", task.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-orange-400/10 text-orange-300")}><Play size={13} /></span><span className="min-w-0 flex-1"><b>{task.title}</b><small>{task.currentStepSummary ?? task.goal}</small></span><span className="hidden text-[11px] text-[#88786a] sm:block">{task.status.replace(/_/g, " ")}</span><ArrowUpRight className="text-[#77695d]" size={14} /></button>)}</div>
        </section>
      </section>
      <LibraryPicker open={libraryOpen} onOpenChange={setLibraryOpen} selectedDeliverableIds={attachments.flatMap(attachment => attachment.sourceDeliverableId ? [attachment.sourceDeliverableId] : [])} onSelect={addLibraryAttachment} />
    </div>
  );
}
