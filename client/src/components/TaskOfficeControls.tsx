import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { BookOpenText, ClipboardCheck, FileText } from "lucide-react";
import { useState } from "react";

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
    {exportOffice.isError ? <span className="sr-only" role="alert">{exportOffice.error.message}</span> : null}
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
    {readOnly ? <p className="rounded-lg border border-white/8 bg-white/[.03] p-3 text-[11px] text-[#a8bbb6]">Replay mode is read-only. Open the live task to propose or review a lesson.</p> : <form onSubmit={event => { event.preventDefault(); if (lesson.trim()) propose.mutate({ taskId, lesson: lesson.trim(), confidence: 0.7 }); }} className="rounded-xl border border-white/8 bg-[#14201e] p-3"><label htmlFor="task-lesson" className="text-[11px] font-semibold text-[#dcece7]">Proposed lesson</label><textarea id="task-lesson" value={lesson} onChange={event => setLesson(event.target.value)} maxLength={1200} placeholder="Example: Confirm spreadsheet column mappings before writing rows." className="mt-2 min-h-24 w-full resize-y rounded-lg border border-white/10 bg-[#0e1716] p-2 text-xs leading-5 text-[#e5f2ef] outline-none placeholder:text-[#6d837d] focus:border-cyan-300/45" /><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-[#778985]">{lesson.length}/1200 · saved as pending review</span><Button type="submit" size="sm" disabled={lesson.trim().length < 20 || propose.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">Propose lesson</Button></div>{propose.isError ? <p role="alert" className="mt-2 text-[11px] text-rose-300">{propose.error.message}</p> : null}</form>}
    <div className="space-y-2">{pendingLessons.length === 0 ? <p className="rounded-lg border border-dashed border-white/12 p-3 text-[11px] text-[#91a7a1]">No pending lessons. Synthia does not infer or activate cross-task learning automatically.</p> : pendingLessons.map(item => <article key={item.id} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><p className="text-xs leading-5 text-[#dcece7]">{item.factText}</p><p className="mt-1 text-[10px] text-[#91a7a1]">Proposed confidence: {Math.round(item.confidence * 100)}%</p>{!readOnly ? <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => review.mutate({ taskId, memoryId: item.id, decision: "active" })} disabled={review.isPending} className="h-7 bg-teal-400 px-2 text-[11px] text-[#072a27] hover:bg-cyan-300">Approve for future tasks</Button><Button size="sm" variant="outline" onClick={() => review.mutate({ taskId, memoryId: item.id, decision: "archived" })} disabled={review.isPending} className="h-7 border-white/12 px-2 text-[11px] text-[#c7ddd7] hover:bg-white/5">Discard</Button></div> : null}</article>)}</div>
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
export function TaskEvaluationPanel({ taskId, evaluationPacks, evaluationResults, readOnly }: {
  taskId: string;
  evaluationPacks: EvaluationPack[];
  evaluationResults: EvaluationResult[];
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
      {createPack.isError ? <p role="alert" className="text-[11px] text-rose-300">{createPack.error.message}</p> : null}
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
            {recordResult.isError ? <p role="alert" className="text-[11px] text-rose-300">{recordResult.error.message}</p> : null}
          </form> : null}
        </article>;
      })}
    </div>
  </section>;
}
