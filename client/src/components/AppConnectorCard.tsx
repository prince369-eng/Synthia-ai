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
  return <span className="synthia-app-connector-glyph relative overflow-hidden" aria-hidden="true"><span className="relative z-0">{initials}</span>{app.iconUrl ? <img className="absolute inset-0 z-1 size-full object-cover bg-[#17201f]" src={app.iconUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} /> : null}</span>;
}

export function AppConnectorCard({ app, connected, returning, pending, onConnect, onVerify }: { app: AppConnectorState; connected: boolean; returning: boolean; pending: boolean; onConnect: () => void; onVerify: () => void }) {
  const status = connected ? "Connected" : returning ? "Finish connection" : "Ready to authorize";
  return <article className="synthia-app-connector-card"><div className="synthia-app-connector-card-head"><AppGlyph app={app} /><div><b>{app.name}</b><p>{app.categories.length ? app.categories.join(" · ") : "Connected app"}</p></div><span className="synthia-status-pill">{status}</span></div><p className="synthia-app-connector-description">{app.description}</p><div className="mt-2.5 flex flex-wrap items-center gap-1"><span className="mr-0.5 text-[9px] font-bold uppercase tracking-[.07em] text-[#71847e]">Permissions</span>{app.scopeOptions.length ? app.scopeOptions.map(scope => <b className="rounded-full border border-cyan-300/15 bg-teal-400/[.06] px-1.5 py-0.5 text-[9px] font-semibold text-[#a5d8d1]" key={scope}>{scope}</b>) : <p className="text-[10px] text-[#71847e]">Permissions are shown before you connect.</p>}</div><div className="synthia-app-connector-card-foot">{connected ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={12} />Connected</span> : returning ? <Button type="button" size="sm" disabled={pending} onClick={onVerify} className="h-7 bg-cyan-300 px-2 text-[10px] text-[#10211f] hover:bg-cyan-200">{pending ? <Loader2 className="animate-spin" size={12} /> : <RefreshCcw size={12} />}Verify connection</Button> : <Button type="button" size="sm" disabled={pending} onClick={onConnect} className="h-7 bg-cyan-300 px-2 text-[10px] text-[#10211f] hover:bg-cyan-200">{pending ? <Loader2 className="animate-spin" size={12} /> : <ExternalLink size={12} />}Connect</Button>}<span title="Every consequential action is shown as a task proposal for your approval." className="inline-flex items-center gap-1 text-[10px] text-[#91a7a1]"><ShieldCheck size={12} />Approval required</span></div>{!connected && !returning ? <p className="synthia-app-connector-note">You authorize this app directly. Synthia records an owner-scoped connection reference, not the app credential.</p> : null}{!connected && returning ? <p className="synthia-app-connector-note">Confirm the app account you just authorized before it can appear in future task proposals.</p> : null}</article>;
}
