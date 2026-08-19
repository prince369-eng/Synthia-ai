import { FileText, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";

export default function Library() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const tasks = trpc.tasks.list.useQuery();
  const filtered = useMemo(() => (tasks.data ?? []).filter(task => `${task.title} ${task.goal}`.toLowerCase().includes(query.toLowerCase())), [query, tasks.data]);
  return <main className="synthia-utility-page"><header className="synthia-utility-header"><p>Library</p><h1>Task deliverables and history</h1><span>Browse artifacts and event histories created by your tasks.</span></header><div className="relative mt-5 max-w-lg"><Search className="absolute left-3 top-2.5 text-[#857567]" size={15} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your tasks" className="h-9 border-white/10 bg-[#1d1611] pl-9 text-xs text-[#f3e6d7] placeholder:text-[#77695c]" /></div>{tasks.isLoading ? <div className="mt-7 flex items-center gap-2 text-xs text-[#a69788]"><Loader2 className="animate-spin" size={14} />Loading library…</div> : null}{tasks.isError ? <div className="synthia-unavailable-note mt-7"><FileText size={15} />Library connects after the external Synthia data store is configured.</div> : null}<div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{filtered.map(task => <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="synthia-library-card"><FileText className="text-orange-300" size={16} /><h2>{task.title}</h2><p>{task.goal}</p><span>Open task record →</span></button>)}</div>{!tasks.isLoading && !tasks.isError && filtered.length === 0 ? <div className="mt-7 rounded-lg border border-dashed border-white/12 p-5 text-center text-xs text-[#9e8e7f]">No task records match this search.</div> : null}</main>;
}
