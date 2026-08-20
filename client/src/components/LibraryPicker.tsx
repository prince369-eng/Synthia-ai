import { FileText, Loader2, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export type LibraryAttachmentSelection = Pick<LibraryItem, "id" | "filename" | "fileType">;

export function LibraryPicker({ open, onOpenChange, selectedDeliverableIds, onSelect }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDeliverableIds: string[];
  onSelect: (item: LibraryAttachmentSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [finalOnly, setFinalOnly] = useState(false);
  const library = trpc.library.list.useQuery(undefined, { enabled: open, retry: false });
  const items = useMemo(() => ((library.data ?? []) as LibraryItem[]).filter(item => {
    const needle = query.trim().toLowerCase();
    const matches = !needle || `${item.filename} ${item.fileType} ${item.taskTitle} ${item.taskGoal}`.toLowerCase().includes(needle);
    return matches && (!finalOnly || item.isFinal);
  }), [finalOnly, library.data, query]);
  function select(item: LibraryItem) {
    onSelect({ id: item.id, filename: item.filename, fileType: item.fileType });
    onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="synthia-library-picker"><DialogHeader><DialogTitle>Attach from Library</DialogTitle><DialogDescription>Select a deliverable you own. Synthia will make a read-only task input reference.</DialogDescription></DialogHeader><div className="synthia-library-picker-controls"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-[#857567]" size={15} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your files" className="h-9 border-white/10 bg-[#171410] pl-9 text-xs text-[#f3e6d7] placeholder:text-[#77695c]" /></div><button type="button" aria-pressed={finalOnly} onClick={() => setFinalOnly(value => !value)} className={finalOnly ? "synthia-library-filter active" : "synthia-library-filter"}>Final only</button></div>{library.isLoading ? <div className="synthia-loading-row"><Loader2 className="animate-spin" size={14} />Loading Library…</div> : null}{library.isError ? <div className="synthia-unavailable-note">Library connects after the external Synthia data store is configured.</div> : null}{!library.isLoading && !library.isError ? <div className="synthia-library-picker-list">{items.map(item => {
    const selected = selectedDeliverableIds.includes(item.id);
    return <article key={item.id} className="synthia-library-picker-item"><FileText className="mt-0.5 shrink-0 text-cyan-300" size={15} /><div className="min-w-0 flex-1"><b>{item.filename}</b><p>{item.taskTitle}</p><small>{item.fileType} · {new Date(item.createdAt).toLocaleDateString()}</small></div><Button type="button" size="sm" variant="outline" disabled={selected} onClick={() => select(item)}>{selected ? "Attached" : "Attach"}</Button></article>;
  })}{items.length === 0 ? <p className="py-5 text-center text-xs text-[#928273]">No Library deliverables match this view.</p> : null}</div> : null}</DialogContent></Dialog>;
}
