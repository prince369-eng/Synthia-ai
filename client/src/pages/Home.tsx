import { startLogin, startSignup } from "@/const";
import { ArrowRight, Bot, CheckCircle2, ChevronRight, Code2, Eye, FileText, Globe2, Menu, ShieldCheck, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const capabilities = [
  {
    icon: Eye,
    title: "Agent’s Computer",
    copy: "Inspect the task-scoped website, screen, source, files, timeline, and plan as work takes shape.",
  },
  {
    icon: ShieldCheck,
    title: "Controlled execution",
    copy: "Keep consequential actions visible with clear approval gates, task events, and a durable record of decisions.",
  },
  {
    icon: WandSparkles,
    title: "Automatic routing",
    copy: "Let Synthia select a ready, task-appropriate route for text, vision, media, or code—while manual selection stays in your hands.",
  },
];

const useCases = [
  {
    number: "01",
    title: "Research with receipts",
    copy: "Turn a question into a bounded research task and review the plan, sources, progress, and deliverables in one place.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Build in the open",
    copy: "Give Synthia a product or implementation goal, then follow the visible work trail through source, files, and previews.",
    icon: Code2,
  },
  {
    number: "03",
    title: "Create with intent",
    copy: "Start image, video, or audio work explicitly and keep the selected route and generated task outputs together.",
    icon: Sparkles,
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const goToCapabilities = () => {
    closeMenu();
    document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <a className="synthia-skip-link" href="#synthia-main-content">Skip to main content</a>
      <main id="synthia-main-content" className="synthia-marketing">
      <div className="synthia-marketing-grid" aria-hidden="true" />
      <header className="synthia-marketing-nav">
        <button className="synthia-marketing-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to the top of Synthia AI">
          <span className="synthia-logo-mark"><Sparkles size={16} /></span>
          <span>Synthia <b>AI</b></span>
        </button>
        <nav className="synthia-marketing-links" aria-label="Public navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#workflow">How it works</a>
          <a href="#use-cases">Use cases</a>
        </nav>
        <div className="synthia-marketing-actions">
          <button type="button" className="synthia-marketing-signin" onClick={() => startLogin("signIn")}>Sign in</button>
          <button type="button" className="synthia-marketing-cta" onClick={startSignup}>Get started <ArrowRight size={15} /></button>
        </div>
        <button type="button" className="synthia-marketing-menu" onClick={() => setMenuOpen(open => !open)} aria-controls="synthia-public-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {menuOpen ? <nav id="synthia-public-navigation" className="synthia-marketing-mobile-menu" aria-label="Mobile public navigation">
        <a href="#capabilities" onClick={closeMenu}>Capabilities</a>
        <a href="#workflow" onClick={closeMenu}>How it works</a>
        <a href="#use-cases" onClick={closeMenu}>Use cases</a>
        <button type="button" onClick={() => { closeMenu(); startLogin("signIn"); }}>Sign in</button>
        <button type="button" onClick={() => { closeMenu(); startSignup(); }}>Get started <ArrowRight size={15} /></button>
      </nav> : null}

      <section className="synthia-marketing-hero" aria-labelledby="synthia-hero-title">
        <div className="synthia-marketing-copy synthia-marketing-reveal">
          <p className="synthia-marketing-kicker"><span><Bot size={13} /></span> Autonomous work, made inspectable</p>
          <h1 id="synthia-hero-title">A capable agent that keeps its work <em>visible.</em></h1>
          <p className="synthia-marketing-lead">Synthia turns a goal into a reviewable task: it plans, carries out bounded work, records the path, and gives you control at the moments that matter.</p>
          <div className="synthia-marketing-hero-actions">
            <button type="button" className="synthia-marketing-hero-primary" onClick={startSignup}>Start a task <ArrowRight size={16} /></button>
            <button type="button" className="synthia-marketing-hero-secondary" onClick={goToCapabilities}>Explore the workspace <ChevronRight size={16} /></button>
          </div>
          <p className="synthia-marketing-assurance"><CheckCircle2 size={14} /> Explicit approvals, durable events, and task-scoped workspaces.</p>
        </div>

        <div className="synthia-marketing-console synthia-marketing-reveal" aria-label="Illustration of a reviewable Synthia task workspace">
          <div className="synthia-marketing-console-orb synthia-marketing-console-orb-a" aria-hidden="true" />
          <div className="synthia-marketing-console-orb synthia-marketing-console-orb-b" aria-hidden="true" />
          <div className="synthia-marketing-console-window">
            <div className="synthia-marketing-console-topbar"><div className="synthia-marketing-console-dots"><i /><i /><i /></div><span>Task workspace</span><span className="synthia-marketing-live"><i /> Live</span></div>
            <div className="synthia-marketing-console-body">
              <div className="synthia-marketing-console-thread">
                <p className="synthia-marketing-console-label">Task objective</p>
                <h2>Turn an idea into a task with a clear trail.</h2>
                <div className="synthia-marketing-console-message"><span>S</span><p>I’ll outline the work first, then keep each action visible in the timeline.</p></div>
                <div className="synthia-marketing-console-progress"><div><span>Task progress</span><b>2 / 4</b></div><i><em /></i></div>
              </div>
              <div className="synthia-marketing-console-computer">
                <div className="synthia-marketing-console-computer-head"><p><Bot size={13} /> Agent’s Computer</p><span>Plan</span></div>
                <ol>
                  <li className="done"><CheckCircle2 size={13} /><span>Analyze the goal</span></li>
                  <li className="done"><CheckCircle2 size={13} /><span>Prepare the plan</span></li>
                  <li className="active"><i /><span>Carry out the task</span></li>
                  <li><i /><span>Review deliverables</span></li>
                </ol>
                <div className="synthia-marketing-console-tabs"><span>Website</span><span>Code</span><span>Files</span></div>
              </div>
            </div>
          </div>
          <div className="synthia-marketing-float-card synthia-marketing-float-card-left"><ShieldCheck size={16} /><div><b>Approval gate</b><span>Awaiting your decision</span></div></div>
          <div className="synthia-marketing-float-card synthia-marketing-float-card-right"><Globe2 size={16} /><div><b>Task workspace</b><span>Website view ready</span></div></div>
        </div>
      </section>

      <section id="capabilities" className="synthia-marketing-section synthia-marketing-capabilities" aria-labelledby="capabilities-title">
        <div className="synthia-marketing-section-head">
          <p className="synthia-marketing-kicker">The working surface</p>
          <h2 id="capabilities-title">Everything important stays close to the task.</h2>
          <p>Synthia uses a deliberate analyze → plan → execute → observe loop, while the interface keeps every outcome and decision within reach.</p>
        </div>
        <div className="synthia-marketing-feature-grid">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            return <article className="synthia-marketing-feature-card" key={capability.title} style={{ "--feature-delay": `${index * 65}ms` } as React.CSSProperties}>
              <span className="synthia-marketing-feature-icon"><Icon size={19} /></span>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
              <span className="synthia-marketing-feature-index">0{index + 1}</span>
            </article>;
          })}
        </div>
      </section>

      <section id="workflow" className="synthia-marketing-workflow" aria-labelledby="workflow-title">
        <div className="synthia-marketing-workflow-intro">
          <p className="synthia-marketing-kicker">A clearer way to delegate</p>
          <h2 id="workflow-title">Bring a goal. Keep the judgment.</h2>
          <p>Every task makes its reasoning and execution path easier to follow, without asking you to give up ownership of the outcome.</p>
        </div>
        <div className="synthia-marketing-steps">
          <article><span>01</span><h3>Describe the outcome</h3><p>Start with a goal, attach the context that matters, and choose a model only when you want to.</p></article>
          <article><span>02</span><h3>Follow the work</h3><p>Review task messages, plan progression, computer panels, and durable events as the run evolves.</p></article>
          <article><span>03</span><h3>Decide with context</h3><p>Pause, redirect, approve, or inspect the outputs with a clear view of what happened and why.</p></article>
        </div>
      </section>

      <section id="use-cases" className="synthia-marketing-section synthia-marketing-use-cases" aria-labelledby="use-cases-title">
        <div className="synthia-marketing-section-head">
          <p className="synthia-marketing-kicker">Built for real work</p>
          <h2 id="use-cases-title">One workspace for work that needs more than a chat reply.</h2>
        </div>
        <div className="synthia-marketing-use-case-list">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return <article key={useCase.number} className="synthia-marketing-use-case">
              <span>{useCase.number}</span>
              <Icon className="synthia-marketing-use-case-icon" size={21} />
              <div><h3>{useCase.title}</h3><p>{useCase.copy}</p></div>
              <button type="button" aria-label={`Start ${useCase.title.toLowerCase()} with Synthia`} onClick={startSignup}><ArrowRight size={17} /></button>
            </article>;
          })}
        </div>
      </section>

      <section className="synthia-marketing-final" aria-labelledby="final-title">
        <div><p className="synthia-marketing-kicker">Your next task starts here</p><h2 id="final-title">Move from intent to a visible, reviewable result.</h2></div>
        <button type="button" className="synthia-marketing-hero-primary" onClick={startSignup}>Open Synthia AI <ArrowRight size={16} /></button>
      </section>

        <footer className="synthia-marketing-footer"><span>© {new Date().getFullYear()} Synthia AI</span><span>Autonomous work, under your control.</span></footer>
      </main>
    </>
  );
}
