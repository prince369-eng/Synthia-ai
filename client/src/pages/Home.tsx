import { startLogin, startSignup } from "@/const";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Eye,
  FileCheck2,
  FileText,
  Globe2,
  Layers3,
  ListChecks,
  LockKeyhole,
  Menu,
  Mic2,
  Network,
  PanelTop,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const capabilities = [
  {
    icon: Eye,
    label: "01",
    title: "Agent’s Computer",
    copy: "Inspect the task-scoped website, screen, source, files, timeline, and plan as work takes shape.",
  },
  {
    icon: ShieldCheck,
    label: "02",
    title: "Approval-aware execution",
    copy: "Keep consequential actions visible with explicit approval gates, ordered task events, and a durable decision record.",
  },
  {
    icon: FileCheck2,
    label: "03",
    title: "Proof-linked outcomes",
    copy: "Attach claims, evidence references, confidence, and recovery guidance to work that needs a reviewable trail.",
  },
  {
    icon: Network,
    label: "04",
    title: "Governed collaboration",
    copy: "Propose specialist handoffs and remediation plans without silently delegating or repairing on your behalf.",
  },
];

const useCases = [
  {
    number: "01",
    title: "Research with a traceable trail",
    copy: "Turn a question into bounded research and review the plan, source references, progress, and deliverables together.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Build in the open",
    copy: "Give Synthia a product or implementation goal, then follow the work through source, files, website preview, and task events.",
    icon: Code2,
  },
  {
    number: "03",
    title: "Create with a clear boundary",
    copy: "Choose image, video, audio, or vision work explicitly and retain the selected route and task outputs in one workspace.",
    icon: Sparkles,
  },
];

const readyNow = [
  "Task composer, automatic-route preview, and model choice controls",
  "Analyze → plan → execute → observe task history and replay",
  "Agent’s Computer with website, code, files, and task views",
  "Approval gates, Proof records, and governed Operations controls",
  "Projects, Library, reviewed Skills, Settings, and authentication",
];

const activationGated = [
  "Text, vision, code, and media provider calls through your allowlisted providers",
  "Web research, browser, sandbox, external storage, and scheduled workflows",
  "Live Voice and local screen sharing after a persistent voice worker is deployed",
  "Optional email, OAuth, E2B, and connected-app capabilities",
];

const roadmap = [
  {
    icon: Activity,
    title: "Adaptive autonomy budget",
    copy: "A task-level control that lets users set and review how much authority an agent earns over time.",
  },
  {
    icon: Wrench,
    title: "Proof-linked recovery",
    copy: "A recovery decision that connects operational health signals, evidence, and a proposed next step.",
  },
  {
    icon: LockKeyhole,
    title: "Capability charter",
    copy: "A plain-language preflight showing the tools, domains, and approvals a task may request before work begins.",
  },
];

