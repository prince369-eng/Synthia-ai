import { BookOpenText, FileText, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function Docs() {
  const [, setLocation] = useLocation();

  return <section className="synthia-page">
    <header className="synthia-page-head">
      <div>
        <p className="synthia-eyebrow">Synthia reference</p>
        <h1>Docs</h1>
        <p>Practical guidance for secure autonomous work, approved app access, and durable task delivery.</p>
      </div>
    </header>
    <div className="synthia-docs-grid">
      <article className="synthia-compact-card synthia-docs-card">
        <FileText size={17} />
        <div><b>Getting started</b><p>Start with a clear task goal, review each proposed action, and keep control of your work.</p></div>
        <button onClick={() => setLocation("/")}>Go to tasks</button>
      </article>
      <article className="synthia-compact-card synthia-docs-card">
        <ShieldCheck size={17} />
        <div><b>Settings & connected apps</b><p>Personalize your workspace and manage only the apps you choose to authorize.</p></div>
        <button onClick={() => setLocation("/settings/integrations")}>Open settings</button>
      </article>
      <article className="synthia-compact-card synthia-docs-card">
        <BookOpenText size={17} />
        <div><b>Task workspaces</b><p>Tasks retain plans, approvals, activity history, and deliverables.</p></div>
        <button onClick={() => setLocation("/")}>Go to tasks</button>
      </article>
    </div>
  </section>;
}
