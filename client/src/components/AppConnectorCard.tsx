import { CheckCircle2, ExternalLink, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AppConnectorState = {
  provider: "pipedream" | "composio";
  label: string;
  configured: boolean;
  authorization: "embedded" | "redirect";
  description: string;
  boundary: string;
};

export function AppConnectorCard({ connector, connected, returning, pending, onConnect, onVerify }: { connector: AppConnectorState; connected: boolean; returning: boolean; pending: boolean; onConnect: () => void; onVerify: () => void }) {
  const status = connected ? "Connected" : connector.configured ? "Ready to authorize" : "Setup required";
  return <article className="synthia-app-connector-card"><div className="synthia-app-connector-card-head"><span className="synthia-app-connector-glyph">{connector.provider === "pipedream" ? "P" : "C"}</span><div><b>{connector.label}</b><p>{connector.provider === "pipedream" ? "Choose from your authorized Pipedream app connections" : "Connect an account through a provider-hosted flow"}</p></div><span className="synthia-status-pill">{status}</span></div><p className="synthia-app-connector-description">{connector.description}</p><div className="synthia-app-connector-card-foot">{connected ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={12} />Connected</span> : returning ? <Button type="button" size="sm" disabled={pending} onClick={onVerify} className="h-7 bg-cyan-300 px-2 text-[10px] text-[#10211f] hover:bg-cyan-200">{pending ? <Loader2 className="animate-spin" size={12} /> : <RefreshCcw size={12} />}Verify connection</Button> : <Button type="button" size="sm" disabled={!connector.configured || pending} onClick={onConnect} className="h-7 bg-cyan-300 px-2 text-[10px] text-[#10211f] hover:bg-cyan-200">{pending ? <Loader2 className="animate-spin" size={12} /> : <ExternalLink size={12} />}Connect</Button>}<span title={connector.boundary} className="inline-flex items-center gap-1 text-[10px] text-[#91a7a1]"><ShieldCheck size={12} />Approval required</span></div>{!connector.configured ? <p className="synthia-app-connector-note">This connection route needs server-side setup before authorization can open.</p> : null}{!connected && !returning ? <p className="synthia-app-connector-note">Authorization opens with {connector.label}; Synthia never receives the connected app credential.</p> : null}{!connected && returning ? <p className="synthia-app-connector-note">After approval, verify the owner-scoped connection reference before using it in a proposal.</p> : null}</article>;
}
