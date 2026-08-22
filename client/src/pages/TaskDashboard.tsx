import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowUp, ArrowUpRight, AudioLines, BarChart3, BookOpen, Bot, Cable, CalendarClock, CheckCircle2, Code2, FileText, FolderOpen, Gauge, ImageIcon, Loader2, MessageSquare, Mic, MoreHorizontal, Play, Plus, Search, Share2, SlidersHorizontal, Sparkles, Table2, Upload, Video } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TASK_ENTRY_SUGGESTIONS, TASK_HISTORY_QUERY_OPTIONS, workspaceWelcome } from "@/lib/workspaceLayout";
import { LibraryPicker, type LibraryAttachmentSelection } from "@/components/LibraryPicker";
import { TaskComposerAttachments, type ComposerAttachment } from "@/components/TaskComposerAttachments";
import { resolveAutomaticTaskRoute } from "@shared/automaticTaskRouting";
import { applyPromptGuidance, promptGuidanceForGoal } from "@/lib/promptGuidance";

export function buildTaskAttachmentRefs(attachments: ComposerAttachment[]) {
  return attachments.map(attachment => attachment.sourceType === "library"
    ? { sourceType: "library" as const, sourceDeliverableId: attachment.sourceDeliverableId! }
    : { sourceType: "upload" as const, filename: attachment.filename, fileType: attachment.fileType, storageKey: attachment.storageKey!, storageUrl: attachment.storageUrl! });
}

const modeLabels = {
  ask_before_risky: "Ask before risky actions",
  supervised: "Supervised execution",
} as const;

const MAX_VOICE_BYTES = 16 * 1024 * 1024;

export function composerModelCapabilityLabel(model: { capabilities?: string[] }) {
  const labels = (model.capabilities ?? []).flatMap(capability => {
    if (capability === "text") return ["Text"];
    if (capability === "vision") return ["Vision"];
    if (capability === "image") return ["Image"];
    if (capability === "video") return ["Video"];
    if (capability === "audio") return ["Audio"];
    return [];
  });
  return labels.length ? labels.join(" · ") : "Text";
}

export function composerMediaCapabilityLabel(capability: { models?: string[]; configured?: boolean } | undefined, kind: string, isLoading = false) {
  if (isLoading || !capability) return `Checking ${kind.toLowerCase()} availability…`;
  if (capability.configured) return `Ready · ${capability.models?.join(", ") || kind}`;
  return capability.models?.length ? `${capability.models.join(", ")} is not enabled yet.` : `${kind} generation is unavailable.`;
}

