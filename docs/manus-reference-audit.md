# Manus Reference Audit for Synthia

This record captures only patterns directly observed in the user-authorized Manus workspace and only those relevant to the approved Synthia scope. It is a product-design reference, not a request to reproduce Manus branding, proprietary assets, or unrelated functionality.

## Central Workspace Composer Follow-up

The live Manus composer uses a compact, non-text attachment **plus** trigger rather than a persistent labeled Attach control. Activating it opens a small menu that includes **From Library** and **Add from local files**, alongside broader product sources outside the Synthia scope. Its controls remain in one calm lower row: attachment entry, plan and capability controls, a device/environment selector, voice entry, and submit. The page also uses small upper-right icon actions rather than a large utility panel.

For Synthia, the approved mapping is intentionally limited to the existing **Library** and authenticated **local-file upload** paths, a truthful model/provider selector, an explicit microphone input entry point, and compact actions for usage, files, sharing, and overflow. These controls must stay inside menus or popovers so the task composer does not grow vertically or become visually noisy.

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

## Settings: General

The live Settings surface is a compact modal with a fixed left navigation rail, a search field directly below the signed-in identity, and a scrollable content pane. The first group is **General**, **Account**, **Usage & Billing**, and **Shortcuts**. Capability, data/integration, developer, and support groups follow in the same rail.

The observed **General** page uses short, labelled sections rather than dense cards. Appearance contains a language selector and a three-way Light/Dark/Auto theme control. Communication preferences then use one-line descriptions with right-aligned switches for browser notifications, completion sounds, product updates, and advertising consent.

For Synthia, the applicable pattern is a searchable, sectioned settings shell; a local display/theme preference; an honest browser-notification preference only where supported; and concise descriptions for each control. Product-marketing and advertising-consent controls are not part of the approved Synthia scope and will not be copied.

## Settings: Account and Usage

The observed **Account** page begins with a compact editable full-name field and then groups plan, credit balance, daily credit refresh, email, stable user identifier, password, sign-in methods, and destructive account deletion into separated rows. Sensitive actions are visually subordinate to identity and plan context, while the destructive control is isolated at the end.

The observed **Usage & Billing** page adds small product-category tabs, then restates plan and credit balance before presenting a dated, task-linked credit history. Entries are grouped by day and show positive or negative usage clearly. The account portal owns password and third-party-sign-in changes; those controls do not edit credentials directly in the application UI.

For Synthia, the applicable mapping is a compact account identity summary, a usage/credits page populated only from the existing secure usage ledger, task-linked history where available, and a clear boundary that billing purchases and account-credential edits remain unavailable until a real, authorized integration exists. Synthia will not create a billing tab, purchase action, or fabricated plan/refresh schedule without a backed service contract.

## Settings: Shortcuts and Personalization

The observed **Keyboard shortcuts** section has a short explanation, a flat list of named actions, editable key-combination controls aligned on the right, per-row clear affordances, and one reset-to-default action. The reference currently includes actions for creating a task, plan mode, voice input, task search, and toggling the sidebar.

The observed **Personalization** section uses Profile and Knowledge tabs. Profile contains a compact identity/context form—nickname, occupation, and a longer “more about you” instruction—with an explicit explanation that it personalizes future task responses. It also presents a distinct external-memory import action.

For Synthia, the scope-aligned implementation is a keyboard-shortcut reference and local preference store for existing Synthia actions only (new task, focus search, toggle sidebar), plus the existing Synthia profile/preferences and memory settings. Voice input and external-memory imports will not be shown until real supported contracts exist.

## Settings: Connectors and Skills

The observed **Connectors** section is an “Added connectors” inventory: a search field, browse/create affordances, and concise connected-service cards with a check state. It is a management surface for external capabilities that are already attached to the account.

The observed **Skills** section follows the same inventory pattern for named task capabilities: search, browse/create controls, short capability descriptions, provenance, and a per-skill enabled switch. It is clearly separated from data-source connectors.

For Synthia, provider readiness and user-authorized integrations already have a real runtime contract, so Synthia can adopt the compact searchable inventory and connected/missing state presentation. Synthia will not show a generic skills marketplace, user-created skills, or enabled toggles until its own agent runtime has secure persisted skill definitions and execution policy enforcement.

## Settings: Mail and Computer

The observed **Mail** section lets an account create tasks by email. It separates a generated task-ingestion address, custom workflow email definitions, and approved sender allow-list management. The security boundary is explicit: only approved senders can create tasks.

The observed **My Computer** section separates cloud and local computer options. Its cloud state is presented as a compact availability card describing persistent storage and always-on operation, with a provisioning action.

