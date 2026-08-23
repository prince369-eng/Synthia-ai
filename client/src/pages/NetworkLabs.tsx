import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientErrorMessage } from "@/lib/clientErrorDisplay";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronRight, ClipboardCheck, Network, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type NodeDraft = { id: string; label: string; vendorFamily: "cisco" | "juniper" | "arista"; imageAlias: string; role: "router" | "switch" | "firewall" | "host" };
type LinkDraft = { id: string; sourceNodeId: string; targetNodeId: string; sourcePort: string; targetPort: string };
type ConfigDraft = { nodeId: string; label: string; content: string };
type AssertionDraft = { id: string; title: string; kind: "reachability" | "routing" | "interface_state" | "policy"; expected: string };

const statusLabel: Record<string, string> = {
  draft: "Draft", ready_for_review: "Ready for review", approved: "Approved for a future local run", evidence_received: "Evidence received", validation_passed: "Validation passed", validation_failed: "Validation needs attention", incomplete: "Evidence incomplete", archived: "Archived",
};

function emptyNode(): NodeDraft { return { id: "", label: "", vendorFamily: "cisco", imageAlias: "", role: "router" }; }
function emptyLink(): LinkDraft { return { id: "", sourceNodeId: "", targetNodeId: "", sourcePort: "", targetPort: "" }; }
function emptyConfig(): ConfigDraft { return { nodeId: "", label: "", content: "" }; }
function emptyAssertion(): AssertionDraft { return { id: "", title: "", kind: "reachability", expected: "" }; }