function AvailabilityList({ items }: { items: string[] }) {
  return (
    <ul className="synthia-marketing-availability-list">
      {items.map((item) => (
        <li key={item}>
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

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
  const scrollTo = (sectionId: string) => {
    closeMenu();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <a className="synthia-skip-link" href="#synthia-main-content">Skip to main content</a>
      <main id="synthia-main-content" className="synthia-marketing">
        <div className="synthia-marketing-grid" aria-hidden="true" />
        <div className="synthia-marketing-noise" aria-hidden="true" />

        <header className="synthia-marketing-nav">
          <button
            className="synthia-marketing-brand"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to the top of Synthia AI"
          >
            <span className="synthia-logo-mark"><Sparkles size={16} /></span>
            <span>Synthia <b>AI</b></span>
          </button>
          <nav className="synthia-marketing-links" aria-label="Public navigation">
            <a href="#platform">Platform</a>
            <a href="#workflow">Workflow</a>
            <a href="#availability">Availability</a>
            <a href="#roadmap">Roadmap</a>
          </nav>
          <div className="synthia-marketing-actions">
            <button type="button" className="synthia-marketing-signin" onClick={() => startLogin("signIn")}>Sign in</button>
            <button type="button" className="synthia-marketing-cta" onClick={startSignup}>Get started <ArrowRight size={15} /></button>
          </div>
          <button
            type="button"
            className="synthia-marketing-menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-controls="synthia-public-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </header>

        {menuOpen ? (
          <nav id="synthia-public-navigation" className="synthia-marketing-mobile-menu" aria-label="Mobile public navigation">
            <a href="#platform" onClick={closeMenu}>Platform</a>
            <a href="#workflow" onClick={closeMenu}>Workflow</a>
            <a href="#availability" onClick={closeMenu}>Availability</a>
            <a href="#roadmap" onClick={closeMenu}>Roadmap</a>
            <button type="button" onClick={() => { closeMenu(); startLogin("signIn"); }}>Sign in</button>
            <button type="button" onClick={() => { closeMenu(); startSignup(); }}>Get started <ArrowRight size={15} /></button>
          </nav>
        ) : null}

        <section className="synthia-marketing-hero" aria-labelledby="synthia-hero-title">
          <div className="synthia-marketing-copy synthia-marketing-reveal">
            <p className="synthia-marketing-kicker"><span><Bot size={13} /></span> Autonomous work, made inspectable</p>
            <h1 id="synthia-hero-title">Delegate the work.<br /><em>Keep the judgment.</em></h1>
            <p className="synthia-marketing-lead">Synthia turns a goal into a reviewable task. It plans, carries out bounded work, keeps the trail visible, and gives you a clear decision point when an action matters.</p>
            <div className="synthia-marketing-hero-actions">
              <button type="button" className="synthia-marketing-hero-primary" onClick={startSignup}>Open your workspace <ArrowRight size={16} /></button>
              <button type="button" className="synthia-marketing-hero-secondary" onClick={() => scrollTo("availability")}>See what is ready <ChevronRight size={16} /></button>
            </div>
            <div className="synthia-marketing-hero-signals" aria-label="Synthia product principles">
              <span><ShieldCheck size={14} /> Approval-aware</span>
              <span><ListChecks size={14} /> Event-sourced</span>
              <span><FileCheck2 size={14} /> Proof-linked</span>
            </div>
          </div>

          <div className="synthia-marketing-console synthia-marketing-reveal" aria-label="Illustration of a reviewable Synthia task workspace">
            <div className="synthia-marketing-console-orb synthia-marketing-console-orb-a" aria-hidden="true" />
            <div className="synthia-marketing-console-orb synthia-marketing-console-orb-b" aria-hidden="true" />
            <div className="synthia-marketing-console-window">
              <div className="synthia-marketing-console-topbar">
                <div className="synthia-marketing-console-dots"><i /><i /><i /></div>
                <span>Task workspace</span>
                <span className="synthia-marketing-live"><i /> Reviewing</span>
              </div>
              <div className="synthia-marketing-console-body">
                <div className="synthia-marketing-console-thread">
                  <p className="synthia-marketing-console-label">Task objective</p>
                  <h2>Map the launch plan and show the work trail.</h2>
                  <div className="synthia-marketing-console-message"><span>S</span><p>I’ll prepare the steps first. I’ll ask before anything needs your approval.</p></div>
                  <div className="synthia-marketing-console-progress"><div><span>Task progress</span><b>2 / 4</b></div><i><em /></i></div>
                  <div className="synthia-marketing-event-row"><Activity size={12} /><span>Evidence record attached</span><small>now</small></div>
                </div>
                <div className="synthia-marketing-console-computer">
                  <div className="synthia-marketing-console-computer-head"><p><Bot size={13} /> Agent’s Computer</p><span>Plan</span></div>
                  <ol>
                    <li className="done"><CheckCircle2 size={13} /><span>Analyze the goal</span></li>
                    <li className="done"><CheckCircle2 size={13} /><span>Prepare the plan</span></li>
                    <li className="active"><i /><span>Review references</span></li>
                    <li><i /><span>Deliver a decision-ready brief</span></li>
                  </ol>
                  <div className="synthia-marketing-console-tabs"><span>Website</span><span>Code</span><span>Files</span></div>
                </div>
              </div>
            </div>
            <div className="synthia-marketing-float-card synthia-marketing-float-card-left"><ShieldCheck size={16} /><div><b>Approval gate</b><span>Decision stays with you</span></div></div>
            <div className="synthia-marketing-float-card synthia-marketing-float-card-right"><FileCheck2 size={16} /><div><b>Proof linked</b><span>Claim + reference recorded</span></div></div>
          </div>
        </section>

        <section className="synthia-marketing-principles" aria-label="Synthia operating principles">
          <div><span>01</span><b>Visible trajectory</b><p>Plans, events, and outputs stay attached to the task.</p></div>
          <div><span>02</span><b>Bounded authority</b><p>Approvals separate intention from consequential action.</p></div>
          <div><span>03</span><b>Clear recovery</b><p>Operational proposals are recorded, never silently executed.</p></div>
        </section>

        <section id="platform" className="synthia-marketing-section synthia-marketing-capabilities" aria-labelledby="capabilities-title">
          <div className="synthia-marketing-section-head synthia-marketing-section-split">
            <div>
              <p className="synthia-marketing-kicker">The working surface</p>
              <h2 id="capabilities-title">One task surface for the work, evidence, and decisions around it.</h2>
            </div>
            <p>Synthia uses a deliberate analyze → plan → execute → observe loop. The workspace makes the state of that loop legible rather than hiding it behind a chat reply.</p>
          </div>
          <div className="synthia-marketing-feature-grid synthia-marketing-feature-grid-expanded">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article className="synthia-marketing-feature-card" key={capability.title}>
                  <span className="synthia-marketing-feature-icon"><Icon size={19} /></span>
                  <h3>{capability.title}</h3>
                  <p>{capability.copy}</p>
                  <span className="synthia-marketing-feature-index">{capability.label}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="synthia-marketing-workflow" aria-labelledby="workflow-title">
          <div className="synthia-marketing-workflow-intro">
            <p className="synthia-marketing-kicker">A clearer way to delegate</p>
            <h2 id="workflow-title">Bring a goal. Keep the context.</h2>
            <p>Use a compact composer to start; use the workspace to inspect the execution path and decide what happens next.</p>
            <button type="button" className="synthia-marketing-text-link" onClick={() => scrollTo("availability")}>Explore capability availability <ArrowUpRight size={14} /></button>
          </div>
          <div className="synthia-marketing-steps">
            <article><span>01</span><h3>Frame the outcome</h3><p>Describe the goal, attach context, use automatic routing or choose a model, and see the predicted route before a task starts.</p></article>
            <article><span>02</span><h3>Inspect the trajectory</h3><p>Follow messages, task events, plans, proof records, and the Agent’s Computer as the work evolves.</p></article>
            <article><span>03</span><h3>Approve with context</h3><p>Pause, redirect, approve, or decline a consequential proposal with a clear record of what led to the request.</p></article>
            <article><span>04</span><h3>Reuse the result</h3><p>Keep deliverables in the Library, preserve task context in Projects, and return to a record that stays owned by the task.</p></article>
          </div>
        </section>

        <section id="availability" className="synthia-marketing-section synthia-marketing-availability" aria-labelledby="availability-title">
          <div className="synthia-marketing-section-head">
            <p className="synthia-marketing-kicker">Capability availability</p>
            <h2 id="availability-title">A clear boundary around what is ready today.</h2>
            <p>Synthia distinguishes implemented product surfaces from integrations that require your provider credentials, a controlled live test, or a separate deployment. It does not present a dormant integration as active.</p>
          </div>
          <div className="synthia-marketing-availability-grid">
            <article className="synthia-marketing-availability-card ready">
              <div className="synthia-marketing-card-status"><span><CheckCircle2 size={13} /> Available in the workspace</span><PanelTop size={18} /></div>
              <h3>Product controls and task governance</h3>
              <AvailabilityList items={readyNow} />
              <button type="button" onClick={startSignup}>Open Synthia <ArrowRight size={14} /></button>
            </article>
            <article className="synthia-marketing-availability-card gated">
              <div className="synthia-marketing-card-status"><span><WandSparkles size={13} /> Connect to enable</span><Layers3 size={18} /></div>
              <h3>Provider and deployment capabilities</h3>
              <AvailabilityList items={activationGated} />
              <button type="button" onClick={startSignup}>Review integrations <ArrowRight size={14} /></button>
            </article>
          </div>
          <p className="synthia-marketing-availability-note"><Mic2 size={14} /> Live Voice and local screen sharing have a visible task entry and consent-first controls, but remain disabled on the current Autoscale hosting plan until a persistent voice-worker deployment is explicitly approved.</p>
        </section>

        <section className="synthia-marketing-section synthia-marketing-use-cases" aria-labelledby="use-cases-title">
          <div className="synthia-marketing-section-head synthia-marketing-section-split">
            <div>
              <p className="synthia-marketing-kicker">Built for real work</p>
              <h2 id="use-cases-title">More than a response window when the path matters.</h2>
            </div>
            <p>Use the same task surface for research, implementation, and creative work while retaining the context needed to review the outcome.</p>
          </div>
          <div className="synthia-marketing-use-case-list">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <article key={useCase.number} className="synthia-marketing-use-case">
                  <span>{useCase.number}</span>
                  <Icon className="synthia-marketing-use-case-icon" size={21} />
                  <div><h3>{useCase.title}</h3><p>{useCase.copy}</p></div>
                  <button type="button" aria-label={`Start ${useCase.title.toLowerCase()} with Synthia`} onClick={startSignup}><ArrowRight size={17} /></button>
                </article>
              );
            })}
          </div>
        </section>

        <section id="roadmap" className="synthia-marketing-roadmap" aria-labelledby="roadmap-title">
          <div className="synthia-marketing-roadmap-head">
            <p className="synthia-marketing-kicker">Research direction</p>
            <h2 id="roadmap-title">The next frontier is not more autonomy. It is autonomy people can govern.</h2>
            <p>These are product research directions, not promises of current functionality. They build on Synthia’s existing approval, proof, and operational controls.</p>
          </div>
          <div className="synthia-marketing-roadmap-grid">
            {roadmap.map((item) => {
              const Icon = item.icon;
              return <article key={item.title}><span><Icon size={18} /></span><h3>{item.title}</h3><p>{item.copy}</p><small>Research candidate</small></article>;
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