Synthia already uses Resend/Postmark for outbound notifications and E2B/Docker for isolated agent execution, but it has no secure inbound-email task ingestion or persistent cloud-computer provisioner in the approved service contract. Synthia can use the compact operational-status layout for existing Agent’s Computer and sandbox readiness, but must not expose email addresses, sender management, local-device control, or cloud provisioning until real authenticated services are implemented.

## Settings: Data Controls and Deployments

The observed **Data controls** section places shared tasks, shared files, archived tasks, and cloud browser data behind compact tabbed views, with a dedicated plaintext-task-data setting. Empty states are direct and state which category has no data.

The observed **Deployments** section separates Websites, Apps, and Domains. Each deployment row contains a thumbnail, project name, updated timestamp, clear publish status, a preview action, and a contextual overflow menu.

For Synthia, the suitable mappings are security-oriented task, artifact, and retention visibility using actual Synthia data, plus the existing Manus project management surface for the Synthia deployment itself. Synthia does not yet expose user-to-user sharing, durable task archiving, cloud-browser data, project publishing, or domain provisioning as agent product capabilities, so those controls will remain absent until backed by ownership-checked services.

## Settings: Integrations and Developers

The observed **Integrations** section uses a concise two-column capability grid. Each card names a connected workflow channel and states the outcome, leaving setup behind a separate interaction. The observed examples include Zapier, Slack, Telegram, and LINE.

The observed **Developers** section contains API-key and webhook tabs, a documentation row, an explicit empty state, and a create-key action. It is a credential-management surface, not a general settings collection.

For Synthia, the integration-card hierarchy applies to the existing provider and account-integration readiness model, but only for configured services. Synthia has no approved Slack, Zapier, Telegram, LINE, user API-key, or webhook product contracts; therefore these actions and claims will not be added. Secrets will remain server-side and environment managed, never visible in the Synthia settings interface.

## Model, Multimodal Composer, and Task Action Update

The live Manus home workspace uses a compact top-left agent selector. The currently observed choices are **Manus 1.6 Max** for complex work, **Manus 1.6** as the general-purpose agent, and **Manus 1.6 Lite** for everyday tasks. Synthia will keep its real multi-provider implementation and expose capability-aware choices only when the corresponding provider/model is configured; it will not copy proprietary names, plan labels, or unavailable capabilities.

The observed composer groups a non-text plus attachment trigger, compact capability/environment controls, microphone entry, and an upward submit affordance into one calm lower rail. Its task overflow menu groups Rename, Schedule a task, Pin, Add to favorites, Archive, and Delete. Synthia maps this only to its existing attachment flows, autonomy/project/model preferences, server-side transcription, task title, scheduled-work readiness, and safe task-management contracts. Destructive, archival, scheduling, or sharing actions remain visibly unavailable until their authorized server contracts exist.

Visual input in Synthia will be a validated image-file attachment available to a configured vision-capable provider. Voice input will use the existing authenticated transcription route. Text interaction remains the primary task composer. This keeps all three modalities real, configuration-aware, and routed through existing ownership, storage, and task-execution boundaries.

### Completed Synthia Mapping

The Settings rail now supports client-side section search while preserving the server-backed routes for identity, usage, integrations, configured providers, skills, data controls, deployment guidance, developer boundaries, personalization, and security. The interface does not render secrets, billing purchase controls, unsupported connectors, persistent-computer provisioning, or developer credentials.

The composer now offers an explicit **Automatic routing** choice alongside configured provider models. Each configured choice exposes its actual text or text-and-vision capability. A fixed text-only model cannot submit a task with image input; the user must select a vision-capable choice or return to automatic routing. Voice recordings continue through the authenticated transcription procedure and are inserted as task text rather than presented as a model choice.

The active-task overflow menu now persists rename, pin, favorite, archive, and soft-delete actions through ownership-scoped task procedures. Delete requires an explicit confirmation. Scheduling remains visibly unavailable because there is no persisted task-to-Heartbeat schedule creation contract yet.


The center composer now includes a compact **Media** capability panel. Image generation reports readiness only when the existing built-in ImageService route and Forge credentials are present. Video generation remains explicitly unavailable until a selected provider has a verified asynchronous adapter, polling/status lifecycle, artifact storage, and secure credential. The panel is informational and does not simulate generation jobs.


Common `video/mp4`, `video/webm`, and `video/quicktime` files are now accepted through the authenticated attachment contract and hydrated into the isolated task input directory for sandbox-based processing. They are not silently converted into inline LLM vision content: only supported image MIME types are sent through the configured vision-model path, and the agent must use an available sandbox processing tool for video inspection.
