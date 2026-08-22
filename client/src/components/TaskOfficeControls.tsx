import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { clientErrorMessage } from "@/lib/clientErrorDisplay";
import { BarChart3, BookOpenText, ClipboardCheck, FileText, GitFork, RotateCcw } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

export function TaskOfficeExportMenu({ taskId }: { taskId: string }) {
  const utils = trpc.useUtils();
  const [message, setMessage] = useState<string | null>(null);
  const exportOffice = trpc.tasks.exportOffice.useMutation({
    onSuccess: async result => {
      setMessage(`${result.filename} is ready in Files.`);
      await utils.tasks.get.invalidate({ taskId });
    },
  });
  const requestExport = (format: "pdf" | "pptx" | "xlsx") => {
    setMessage(null);
    exportOffice.mutate({ taskId, format });
  };

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" aria-label="Export task as PDF, presentation, or spreadsheet" title="Export task deliverable" disabled={exportOffice.isPending} className="h-7 border-teal-300/20 bg-teal-300/[.04] px-2 text-[11px] text-teal-100 hover:bg-teal-300/10"><FileText size={13} />Export</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#14201e] text-[#e5f2ef]">
      <DropdownMenuLabel>Task deliverable</DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-white/8" />
      <DropdownMenuItem onSelect={() => requestExport("pdf")}>Export audited PDF brief</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => requestExport("pptx")}>Export editable presentation</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => requestExport("xlsx")}>Export task timeline spreadsheet</DropdownMenuItem>
      <DropdownMenuSeparator className="bg-white/8" />
      <p className="px-2 py-1.5 text-[10px] leading-4 text-[#91a7a1]">Creates a task-owned file only after you choose a format. No model run is started.</p>
    </DropdownMenuContent>
    {message ? <span className="sr-only" role="status">{message}</span> : null}
    {exportOffice.isError ? <span className="sr-only" role="alert">{clientErrorMessage(exportOffice.error, "We could not create that export. Please try again.")}</span> : null}
  </DropdownMenu>;
}

