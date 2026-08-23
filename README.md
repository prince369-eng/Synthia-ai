# Synthia AI

Synthia AI is an approval-aware autonomous-workspace application. It combines a React workspace, Express/tRPC API, Manus OAuth, a structured task store, configurable model providers, and guarded task tools. The product is intentionally designed so that a visible feature is not presented as operational until its prerequisite configuration, authorization, and safety checks are satisfied.

> **Current status:** The interactive workspace, task UI, protected APIs, projects, library, settings, agent guidance, connectors catalog, and Network Lab Workspace control plane are implemented. External providers, scheduled work, live voice, media generation, external app actions, VirtualBox execution, and production network operations remain configuration- or approval-gated. See [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) before relying on any capability.

## Start here

| Reader | Read first | Purpose |
|---|---|---|
| New contributor | [Beginner setup](docs/BEGINNER_SETUP.md) | Install, configure, run, test, and understand the safety boundaries. |
| Experienced engineer | [Developer guide](docs/DEVELOPER_GUIDE.md) | Change procedures, UI, data, tests, and security-sensitive flows safely. |
| Architect or reviewer | [Architecture](docs/ARCHITECTURE.md) | Understand trust boundaries, data flow, system modules, and deployment constraints. |
| Product or UI engineer | [Design system](docs/DESIGN_SYSTEM.md) | Preserve the compact teal/cyan workspace, navigation, accessibility, and responsive behavior. |
| Operator | [Feature status](docs/FEATURE_STATUS.md) | Distinguish ready, configuration-gated, planned, and intentionally disabled functionality. |
| Network engineer | [Network Lab Workspace](docs/NETWORK_LAB.md) | Understand the safe path to local, multi-vendor lab validation. |
| Maintainer | [Change map](docs/CHANGE_MAP.md) | Find the responsible file before changing a feature or protected boundary. |

## Local development

Use Node.js 22+ and pnpm 10+. Do not commit `.env`, provider keys, OAuth credentials, database URLs, private keys, vendor images, or generated evidence.

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

The development command serves the application on the port selected by the runtime. Production compilation is checked with `pnpm build`.

## Repository layout

| Path | Responsibility |
|---|---|
| `client/src/` | React routes, workspace UI, reusable components, and global styles. |
| `server/routers.ts` | Protected tRPC API contracts and input validation. |
| `server/agent/` | Task planning, routing, policy, worker, evidence, and tool-boundary logic. |
| `server/integrations/` | Provider and app-connector adapters; never expose credentials to the browser. |
| `server/networkLabs.ts` | Owner-scoped network-lab control-plane records and guarded state transitions. |
| `server/networkLabManifest.ts` | Short-lived local-lab manifest contract; this is a control contract, not an executor. |
| `drizzle/schema.ts` | Drizzle schema; migrations are generated under `drizzle/`. |
| `docs/` | Product status, setup, architecture, UI, developer, and operational documentation. |

## Quality gates

Before requesting review or pushing a change, run:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

The build currently reports a non-module static-preview script advisory and bundle-size advisories. These are known advisories, not a claim that performance work is complete.

## Contributing safely

Every feature change must update its input validation, protected procedure, user states, tests, and documentation together. Keep external actions disabled by default, retain owner scoping, prevent raw operational errors from reaching users, and add an explicit approval boundary before any consequential action. Details are in [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) and [docs/CHANGE_MAP.md](docs/CHANGE_MAP.md).
