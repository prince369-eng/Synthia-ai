import { trpc } from "@/lib/trpc";
import { clientErrorMessage } from "@/lib/clientErrorDisplay";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { EXPLICIT_SIGNED_OUT_STORAGE_KEY, startLogin } from "./const";
import { shouldMountSynthiaWorkspace } from "./lib/bootstrap";
import { composerTransportProbePayload, composerTransportProbeStatusLabel, type ComposerTransportProbeOutcome } from "./lib/composerTransportProbe";
import { isTrpcLikeError } from "./lib/trpcErrorShape";
import "./index.css";

const queryClient = new QueryClient();

function classifyClientError(error: unknown): "network" | "unauthorized" | "request" | "unknown" {
  if (error instanceof TRPCClientError || isTrpcLikeError(error)) {
    return error.message === UNAUTHED_ERR_MSG ? "unauthorized" : "request";
  }

  if (error instanceof TypeError || (error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "TypeError")) return "network";
  return "unknown";
}

function reportClientError(scope: "bootstrap" | "mutation" | "query", error: unknown) {
  console.error("[Synthia client error]", { scope, category: classifyClientError(error) });
}

function sanitizeDisplayedClientError(error: unknown) {
  if (error instanceof TRPCClientError || isTrpcLikeError(error)) {
    error.message = clientErrorMessage(error);
  }
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError) && !isTrpcLikeError(error)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // A logout may race with outstanding protected queries. Remain on Synthia's
  // public entry page instead of silently launching the SSO portal again.
  try {
    if (sessionStorage.getItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY) === "1") return;
  } catch {
    // Fall through for browsers that do not expose session storage.
  }

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    reportClientError("query", error);
    sanitizeDisplayedClientError(error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    reportClientError("mutation", error);
    sanitizeDisplayedClientError(error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          // An explicit logout must also suppress the preview bearer fallback.
          // Otherwise a stale mirrored token can authenticate the very next
          // auth.me request after the server cookie has been cleared.
          if (sessionStorage.getItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY) === "1") {
            return {};
          }
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const rootElement = document.getElementById("root");
const bootstrap = document.getElementById("synthia-bootstrap");

if (!rootElement) {
  throw new Error("Synthia AI could not locate its application root.");
}

declare global {
  interface Window {
    __SYNTHIA_BOOTSTRAPPED__?: boolean;
    __SYNTHIA_TRANSPORT_PROBE__?: boolean;
  }
}

function reportComposerTransportProbe(outcome: ComposerTransportProbeOutcome, error?: unknown) {
  const payload = composerTransportProbePayload(outcome, error);
  try {
    void globalThis.fetch("/__synthia__/composer-transport-probe-diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // The diagnostic must never affect workspace bootstrap.
  }
}

function renderComposerTransportProbeStatus(outcome: ComposerTransportProbeOutcome) {
  try {
    const statusId = "synthia-transport-probe-status";
    const existing = document.getElementById(statusId);
    const status = existing ?? document.createElement("div");
    status.id = statusId;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.dataset.outcome = outcome;
    status.textContent = composerTransportProbeStatusLabel(outcome);
    status.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:min(360px,calc(100vw - 32px));border:1px solid rgba(45,212,191,.42);border-radius:10px;background:#062a2a;color:#ecfeff;padding:10px 12px;font:500 13px/1.4 system-ui,sans-serif;box-shadow:0 12px 28px rgba(0,0,0,.28);";
    if (!existing) document.body.append(status);
  } catch {
    // The diagnostic indicator must never affect workspace bootstrap.
  }
}

if (window.__SYNTHIA_TRANSPORT_PROBE__ === true) {
  renderComposerTransportProbeStatus("started");
  reportComposerTransportProbe("started");
  let settled = false;
  const timeout = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    renderComposerTransportProbeStatus("timeout");
    reportComposerTransportProbe("timeout");
  }, 5_000);
  void trpcClient.diagnostics.composerTransportProbe.mutate()
    .then(() => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      renderComposerTransportProbeStatus("success");
      reportComposerTransportProbe("success");
    })
    .catch(error => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      renderComposerTransportProbeStatus("failure");
      reportComposerTransportProbe("failure", error);
    });
}

try {
  if (shouldMountSynthiaWorkspace(window.__SYNTHIA_BOOTSTRAPPED__)) {
    window.__SYNTHIA_BOOTSTRAPPED__ = true;
    bootstrap?.remove();
    createRoot(rootElement).render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  }
} catch (error) {
  rootElement.innerHTML = `<div id="synthia-bootstrap" role="alert"><div id="synthia-bootstrap-card"><div id="synthia-bootstrap-mark">!</div><h1>Unable to open Synthia AI</h1><p>The workspace could not start in this browser. Reload the preview once to refresh its secure client session.</p></div></div>`;
  reportClientError("bootstrap", error);
}
