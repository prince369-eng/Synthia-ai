import { CalendarClock, Clock3, Loader2, PauseCircle, PlayCircle, Route } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ScheduledJob = {
  taskUid: string;
  name: string;
  description?: string | null;
  callbackPath: string;
  cronExpression: string;
  isEnable: boolean;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

export function normalizeScheduledJobs(payload: unknown): ScheduledJob[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { jobs?: unknown }).jobs)) return [];
  return (payload as { jobs: ScheduledJob[] }).jobs;
}

function formatScheduleTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

export default function Scheduled() {
  const jobs = trpc.scheduled.list.useQuery(undefined, { retry: false });
  const scheduledJobs = normalizeScheduledJobs(jobs.data);
  const activeCount = scheduledJobs.filter(job => job.isEnable).length;
  return <section className="synthia-page"><header className="synthia-page-head"><div><p className="synthia-eyebrow">Durable automation</p><h1>Scheduled</h1><p>Inspect recurring Synthia work created for approved workflows. Schedule changes remain unavailable until the workflow owner and callback are configured safely.</p></div><div className="synthia-page-stat"><b>{activeCount}</b><span>active schedule{activeCount === 1 ? "" : "s"}</span></div></header>
    {jobs.isLoading ? <div className="synthia-empty-state"><Loader2 className="animate-spin" size={16} /> Loading scheduled work…</div> : null}
    {jobs.isError ? <div className="synthia-empty-state">Scheduled work is unavailable until the managed scheduler can be reached for this signed-in account.</div> : null}
    {!jobs.isLoading && !jobs.isError && scheduledJobs.length === 0 ? <div className="synthia-empty-state"><CalendarClock size={18} /><b>No scheduled work</b><span>Schedules are created only for approved recurring workflows; no demonstration jobs are shown.</span></div> : null}
    <div className="synthia-compact-grid">{scheduledJobs.map(job => <article className="synthia-compact-card synthia-schedule-card" key={job.taskUid}><div className="flex min-w-0 items-start justify-between gap-3"><div><b>{job.name}</b><p>{job.description || "Recurring Synthia workflow"}</p></div>{job.isEnable ? <PlayCircle className="shrink-0 text-emerald-400" size={17} aria-label="Schedule active" /> : <PauseCircle className="shrink-0 text-zinc-400" size={17} aria-label="Schedule paused" />}</div><div className="synthia-schedule-detail"><Clock3 size={13} /><span>{job.cronExpression}</span></div><div className="synthia-schedule-detail"><Route size={13} /><span>{job.callbackPath}</span></div><small>Last: {formatScheduleTime(job.lastExecutedAt)} · Next: {formatScheduleTime(job.nextExecutionAt)}</small></article>)}</div>
  </section>;
}
