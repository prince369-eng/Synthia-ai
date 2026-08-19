import { BookOpenText, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function Docs() {
  const [, setLocation] = useLocation();
  return <section className="synthia-page"><header className="synthia-page-head"><div><p className="synthia-eyebrow">Synthia reference</p><h1>Docs</h1><p>Operational guidance for secure autonomous work, provider activation, and durable task delivery.</p></div></header><div className="synthia-compact-grid"><article className="synthia-compact-card"><FileText size={17} /><div><b>Provider configuration</b><p>Review the environment contract before adding secure project secrets.</p></div><a href="/docs/environment-reference.md" target="_blank" rel="noreferrer" aria-label="Open environment reference"><ExternalLink size={15} /></a></article><article className="synthia-compact-card"><ShieldCheck size={17} /><div><b>Settings & integrations</b><p>Configure preferences and inspect connected providers for your account.</p></div><button onClick={() => setLocation("/settings/integrations")}>Open settings</button></article><article className="synthia-compact-card"><BookOpenText size={17} /><div><b>Task workspaces</b><p>Tasks retain plans, approvals, events, sandbox output, and deliverables.</p></div><button onClick={() => setLocation("/")}>Go to tasks</button></article></div></section>;
}
