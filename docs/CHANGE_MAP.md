# Change Map: Where to Edit Without Breaking Synthia

This map is the first stop before modifying a core feature. Each row names the responsible files, the safe change point, and the boundary that must remain intact.

| You want to change… | Start here | Then review | Do not break |
|---|---|---|---|
| App route or page entry | `client/src/App.tsx` | `SynthiaAppShell.tsx`, target page, route tests | Authenticated shell and lazy-page fallback. |
| Global colors, scale, typography | `client/src/index.css` | `ThemeContext.tsx`, design guide | Dark contrast, focus visibility, responsive overflow. |
| Sidebar navigation | `client/src/components/SynthiaAppShell.tsx` | `App.tsx`, navigation tests | Collapsible behavior and a return route from workspaces. |
| Task composer | `client/src/pages/TaskDashboard.tsx` | `clientErrorDisplay.ts`, composer tests | Anchored bounded popovers, no raw error output. |
| Task details/progress | `client/src/pages/TaskWorkspace.tsx` | task event helpers and tests | Event redaction, evidence links, back navigation. |
| User settings | `client/src/pages/Settings.tsx` | settings-related procedures and UI tests | No backend/environment/secret exposure. |
| Authentication | `server/_core/oauth.ts`, `server/_core/context.ts` | `useAuth.ts`, logout tests | Server-managed cookies and protected procedure context. |
| tRPC endpoint | `server/routers.ts` | feature helper, `server/db.ts`, relevant test | Zod bounds, user scope, rate limit, safe errors. |
| Database model | `drizzle/schema.ts` | generated migration, helper methods | Additive migration review and user-indexed access pattern. |
| Task policy/model routing | `server/agent/policy.ts`, `automaticRouting.ts` | runner, capability catalog, tests | Approval boundaries and no unintended provider calls. |
| Provider integration | `server/integrations/` or `server/media/` | capability UI and mocks | Credentials server-side; provider errors bounded. |
| Voice | `server/realtime/voiceMode.ts` | `VoiceModeDialog`, LiveKit tests | Browser permission, user initiation, safe dispatch failure. |
| Connectors | `server/integrations/appConnectors.ts` | plugins UI and authorization flow | No assumed authorization or credential leakage. |
| Network Lab control plane | `server/networkLabs.ts` | `networkLabManifest.ts`, `NetworkLabs.tsx`, contract test | Owner scope, immutable approval, no server-side execution. |
| Preview delivery | `server/_core/vite.ts` | Vite tests | Static preview compatibility bundle and safe replacement behavior. |

## Header convention for core files

Core modules carry a concise top-of-file responsibility comment. When creating a new core module, add a header that states: (1) what it owns, (2) which boundary it protects, and (3) what it explicitly does not do. This allows future developers to find the safe change surface before reading implementation details.

## Changes that require extra review

Changes to authentication, session cookies, context, tRPC protection, database access, storage, encryption, live voice, task execution, static preview delivery, external providers, or network labs require a focused test plus the full quality gate. Do not “clean up” these files with broad rewrites without first reading their associated tests.