export default function NetworkLabs() {
  const utils = trpc.useUtils();
  const labsQuery = trpc.networkLabs.list.useQuery(undefined, { retry: false });
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const detailQuery = trpc.networkLabs.get.useQuery({ labId: selectedLabId ?? "00000000-0000-4000-8000-000000000000" }, { enabled: Boolean(selectedLabId), retry: false });
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [vendorFamilies, setVendorFamilies] = useState<Array<"cisco" | "juniper" | "arista">>(["cisco"]);
  const [nodes, setNodes] = useState<NodeDraft[]>([]);
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [configs, setConfigs] = useState<ConfigDraft[]>([]);
  const [assertions, setAssertions] = useState<AssertionDraft[]>([]);
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const createLab = trpc.networkLabs.create.useMutation({
    onSuccess: async result => {
      setFormMessage("Network lab saved as a draft. Review it before requesting a future local run.");
      setSelectedLabId(result.lab.id);
      setTitle(""); setObjective(""); setNodes([]); setLinks([]); setConfigs([]); setAssertions([]); setRollbackPlan("");
      await utils.networkLabs.list.invalidate();
    },
    onError: error => setFormMessage(clientErrorMessage(error, "The network lab could not be saved. Review the fields and try again.")),
  });
  const submitForReview = trpc.networkLabs.submitForReview.useMutation({
    onSuccess: async () => { await utils.networkLabs.get.invalidate(); await utils.networkLabs.list.invalidate(); },
  });
  const decideApproval = trpc.networkLabs.decideApproval.useMutation({
    onSuccess: async () => { await utils.networkLabs.get.invalidate(); await utils.networkLabs.list.invalidate(); },
  });
  const issueManifest = trpc.networkLabs.issueManifest.useMutation({
    onSuccess: result => {
      const artifact = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(artifact);
      const link = document.createElement("a");
      link.href = url;
      link.download = `synthia-network-lab-${result.payload.labId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const selectedLab = detailQuery.data;
  const selectedApproval = selectedLab?.approvals.find(approval => approval.decision === "pending");
  const selectedTopology = useMemo(() => selectedLab?.lab.topology as { nodes?: Array<{ id: string; label: string; vendorFamily: string; role: string }>; links?: Array<{ id: string }> } | undefined, [selectedLab]);

  const updateNode = (index: number, patch: Partial<NodeDraft>) => setNodes(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateLink = (index: number, patch: Partial<LinkDraft>) => setLinks(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateConfig = (index: number, patch: Partial<ConfigDraft>) => setConfigs(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateAssertion = (index: number, patch: Partial<AssertionDraft>) => setAssertions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const toggleVendor = (vendor: "cisco" | "juniper" | "arista") => setVendorFamilies(current => current.includes(vendor) ? current.filter(item => item !== vendor) : [...current, vendor]);

  const create = (event: FormEvent) => {
    event.preventDefault();
    setFormMessage(null);
    createLab.mutate({ title, objective, vendorFamilies, topology: { nodes, links }, configurationCandidates: configs, validationPlan: assertions, rollbackPlan });
  };

  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8" aria-label="Network Lab Workspace">
    <header className="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-teal-950/70 via-[#102323] to-[#111b1d] p-5 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-cyan-300"><Network size={14} /> Network engineering</p><h1 className="text-2xl font-semibold tracking-tight text-slate-100">Network Lab Workspace</h1><p className="mt-2 text-sm leading-6 text-slate-300">Design a Linux-hosted, VirtualBox-compatible multi-vendor lab. Synthia records the topology, secret-free configuration candidates, checks, rollback plan, and owner approval. Local execution remains separately controlled.</p></div><div className="rounded-xl border border-amber-300/15 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-100"><ShieldCheck className="mb-1 text-amber-300" size={16} />No vendor image, virtual machine, or network connection is started from this workspace.</div></div>
    </header>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <form className="space-y-5 rounded-2xl border border-white/10 bg-[#102020]/70 p-5" onSubmit={create}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-100">New lab proposal</h2><p className="mt-1 text-sm text-slate-400">Save a complete design before reviewing it for a future local run.</p></div><Badge variant="outline" className="border-cyan-400/30 text-cyan-200">Linux + VirtualBox</Badge></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium text-slate-200">Lab title<Input required value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="Campus core migration validation" /></label><label className="grid gap-2 text-sm font-medium text-slate-200">Objective<Textarea required value={objective} onChange={event => setObjective(event.target.value)} maxLength={2000} placeholder="Describe the change and success outcome." className="min-h-20 resize-y" /></label></div>
        <section className="space-y-3 rounded-xl border border-white/8 bg-black/10 p-4"><h3 className="text-sm font-semibold text-slate-100">Vendor families</h3><div className="flex flex-wrap gap-2">{(["cisco", "juniper", "arista"] as const).map(vendor => <Button key={vendor} type="button" variant="outline" size="sm" className={vendorFamilies.includes(vendor) ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-white/15 text-slate-300"} onClick={() => toggleVendor(vendor)}>{vendor[0].toUpperCase() + vendor.slice(1)}</Button>)}</div></section>
        <DraftSection title="Topology nodes" subtitle="Use local image aliases only; do not provide image files, paths, or credentials." action={() => setNodes(items => [...items, emptyNode()])}>{nodes.length === 0 ? <EmptyDraft text="Add at least two nodes to create a topology." /> : nodes.map((node, index) => <div className="grid gap-2 rounded-lg border border-white/8 p-3 md:grid-cols-5" key={index}><Input aria-label="Node ID" value={node.id} onChange={event => updateNode(index, { id: event.target.value })} placeholder="core-1" /><Input aria-label="Node label" value={node.label} onChange={event => updateNode(index, { label: event.target.value })} placeholder="Core router 1" /><select aria-label="Vendor family" className="h-9 rounded-md border border-white/12 bg-[#0b1617] px-2 text-sm text-slate-100" value={node.vendorFamily} onChange={event => updateNode(index, { vendorFamily: event.target.value as NodeDraft["vendorFamily"] })}><option value="cisco">Cisco</option><option value="juniper">Juniper</option><option value="arista">Arista</option></select><Input aria-label="Local image alias" value={node.imageAlias} onChange={event => updateNode(index, { imageAlias: event.target.value })} placeholder="local-csr1000v" /><div className="flex gap-2"><select aria-label="Node role" className="min-w-0 flex-1 rounded-md border border-white/12 bg-[#0b1617] px-2 text-sm text-slate-100" value={node.role} onChange={event => updateNode(index, { role: event.target.value as NodeDraft["role"] })}><option value="router">Router</option><option value="switch">Switch</option><option value="firewall">Firewall</option><option value="host">Host</option></select><RemoveButton onClick={() => setNodes(items => items.filter((_, itemIndex) => itemIndex !== index))} /></div></div>)}</DraftSection>
        <DraftSection title="Topology links" subtitle="Describe internal virtual links. Bridged, NAT, forwarded, and physical network links are not accepted." action={() => setLinks(items => [...items, emptyLink()])}>{links.length === 0 ? <EmptyDraft text="Add at least one internal link." /> : links.map((link, index) => <div className="grid gap-2 rounded-lg border border-white/8 p-3 md:grid-cols-5" key={index}><Input aria-label="Link ID" value={link.id} onChange={event => updateLink(index, { id: event.target.value })} placeholder="core-edge-a" /><Input aria-label="Source node" value={link.sourceNodeId} onChange={event => updateLink(index, { sourceNodeId: event.target.value })} placeholder="core-1" /><Input aria-label="Source port" value={link.sourcePort} onChange={event => updateLink(index, { sourcePort: event.target.value })} placeholder="ge-0/0/0" /><Input aria-label="Target node" value={link.targetNodeId} onChange={event => updateLink(index, { targetNodeId: event.target.value })} placeholder="edge-1" /><div className="flex gap-2"><Input aria-label="Target port" value={link.targetPort} onChange={event => updateLink(index, { targetPort: event.target.value })} placeholder="Ethernet1" /><RemoveButton onClick={() => setLinks(items => items.filter((_, itemIndex) => itemIndex !== index))} /></div></div>)}</DraftSection>
        <DraftSection title="Secret-free configuration candidates" subtitle="Use placeholders such as &lt;redacted&gt;; credentials and private keys are rejected." action={() => setConfigs(items => [...items, emptyConfig()])}>{configs.length === 0 ? <EmptyDraft text="Add the candidate configuration for every configured node." /> : configs.map((config, index) => <div className="grid gap-2 rounded-lg border border-white/8 p-3 md:grid-cols-[160px_1fr_auto]" key={index}><Input aria-label="Configuration node" value={config.nodeId} onChange={event => updateConfig(index, { nodeId: event.target.value })} placeholder="core-1" /><Input aria-label="Configuration label" value={config.label} onChange={event => updateConfig(index, { label: event.target.value })} placeholder="Base routing configuration" /><RemoveButton onClick={() => setConfigs(items => items.filter((_, itemIndex) => itemIndex !== index))} /><Textarea aria-label="Configuration candidate" className="md:col-span-3 min-h-28 font-mono text-xs" value={config.content} onChange={event => updateConfig(index, { content: event.target.value })} placeholder="Secret-free configuration candidate" /></div>)}</DraftSection>
        <DraftSection title="Validation plan" subtitle="Checks are declarative. This release does not run them automatically." action={() => setAssertions(items => [...items, emptyAssertion()])}>{assertions.length === 0 ? <EmptyDraft text="Define at least one validation assertion." /> : assertions.map((assertion, index) => <div className="grid gap-2 rounded-lg border border-white/8 p-3 md:grid-cols-[150px_1fr_180px_auto]" key={index}><Input aria-label="Assertion ID" value={assertion.id} onChange={event => updateAssertion(index, { id: event.target.value })} placeholder="ospf-up" /><Input aria-label="Assertion title" value={assertion.title} onChange={event => updateAssertion(index, { title: event.target.value })} placeholder="Adjacency reaches full state" /><select aria-label="Assertion kind" className="h-9 rounded-md border border-white/12 bg-[#0b1617] px-2 text-sm text-slate-100" value={assertion.kind} onChange={event => updateAssertion(index, { kind: event.target.value as AssertionDraft["kind"] })}><option value="reachability">Reachability</option><option value="routing">Routing</option><option value="interface_state">Interface state</option><option value="policy">Policy</option></select><RemoveButton onClick={() => setAssertions(items => items.filter((_, itemIndex) => itemIndex !== index))} /><Input aria-label="Expected result" className="md:col-span-4" value={assertion.expected} onChange={event => updateAssertion(index, { expected: event.target.value })} placeholder="Expected observable condition" /></div>)}</DraftSection>
        <label className="grid gap-2 text-sm font-medium text-slate-200">Rollback plan<Textarea required className="min-h-24 resize-y" value={rollbackPlan} onChange={event => setRollbackPlan(event.target.value)} maxLength={4000} placeholder="Describe how to revert the local lab configuration and remove the lab resources." /></label>
        {formMessage ? <p role="status" className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-cyan-100">{formMessage}</p> : null}
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={createLab.isPending} className="bg-cyan-500 text-slate-950 hover:bg-cyan-300">{createLab.isPending ? "Saving proposal…" : "Save lab proposal"}<ChevronRight size={16} /></Button><p className="text-xs text-slate-500">Saving a proposal never starts a local lab.</p></div>
      </form>

      <aside className="space-y-5"><section className="rounded-2xl border border-white/10 bg-[#102020]/70 p-5"><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-slate-100">Your lab proposals</h2><Badge variant="outline" className="border-white/15 text-slate-300">{labsQuery.data?.length ?? 0}</Badge></div>{labsQuery.isLoading ? <p className="mt-4 text-sm text-slate-400">Loading proposals…</p> : null}{labsQuery.isError ? <p className="mt-4 text-sm text-slate-400">{clientErrorMessage(labsQuery.error, "Lab proposals are unavailable. Please retry.")}</p> : null}{!labsQuery.isLoading && !labsQuery.isError && labsQuery.data?.length === 0 ? <p className="mt-4 text-sm leading-6 text-slate-400">No lab proposals yet. Create one with a complete topology and review plan.</p> : null}<div className="mt-4 space-y-2">{labsQuery.data?.map(lab => <button type="button" key={lab.id} onClick={() => setSelectedLabId(lab.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedLabId === lab.id ? "border-cyan-400/45 bg-cyan-400/10" : "border-white/8 bg-black/10 hover:border-white/20"}`}><div className="flex items-start justify-between gap-3"><span className="font-medium text-slate-100">{lab.title}</span><Badge variant="outline" className="border-white/15 text-[10px] text-slate-300">{statusLabel[lab.status] ?? lab.status}</Badge></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{lab.objective}</p></button>)}</div></section>
        <section className="rounded-2xl border border-white/10 bg-[#102020]/70 p-5"><h2 className="text-base font-semibold text-slate-100">Review and evidence</h2>{!selectedLabId ? <p className="mt-3 text-sm leading-6 text-slate-400">Select a proposal to inspect its topology and record a review decision.</p> : detailQuery.isLoading ? <p className="mt-3 text-sm text-slate-400">Loading proposal…</p> : detailQuery.isError ? <p className="mt-3 text-sm text-slate-400">{clientErrorMessage(detailQuery.error, "This lab proposal is unavailable. Please retry.")}</p> : selectedLab ? <div className="mt-4 space-y-4"><div><div className="flex items-center justify-between gap-2"><h3 className="font-medium text-slate-100">{selectedLab.lab.title}</h3><Badge variant="outline" className="border-cyan-400/30 text-cyan-200">{statusLabel[selectedLab.lab.status] ?? selectedLab.lab.status}</Badge></div><p className="mt-2 text-sm leading-6 text-slate-400">{selectedLab.lab.objective}</p></div><div className="grid grid-cols-2 gap-2 text-xs"><Metric label="Nodes" value={selectedTopology?.nodes?.length ?? 0} /><Metric label="Internal links" value={selectedTopology?.links?.length ?? 0} /><Metric label="Checks" value={Array.isArray(selectedLab.lab.validationPlan) ? selectedLab.lab.validationPlan.length : 0} /><Metric label="Evidence" value={selectedLab.evidence.length} /></div><div className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100"><ClipboardCheck className="mb-1 text-amber-300" size={15} />Approval creates a signed, short-lived runner manifest only. Starting a virtual lab remains a separate local action by the engineer.</div>{selectedLab.lab.status === "draft" ? <Button className="w-full" disabled={submitForReview.isPending} onClick={() => submitForReview.mutate({ labId: selectedLab.lab.id })}>Request review</Button> : null}{selectedApproval ? <div className="grid grid-cols-2 gap-2"><Button className="bg-emerald-500 text-emerald-950 hover:bg-emerald-300" disabled={decideApproval.isPending} onClick={() => decideApproval.mutate({ labId: selectedLab.lab.id, approvalId: selectedApproval.id, decision: "approved", reviewNote: "Approved for a future local runner manifest." })}><CheckCircle2 size={15} />Approve</Button><Button variant="outline" disabled={decideApproval.isPending} onClick={() => decideApproval.mutate({ labId: selectedLab.lab.id, approvalId: selectedApproval.id, decision: "rejected", reviewNote: "Needs revision before a local lab can be considered." })}>Needs revision</Button></div> : null}{selectedLab.lab.status === "approved" ? <Button className="w-full" variant="outline" disabled={issueManifest.isPending} onClick={() => issueManifest.mutate({ labId: selectedLab.lab.id })}>{issueManifest.isPending ? "Preparing manifest…" : "Download local runner manifest"}</Button> : null}{issueManifest.isError ? <p className="text-xs leading-5 text-slate-400">{clientErrorMessage(issueManifest.error, "The runner manifest is unavailable. Refresh and try again.")}</p> : null}</div> : null}</section>
      </aside>
    </div>
  </div>;
}

function DraftSection({ title, subtitle, action, children }: { title: string; subtitle: string; action: () => void; children: React.ReactNode }) { return <section className="space-y-3 rounded-xl border border-white/8 bg-black/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-100">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p></div><Button type="button" size="sm" variant="outline" onClick={action} className="border-cyan-400/25 text-cyan-200"><Plus size={14} />Add</Button></div><div className="space-y-2">{children}</div></section>; }
function EmptyDraft({ text }: { text: string }) { return <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">{text}</p>; }
function RemoveButton({ onClick }: { onClick: () => void }) { return <Button aria-label="Remove row" type="button" size="icon" variant="outline" onClick={onClick} className="shrink-0 border-rose-400/20 text-rose-200 hover:bg-rose-400/10"><Trash2 size={14} /></Button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-white/8 bg-black/10 p-2"><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-base font-semibold text-slate-100">{value}</p></div>; }
