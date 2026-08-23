# Architecture and Trust Boundaries

Synthia is a web control plane. The browser handles presentation and user input; the server validates, authorizes, persists, and applies policy; external capabilities are isolated behind server-side adapters. The browser never receives provider secrets or direct database access.

```text
Browser (React)
  │  typed tRPC calls, OAuth session cookie, bounded UI errors
  ▼
Express + tRPC server
  │  authentication, Zod validation, owner scope, rate limits, policy checks
  ├──────────────► PostgreSQL / Drizzle persistence
  ├──────────────► model, search, media, storage, or connector adapters
  └──────────────► task worker / evidence channels

Network Lab control plane
  │  approved intent + signed, expiring manifest
  ▼
Engineer-operated Linux runner (separate, local)
  │  internal-only virtual topology, allow-listed validations, redacted evidence
  └──────────────► returns reviewed evidence; never reaches production gear
```

## Main layers

| Layer | Key files | Responsibility | Must not do |
|---|---|---|---|
| Client routing | `client/src/App.tsx` | Route composition, lazy loading, app shell, error boundary. | Import server-only code or provider secrets. |
| UI shell | `client/src/components/SynthiaAppShell.tsx` | Navigation, escape routes, profile and workspace framing. | Hide an unavailable capability as though it were active. |
| API | `server/routers.ts` | Protected procedure registry, Zod contracts, rate limits, safe responses. | Trust browser input or return raw operational errors. |
| Data | `drizzle/schema.ts`, `server/db.ts` | Data model and persistence helpers. | Bypass owner scoping or invent schema at query time. |
| Agent | `server/agent/` | Task policy, model selection, tool boundaries, worker cycle. | Treat model output as authority to bypass approval. |
| Integrations | `server/integrations/`, `server/media/`, `server/realtime/` | Provider-specific behavior and bounded failures. | Expose keys, raw provider diagnostics, or uncontrolled egress. |
| Security | `server/security/`, `shared/` | Logging, rate limits, encryption and pure shared contracts. | Put secret-bearing code in `shared/`. |
| Network labs | `server/networkLabs.ts`, `server/networkLabManifest.ts` | Declarative topology, approval state, evidence, manifest policy. | Start a VM, contact a device, or retain vendor images. |

## Authorization model

Protected tRPC procedures receive the authenticated user from the server context. Every persistent read, update, approval, manifest, and evidence record must be scoped by that user identifier. Never accept `userId` from a browser request as an authorization decision.

## Error and diagnostic policy

User-visible messages must be short recovery guidance. Raw provider errors, database connection strings, filesystem paths, tokens, command lines, stack traces, and key-shaped values belong neither in UI nor persisted task-event payloads. Use structured logging with an error classification for operators, then return a bounded message through tRPC.

## Network-lab trust model

The web app should sign a short-lived manifest only after a proposal is approved. The future local runner must verify the signature with a **pinned public key**, not receive the server’s private signing key. The runner must enforce its own policy; a manifest is not a license to run arbitrary shell commands. It must reject bridge/NAT/port forwarding/cloud/physical-device targets and allow only internal VirtualBox topology operations. Evidence must be redacted, capped, integrity-labeled, and human-reviewable before upload.