export default function TaskDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
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
  const [headerMenu, setHeaderMenu] = useState<"usage" | "more" | null>(null);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const [centerMoreOpen, setCenterMoreOpen] = useState(false);
  const [taskControlsOpen, setTaskControlsOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [connectorPickerOpen, setConnectorPickerOpen] = useState(false);
  const [selectedConnectedApps, setSelectedConnectedApps] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [voicePermissionBlocked, setVoicePermissionBlocked] = useState(false);
  const [liveVoiceHint, setLiveVoiceHint] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const openVoiceAfterTaskCreateRef = useRef(false);
  const tasks = trpc.tasks.list.useQuery(undefined, { ...TASK_HISTORY_QUERY_OPTIONS, enabled: isAuthenticated });
  const projects = trpc.projects.list.useQuery(undefined, { retry: false });
  const settings = trpc.settings.get.useQuery(undefined, { retry: false });
  const usage = trpc.workspace.usage.useQuery(undefined, { retry: false });
  const availableModels = trpc.catalog.models.useQuery(undefined, { retry: false });
  const mediaCapabilities = trpc.catalog.media.useQuery(undefined, { retry: false });
  const appCatalog = trpc.integrations.appCatalog.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const connectedApps = trpc.workspace.integrations.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const uploadAttachment = trpc.tasks.uploadAttachment.useMutation();
  const transcribeVoice = trpc.tasks.transcribeVoice.useMutation();
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: ({ task }) => {
      const openVoice = openVoiceAfterTaskCreateRef.current;
      openVoiceAfterTaskCreateRef.current = false;
      setLocation(`/tasks/${task.id}${openVoice ? "?voice=1" : ""}`);
    },
  });
  const estimate = trpc.catalog.estimateTask.useQuery(
    { goal, planSteps: 3, involvesCode },
    { enabled: goal.trim().length >= 8, staleTime: 8_000 },
  );
  const concreteModels = useMemo(() => (availableModels.data?.models ?? []).filter(model => model.model.trim().toLowerCase() !== "automatic"), [availableModels.data?.models]);
  const selectedModel = concreteModels.find(model => model.id === selectedModelId);
  const includesVisualAttachment = attachments.some(attachment => attachment.fileType.startsWith("image/"));
  const selectedModelSupportsVision = !selectedModel || selectedModel.capabilities.includes("vision");
  const visualInputBlocked = includesVisualAttachment && !selectedModelSupportsVision;
  const automaticRoute = useMemo(() => resolveAutomaticTaskRoute({
    goal,
    attachments,
    media: mediaCapabilities.data ?? {
      image: { configured: false, provider: null, models: [] },
      video: { configured: false, provider: null, models: [] },
      audio: { configured: false, provider: null, models: [] },
    },
    publicMedia: mediaCapabilities.data?.publicMedia,
  }), [attachments, goal, mediaCapabilities.data]);
  const visibleModelName = selectedModel?.model ?? automaticRoute.model ?? concreteModels[0]?.model ?? "Models";
  const welcome = useMemo(() => workspaceWelcome(user?.name), [user?.name]);
  const promptGuidance = useMemo(() => promptGuidanceForGoal(goal), [goal]);
  const composerApps = useMemo(() => (appCatalog.data ?? []).slice(0, 10), [appCatalog.data]);
  const connectedAppLabels = useMemo(() => new Set((connectedApps.data ?? []).map(app => app.label.toLowerCase())), [connectedApps.data]);

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

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    voiceStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (goal.trim().length >= 8) setLiveVoiceHint(null);
  }, [goal]);

  function startTask(openVoiceMode = false) {
    if (goal.trim().length < 8 || createTask.isPending || visualInputBlocked) {
      if (openVoiceMode && goal.trim().length < 8) {
        setLiveVoiceHint("Add a task goal first, then select Live voice to open a voice-enabled task.");
        composerRef.current?.focus();
      }
      return;
    }
    setLiveVoiceHint(null);
    openVoiceAfterTaskCreateRef.current = openVoiceMode;
    createTask.mutate({
      goal: goal.trim(),
      projectId: projectId || undefined,
      involvesCode,
      autonomySettings: {
        mode,
        ...capabilities,
        selectedModel: selectedModel ? { provider: selectedModel.provider, model: selectedModel.model } : undefined,
        selectedConnectedApps,
      },
      attachments: buildTaskAttachmentRefs(attachments),
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTask();
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

  async function toggleVoiceCapture() {
    if (voiceState === "transcribing") return;
    if (voiceState === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoicePermissionBlocked(false);
      setAttachmentError("Voice input is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/ogg", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      voiceStreamRef.current = stream;
      recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => {
        void (async () => {
          recorderRef.current = null;
          voiceStreamRef.current?.getTracks().forEach(track => track.stop());
          voiceStreamRef.current = null;
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          if (blob.size === 0 || blob.size > MAX_VOICE_BYTES) {
            setAttachmentError("Keep voice recordings between 1 byte and 16 MB.");
            setVoiceState("idle");
            return;
          }
          setVoiceState("transcribing");
          try {
            const dataBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("The voice recording could not be read."));
              reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
              reader.readAsDataURL(blob);
            });
            const contentType = (["audio/ogg", "audio/mp4"].includes(blob.type) ? blob.type : "audio/webm") as "audio/ogg" | "audio/mp4" | "audio/webm";
            const extension = contentType === "audio/ogg" ? "ogg" : contentType === "audio/mp4" ? "m4a" : "webm";
            const result = await transcribeVoice.mutateAsync({ filename: `synthia-voice-${Date.now()}.${extension}`, contentType, dataBase64 });
            setGoal(current => current.trim() ? `${current.trim()}\n\n${result.text}` : result.text);
            setAttachmentError(null);
            composerRef.current?.focus();
          } catch (error) {
            setAttachmentError(error instanceof Error ? error.message : "The voice recording could not be transcribed.");
          } finally {
            setVoiceState("idle");
          }
        })();
      };
      recorderRef.current = recorder;
      recorder.start();
      setVoicePermissionBlocked(false);
      setAttachmentError(null);
      setVoiceState("recording");
    } catch (error) {
      const permissionBlocked = error instanceof Error && ["NotAllowedError", "SecurityError"].includes(error.name);
      setVoicePermissionBlocked(permissionBlocked);
      setAttachmentError(permissionBlocked
        ? "Microphone access is blocked. Allow it in this site’s browser settings, then try again."
        : "Synthia could not access your microphone. Check that it is connected and available, then try again.");
    }
  }

  function dismissVoiceWarning() {
    setVoicePermissionBlocked(false);
    setAttachmentError(current => current?.startsWith("Microphone") || current?.startsWith("Synthia could not access your microphone") ? null : current);
  }

  return (
    <div className="synthia-dashboard">
      <header className="synthia-dashboard-header">
        <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[#e5f2ef]">Synthia AI</span><span className="hidden h-4 w-px bg-white/10 sm:block" /><span className="hidden text-xs text-[#778985] sm:inline">Workspace</span></div>
        <div className="synthia-dashboard-header-actions">
          <div className="relative">
            <button type="button" className="synthia-header-action" aria-label="Usage summary" title="Usage" onClick={() => setHeaderMenu(value => value === "usage" ? null : "usage")}><Gauge size={15} /></button>
            {headerMenu === "usage" ? <div className="synthia-header-popover"><b>Usage</b><span>{usage.isError ? "Usage unavailable" : `${usage.data?.creditsBalance ?? 0} credits available`}</span><button type="button" onClick={() => setLocation("/settings/billing")}>View usage</button></div> : null}
          </div>
          <button type="button" className="synthia-header-action" aria-label="Open task files" title="Files" onClick={() => setLibraryOpen(true)}><FileText size={15} /></button>
          <button type="button" className="synthia-header-action" aria-label="Sharing unavailable" title="Task sharing is unavailable until a secure sharing contract is configured" disabled><Share2 size={15} /></button>
          <div className="relative">
            <button type="button" className="synthia-header-action" aria-label="More workspace actions" title="More" onClick={() => setHeaderMenu(value => value === "more" ? null : "more")}><MoreHorizontal size={16} /></button>
            {headerMenu === "more" ? <div className="synthia-header-popover"><button type="button" onClick={() => setLocation("/docs")}>Documentation</button><button type="button" onClick={() => setLocation("/settings")}>Workspace settings</button></div> : null}
          </div>
          <span className="synthia-control-plane" title="Synthia control plane is online"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Online</span>
        </div>
      </header>

      <section className="synthia-chat-stage" aria-labelledby="task-composer-title">
        <p className="synthia-workspace-kicker"><Sparkles size={13} /> {welcome.greeting}</p>
        <h1 id="task-composer-title">{welcome.lead}</h1>
        <p className="synthia-chat-intro">{welcome.detail}</p>
        <form onSubmit={submit} className="synthia-chat-composer">
          <div className="synthia-composer-head">
            <span className="synthia-composer-head-title"><span className="synthia-composer-head-glyph"><Sparkles size={13} /></span><span><b>Start with a goal</b><small>Shape the outcome. Review consequential work before it happens.</small></span></span>
            <span className="synthia-composer-safety"><span />Review-first</span>
          </div>
          <label className="sr-only" htmlFor="task-goal">Task goal</label>
          <Textarea ref={composerRef} id="task-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="Ask Synthia anything — no task runs until you start it" className="synthia-chat-input" />
          {promptGuidance.length ? <aside className="synthia-prompt-guidance" aria-label="Smart prompt suggestions" aria-live="polite"><div><Sparkles size={13} /><span><b>Smart suggestions</b><small>Local guidance only — your goal stays in your control.</small></span></div><div className="synthia-prompt-guidance-actions">{promptGuidance.map(suggestion => <button key={suggestion.id} type="button" title={suggestion.detail} onClick={() => setGoal(current => applyPromptGuidance(current, suggestion))}>{suggestion.label}<ArrowUpRight size={12} /></button>)}</div></aside> : null}
          <TaskComposerAttachments attachments={attachments} onRemove={removeAttachment} />
          <div className="synthia-composer-actions">
            <div className="synthia-composer-control-group">
              <div className="relative">
                <button type="button" className={cn("synthia-composer-plus", attachmentMenuOpen && "active")} aria-label="Add a task attachment" aria-expanded={attachmentMenuOpen} aria-controls="attachment-menu" onClick={() => setAttachmentMenuOpen(value => !value)}><Plus size={15} /></button>
                {attachmentMenuOpen ? <div id="attachment-menu" className="synthia-attachment-menu"><button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={14} /><span>Add from local files</span></button><button type="button" onClick={() => { setAttachmentMenuOpen(false); setLibraryOpen(true); }}><FolderOpen size={14} /><span>From Library</span></button></div> : null}
              </div>
              <div className="relative">
                <button type="button" className={cn("synthia-composer-toggle", taskControlsOpen && "active")} aria-label="Open task controls" aria-expanded={taskControlsOpen} onClick={() => setTaskControlsOpen(value => !value)}><SlidersHorizontal size={14} /><span>Controls</span></button>
                {taskControlsOpen ? <div className="synthia-task-controls-menu">
                  <p>Task controls</p>
                  <button type="button" onClick={() => setInvolvesCode(value => !value)} className={cn(involvesCode && "active")}><Code2 size={14} /><span><b>Code execution</b><small>{involvesCode ? "Included for this task" : "Off for this task"}</small></span></button>
                  <div className="synthia-control-choice-group"><span>Autonomy</span>{(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map(value => <button key={value} type="button" onClick={() => setMode(value)} className={cn(mode === value && "active")}>{value === "ask_before_risky" ? "Ask first" : "Supervised"}</button>)}</div>
                  <label>Project<select aria-label="Project for task" value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">No project</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                </div> : null}
              </div>
            </div>
            <div className="synthia-composer-control-group synthia-composer-control-group-end">
              <div className="relative">
                <button type="button" className={cn("synthia-composer-toggle", mediaMenuOpen && "active")} aria-label="View media capabilities" aria-expanded={mediaMenuOpen} onClick={() => setMediaMenuOpen(value => !value)}><Sparkles size={13} /><span>Media</span></button>
                {mediaMenuOpen ? <div className="synthia-model-menu synthia-media-menu" data-testid="media-capability-menu"><div className="synthia-media-capability"><ImageIcon size={14} /><span><b>Image generation</b><small>{composerMediaCapabilityLabel(mediaCapabilities.data?.image, "Image", mediaCapabilities.isLoading)}</small></span><em className={mediaCapabilities.isLoading ? "pending" : mediaCapabilities.data?.image.configured ? "ready" : "pending"}>{mediaCapabilities.isLoading ? "Checking" : mediaCapabilities.data?.image.configured ? "Ready" : "Unavailable"}</em></div><div className="synthia-media-capability"><Video size={14} /><span><b>Video generation</b><small>{composerMediaCapabilityLabel(mediaCapabilities.data?.video, "Video", mediaCapabilities.isLoading)}</small></span><em className={mediaCapabilities.isLoading ? "pending" : mediaCapabilities.data?.video.configured ? "ready" : "pending"}>{mediaCapabilities.isLoading ? "Checking" : mediaCapabilities.data?.video.configured ? "Ready" : "Unavailable"}</em></div><div className="synthia-media-capability"><AudioLines size={14} /><span><b>Audio generation</b><small>{composerMediaCapabilityLabel(mediaCapabilities.data?.audio, "Audio", mediaCapabilities.isLoading)}</small></span><em className={mediaCapabilities.isLoading ? "pending" : mediaCapabilities.data?.audio.configured ? "ready" : "pending"}>{mediaCapabilities.isLoading ? "Checking" : mediaCapabilities.data?.audio.configured ? "Ready" : "Unavailable"}</em></div><div className="synthia-media-capability"><Video size={14} /><span><b>Public video understanding</b><small>{mediaCapabilities.isLoading ? "Checking public-link availability…" : mediaCapabilities.data?.publicMedia.configured ? "Ready for eligible public video links" : "Public-link analysis is not enabled for this workspace."}</small></span><em className={mediaCapabilities.isLoading ? "pending" : mediaCapabilities.data?.publicMedia.configured ? "ready" : "pending"}>{mediaCapabilities.isLoading ? "Checking" : mediaCapabilities.data?.publicMedia.configured ? "Ready" : "Unavailable"}</em></div><p>Ready media tools are used only within a task after you explicitly start it.</p></div> : null}
              </div>
              <div className="relative">
                <button type="button" className={cn("synthia-composer-toggle", connectorPickerOpen && "active")} aria-label="Choose connected apps for this task" aria-expanded={connectorPickerOpen} aria-controls="composer-connector-picker" onClick={() => setConnectorPickerOpen(value => !value)} onKeyDown={event => { if (event.key === "Escape") setConnectorPickerOpen(false); }}><Cable size={13} /><span>Apps</span>{selectedConnectedApps.length ? <b className="synthia-composer-connector-count">{selectedConnectedApps.length}</b> : null}</button>
                {connectorPickerOpen ? <div id="composer-connector-picker" className="synthia-composer-connector-picker" role="dialog" aria-label="Choose apps for this task"><div className="synthia-composer-connector-picker-head"><span><Cable size={14} /><b>Apps for this task</b></span><button type="button" onClick={() => { setConnectorPickerOpen(false); setLocation("/plugins"); }}>Manage apps</button></div><p>Select connected apps as task context. Synthia will still propose every external action for your approval.</p><div className="synthia-composer-connector-list">{composerApps.map(app => { const connected = connectedAppLabels.has(app.slug.toLowerCase()); const selected = selectedConnectedApps.includes(app.slug); return <button type="button" key={app.slug} className={cn("synthia-composer-connector-option", selected && "selected", !connected && "available")} onClick={() => { if (!connected) { setConnectorPickerOpen(false); setLocation(`/plugins?app=${encodeURIComponent(app.slug)}`); return; } setSelectedConnectedApps(current => selected ? current.filter(slug => slug !== app.slug) : [...current, app.slug].slice(0, 6)); }}><span className="synthia-composer-app-icon"><img src={app.iconUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} />{app.name.slice(0, 1)}</span><span><b>{app.name}</b><small>{connected ? selected ? "Included as task context" : "Connected · select to include" : "Connect to use"}</small></span>{connected && selected ? <CheckCircle2 size={14} /> : <span className="synthia-composer-connect-label">{connected ? "Select" : "Connect"}</span>}</button>; })}{appCatalog.isLoading ? <p className="synthia-composer-connector-loading"><Loader2 className="animate-spin" size={13} />Loading apps…</p> : null}</div><button type="button" className="synthia-composer-connector-browse" onClick={() => { setConnectorPickerOpen(false); setLocation("/plugins"); }}><Search size={13} />Browse all available apps</button></div> : null}
              </div>
              <div className="relative">
                <button type="button" className={cn("synthia-composer-toggle synthia-model-trigger", modelMenuOpen && "active")} aria-label="Choose model" aria-expanded={modelMenuOpen} onClick={() => setModelMenuOpen(value => !value)}><Bot size={13} /><span>{visibleModelName}</span></button>
                {modelMenuOpen ? <div className="synthia-model-menu" data-testid="composer-model-menu" data-scrollable="true"><button type="button" className={cn(!selectedModelId && "active")} onClick={() => { setSelectedModelId(""); setModelMenuOpen(false); }}><b>{visibleModelName}</b><small>Recommended for this task</small></button>{concreteModels.filter(model => model.id !== (automaticRoute.model ? `${automaticRoute.provider}:${automaticRoute.model}` : undefined)).map(model => <button key={model.id} type="button" className={cn(model.id === selectedModelId && "active")} onClick={() => { setSelectedModelId(model.id); setModelMenuOpen(false); }}><b>{model.model}</b><small>{composerModelCapabilityLabel(model)}</small></button>)}{concreteModels.length ? null : <p>Model choices will appear when they are available.</p>}</div> : null}
              </div>
              <button type="button" className="synthia-composer-toggle synthia-live-voice-toggle" aria-label="Start a live voice task" title="Create a task and open Live Voice" onClick={() => startTask(true)} disabled={createTask.isPending || visualInputBlocked}><AudioLines size={14} /><span>Live</span></button>
              <button type="button" className={cn("synthia-composer-toggle synthia-mic-button", voiceState !== "idle" && "active")} aria-label={voiceState === "recording" ? "Stop recording voice instruction" : "Start voice instruction"} title={voiceState === "transcribing" ? "Transcribing voice instruction" : voiceState === "recording" ? "Stop recording" : "Add voice instruction"} onClick={() => void toggleVoiceCapture()} disabled={voiceState === "transcribing"}><Mic size={14} /><span className="sr-only">Voice input</span>{voiceState === "recording" ? <span className="synthia-recording-dot" /> : null}</button>
              <Button type="submit" size="icon" aria-label="Start task" title="Start task" disabled={goal.trim().length < 8 || createTask.isPending || visualInputBlocked} className="synthia-send-button">{createTask.isPending ? <Loader2 className="animate-spin" size={17} /> : <ArrowUp size={18} />}</Button>
            </div>
          </div>
          {estimate.data ? <p className="synthia-estimate">Estimated: <span>{estimate.data.estimatedCreditsMin}–{estimate.data.estimatedCreditsMax} credits</span></p> : null}
          {visualInputBlocked ? <p role="alert" className="mt-2 px-1 text-xs text-amber-200">This task includes an image. Select a vision-capable model or return to Automatic routing before starting.</p> : null}
          {liveVoiceHint ? <div role="status" className="synthia-composer-hint"><span>{liveVoiceHint}</span><button type="button" onClick={() => setLiveVoiceHint(null)} aria-label="Dismiss Live Voice guidance">Dismiss</button></div> : null}
          {attachmentError ? <div role="alert" className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-rose-300"><span>{attachmentError}</span>{voicePermissionBlocked ? <><button type="button" className="font-medium text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 transition-colors hover:text-cyan-100" onClick={() => void toggleVoiceCapture()}>Try microphone again</button><button type="button" className="font-medium text-[#91a7a1] underline decoration-white/20 underline-offset-2 transition-colors hover:text-[#e5f2ef]" aria-label="Dismiss microphone warning" onClick={dismissVoiceWarning}>Dismiss</button></> : null}</div> : null}
          {createTask.isError ? <p role="alert" className="mt-3 text-xs text-rose-300">{createTask.error.message}</p> : null}
          <input ref={fileInputRef} onChange={event => void chooseLocalFile(event)} className="sr-only" type="file" accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.zip,.7z,.tar,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov" />
        </form>
        <div className="synthia-prompt-chips" aria-label="Suggested task prompts">{TASK_ENTRY_SUGGESTIONS.map(item => <button type="button" key={item.label} onClick={() => setGoal(item.goal)}>{item.label}</button>)}<div className="relative"><button type="button" className={cn("synthia-prompt-more", centerMoreOpen && "active")} aria-label="More task modes" aria-expanded={centerMoreOpen} onClick={() => setCenterMoreOpen(value => !value)}><MoreHorizontal size={14} /> More</button>{centerMoreOpen ? <div className="synthia-capability-menu" data-testid="center-capability-menu"><button type="button" onClick={() => { setInvolvesCode(true); setGoal("Build a production-ready application that solves this problem:"); setCenterMoreOpen(false); }}><Code2 size={14} /><span><b>Develop apps</b><small>Plan and build with code execution.</small></span></button><button type="button" onClick={() => { setGoal("Create or process a video for this objective:"); setMediaMenuOpen(true); setCenterMoreOpen(false); }}><Video size={14} /><span><b>Video</b><small>Use video inputs or verified generation.</small></span></button><button type="button" onClick={() => { setLocation("/scheduled"); setCenterMoreOpen(false); }}><CalendarClock size={14} /><span><b>Scheduled task</b><small>Open Synthia’s configured schedule area.</small></span></button><button type="button" onClick={() => { setCapabilities(value => ({ ...value, allowWebSearch: true })); setGoal("Conduct wide research on this topic and cite the findings:"); setCenterMoreOpen(false); }}><Search size={14} /><span><b>Wide Research</b><small>Search, compare, and synthesize sources.</small></span></button><button type="button" onClick={() => { setGoal("Create a structured spreadsheet for this objective:"); setCenterMoreOpen(false); }}><Table2 size={14} /><span><b>Spreadsheet</b><small>Produce a real downloadable data artifact.</small></span></button><button type="button" onClick={() => { setGoal("Create a clear data visualization for this objective:"); setCenterMoreOpen(false); }}><BarChart3 size={14} /><span><b>Visualization</b><small>Analyze data and deliver a chart.</small></span></button><button type="button" onClick={() => { setGoal("Create an audio or voice workflow for this objective:"); setCenterMoreOpen(false); }}><AudioLines size={14} /><span><b>Audio</b><small>Use voice input or an audio-capable task route.</small></span></button><button type="button" onClick={() => { setGoal("Answer this directly and concisely:"); setMode("ask_before_risky"); setCenterMoreOpen(false); }}><MessageSquare size={14} /><span><b>Chat mode</b><small>Keep the task focused on an answer.</small></span></button><button type="button" onClick={() => { setGoal("Turn this repeatable workflow into a reliable playbook:"); setCenterMoreOpen(false); }}><BookOpen size={14} /><span><b>Playbook</b><small>Document a repeatable autonomous workflow.</small></span></button><p>Every option creates a Synthia task or opens an existing route; unsupported provider actions remain unavailable.</p></div> : null}</div></div>

        <section className="synthia-dashboard-tasks" aria-label="Task history">
          <div className="synthia-section-heading"><h2>Recent tasks</h2><span>{tasks.data?.length ?? 0} total</span></div>
          {isAuthenticated && !tasks.isError && tasks.isLoading ? <div className="synthia-loading-row"><Loader2 className="animate-spin" size={14} /> Loading your tasks…</div> : null}
          {isAuthenticated && tasks.isError ? <div className="synthia-unavailable-note"><Bot size={15} /> Task history could not be loaded. Reload the workspace and try again.</div> : null}
          {isAuthenticated && !tasks.isLoading && !tasks.isError && tasks.data?.length === 0 ? <div className="synthia-empty-tasks"><Bot size={17} /><span>Start with the prompt above. Tasks you create will appear here with their live execution state.</span></div> : null}
          <div className="grid gap-1.5">{tasks.data?.map(task => <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="synthia-task-row"><span className={cn("grid h-7 w-7 place-items-center rounded-md", task.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-teal-400/10 text-cyan-300")}><Play size={13} /></span><span className="min-w-0 flex-1"><b>{task.title}</b><small>{task.currentStepSummary ?? task.goal}</small></span><span className="hidden text-[11px] text-[#778985] sm:block">{task.status.replace(/_/g, " ")}</span><ArrowUpRight className="text-[#637773]" size={14} /></button>)}</div>
        </section>
      </section>
      <LibraryPicker open={libraryOpen} onOpenChange={setLibraryOpen} selectedDeliverableIds={attachments.flatMap(attachment => attachment.sourceDeliverableId ? [attachment.sourceDeliverableId] : [])} onSelect={addLibraryAttachment} />
    </div>
  );
}
