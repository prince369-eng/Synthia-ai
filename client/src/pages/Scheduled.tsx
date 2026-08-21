import { useState } from "react";
import { CalendarClock, Clock3, Loader2, PauseCircle, PlayCircle, Plus, Route, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ScheduleDraft = { name: string; goal: string; cron: string };

function formatScheduleTime(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString() : "Not scheduled";
}

export default function Scheduled() {
  const utils = trpc.useUtils();
  const scheduleStatus = trpc.scheduled.status.useQuery();
  const schedules = trpc.scheduled.list.useQuery(undefined, { retry: false });
  const createSchedule = trpc.scheduled.create.useMutation({
    onSuccess: async () => {
      await utils.scheduled.list.invalidate();
      setDraft({ name: "", goal: "", cron: "" });
    },
  });
  const setEnabled = trpc.scheduled.setEnabled.useMutation({ onSuccess: () => utils.scheduled.list.invalidate() });
  const removeSchedule = trpc.scheduled.delete.useMutation({ onSuccess: () => utils.scheduled.list.invalidate() });
  const [draft, setDraft] = useState<ScheduleDraft>({ name: "", goal: "", cron: "" });

  const workflows = schedules.data?.workflows ?? [];
  const available = scheduleStatus.data?.available === true;
  const activeCount = workflows.filter(workflow => workflow.status === "active").length;
  const canSubmit = available && draft.name.trim().length >= 2 && draft.goal.trim().length >= 12 && draft.cron.trim().length > 0;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    createSchedule.mutate({ name: draft.name.trim(), goal: draft.goal.trim(), cron: draft.cron.trim() });
  };

  return <section className="synthia-page">
    <header className="synthia-page-head">
      <div>
        <p className="synthia-eyebrow">Durable automation</p>
        <h1>Scheduled</h1>
        <p>Create a recurring Synthia workflow only after reviewing its objective and frequency. Each run creates one owned task with an auditable timeline.</p>
      </div>
      <div className="synthia-page-stat"><b>{activeCount}</b><span>active schedule{activeCount === 1 ? "" : "s"}</span></div>
    </header>

    {!scheduleStatus.isLoading && !available ? <div className="synthia-empty-state" role="status">
      <CalendarClock size={18} /><div><b>Schedules are ready after publishing</b><span>{scheduleStatus.data?.reason ?? "Preview never creates or changes Heartbeat jobs."}</span></div>
    </div> : null}

    <form className="synthia-schedule-form" onSubmit={submit} aria-describedby="schedule-create-guidance">
      <div className="flex items-center gap-2"><Plus size={16} className="text-cyan-300" /><b>Create a reviewed schedule</b></div>
      <p id="schedule-create-guidance" className="text-sm text-zinc-400">UTC cron uses six fields with seconds set to <code>0</code>, for example <code>0 0 9 * * *</code>. Creation is disabled in preview.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-zinc-300"><span>Name</span><input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} maxLength={120} disabled={!available || createSchedule.isPending} className="synthia-input" placeholder="Weekly research brief" /></label>
        <label className="space-y-1 text-sm text-zinc-300"><span>UTC cron</span><input value={draft.cron} onChange={event => setDraft(current => ({ ...current, cron: event.target.value }))} maxLength={120} disabled={!available || createSchedule.isPending} className="synthia-input font-mono" placeholder="0 0 9 * * *" /></label>
      </div>
      <label className="block space-y-1 text-sm text-zinc-300"><span>Task objective</span><textarea value={draft.goal} onChange={event => setDraft(current => ({ ...current, goal: event.target.value }))} maxLength={8000} disabled={!available || createSchedule.isPending} className="synthia-input min-h-24" placeholder="Describe the recurring work Synthia should run." /></label>
      {createSchedule.error ? <p className="text-sm text-rose-300" role="alert">{createSchedule.error.message}</p> : null}
      <button type="submit" disabled={!canSubmit || createSchedule.isPending} className="synthia-button-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"><CalendarClock size={15} />{createSchedule.isPending ? "Creating…" : "Create schedule"}</button>
    </form>

    {schedules.isLoading ? <div className="synthia-empty-state"><Loader2 className="animate-spin" size={16} /> Loading scheduled work…</div> : null}
    {schedules.isError ? <div className="synthia-empty-state" role="alert">Your saved schedules could not be loaded. No new job was created.</div> : null}
    {!schedules.isLoading && !schedules.isError && workflows.length === 0 ? <div className="synthia-empty-state"><CalendarClock size={18} /><b>No saved schedules</b><span>There are no recurring workflows for this account.</span></div> : null}

    <div className="synthia-compact-grid">{workflows.map(workflow => {
      const active = workflow.status === "active";
      const working = setEnabled.isPending || removeSchedule.isPending;
      return <article className="synthia-compact-card synthia-schedule-card" key={workflow.id}>
        <div className="flex min-w-0 items-start justify-between gap-3"><div><b>{workflow.name}</b><p>{workflow.goal}</p></div>{active ? <PlayCircle className="shrink-0 text-emerald-400" size={17} aria-label="Schedule active" /> : <PauseCircle className="shrink-0 text-zinc-400" size={17} aria-label="Schedule paused" />}</div>
        <div className="synthia-schedule-detail"><Clock3 size={13} /><span>{workflow.cronExpression}</span></div>
        <div className="synthia-schedule-detail"><Route size={13} /><span>Creates an owned Synthia task</span></div>
        <small>Last: {formatScheduleTime(workflow.lastExecutedAt)} · Next: {formatScheduleTime(workflow.nextExecutionAt)}</small>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!available || working} onClick={() => setEnabled.mutate({ workflowId: workflow.id, enabled: !active })} className="synthia-button-secondary disabled:cursor-not-allowed disabled:opacity-50">{active ? "Pause" : "Resume"}</button>
          <button type="button" disabled={!available || working} onClick={() => removeSchedule.mutate({ workflowId: workflow.id })} className="synthia-button-secondary inline-flex items-center gap-1 text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={13} />Delete</button>
        </div>
      </article>;
    })}</div>
  </section>;
}
