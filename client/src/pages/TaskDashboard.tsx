import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Bot, Code2, Loader2, Play, Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const modeLabels = {
  ask_before_risky: "Ask before risky actions",
  supervised: "Supervised execution",
} as const;

export default function TaskDashboard() {
  const [, setLocation] = useLocation();
  const [goal, setGoal] = useState("");
  const [involvesCode, setInvolvesCode] = useState(false);
  const [mode, setMode] = useState<"ask_before_risky" | "supervised">("ask_before_risky");
  const tasks = trpc.tasks.list.useQuery();
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: ({ task }) => setLocation(`/tasks/${task.id}`),
  });
  const estimate = trpc.catalog.estimateTask.useQuery(
    { goal, planSteps: 3, involvesCode },
    { enabled: goal.trim().length >= 8, staleTime: 8_000 },
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (goal.trim().length < 8 || createTask.isPending) return;
    createTask.mutate({
      goal: goal.trim(),
      involvesCode,
      autonomySettings: { mode, allowWebSearch: true, allowCodeExecution: true, allowFileWrites: true },
    });
  }

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-orange-300">Synthia workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#fff7eb]">Give Synthia a goal.</h1></div>
        <div className="hidden items-center gap-2 text-xs text-[#a99a8d] sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" />Control plane online</div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 py-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-[#201812] p-5 shadow-[0_24px_80px_rgba(0,0,0,.22)] sm:p-7">
            <div className="flex items-center gap-2 text-sm font-medium text-orange-200"><Sparkles size={16} /> New autonomous task</div>
            <label className="sr-only" htmlFor="task-goal">Task goal</label>
            <Textarea id="task-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="Describe the outcome you want Synthia to achieve…" className="mt-5 min-h-40 resize-none border-white/10 bg-[#16110d] px-4 py-4 text-base leading-7 text-[#f7ede0] placeholder:text-[#776a5e] focus-visible:ring-orange-400" />
            <div className="mt-5 flex flex-col gap-4 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setInvolvesCode(value => !value)} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs", involvesCode ? "border-orange-300/40 bg-orange-400/10 text-orange-200" : "border-white/10 text-[#ae9f91]")}><Code2 size={14} />Includes code</button>
                {(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map(value => <button key={value} type="button" onClick={() => setMode(value)} className={cn("h-9 rounded-lg border px-3 text-xs", mode === value ? "border-orange-300/40 bg-orange-400/10 text-orange-200" : "border-white/10 text-[#ae9f91]")}>{modeLabels[value]}</button>)}
              </div>
              <Button type="submit" disabled={goal.trim().length < 8 || createTask.isPending} className="gap-2 rounded-xl bg-gradient-to-r from-orange-300 to-orange-500 font-semibold text-[#2c160c] hover:from-orange-200 hover:to-orange-400">{createTask.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Start task</Button>
            </div>
            {estimate.data ? <p className="mt-4 text-xs text-[#99897b]">Estimated range: <span className="text-orange-200">{estimate.data.estimatedCreditsMin}–{estimate.data.estimatedCreditsMax} credits</span>. The ledger records actual usage as the task runs.</p> : null}
            {createTask.isError ? <p role="alert" className="mt-4 text-sm text-rose-300">{createTask.error.message}</p> : null}
          </form>

          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-[#f3e7d8]">All tasks</h2><span className="text-xs text-[#7d6f62]">{tasks.data?.length ?? 0} total</span></div>
            {tasks.isLoading ? <div className="flex items-center gap-2 py-12 text-sm text-[#88786b]"><Loader2 className="animate-spin" size={16} /> Loading your tasks…</div> : null}
            {tasks.isError ? <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">{tasks.error.message}</div> : null}
            {!tasks.isLoading && !tasks.isError && tasks.data?.length === 0 ? <div className="rounded-2xl border border-dashed border-white/13 px-6 py-12 text-center"><Bot className="mx-auto text-orange-300" size={24} /><p className="mt-3 text-sm text-[#b9aa9a]">Your created tasks will appear here with their true execution state.</p></div> : null}
            <div className="grid gap-3">
              {tasks.data?.map(task => <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-left transition-colors hover:border-orange-300/25 hover:bg-orange-300/[.04]"><span className={cn("grid h-9 w-9 place-items-center rounded-xl", task.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-orange-400/10 text-orange-300")}><Play size={15} /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm font-medium text-[#f4e9db]">{task.title}</b><small className="mt-1 block truncate text-xs text-[#8e7f72]">{task.currentStepSummary ?? task.goal}</small></span><span className="hidden text-xs text-[#9b8b7e] sm:block">{task.status.replace(/_/g, " ")}</span><ArrowUpRight className="text-[#77695d] group-hover:text-orange-300" size={16} /></button>)}
            </div>
          </section>
        </section>
        <aside className="h-fit rounded-2xl border border-white/9 bg-[#1d1611] p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-orange-300">Execution contract</p><div className="mt-5 space-y-4 text-sm leading-6 text-[#b2a395]"><p>Every task keeps an ordered event record for review, replay, and recovery.</p><p>External-impact actions stop for approval. Approving or editing them happens inside the task thread.</p><p>The Agent’s Computer opens automatically when you enter a task, with Code selected by default.</p></div></aside>
      </div>
    </div>
  );
}
