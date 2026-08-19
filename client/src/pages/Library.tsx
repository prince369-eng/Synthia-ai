import { ExternalLink, FileCheck2, FileText, FolderOpen, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";

type LibraryItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskGoal: string;
  taskStatus: string;
  filename: string;
  fileType: string;
  isFinal: boolean;
  createdAt: Date | string;
};

export function filterLibraryItems(items: LibraryItem[], query: string, finalOnly: boolean) {
  const normalized = query.trim().toLowerCase();
  return items.filter(item => {
    const matchesQuery = !normalized || `${item.filename} ${item.fileType} ${item.taskTitle} ${item.taskGoal}`.toLowerCase().includes(normalized);
    return matchesQuery && (!finalOnly || item.isFinal);
  });
}

export function LibraryArtifactOpenButton({ taskId, deliverable }: { taskId: string; deliverable: Pick<LibraryItem, "id" | "filename"> }) {
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

  return <button type="button" aria-label={`Open ${deliverable.filename}`} onClick={() => void openArtifact()} disabled={artifact.isFetching} className="synthia-library-open"><span>{artifact.isFetching ? "Preparing" : "Open file"}</span>{artifact.isFetching ? <Loader2 className="animate-spin" size={13} /> : <ExternalLink size={13} />}</button>;
}

export default function Library() {
  const [query, setQuery] = useState("");
  const [finalOnly, setFinalOnly] = useState(false);
  const [, setLocation] = useLocation();
  const library = trpc.library.list.useQuery(undefined, { retry: false });
  const filtered = useMemo(() => filterLibraryItems((library.data ?? []) as LibraryItem[], query, finalOnly), [finalOnly, library.data, query]);
  const countLabel = library.isLoading ? "Loading deliverables" : `${library.data?.length ?? 0} deliverable${(library.data?.length ?? 0) === 1 ? "" : "s"}`;

  return <main className="synthia-utility-page"><header className="synthia-utility-header"><p>Library</p><h1>Deliverables from your tasks</h1><span>Search task outputs, open a secure file link, or review the complete task workspace.</span></header><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-lg"><Search className="absolute left-3 top-2.5 text-[#857567]" size={15} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search files, task names, or goals" className="h-9 border-white/10 bg-[#1d1611] pl-9 text-xs text-[#f3e6d7] placeholder:text-[#77695c]" /></div><button type="button" aria-pressed={finalOnly} onClick={() => setFinalOnly(value => !value)} className={finalOnly ? "synthia-library-filter active" : "synthia-library-filter"}>Final outputs</button></div><div className="mt-4 flex items-center gap-2 text-xs text-[#a69788]"><FolderOpen size={14} />{countLabel}{!library.isLoading && !library.isError && filtered.length !== (library.data?.length ?? 0) ? <span>· {filtered.length} matching</span> : null}</div>{library.isLoading ? <div className="mt-7 flex items-center gap-2 text-xs text-[#a69788]"><Loader2 className="animate-spin" size={14} />Loading library…</div> : null}{library.isError ? <div className="synthia-unavailable-note mt-7"><FileText size={15} />Library connects after the external Synthia data store is configured.</div> : null}<div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{filtered.map(item => <article key={item.id} className="synthia-library-card"><button type="button" onClick={() => setLocation(`/tasks/${item.taskId}`)} className="synthia-library-workspace"><div className="flex items-start justify-between gap-3"><FileText className="text-orange-300" size={16} />{item.isFinal ? <span className="synthia-library-final"><FileCheck2 size={12} />Final</span> : <span className="synthia-library-type">Working file</span>}</div><h2>{item.filename}</h2><p>{item.taskTitle}</p><small>{item.fileType} · {new Date(item.createdAt).toLocaleDateString()}</small><span>Open task workspace →</span></button><LibraryArtifactOpenButton taskId={item.taskId} deliverable={item} /></article>)}</div>{!library.isLoading && !library.isError && filtered.length === 0 ? <div className="mt-7 rounded-lg border border-dashed border-white/12 p-5 text-center text-xs text-[#9e8e7f]">{library.data?.length ? "No deliverables match the current filters." : "No task deliverables have been created yet."}</div> : null}</main>;
}
