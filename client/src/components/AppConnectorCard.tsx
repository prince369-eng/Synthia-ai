import { CheckCircle2, ExternalLink, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AppConnectorState = {
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  categories: string[];
  scopeOptions: string[];
  authorizationRequired: true;
  approvalRequired: true;
};

function AppGlyph({ app }: { app: AppConnectorState }) {
  const initials = app.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "A";
  return <span className="synthia-app-connector-glyph relative overflow-hidden" aria-hidden="true"><span className="relative z-0">{initials}</span>{app.iconUrl ? <img className="absolute inset-0 z-10 size-full object-cover bg-[#17201f] p-1" src={app.iconUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} /> : null}</span>;
}

export function AppConnectorCard({ app, connected, returning, pending, onConnect, onVerify }: { app: AppConnectorState; connected: boolean; returning: boolean; pending: boolean; onConnect: () => void; onVerify: () => void }) {
  const status = connected ? "Connected" : returning ? "Finish connection" : "Ready to authorize";
  const visibleScopes = app.scopeOptions.slice(0, 3);
  const remainingScopeCount = Math.max(0, app.scopeOptions.length - visibleScopes.length);
  return <article className="synthia-app-connector-card"><div className="synthia-app-connector-card-head"><AppGlyph app={app} /><div><b>{app.name}</b><p>{app.categories.length ? app.categories.join(" · ") : "Connected app"}</p></div><span className="synthia-status-pill">{status}</span></div><p className="synthia-app-connector-description">{app.description}</p><div className="synthia-app-connector-scopes" aria-label={`Available permissions: ${app.scopeOptions.join(", ") || "Shown during authorization"}`}>{visibleScopes.length ? visibleScopes.map(scope => <span key={scope}>{scope}</span>) : <span>Permissions shown during authorization</span>}{remainingScopeCount ? <span>+{remainingScopeCount}</span> : null}</div><div className="synthia-app-connector-card-foot">{connected ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={12} />Connected</span> : returning ? <Button type="button" size="sm" disabled={pending} onClick={onVerify} className="h-7 bg-cyan-300 px-2 text-[10px] text-[#10211f] hover:bg-cyan-200">{pending ? <Loader2 className="animate-spin" size={12} /> : <RefreshCcw size={12} />}Verify</Button> : <Button type="button" size="sm" disabled={pending} onClick={onConnect} className="h-7 bg-cyan-300 px-2 text-[10px] text-[#10211f] hover:bg-cyan-200">{pending ? <Loader2 className="animate-spin" size={12} /> : <ExternalLink size={12} />}Connect</Button>}<span title="Every consequential action is shown as a task proposal for your approval." className="synthia-app-approval-cue"><ShieldCheck size={12} />Approval required</span></div>{!connected && !returning ? <p className="synthia-app-connector-note">Authorize directly · Synthia receives a connection reference, not the app credential · Task actions always need approval</p> : null}{!connected && returning ? <p className="synthia-app-connector-note">Verify the account before it can be proposed for task work</p> : null}</article>;
}
