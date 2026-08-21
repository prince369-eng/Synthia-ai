import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { BookOpenText, FileText } from "lucide-react";
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