export function TaskLearningPanel({ taskId, pendingLessons, readOnly }: { taskId: string; pendingLessons: Array<{ id: string; factText: string; confidence: number }>; readOnly: boolean }) {
  const utils = trpc.useUtils();
  const [lesson, setLesson] = useState("");
  const propose = trpc.tasks.proposeTaskLesson.useMutation({
    onSuccess: async () => { setLesson(""); await utils.tasks.get.invalidate({ taskId }); },
  });
  const review = trpc.tasks.reviewTaskLesson.useMutation({
    onSuccess: async () => void utils.tasks.get.invalidate({ taskId }),
  });

  return <section className="space-y-3" aria-label="Task review and approved lessons">
    <div className="rounded-xl border border-teal-300/15 bg-teal-300/[.04] p-3"><div className="flex items-start gap-2"><BookOpenText size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Review before Synthia learns</h2><p className="mt-1 text-[11px] leading-5 text-[#a8bbb6]">Record a bounded lesson from this task, then explicitly approve or discard it. Only approved lessons are added to future planning context; nothing changes the agent’s code, tools, or permissions.</p></div></div></div>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to propose or review a lesson.</p> : <form onSubmit={event => { event.preventDefault(); if (lesson.trim()) propose.mutate({ taskId, lesson: lesson.trim(), confidence: 0.7 }); }} className="rounded-xl border border-white/8 bg-[#14201e] p-3"><label htmlFor="task-lesson" className="text-[11px] font-semibold text-[#dcece7]">Proposed lesson</label><textarea id="task-lesson" value={lesson} onChange={event => setLesson(event.target.value)} maxLength={1200} placeholder="Example: Confirm spreadsheet column mappings before writing rows." className="mt-2 min-h-24 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" /><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-[#778985]">{lesson.length}/1200 · saved as pending review</span><Button type="submit" size="sm" disabled={lesson.trim().length < 20 || propose.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">Propose lesson</Button></div>{propose.isError ? <p role="alert" className="mt-2 text-[11px] text-rose-300">{clientErrorMessage(propose.error, "We could not propose that lesson. Please try again.")}</p> : null}</form>}
    <div className="space-y-2">{pendingLessons.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] text-[#91a7a1]">No pending lessons. Synthia does not infer or activate cross-task learning automatically.</p> : pendingLessons.map(item => <article key={item.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><p className="text-xs leading-5 text-[#dcece7]">{item.factText}</p><p className="mt-1 text-[10px] text-[#91a7a1]">Proposed confidence: {Math.round(item.confidence * 100)}%</p>{!readOnly ? <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => review.mutate({ taskId, memoryId: item.id, decision: "active" })} disabled={review.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">Approve for future tasks</Button><Button size="sm" variant="outline" onClick={() => review.mutate({ taskId, memoryId: item.id, decision: "archived" })} disabled={review.isPending} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Discard</Button></div> : null}</article>)}</div>
  </section>;
}

type ComparisonMetric = {
  taskId: string;
  title: string;
  status: string;
  executionProfile: string;
  creditsConsumed: number;
  elapsedMinutes: number | null;
  deliverableCount: number;
  finalDeliverableCount: number;
  proofCount: number;
  corroboratedProofCount: number;
  proofNeedsReviewCount: number;
  latestVerdict: string | null;
  errorEventCount: number;
  pipelineDriftCount: number;
  criticalPipelineSignalCount: number;
};

const comparisonRows: Array<{ label: string; value: (metric: ComparisonMetric) => string }> = [
  { label: "Execution profile", value: metric => metric.executionProfile },
  { label: "Recorded credits", value: metric => metric.creditsConsumed.toFixed(1) },
  { label: "Elapsed time", value: metric => metric.elapsedMinutes === null ? "Not available" : `${metric.elapsedMinutes} min` },
  { label: "Final deliverables", value: metric => `${metric.finalDeliverableCount}/${metric.deliverableCount}` },
  { label: "Corroborated proof", value: metric => `${metric.corroboratedProofCount}/${metric.proofCount}` },
  { label: "Proof needing review", value: metric => String(metric.proofNeedsReviewCount) },
  { label: "Latest review verdict", value: metric => metric.latestVerdict?.replace(/_/g, " ") ?? "No stored verdict" },
  { label: "Recorded errors", value: metric => String(metric.errorEventCount) },
  { label: "Pipeline drift signals", value: metric => `${metric.pipelineDriftCount} (${metric.criticalPipelineSignalCount} critical)` },
];

/** Renders persisted comparison facts only; no action is proposed or executed here. */
export function TaskRunComparisonPanel({ taskId }: { taskId: string }) {
  const [comparisonTaskId, setComparisonTaskId] = useState("");
  const comparison = trpc.tasks.compare.useQuery({ taskId, ...(comparisonTaskId ? { comparisonTaskId } : {}) });
  const data = comparison.data;
  const current = data?.current as ComparisonMetric | undefined;
  const baseline = data?.baseline as ComparisonMetric | null | undefined;
  return <section className="space-y-3" aria-label="Run comparison and drift dashboard">
    <div className="rounded-xl border border-teal-300/15 bg-teal-300/[.04] p-3"><div className="flex items-start gap-2"><BarChart3 size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Run comparison</h2><p className="mt-1 text-[11px] leading-5 text-[#a8bbb6]">Compare recorded task facts to identify changes worth reviewing. This dashboard is read-only: it never reruns work or changes models, Skills, tools, policies, prompts, lessons, or approvals.</p></div></div></div>
    {comparison.isLoading ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Loading owner-scoped comparison records…</p> : null}
    {comparison.isError ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(comparison.error, "We could not load the comparison. Please try again.")}</p> : null}
    {data && current ? <><label className="block text-[11px] text-[#a8bbb6]" htmlFor="comparison-baseline">Compare against<select id="comparison-baseline" value={comparisonTaskId || baseline?.taskId || ""} onChange={event => setComparisonTaskId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0e1716] px-2 py-1.5 text-xs text-[#e5f2ef] outline-none focus:border-cyan-300/45"><option value="">Most recent completed task</option>{data.availableBaselines.map(task => <option key={task.id} value={task.id}>{task.title} · {task.status.replace(/_/g, " ")}</option>)}</select></label>{!baseline ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No other owner-scoped task is available yet. Complete another task to compare persisted outcomes; Synthia will not invent a baseline or start one for you.</p> : <><div className="overflow-x-auto rounded-lg border border-white/8"><table className="w-full min-w-[420px] text-left text-[11px]"><thead className="bg-white/[.03] text-[#91a7a1]"><tr><th className="px-3 py-2 font-medium">Metric</th><th className="px-3 py-2 font-medium">This task</th><th className="px-3 py-2 font-medium">Comparison task</th></tr></thead><tbody>{comparisonRows.map(row => <tr key={row.label} className="border-t border-white/6"><th className="px-3 py-2 font-medium text-[#c7ddd7]">{row.label}</th><td className="px-3 py-2 text-cyan-100">{row.value(current)}</td><td className="px-3 py-2 text-[#a8bbb6]">{row.value(baseline)}</td></tr>)}</tbody></table></div><div className="space-y-2">{data.signals.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] text-[#91a7a1]">No review signals crossed the dashboard threshold. This is not a quality guarantee; inspect the evidence and evaluation records when relevant.</p> : data.signals.map(signal => <article key={signal.id} className="rounded-lg border border-amber-300/15 bg-amber-300/[.035] p-3"><p className="text-[11px] font-semibold text-amber-100">{signal.title}</p><p className="mt-1 text-[11px] leading-5 text-[#c7bca8]">{signal.detail}</p></article>)}</div></>}</> : null}
  </section>;
}

type HandoffPolicy = {
  id: string;
  title: string;
  taskCategory: string;
  specialistRole: "coordinator" | "researcher" | "analyst" | "writer" | "coder" | "reviewer";
  boundedScope: string;
  evidenceRequirements: unknown;
  budgetLimit: number;
  timeLimitMinutes: number;
  requiresApproval: boolean;
  status: string;
};

type RecoveryPlaybook = {
  id: string;
  title: string;
  triggerConditions: unknown;
  recoverySteps: unknown;
  applicability: string;
  blastRadiusPreview: string;
  rollbackGuidance: string;
  evidenceRequirements: unknown;
  riskLevel: "low" | "medium" | "high";
  requiresApproval: boolean;
  status: string;
};

const specialistRoles = ["coordinator", "researcher", "analyst", "writer", "coder", "reviewer"] as const;
const asLines = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("\n") : "";
const lines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);

function PanelNotice({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-teal-300/15 bg-teal-300/[.04] p-3 text-[11px] leading-5 text-[#a8bbb6]">{children}</div>;
}

/** Owner-authored delegation guidance only; policy records never queue or execute specialist work. */
export function TaskHandoffPolicyPanel({ taskId, policies, readOnly }: { taskId: string; policies: HandoffPolicy[]; readOnly: boolean }) {
  const utils = trpc.useUtils();
  const emptyDraft = { title: "", taskCategory: "", specialistRole: "researcher" as HandoffPolicy["specialistRole"], boundedScope: "", evidenceRequirements: "", budgetLimit: "100", timeLimitMinutes: "60" };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const refresh = () => void utils.tasks.get.invalidate({ taskId });
  const create = trpc.tasks.createHandoffPolicy.useMutation({ onSuccess: () => { setDraft(emptyDraft); setOpen(false); refresh(); } });
  const update = trpc.tasks.updateHandoffPolicy.useMutation({ onSuccess: () => { setDraft(emptyDraft); setEditingId(null); setOpen(false); refresh(); } });
  const archive = trpc.tasks.archiveHandoffPolicy.useMutation({ onSuccess: refresh });
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { taskId, title: draft.title.trim(), taskCategory: draft.taskCategory.trim(), specialistRole: draft.specialistRole, boundedScope: draft.boundedScope.trim(), evidenceRequirements: lines(draft.evidenceRequirements), budgetLimit: Number(draft.budgetLimit), timeLimitMinutes: Number(draft.timeLimitMinutes) };
    if (editingId) update.mutate({ ...input, policyId: editingId }); else create.mutate(input);
  };
  const edit = (policy: HandoffPolicy) => { setDraft({ title: policy.title, taskCategory: policy.taskCategory, specialistRole: policy.specialistRole, boundedScope: policy.boundedScope, evidenceRequirements: asLines(policy.evidenceRequirements), budgetLimit: String(policy.budgetLimit), timeLimitMinutes: String(policy.timeLimitMinutes) }); setEditingId(policy.id); setOpen(true); };
  const mutationError = create.error ?? update.error ?? archive.error;
  return <section className="space-y-3" aria-label="Policy-aware specialist handoffs">
    <PanelNotice><div className="flex items-start gap-2"><GitFork size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Policy-aware handoffs</h2><p className="mt-1">Create an owner-scoped template for a future specialist proposal. A policy cannot create, approve, queue, or execute a delegation. Each later handoff still requires explicit approval.</p></div></div></PanelNotice>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to curate handoff guidance.</p> : <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingId(null); setDraft(emptyDraft); setOpen(value => !value); }} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{open ? "Cancel" : "Add handoff policy"}</Button></div>}
    {open && !readOnly ? <form onSubmit={save} className="space-y-2.5 rounded-xl border border-white/8 bg-[#14201e] p-3"><div className="grid gap-2 sm:grid-cols-2"><FormText label="Policy title" value={draft.title} onChange={value => setDraft(item => ({ ...item, title: value }))} placeholder="Research review handoff" required /><FormText label="Task category" value={draft.taskCategory} onChange={value => setDraft(item => ({ ...item, taskCategory: value }))} placeholder="Market research" required /></div><label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">Specialist role<select value={draft.specialistRole} onChange={event => setDraft(item => ({ ...item, specialistRole: event.target.value as HandoffPolicy["specialistRole"] }))} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#0e1716] px-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none focus:border-cyan-300/45">{specialistRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label><FormArea label="Bounded scope" value={draft.boundedScope} onChange={value => setDraft(item => ({ ...item, boundedScope: value }))} placeholder="Describe exactly what a future proposal may cover and its boundary." /><FormArea label="Required evidence (one item per line)" value={draft.evidenceRequirements} onChange={value => setDraft(item => ({ ...item, evidenceRequirements: value }))} placeholder="Source references to inspect before proposing a handoff" /><div className="grid gap-2 sm:grid-cols-2"><FormNumber label="Maximum budget" value={draft.budgetLimit} onChange={value => setDraft(item => ({ ...item, budgetLimit: value }))} min={1} max={1000000} /><FormNumber label="Maximum minutes" value={draft.timeLimitMinutes} onChange={value => setDraft(item => ({ ...item, timeLimitMinutes: value }))} min={1} max={10080} /></div><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[#778985]">Saved as an approval-only proposal template.</span><Button type="submit" size="sm" disabled={create.isPending || update.isPending || draft.title.trim().length < 3 || draft.taskCategory.trim().length < 2 || draft.boundedScope.trim().length < 12 || lines(draft.evidenceRequirements).length === 0} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{create.isPending || update.isPending ? "Saving…" : editingId ? "Save policy" : "Create policy"}</Button></div></form> : null}
    {mutationError ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(mutationError, "We could not save that handoff policy. Please try again.")}</p> : null}
    <PolicyCards policies={policies} readOnly={readOnly} onEdit={edit} onArchive={policyId => archive.mutate({ taskId, policyId })} archiving={archive.isPending} />
  </section>;
}

/** Owner-curated recovery templates only; every future recovery remains a reviewed proposal. */
export function TaskRecoveryPlaybookPanel({ taskId, playbooks, readOnly }: { taskId: string; playbooks: RecoveryPlaybook[]; readOnly: boolean }) {
  const utils = trpc.useUtils();
  const emptyDraft = { title: "", triggerConditions: "", recoverySteps: "", applicability: "", blastRadiusPreview: "", rollbackGuidance: "", evidenceRequirements: "", riskLevel: "medium" as RecoveryPlaybook["riskLevel"] };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const refresh = () => void utils.tasks.get.invalidate({ taskId });
  const create = trpc.tasks.createRecoveryPlaybook.useMutation({ onSuccess: () => { setDraft(emptyDraft); setOpen(false); refresh(); } });
  const update = trpc.tasks.updateRecoveryPlaybook.useMutation({ onSuccess: () => { setDraft(emptyDraft); setEditingId(null); setOpen(false); refresh(); } });
  const archive = trpc.tasks.archiveRecoveryPlaybook.useMutation({ onSuccess: refresh });
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { taskId, title: draft.title.trim(), triggerConditions: lines(draft.triggerConditions), recoverySteps: lines(draft.recoverySteps), applicability: draft.applicability.trim(), blastRadiusPreview: draft.blastRadiusPreview.trim(), rollbackGuidance: draft.rollbackGuidance.trim(), evidenceRequirements: lines(draft.evidenceRequirements), riskLevel: draft.riskLevel };
    if (editingId) update.mutate({ ...input, playbookId: editingId }); else create.mutate(input);
  };
  const edit = (playbook: RecoveryPlaybook) => { setDraft({ title: playbook.title, triggerConditions: asLines(playbook.triggerConditions), recoverySteps: asLines(playbook.recoverySteps), applicability: playbook.applicability, blastRadiusPreview: playbook.blastRadiusPreview, rollbackGuidance: playbook.rollbackGuidance, evidenceRequirements: asLines(playbook.evidenceRequirements), riskLevel: playbook.riskLevel }); setEditingId(playbook.id); setOpen(true); };
  const mutationError = create.error ?? update.error ?? archive.error;
  return <section className="space-y-3" aria-label="Recovery playbooks">
    <PanelNotice><div className="flex items-start gap-2"><RotateCcw size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Recovery playbooks</h2><p className="mt-1">Document a bounded response to a known failure mode. A playbook never detects a failure, starts a recovery, or changes a task on its own; every use is a separate approval-required proposal.</p></div></div></PanelNotice>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to curate recovery guidance.</p> : <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingId(null); setDraft(emptyDraft); setOpen(value => !value); }} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{open ? "Cancel" : "Add recovery playbook"}</Button></div>}
    {open && !readOnly ? <form onSubmit={save} className="space-y-2.5 rounded-xl border border-white/8 bg-[#14201e] p-3"><FormText label="Playbook title" value={draft.title} onChange={value => setDraft(item => ({ ...item, title: value }))} placeholder="Schema change review" required /><FormArea label="Trigger conditions (one per line)" value={draft.triggerConditions} onChange={value => setDraft(item => ({ ...item, triggerConditions: value }))} placeholder="A condition that warrants a reviewed recovery proposal" /><FormArea label="Proposed recovery steps (one per line)" value={draft.recoverySteps} onChange={value => setDraft(item => ({ ...item, recoverySteps: value }))} placeholder="A bounded step to review; not an automatic action" /><FormArea label="Applicability" value={draft.applicability} onChange={value => setDraft(item => ({ ...item, applicability: value }))} placeholder="When this playbook is relevant and when it is not." /><FormArea label="Blast-radius preview" value={draft.blastRadiusPreview} onChange={value => setDraft(item => ({ ...item, blastRadiusPreview: value }))} placeholder="What could be affected if a later proposal is approved." /><FormArea label="Rollback guidance" value={draft.rollbackGuidance} onChange={value => setDraft(item => ({ ...item, rollbackGuidance: value }))} placeholder="How a separately approved recovery could be reversed." /><div className="grid gap-2 sm:grid-cols-2"><FormArea label="Required evidence (one per line)" value={draft.evidenceRequirements} onChange={value => setDraft(item => ({ ...item, evidenceRequirements: value }))} placeholder="Evidence required before a proposal" /><label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">Risk level<select value={draft.riskLevel} onChange={event => setDraft(item => ({ ...item, riskLevel: event.target.value as RecoveryPlaybook["riskLevel"] }))} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#0e1716] px-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none focus:border-cyan-300/45"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label></div><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[#778985]">Saved for review only; no recovery is run.</span><Button type="submit" size="sm" disabled={create.isPending || update.isPending || draft.title.trim().length < 3 || lines(draft.triggerConditions).length === 0 || lines(draft.recoverySteps).length === 0 || draft.applicability.trim().length < 12 || draft.blastRadiusPreview.trim().length < 12 || draft.rollbackGuidance.trim().length < 12 || lines(draft.evidenceRequirements).length === 0} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{create.isPending || update.isPending ? "Saving…" : editingId ? "Save playbook" : "Create playbook"}</Button></div></form> : null}
    {mutationError ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(mutationError, "We could not save that recovery playbook. Please try again.")}</p> : null}
    <PlaybookCards playbooks={playbooks} readOnly={readOnly} onEdit={edit} onArchive={playbookId => archive.mutate({ taskId, playbookId })} archiving={archive.isPending} />
  </section>;
}

