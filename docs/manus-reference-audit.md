# Manus Reference Audit for Synthia

This record captures only patterns directly observed in the user-authorized Manus workspace and only those relevant to the approved Synthia scope. It is a product-design reference, not a request to reproduce Manus branding, proprietary assets, or unrelated functionality.

## Library

The Library uses a compact route header followed by a single-line file-type filter: **All**, **Slides**, **Websites**, **Documents**, **Spreadsheets**, **Images**, **Audio & Video**, and **Others**. A search field sits on the same control row, with compact view and collection controls adjacent to it. The content is arranged as dense, task-grouped artifact cards: each group exposes the originating task name, recency, a task/project context label, a visual preview where available, and a per-item overflow control.

For Synthia, the scope-aligned mapping is an artifact library driven by real Synthia task deliverables. It can support type filters, search, task context, timestamps, preview metadata, and secure artifact retrieval. Controls that rely on data not owned by Synthia will not be added.

## Agent

The Agent route is a concise capability-and-onboarding surface rather than a duplicate task workspace. It uses a centered visual focal point, a short business-oriented promise, four evenly sized capability cards, a single primary onboarding action, and clearly labeled future messenger availability. The observed cards cover identity, persistent memory and computer context, custom skills, and messenger access.

For Synthia, this maps to the already-existing Synthia execution readiness, memory, Agent's Computer, and autonomous-loop capabilities. It should expose live operational status and configuration guidance without claiming future channels or offering an onboarding flow that Synthia cannot complete.

## Scheduled

The Scheduled empty state presents a short automation promise, three compact use-case entry rows, and one clear creation action. The rows focus on monitoring, daily summary, and turning recurring manual work into a scheduled workflow. There are no fake schedules in the observed empty state.

For Synthia, the mapping is a truthful empty state driven by the managed Heartbeat service, schedule lifecycle rows when real jobs exist, and a create path only after the application has the necessary authenticated schedule-creation contract. Suggested use cases may serve as guidance but must never create a job silently.

## Plugins

The Plugins route has a compact header with **Manage** and **Create** actions, a small row of featured capability cards, a unified search field, and separate sections for connectors, reusable skills, and data sources. Connector cards pair a logo, title, concise outcome description, and a lightweight add/control affordance. The page is discovery-first but keeps management one action away.

For Synthia, the scope-aligned implementation is limited to the integrations already described in the Synthia environment contract: provider readiness, user-authorized integrations, available agent tools, and data/search providers. It will not present a fake marketplace, advertise unavailable services, or imply that arbitrary third-party connectors are already connected.

### Plugin Management Detail

The Plugins **Manage** control opens a compact menu that separates management by **Skills** and **Connectors**. This confirms that the discovery surface and the configuration surface are intentionally distinct.

Synthia should follow that distinction with a compact management switch for configured Synthia providers and user-owned integrations. It should not add management options for skills or connectors that have no actual runtime contract in Synthia.

## Synthia Implementation Decisions

The reference is being used for **information hierarchy and interaction patterns**, not copied branding or claims. Synthia will retain its radiant-orange visual system and only show capabilities backed by its task, provider-readiness, integration, artifact, usage, and Heartbeat contracts.

| Area | Included now | Deliberately excluded until a corresponding Synthia backend contract exists |
| --- | --- | --- |
| Library | Deliverable-level search, task context, final-output state, and secure open-in-workspace navigation | A generic cloud-drive marketplace or fabricated file counts |
| Scheduled | Truthful job state, cron timing, callback context, next/last execution metadata, and availability guidance | Create, pause, resume, delete, or run-now controls without a persisted Synthia workflow owner and authenticated callback handler |
| Agent | Live queue/task readiness, active task state, and direct task-workspace access | Custom-agent creation, cloning, or fake agent analytics |
| Plugins | Searchable configured services, connected integrations, safe settings links, and real disconnect actions | Third-party connector discovery or OAuth flows not yet configured in Synthia |
| Profile | Credit balance, account identity, compact destination hierarchy, and secure sign-out | Billing purchase actions or profile edits not provided by the secure account portal |

## Lower Profile Panel

The lower profile panel is a compact popover, visually grouped into identity/plan context, account controls, external destinations, and session termination. It displays the signed-in identity, plan label, credit balance, an upgrade entry, then account, personalization, and settings actions. Homepage, help, and documentation are grouped separately and use an external-destination affordance. Sign-out is isolated at the bottom.

For Synthia, the panel maps to the authenticated account identity, real Synthia credit summary when the usage store is available, grouped internal settings links, an optional external homepage/help destination, documentation, and the existing secure sign-out flow. Billing language or upgrades cannot be claimed until an actual billing integration is configured.

## Agent Onboarding Detail

The Agent action opens a focused channel-selection dialog. It lets the user choose Telegram, LINE, or Slack, then presents a channel-specific setup panel with a QR-code handoff and an external continuation action. The underlying page retains its concise capability hierarchy while the dialog is active.

Synthia does not currently include a configured messenger-channel integration in the approved service plan. Therefore, Synthia can adopt the visual pattern of a focused capability detail panel only for real, configured capabilities. It must not add messenger selection, QR enrollment, or external handoff controls until the corresponding authenticated integration and security contract exist.
