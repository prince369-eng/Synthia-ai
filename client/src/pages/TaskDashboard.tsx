import { trpc } from "@/lib/trpc";
import { ArrowUp, ArrowUpRight, Bot, Code2, Loader2, Play, Send, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TASK_ENTRY_SUGGESTIONS, TASK_HISTORY_QUERY_OPTIONS } from "@/lib/workspaceLayout";

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
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const tasks = trpc.tasks.list.useQuery(undefined, TASK_HISTORY_QUERY_OPTIONS);
  const settings = trpc.settings.get.useQuery(undefined, { retry: false });
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
      involvesCode,
      autonomySettings: { mode, ...capabilities },
    });
  }

  return (
    <div className="synthia-dashboard">
      <header className="synthia-dashboard-header">
        <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[#f5eadb]">Synthia AI</span><span className="hidden h-4 w-px bg-white/10 sm:block" /><span className="hidden text-xs text-[#8d7e70] sm:inline">Autonomous workspace</span></div>
        <div className="flex items-center gap-2 text-xs text-[#a99a8d]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Control plane online</div>
      </header>

      <section className="synthia-chat-stage" aria-labelledby="task-composer-title">
        <div className="synthia-plan-chip"><span>Free plan</span><span className="h-3 w-px bg-white/10" /><span className="text-orange-300">Credits estimate</span></div>
        <p className="synthia-eyebrow justify-center"><Sparkles size={13} /> New autonomous task</p>
        <h1 id="task-composer-title">What should Synthia accomplish?</h1>
        <p className="synthia-chat-intro">Describe the outcome. Synthia will plan, execute, and show every decision.</p>
        <form onSubmit={submit} className="synthia-chat-composer">
            <label className="sr-only" htmlFor="task-goal">Task goal</label>
            <Textarea ref={composerRef} id="task-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="Ask Synthia anything — no task runs until you start it" className="synthia-chat-input" />
            <div className="synthia-composer-actions">
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                <button type="button" onClick={() => setInvolvesCode(value => !value)} className={cn("synthia-composer-toggle", involvesCode && "active")}><Code2 size={14} /> <span>Code</span></button>
                {(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map(value => <button key={value} type="button" onClick={() => setMode(value)} className={cn("synthia-composer-toggle", mode === value && "active")}><span>{value === "ask_before_risky" ? "Ask first" : "Supervised"}</span></button>)}
              </div>
              <Button type="submit" size="icon" aria-label="Start task" title="Start task" disabled={goal.trim().length < 8 || createTask.isPending} className="synthia-send-button">{createTask.isPending ? <Loader2 className="animate-spin" size={17} /> : <ArrowUp size={18} />}</Button>
            </div>
            {estimate.data ? <p className="synthia-estimate">Estimated: <span>{estimate.data.estimatedCreditsMin}–{estimate.data.estimatedCreditsMax} credits</span></p> : null}
            {createTask.isError ? <p role="alert" className="mt-3 text-xs text-rose-300">{createTask.error.message}</p> : null}
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
    </div>
  );
}