type PolicyPack = {
  id: string;
  title: string;
  taskDomain: string;
  planningGuidance: string;
  evidenceRequirements: unknown;
  approvalConstraints: unknown;
  status: "enabled" | "archived";
};

/** Declarative planning context only; packs never grant tool or approval authority. */
export function TaskPolicyPackPanel({ taskId, policyPacks, readOnly }: { taskId: string; policyPacks: PolicyPack[]; readOnly: boolean }) {
  const utils = trpc.useUtils();
  const emptyDraft = { title: "", taskDomain: "", planningGuidance: "", evidenceRequirements: "", approvalConstraints: "" };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const refresh = () => void utils.tasks.get.invalidate({ taskId });
  const create = trpc.tasks.createPolicyPack.useMutation({ onSuccess: () => { setDraft(emptyDraft); setOpen(false); refresh(); } });
  const update = trpc.tasks.updatePolicyPack.useMutation({ onSuccess: () => { setDraft(emptyDraft); setEditingId(null); setOpen(false); refresh(); } });
  const archive = trpc.tasks.archivePolicyPack.useMutation({ onSuccess: refresh });
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { taskId, title: draft.title.trim(), taskDomain: draft.taskDomain.trim(), planningGuidance: draft.planningGuidance.trim(), evidenceRequirements: lines(draft.evidenceRequirements), approvalConstraints: lines(draft.approvalConstraints) };
    if (editingId) update.mutate({ ...input, policyPackId: editingId }); else create.mutate(input);
  };
  const edit = (policyPack: PolicyPack) => {
    setDraft({ title: policyPack.title, taskDomain: policyPack.taskDomain, planningGuidance: policyPack.planningGuidance, evidenceRequirements: asLines(policyPack.evidenceRequirements), approvalConstraints: asLines(policyPack.approvalConstraints) });
    setEditingId(policyPack.id);
    setOpen(true);
  };
  const mutationError = create.error ?? update.error ?? archive.error;
  return <section className="space-y-3" aria-label="Task policy packs">
    <PanelNotice><div className="flex items-start gap-2"><BookOpenText size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Task policy packs</h2><p className="mt-1">Curate visible planning guidance for matching future tasks. A pack cannot start work, invoke tools, change credentials, grant permission, or override a task-level approval.</p></div></div></PanelNotice>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to curate planning guidance.</p> : <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingId(null); setDraft(emptyDraft); setOpen(value => !value); }} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{open ? "Cancel" : "Add policy pack"}</Button></div>}
    {open && !readOnly ? <form onSubmit={save} className="space-y-2.5 rounded-xl border border-white/8 bg-[#14201e] p-3"><div className="grid gap-2 sm:grid-cols-2"><FormText label="Policy title" value={draft.title} onChange={value => setDraft(item => ({ ...item, title: value }))} placeholder="Research evidence guardrail" required /><FormText label="Task domain" value={draft.taskDomain} onChange={value => setDraft(item => ({ ...item, taskDomain: value }))} placeholder="Market research" required /></div><FormArea label="Planning guidance" value={draft.planningGuidance} onChange={value => setDraft(item => ({ ...item, planningGuidance: value }))} placeholder="What Synthia may consider while planning a matching future task." /><div className="grid gap-2 sm:grid-cols-2"><FormArea label="Required evidence (one per line)" value={draft.evidenceRequirements} onChange={value => setDraft(item => ({ ...item, evidenceRequirements: value }))} placeholder="Evidence that planning should request or preserve" /><FormArea label="Approval constraints (one per line)" value={draft.approvalConstraints} onChange={value => setDraft(item => ({ ...item, approvalConstraints: value }))} placeholder="Actions that must still be explicitly approved" /></div><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[#778985]">Enabled packs shape planning only; they never authorize execution.</span><Button type="submit" size="sm" disabled={create.isPending || update.isPending || draft.title.trim().length < 3 || draft.taskDomain.trim().length < 2 || draft.planningGuidance.trim().length < 12 || lines(draft.evidenceRequirements).length === 0 || lines(draft.approvalConstraints).length === 0} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{create.isPending || update.isPending ? "Saving…" : editingId ? "Save policy pack" : "Create policy pack"}</Button></div></form> : null}
    {mutationError ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(mutationError, "We could not save that policy pack. Please try again.")}</p> : null}
    <div className="space-y-2">{policyPacks.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No policy packs have been saved for this task. Synthia will not infer planning preferences or expand its authority.</p> : policyPacks.map(policyPack => <article key={policyPack.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#e5f2ef]">{policyPack.title}</p><p className="mt-1 text-[10px] text-cyan-100">{policyPack.taskDomain} · planning guidance only</p></div><span className="rounded-full border border-teal-300/15 bg-teal-300/[.05] px-2 py-0.5 text-[9px] text-teal-100">{policyPack.status === "enabled" ? "Enabled" : "Archived"}</span></div><p className="mt-2 text-[11px] leading-5 text-[#a8bbb6]">{policyPack.planningGuidance}</p><p className="mt-2 text-[10px] text-[#778985]">Evidence: {asLines(policyPack.evidenceRequirements).split("\n").filter(Boolean).join(" · ")}</p><p className="mt-1 text-[10px] text-[#778985]">Approval constraints: {asLines(policyPack.approvalConstraints).split("\n").filter(Boolean).join(" · ")}</p>{!readOnly && policyPack.status === "enabled" ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(policyPack)} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Edit</Button><Button size="sm" variant="outline" onClick={() => archive.mutate({ taskId, policyPackId: policyPack.id })} disabled={archive.isPending} className="h-7 border-rose-300/20 px-2 text-[11px] text-rose-200 hover:bg-rose-300/10">Archive</Button></div> : null}</article>)}</div>
  </section>;
}

type QualityBudget = { id: string; title: string; maxCredits: number; maxRuntimeMinutes: number; maxActionCycles: number; minEvidenceRecords: number; expectedDeliverables: number; maxRevisionCycles: number; reviewDepth: "basic" | "standard" | "thorough"; reviewerGuidance: string; requiresHumanReview: boolean; status: "active" | "archived" };

/** Quality budgets record review expectations only. They cannot change execution, pass/fail state, or approvals. */
export function TaskQualityBudgetPanel({ taskId, qualityBudgets, readOnly }: { taskId: string; qualityBudgets: QualityBudget[]; readOnly: boolean }) {
  const utils = trpc.useUtils();
  const emptyDraft = { title: "", maxCredits: "100", maxRuntimeMinutes: "60", maxActionCycles: "5", minEvidenceRecords: "0", expectedDeliverables: "0", maxRevisionCycles: "0", reviewDepth: "standard" as QualityBudget["reviewDepth"], reviewerGuidance: "", requiresHumanReview: true };
  const [draft, setDraft] = useState(emptyDraft); const [editingId, setEditingId] = useState<string | null>(null); const [open, setOpen] = useState(false);
  const refresh = () => void utils.tasks.get.invalidate({ taskId });
  const create = trpc.tasks.createQualityBudget.useMutation({ onSuccess: () => { setDraft(emptyDraft); setOpen(false); refresh(); } });
  const update = trpc.tasks.updateQualityBudget.useMutation({ onSuccess: () => { setDraft(emptyDraft); setEditingId(null); setOpen(false); refresh(); } });
  const archive = trpc.tasks.archiveQualityBudget.useMutation({ onSuccess: refresh });
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const input = { taskId, title: draft.title.trim(), maxCredits: Number(draft.maxCredits), maxRuntimeMinutes: Number(draft.maxRuntimeMinutes), maxActionCycles: Number(draft.maxActionCycles), minEvidenceRecords: Number(draft.minEvidenceRecords), expectedDeliverables: Number(draft.expectedDeliverables), maxRevisionCycles: Number(draft.maxRevisionCycles), reviewDepth: draft.reviewDepth, reviewerGuidance: draft.reviewerGuidance.trim(), requiresHumanReview: draft.requiresHumanReview }; if (editingId) update.mutate({ ...input, qualityBudgetId: editingId }); else create.mutate(input); };
  const edit = (budget: QualityBudget) => { setDraft({ title: budget.title, maxCredits: String(budget.maxCredits), maxRuntimeMinutes: String(budget.maxRuntimeMinutes), maxActionCycles: String(budget.maxActionCycles), minEvidenceRecords: String(budget.minEvidenceRecords), expectedDeliverables: String(budget.expectedDeliverables), maxRevisionCycles: String(budget.maxRevisionCycles), reviewDepth: budget.reviewDepth, reviewerGuidance: budget.reviewerGuidance, requiresHumanReview: budget.requiresHumanReview }); setEditingId(budget.id); setOpen(true); };
  const error = create.error ?? update.error ?? archive.error;
  const valid = draft.title.trim().length >= 3 && draft.reviewerGuidance.trim().length >= 12 && Number(draft.maxCredits) >= 1 && Number(draft.maxRuntimeMinutes) >= 1 && Number(draft.maxActionCycles) >= 1;
  return <section className="space-y-3" aria-label="Task quality budgets">
    <PanelNotice><div className="flex items-start gap-2"><ClipboardCheck size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Quality budgets</h2><p className="mt-1">Record expected evidence, deliverables, review depth, and bounded task facts. These are informational review context only: they never retry, remediate, approve, pass, fail, or start work.</p></div></div></PanelNotice>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to curate quality review expectations.</p> : <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingId(null); setDraft(emptyDraft); setOpen(value => !value); }} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{open ? "Cancel" : "Add quality budget"}</Button></div>}
    {open && !readOnly ? <form onSubmit={save} className="space-y-2.5 rounded-xl border border-white/8 bg-[#14201e] p-3"><div className="grid gap-2 sm:grid-cols-2"><FormText label="Budget title" value={draft.title} onChange={value => setDraft(item => ({ ...item, title: value }))} placeholder="Evidence-first delivery review" required /><label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">Review depth<select value={draft.reviewDepth} onChange={event => setDraft(item => ({ ...item, reviewDepth: event.target.value as QualityBudget["reviewDepth"] }))} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#0e1716] px-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none focus:border-cyan-300/45"><option value="basic">Basic</option><option value="standard">Standard</option><option value="thorough">Thorough</option></select></label></div><div className="grid gap-2 sm:grid-cols-3"><FormNumber label="Recorded credit ceiling" value={draft.maxCredits} onChange={value => setDraft(item => ({ ...item, maxCredits: value }))} min={1} max={1000000} /><FormNumber label="Runtime ceiling (min)" value={draft.maxRuntimeMinutes} onChange={value => setDraft(item => ({ ...item, maxRuntimeMinutes: value }))} min={1} max={10080} /><FormNumber label="Action-cycle ceiling" value={draft.maxActionCycles} onChange={value => setDraft(item => ({ ...item, maxActionCycles: value }))} min={1} max={100} /></div><div className="grid gap-2 sm:grid-cols-3"><FormNumber label="Evidence records expected" value={draft.minEvidenceRecords} onChange={value => setDraft(item => ({ ...item, minEvidenceRecords: value }))} min={0} max={100} /><FormNumber label="Deliverables expected" value={draft.expectedDeliverables} onChange={value => setDraft(item => ({ ...item, expectedDeliverables: value }))} min={0} max={100} /><FormNumber label="Revision cycles expected" value={draft.maxRevisionCycles} onChange={value => setDraft(item => ({ ...item, maxRevisionCycles: value }))} min={0} max={20} /></div><FormArea label="Reviewer guidance" value={draft.reviewerGuidance} onChange={value => setDraft(item => ({ ...item, reviewerGuidance: value }))} placeholder="What a human reviewer should inspect. This cannot trigger an automatic pass, retry, or remediation." /><label className="flex items-center gap-2 text-[11px] text-[#a8bbb6]"><input type="checkbox" checked={draft.requiresHumanReview} onChange={event => setDraft(item => ({ ...item, requiresHumanReview: event.target.checked }))} className="h-3.5 w-3.5 accent-teal-400" />Require a human review record</label><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[#778985]">Budgets are review facts, not execution limits or automatic outcomes.</span><Button type="submit" size="sm" disabled={create.isPending || update.isPending || !valid} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{create.isPending || update.isPending ? "Saving…" : editingId ? "Save quality budget" : "Create quality budget"}</Button></div></form> : null}
    {error ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(error, "We could not save that quality budget. Please try again.")}</p> : null}
    <div className="space-y-2">{qualityBudgets.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No quality budget has been recorded. Synthia will not invent thresholds, retry work, or declare a task successful automatically.</p> : qualityBudgets.map(budget => <article key={budget.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#e5f2ef]">{budget.title}</p><p className="mt-1 text-[10px] text-cyan-100">{budget.reviewDepth} review · {budget.requiresHumanReview ? "human review required" : "human review optional"}</p></div><span className="rounded-full border border-teal-300/15 bg-teal-300/[.05] px-2 py-0.5 text-[9px] text-teal-100">{budget.status === "active" ? "Review context" : "Archived"}</span></div><div className="mt-2 grid gap-1 text-[10px] text-[#91a7a1] sm:grid-cols-2"><span>Recorded ceiling: {budget.maxCredits} credits · {budget.maxRuntimeMinutes} min · {budget.maxActionCycles} cycles</span><span>Expected: {budget.minEvidenceRecords} evidence · {budget.expectedDeliverables} deliverables · {budget.maxRevisionCycles} revisions</span></div><p className="mt-2 text-[11px] leading-5 text-[#a8bbb6]">{budget.reviewerGuidance}</p>{!readOnly && budget.status === "active" ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(budget)} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Edit</Button><Button size="sm" variant="outline" onClick={() => archive.mutate({ taskId, qualityBudgetId: budget.id })} disabled={archive.isPending} className="h-7 border-rose-300/20 px-2 text-[11px] text-rose-200 hover:bg-rose-300/10">Archive</Button></div> : null}</article>)}</div>
  </section>;
}

type BrowserChangeSet = { id: string; title: string; targetUrl: string; proposedChanges: unknown; reviewerGuidance: string; requiresHumanReview: boolean; status: string };

/** Durable review context only. This panel deliberately has no browser, navigation, credential, upload, submit, or execution control. */
export function TaskBrowserChangeSetPanel({ taskId, changeSets, readOnly }: { taskId: string; changeSets: BrowserChangeSet[]; readOnly: boolean }) {
  const utils = trpc.useUtils();
  const emptyDraft = { title: "", targetUrl: "", proposedChanges: "", reviewerGuidance: "", requiresHumanReview: true };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const refresh = () => void utils.tasks.get.invalidate({ taskId });
  const create = trpc.tasks.createBrowserChangeSet.useMutation({ onSuccess: () => { setDraft(emptyDraft); setEditingId(null); setOpen(false); refresh(); } });
  const update = trpc.tasks.updateBrowserChangeSet.useMutation({ onSuccess: () => { setDraft(emptyDraft); setEditingId(null); setOpen(false); refresh(); } });
  const archive = trpc.tasks.archiveBrowserChangeSet.useMutation({ onSuccess: refresh });
  const proposedChanges = lines(draft.proposedChanges);
  const valid = draft.title.trim().length >= 3 && draft.targetUrl.trim().length > 0 && proposedChanges.length > 0 && draft.reviewerGuidance.trim().length >= 12;
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const input = { taskId, title: draft.title.trim(), targetUrl: draft.targetUrl.trim(), proposedChanges, reviewerGuidance: draft.reviewerGuidance.trim(), requiresHumanReview: draft.requiresHumanReview }; if (editingId) update.mutate({ ...input, browserChangeSetId: editingId }); else create.mutate(input); };
  const edit = (changeSet: BrowserChangeSet) => { setDraft({ title: changeSet.title, targetUrl: changeSet.targetUrl, proposedChanges: asLines(changeSet.proposedChanges), reviewerGuidance: changeSet.reviewerGuidance, requiresHumanReview: changeSet.requiresHumanReview }); setEditingId(changeSet.id); setOpen(true); };
  const error = create.error ?? update.error ?? archive.error;
  return <section className="space-y-3" aria-label="Browser change-set review records">
    <PanelNotice><div className="flex items-start gap-2"><FileText size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Browser change sets</h2><p className="mt-1">Review-only records for a referenced web surface. Synthia cannot open a browser, navigate, use credentials, upload, submit forms, or execute any action from this panel.</p></div></div></PanelNotice>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to curate review records.</p> : <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingId(null); setDraft(emptyDraft); setOpen(value => !value); }} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{open ? "Cancel" : "Add change set"}</Button></div>}
    {open && !readOnly ? <form onSubmit={save} className="space-y-2.5 rounded-xl border border-white/8 bg-[#14201e] p-3"><FormText label="Change-set title" value={draft.title} onChange={value => setDraft(item => ({ ...item, title: value }))} placeholder="Review checkout copy changes" required /><label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">Target URL / reference<input required type="url" maxLength={2048} value={draft.targetUrl} onChange={event => setDraft(item => ({ ...item, targetUrl: event.target.value }))} placeholder="https://example.com/reference" className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#0e1716] px-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" /></label><p className="-mt-1 text-[10px] leading-4 text-[#778985]">Stored and shown as plain text only. It is not opened, fetched, or made clickable.</p><FormArea label="Proposed changes (one per line)" value={draft.proposedChanges} onChange={value => setDraft(item => ({ ...item, proposedChanges: value }))} placeholder="Clarify the delivery timeframe\nAdd an accessible error-state note" /><FormArea label="Reviewer guidance" value={draft.reviewerGuidance} onChange={value => setDraft(item => ({ ...item, reviewerGuidance: value }))} placeholder="What a human reviewer should verify before any separate action is considered." /><label className="flex items-center gap-2 text-[11px] text-[#a8bbb6]"><input type="checkbox" checked={draft.requiresHumanReview} onChange={event => setDraft(item => ({ ...item, requiresHumanReview: event.target.checked }))} className="h-3.5 w-3.5 accent-teal-400" />Require human review</label><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[#778985]">Record only; no browser work is initiated.</span><Button type="submit" size="sm" disabled={create.isPending || update.isPending || !valid} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">{create.isPending || update.isPending ? "Saving…" : editingId ? "Save change set" : "Create change set"}</Button></div></form> : null}
    {error ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(error, "We could not save that browser change set. Please try again.")}</p> : null}
    <div className="space-y-2">{changeSets.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No browser change set has been recorded. Synthia will not infer a destination, open a browser, or act on a web surface automatically.</p> : changeSets.map(changeSet => <article key={changeSet.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#e5f2ef]">{changeSet.title}</p><p className="mt-1 break-all text-[10px] text-cyan-100">Reference: {changeSet.targetUrl}</p></div><span className="rounded-full border border-teal-300/15 bg-teal-300/[.05] px-2 py-0.5 text-[9px] text-teal-100">{changeSet.status === "active" ? "Review only" : "Archived"}</span></div><ul className="mt-2 space-y-1 text-[11px] leading-5 text-[#c7ddd7]">{Array.isArray(changeSet.proposedChanges) ? changeSet.proposedChanges.filter((item): item is string => typeof item === "string").map(item => <li key={item}>• {item}</li>) : null}</ul><p className="mt-2 text-[10px] leading-4 text-[#a8bbb6]">Reviewer: {changeSet.reviewerGuidance}</p><p className="mt-1 text-[10px] text-[#778985]">{changeSet.requiresHumanReview ? "Human review required" : "Human review optional"}</p>{!readOnly && changeSet.status === "active" ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(changeSet)} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Edit</Button><Button size="sm" variant="outline" onClick={() => archive.mutate({ taskId, browserChangeSetId: changeSet.id })} disabled={archive.isPending} className="h-7 border-rose-300/20 px-2 text-[11px] text-rose-200 hover:bg-rose-300/10">Archive</Button></div> : null}</article>)}</div>
  </section>;
}

function FormText({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) { return <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">{label}<input required={required} minLength={required ? 2 : undefined} maxLength={160} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#0e1716] px-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" /></label>; }
function FormNumber({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min: number; max: number }) { return <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">{label}<input required type="number" min={min} max={max} value={value} onChange={event => onChange(event.target.value)} className="mt-1.5 h-8 w-full rounded-md border border-white/10 bg-[#0e1716] px-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none focus:border-cyan-300/45" /></label>; }
function FormArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ab2ad]">{label}<textarea required minLength={4} maxLength={3000} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 min-h-20 w-full resize-y rounded-md border border-white/10 bg-[#0e1716] px-2.5 py-2 text-xs font-normal normal-case tracking-normal text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" /></label>; }
function PolicyCards({ policies, readOnly, onEdit, onArchive, archiving }: { policies: HandoffPolicy[]; readOnly: boolean; onEdit: (policy: HandoffPolicy) => void; onArchive: (policyId: string) => void; archiving: boolean }) { return <div className="space-y-2">{policies.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No handoff policies have been saved for this task. Synthia will not infer delegation preferences or delegate work automatically.</p> : policies.map(policy => <article key={policy.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#e5f2ef]">{policy.title}</p><p className="mt-1 text-[10px] text-cyan-100">{policy.taskCategory} · {policy.specialistRole} · {policy.budgetLimit} budget · {policy.timeLimitMinutes} min</p></div><span className="rounded-full border border-teal-300/15 bg-teal-300/[.05] px-2 py-0.5 text-[9px] text-teal-100">Approval required</span></div><p className="mt-2 text-[11px] leading-5 text-[#a8bbb6]">{policy.boundedScope}</p><p className="mt-2 text-[10px] text-[#778985]">Evidence: {asLines(policy.evidenceRequirements).split("\n").filter(Boolean).join(" · ")}</p>{!readOnly ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(policy)} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Edit</Button><Button size="sm" variant="outline" onClick={() => onArchive(policy.id)} disabled={archiving} className="h-7 border-rose-300/20 px-2 text-[11px] text-rose-200 hover:bg-rose-300/10">Archive</Button></div> : null}</article>)}</div>; }
function PlaybookCards({ playbooks, readOnly, onEdit, onArchive, archiving }: { playbooks: RecoveryPlaybook[]; readOnly: boolean; onEdit: (playbook: RecoveryPlaybook) => void; onArchive: (playbookId: string) => void; archiving: boolean }) { return <div className="space-y-2">{playbooks.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No recovery playbooks have been saved. Synthia will not infer failures, trigger a playbook, or repair a task automatically.</p> : playbooks.map(playbook => <article key={playbook.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#e5f2ef]">{playbook.title}</p><p className="mt-1 text-[10px] text-cyan-100">Risk: {playbook.riskLevel} · approval required</p></div><span className="rounded-full border border-teal-300/15 bg-teal-300/[.05] px-2 py-0.5 text-[9px] text-teal-100">Proposal only</span></div><p className="mt-2 text-[11px] leading-5 text-[#a8bbb6]">{playbook.applicability}</p><p className="mt-2 text-[10px] text-[#91a7a1]">Triggers: {asLines(playbook.triggerConditions).split("\n").filter(Boolean).join(" · ")}</p><p className="mt-1 text-[10px] text-[#91a7a1]">Steps: {asLines(playbook.recoverySteps).split("\n").filter(Boolean).join(" · ")}</p>{!readOnly ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(playbook)} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Edit</Button><Button size="sm" variant="outline" onClick={() => onArchive(playbook.id)} disabled={archiving} className="h-7 border-rose-300/20 px-2 text-[11px] text-rose-200 hover:bg-rose-300/10">Archive</Button></div> : null}</article>)}</div>; }

/** Shows only durable owner-scoped lineage metadata; downloading remains a local, explicit browser action. */
export function TaskProvenancePanel({ taskId }: { taskId: string }) {
  const provenance = trpc.tasks.provenance.useQuery({ taskId });
  const bundle = provenance.data?.bundle;
  const safeguards = provenance.data?.safeguards ?? [];
  const downloadMetadata = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `synthia-provenance-${taskId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <section className="space-y-3" aria-label="Artifact provenance bundle">
    <div className="rounded-xl border border-teal-300/15 bg-teal-300/[.04] p-3"><div className="flex items-start gap-2"><FileText size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Artifact provenance</h2><p className="mt-1 text-[11px] leading-5 text-[#a8bbb6]">Inspect the durable lineage of this task’s events, deliverables, and proof records. This bundle is metadata-only and never retrieves file bytes, event payloads, storage URLs, or credentials.</p></div></div></div>
    {provenance.isLoading ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Loading owner-scoped provenance metadata…</p> : null}
    {provenance.isError ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[11px] text-rose-200">{clientErrorMessage(provenance.error, "We could not load provenance records. Please try again.")}</p> : null}
    {bundle ? <><div className="grid gap-2 sm:grid-cols-3"><article className="rounded-lg border border-white/8 bg-white/[.025] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#778985]">Timeline entries</p><p className="mt-1 text-lg font-semibold text-cyan-100">{bundle.timeline.length}</p></article><article className="rounded-lg border border-white/8 bg-white/[.025] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#778985]">Deliverables</p><p className="mt-1 text-lg font-semibold text-cyan-100">{bundle.deliverables.length}</p></article><article className="rounded-lg border border-white/8 bg-white/[.025] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#778985]">Proof records</p><p className="mt-1 text-lg font-semibold text-cyan-100">{bundle.proofRecords.length}</p></article></div><div className="rounded-lg border border-white/8 bg-[#14201e] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-semibold text-[#dcece7]">Metadata-only bundle</p><p className="mt-1 text-[10px] leading-4 text-[#91a7a1]">Created locally in your browser only when you select download. It cannot change this task or start work.</p></div><Button size="sm" variant="outline" onClick={downloadMetadata} className="h-7 border-cyan-300/20 bg-cyan-300/[.04] px-2 text-[11px] text-cyan-100 hover:bg-cyan-300/10">Download JSON</Button></div></div><div className="space-y-2"><p className="text-[11px] font-semibold text-[#dcece7]">Safeguards</p>{safeguards.map(safeguard => <p key={safeguard} className="rounded-md border border-white/8 bg-white/[.025] px-2.5 py-2 text-[11px] text-[#a8bbb6]">{safeguard}</p>)}</div>{bundle.deliverables.length === 0 && bundle.proofRecords.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] leading-5 text-[#91a7a1]">No deliverable or proof metadata has been recorded for this task yet. Synthia will not fabricate lineage or create records automatically.</p> : null}</> : null}
  </section>;
}

type EvaluationPack = {
  id: string;
  title: string;
  successCriteria: unknown;
  evidenceRequirements: unknown;
  reviewerGuidance: string;
  status: string;
  createdAt: Date | string;
};

type EvaluationResult = {
  id: string;
  packId: string;
  verdict: string;
  reviewerSummary: string;
  proposedLesson: string | null;
  createdAt: Date | string;
};

type EvaluationCriterion = { criterion: string; rationale?: string };
type EvidenceRequirement = { requirement: string; required: boolean };
type EvaluationVerdict = "pass" | "needs_revision" | "fail" | "inconclusive";

function evaluationCriteria(value: unknown): EvaluationCriterion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record.criterion === "string" ? [{ criterion: record.criterion, rationale: typeof record.rationale === "string" ? record.rationale : undefined }] : [];
  });
}

function evaluationRequirements(value: unknown): EvidenceRequirement[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record.requirement === "string" ? [{ requirement: record.requirement, required: record.required === true }] : [];
  });
}

function parseLines(value: string) {
  return value.split("\n").map(item => item.trim()).filter(Boolean);
}

function parseEvidenceReferences(value: string) {
  return parseLines(value).map(line => {
    const [label, locator, description] = line.split("|").map(part => part.trim());
    return { label, ...(locator ? { locator } : {}), ...(description ? { description } : {}) };
  }).filter(item => item.label.length >= 2);
}

const verdictLabels: Record<EvaluationVerdict, string> = {
  pass: "Pass",
  needs_revision: "Needs revision",
  fail: "Fail",
  inconclusive: "Inconclusive",
};

function verdictLabel(value: string) {
  return value in verdictLabels ? verdictLabels[value as EvaluationVerdict] : "Unknown";
}

/**
 * Evaluation packs are an owner-authored review contract. They never invoke an
 * evaluator, task, model, provider, browser, or sandbox by themselves.
 */
export function TaskEvaluationPanel({ taskId, evaluationPacks, evaluationResults, qualityBudgets, readOnly }: {
  taskId: string;
  evaluationPacks: EvaluationPack[];
  evaluationResults: EvaluationResult[];
  qualityBudgets: QualityBudget[];
  readOnly: boolean;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [criteriaText, setCriteriaText] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [reviewerGuidance, setReviewerGuidance] = useState("");
  const [reviewingPackId, setReviewingPackId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<EvaluationVerdict>("inconclusive");
  const [reviewerSummary, setReviewerSummary] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [proposedLesson, setProposedLesson] = useState("");
  const [criterionResults, setCriterionResults] = useState<Record<string, "met" | "partially_met" | "not_met" | "not_assessed">>({});
  const createPack = trpc.tasks.createEvaluationPack.useMutation({
    onSuccess: async () => {
      setTitle("");
      setCriteriaText("");
      setRequirementsText("");
      setReviewerGuidance("");
      await utils.tasks.get.invalidate({ taskId });
    },
  });
  const recordResult = trpc.tasks.recordEvaluationResult.useMutation({
    onSuccess: async () => {
      setReviewingPackId(null);
      setReviewerSummary("");
      setEvidenceText("");
      setProposedLesson("");
      setCriterionResults({});
      await utils.tasks.get.invalidate({ taskId });
    },
  });
  const activeQualityBudgets = qualityBudgets.filter(budget => budget.status === "active");
  const expectedEvidenceRecords = activeQualityBudgets.reduce((total, budget) => total + budget.minEvidenceRecords, 0);
  const expectedDeliverables = activeQualityBudgets.reduce((total, budget) => total + budget.expectedDeliverables, 0);

  const submitPack = (event: React.FormEvent) => {
    event.preventDefault();
    const successCriteria = parseLines(criteriaText).map(criterion => ({ criterion }));
    const evidenceRequirements = parseLines(requirementsText).map(requirement => ({ requirement, required: true }));
    if (!title.trim() || successCriteria.length === 0 || !reviewerGuidance.trim()) return;
    createPack.mutate({ taskId, title: title.trim(), successCriteria, evidenceRequirements, reviewerGuidance: reviewerGuidance.trim() });
  };

  const beginReview = (pack: EvaluationPack) => {
    const criteria = evaluationCriteria(pack.successCriteria);
    setReviewingPackId(pack.id);
    setVerdict("inconclusive");
    setReviewerSummary("");
    setEvidenceText("");
    setProposedLesson("");
    setCriterionResults(Object.fromEntries(criteria.map(item => [item.criterion, "not_assessed"])));
  };

  const submitReview = (event: React.FormEvent, pack: EvaluationPack) => {
    event.preventDefault();
    const criteria = evaluationCriteria(pack.successCriteria);
    if (criteria.length === 0 || reviewerSummary.trim().length < 4) return;
    const lesson = proposedLesson.trim();
    if (lesson && lesson.length < 20) return;
    recordResult.mutate({
      taskId,
      packId: pack.id,
      verdict,
      criterionResults: criteria.map(item => ({ criterion: item.criterion, result: criterionResults[item.criterion] ?? "not_assessed" })),
      evidenceReferences: parseEvidenceReferences(evidenceText),
      reviewerSummary: reviewerSummary.trim(),
      ...(lesson ? { proposedLesson: lesson } : {}),
    });
  };

  return <section className="space-y-3" aria-label="Task evaluation packs and reviewer outcomes">
    <div className="rounded-xl border border-teal-300/15 bg-teal-300/[.04] p-3">
      <div className="flex items-start gap-2"><ClipboardCheck size={16} className="mt-0.5 shrink-0 text-cyan-300" /><div><h2 className="text-xs font-semibold text-[#e5f2ef]">Evaluation packs</h2><p className="mt-1 text-[11px] leading-5 text-[#a8bbb6]">Define a human review contract, then record an owner-reviewed outcome. This panel does not run an evaluation or alter prompts, models, Skills, tools, permissions, or execution policy.</p></div></div>
    </div>
    <div className="rounded-xl border border-cyan-300/12 bg-cyan-300/[.035] p-3" aria-label="Quality-budget review context">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[11px] font-semibold text-cyan-100">Quality-budget review context</p><p className="mt-1 text-[10px] leading-4 text-[#a8bbb6]">{activeQualityBudgets.length === 0 ? "No active quality budget is recorded for this task." : `${activeQualityBudgets.length} active budget${activeQualityBudgets.length === 1 ? "" : "s"} declares ${expectedEvidenceRecords} expected evidence record${expectedEvidenceRecords === 1 ? "" : "s"} and ${expectedDeliverables} expected deliverable${expectedDeliverables === 1 ? "" : "s"}.`}</p></div><span className="rounded-full border border-cyan-300/15 bg-cyan-300/[.06] px-2 py-0.5 text-[9px] uppercase tracking-[.1em] text-cyan-100">Informational</span></div>
      <p className="mt-2 text-[10px] leading-4 text-[#91a7a1]">This summary is review context only. It does not score evidence, issue a pass or fail, pause work, retry work, or mutate this task.</p>
    </div>
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to create a pack or record a reviewer outcome.</p> : <form onSubmit={submitPack} className="space-y-2 rounded-xl border border-white/8 bg-[#14201e] p-3">
      <div className="flex items-center justify-between gap-3"><h3 className="text-[11px] font-semibold text-[#dcece7]">Create review contract</h3><span className="text-[10px] text-[#778985]">Declarative only</span></div>
      <label className="block text-[11px] text-[#a8bbb6]" htmlFor="evaluation-title">Pack title</label>
      <input id="evaluation-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="Example: Final research brief quality" className="w-full rounded-lg border border-white/10 bg-[#0e1716] px-2 py-1.5 text-xs text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
      <label className="block text-[11px] text-[#a8bbb6]" htmlFor="evaluation-criteria">Success criteria <span className="text-[#778985]">(one per line)</span></label>
      <textarea id="evaluation-criteria" value={criteriaText} onChange={event => setCriteriaText(event.target.value)} maxLength={2_800} placeholder="Claims trace to cited evidence\nDeliverable meets the task objective" className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
      <label className="block text-[11px] text-[#a8bbb6]" htmlFor="evaluation-evidence-requirements">Required evidence <span className="text-[#778985]">(optional; one per line)</span></label>
      <textarea id="evaluation-evidence-requirements" value={requirementsText} onChange={event => setRequirementsText(event.target.value)} maxLength={2_800} placeholder="Source URLs or task artifact references\nVerification notes for factual claims" className="min-h-16 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
      <label className="block text-[11px] text-[#a8bbb6]" htmlFor="evaluation-guidance">Reviewer guidance</label>
      <textarea id="evaluation-guidance" value={reviewerGuidance} onChange={event => setReviewerGuidance(event.target.value)} maxLength={1_200} placeholder="State what must be checked and how to handle uncertainty." className="min-h-16 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-[#778985]">No automatic verdict or remediation.</span><Button type="submit" size="sm" disabled={title.trim().length < 3 || parseLines(criteriaText).length === 0 || reviewerGuidance.trim().length < 4 || createPack.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">Save pack</Button></div>
      {createPack.isError ? <p role="alert" className="text-[11px] text-rose-300">{clientErrorMessage(createPack.error, "We could not create that evaluation pack. Please try again.")}</p> : null}
    </form>}
    <div className="space-y-2">
      {evaluationPacks.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] text-[#91a7a1]">No evaluation packs yet. Synthia will not infer a score, launch a review, or change future task behavior automatically.</p> : evaluationPacks.map(pack => {
        const criteria = evaluationCriteria(pack.successCriteria);
        const requirements = evaluationRequirements(pack.evidenceRequirements);
        const results = evaluationResults.filter(result => result.packId === pack.id);
        const reviewing = reviewingPackId === pack.id;
        return <article key={pack.id} className="rounded-xl border border-white/8 bg-white/[.025] p-3">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-semibold text-[#dcece7]">{pack.title}</h3><p className="mt-1 text-[10px] text-[#91a7a1]">{criteria.length} criterion{criteria.length === 1 ? "" : "a"} · {requirements.length} evidence requirement{requirements.length === 1 ? "" : "s"}</p></div><span className="rounded-full bg-teal-300/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[.1em] text-cyan-200">{pack.status}</span></div>
          <ul className="mt-2 space-y-1 text-[11px] leading-5 text-[#c7ddd7]">{criteria.map(item => <li key={item.criterion}>• {item.criterion}{item.rationale ? <span className="text-[#91a7a1]"> — {item.rationale}</span> : null}</li>)}</ul>
          {requirements.length > 0 ? <p className="mt-2 text-[10px] leading-4 text-[#91a7a1]">Evidence: {requirements.map(item => item.requirement).join(" · ")}</p> : null}
          <p className="mt-2 text-[10px] leading-4 text-[#a8bbb6]">Reviewer: {pack.reviewerGuidance}</p>
          {results.map(result => <div key={result.id} className="mt-2 rounded-lg border border-cyan-300/12 bg-cyan-300/[.035] p-2"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-cyan-200">{verdictLabel(result.verdict)}</p><p className="mt-1 text-[11px] leading-5 text-[#dcece7]">{result.reviewerSummary}</p>{result.proposedLesson ? <p className="mt-1 text-[10px] leading-4 text-[#a8bbb6]">Informational lesson candidate: {result.proposedLesson}</p> : null}</div>)}
          {!readOnly && !reviewing ? <Button type="button" size="sm" variant="outline" onClick={() => beginReview(pack)} className="mt-3 h-7 border-cyan-300/20 px-2 text-[11px] text-cyan-100 hover:bg-cyan-300/10">Record reviewer outcome</Button> : null}
          {!readOnly && reviewing ? <form onSubmit={event => submitReview(event, pack)} className="mt-3 space-y-2 border-t border-white/8 pt-3">
            <div className="flex items-center justify-between gap-2"><label htmlFor={`evaluation-verdict-${pack.id}`} className="text-[11px] text-[#a8bbb6]">Verdict</label><select id={`evaluation-verdict-${pack.id}`} value={verdict} onChange={event => setVerdict(event.target.value as EvaluationVerdict)} className="rounded-md border border-white/10 bg-[#0e1716] px-2 py-1 text-[11px] text-[#e5f2ef] outline-none focus:border-cyan-300/45">{Object.entries(verdictLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="space-y-1"><p className="text-[11px] text-[#a8bbb6]">Criterion outcomes</p>{criteria.map(item => <label key={item.criterion} className="flex items-center justify-between gap-2 text-[11px] text-[#c7ddd7]"><span className="min-w-0 truncate">{item.criterion}</span><select aria-label={`Outcome for ${item.criterion}`} value={criterionResults[item.criterion] ?? "not_assessed"} onChange={event => setCriterionResults(current => ({ ...current, [item.criterion]: event.target.value as "met" | "partially_met" | "not_met" | "not_assessed" }))} className="shrink-0 rounded-md border border-white/10 bg-[#0e1716] px-1.5 py-1 text-[10px] text-[#e5f2ef] outline-none focus:border-cyan-300/45"><option value="met">Met</option><option value="partially_met">Partly met</option><option value="not_met">Not met</option><option value="not_assessed">Not assessed</option></select></label>)}</div>
            <label className="block text-[11px] text-[#a8bbb6]" htmlFor={`evaluation-summary-${pack.id}`}>Reviewer summary</label><textarea id={`evaluation-summary-${pack.id}`} value={reviewerSummary} onChange={event => setReviewerSummary(event.target.value)} maxLength={2_000} placeholder="Record the review outcome and any required next step." className="min-h-16 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
            <label className="block text-[11px] text-[#a8bbb6]" htmlFor={`evaluation-evidence-${pack.id}`}>Evidence references <span className="text-[#778985]">(one per line: label | locator | note)</span></label><textarea id={`evaluation-evidence-${pack.id}`} value={evidenceText} onChange={event => setEvidenceText(event.target.value)} maxLength={4_800} placeholder="Research brief | /artifacts/brief.pdf | Supports the final claims" className="min-h-16 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
            <label className="block text-[11px] text-[#a8bbb6]" htmlFor={`evaluation-lesson-${pack.id}`}>Informational lesson candidate <span className="text-[#778985]">(optional; requires separate reviewed-learning approval)</span></label><textarea id={`evaluation-lesson-${pack.id}`} value={proposedLesson} onChange={event => setProposedLesson(event.target.value)} maxLength={1_200} placeholder="Example: Confirm source metadata before completing a research brief." className="min-h-16 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" />
            <div className="flex items-center justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setReviewingPackId(null)} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Cancel</Button><Button type="submit" size="sm" disabled={reviewerSummary.trim().length < 4 || (proposedLesson.trim().length > 0 && proposedLesson.trim().length < 20) || recordResult.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">Record outcome</Button></div>
            {recordResult.isError ? <p role="alert" className="text-[11px] text-rose-300">{clientErrorMessage(recordResult.error, "We could not record that comparison result. Please try again.")}</p> : null}
          </form> : null}
        </article>;
      })}
    </div>
  </section>;
}
