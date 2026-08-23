# Beginner Setup and Safe Local Development

This guide explains how to run Synthia locally without confusing **code availability** with **provider availability**. It is written for developers who are new to the repository.

## 1. Prerequisites

Install Node.js 22 or later, pnpm 10 or later, Git, and a PostgreSQL-compatible database only if you intend to test database-backed flows outside the managed environment. The application uses TypeScript, React, Vite, Express, tRPC, Drizzle, and Manus OAuth. Do not install VirtualBox, vendor images, or external provider SDKs merely to run tests.

```bash
node --version
pnpm --version
git --version
```

## 2. Install and start

Clone the repository and install locked dependencies.

```bash
git clone https://github.com/prince369-eng/Synthia-ai.git
cd Synthia-ai
pnpm install
pnpm check
pnpm test
pnpm dev
```

Open the development URL reported in the terminal. Do not hard-code a port because the hosting runtime may choose one.

## 3. Configuration model

Synthia reads credentials and deployment settings from secure environment variables. The following table separates development requirements from optional integrations.

| Category | Examples | Required to open the UI? | Important rule |
|---|---|---:|---|
| Core identity | OAuth client settings, session secret | Yes in an authenticated deployment | Do not hand-write session cookies. |
| Data | Application database URL | Required for persistent records | Apply reviewed migrations before relying on a new table. |
| Models and search | Groq, Gemini, OpenRouter, Tavily, Serper, AIHubMix, Agnes | No | A configured key does not mean every model is available or free. |
| Live features | LiveKit credentials | No | Microphone and screen-share require browser permission and a configured service. |
| Media | Image, video, transcription providers | No | Never test with a billable request unless you explicitly intend to use quota. |
| Network lab | `SYNTHIA_NETWORK_LAB_MANIFEST_PRIVATE_KEY` | No | Never paste a private key into chat, source code, or Git. |

The repository intentionally excludes `.env`. Store local values in an ignored environment file, or use the platform’s encrypted settings interface.

## 4. Database changes

Schema is authored in `drizzle/schema.ts`. The intended workflow is:

```bash
pnpm drizzle-kit generate
# Review the generated SQL file in drizzle/
# Apply it only to the correct target database through the approved migration path
```

Never edit an applied migration. Never apply a generated migration solely because it compiles. Confirm the database dialect and inspect whether it is additive, destructive, or depends on prior migrations. The Network Lab migrations `0019` and `0020` are present in the repository but must be applied through the correct PostgreSQL deployment connection before the corresponding persistent feature can be used.

## 5. Everyday development loop

Make a small coherent change, then validate the same boundary you changed.

| Change | Minimum verification |
|---|---|
| React page or component | Component/source contract plus manual preview review. |
| Protected tRPC procedure | Zod validation, owner-scope behavior, safe error path, and a deterministic test. |
| Drizzle model | Generated migration review and target-database migration plan. |
| Provider adapter | Unit tests with mocked network calls; do not spend provider credits. |
| Security boundary | Regression test proving raw secrets, diagnostics, or unauthorized data do not cross it. |

Then run the complete quality gate:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

## 6. Safe testing rules

Tests are deterministic and must not start a browser destination, queue worker, sandbox, external connector, live voice session, screen share, media request, network device action, or VirtualBox instance. Use mocks and test-only values at integration boundaries. Tests should prove the control-plane contract, not simulate expensive or unsafe real-world execution.

## 7. Windows host with Linux in VirtualBox

The selected network-lab target is a **Linux-first local runner**. If Linux itself runs inside VirtualBox on a Windows host, a future multi-vendor nested lab requires nested virtualization to be enabled and supported by the CPU, Windows, outer VirtualBox configuration, and guest OS. This is a deployment prerequisite, not something Synthia can bypass. Do not attempt vendor-image import or nested lab execution until the runner installation guide and hardware check are complete.
