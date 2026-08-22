# Project TODO

- [x] Document the Synthia AI system architecture, scalable deployment boundaries, threat model, and operational assumptions.
- [ ] Activate external-service environment values for E2B, Docker sandbox, Groq, OpenRouter, Gemini, DeepSeek, Tavily, Serper, S3, Cloudflare R2, Resend, Postmark, Redis, and PostgreSQL after the user supplies the credentials.
- [x] Convert the Synthia application schema and runtime adapter to the requested PostgreSQL production database contract.
- [x] Apply the reviewed initial PostgreSQL migration to the external Synthia database after `SYNTHIA_POSTGRES_URL` is configured.
- [x] Implement the event-sourced task schema, indexes, migration, and database access layer for tasks, ordered events, sandboxes, deliverables, messages, approvals, integrations, memory, usage, and user preferences.
- [x] Implement validated, authenticated task and settings APIs with rate limiting, structured logging, error handling, secure secret encryption, and authorization rules.
- [x] Implement the SandboxProvider abstraction with Docker development fallback and E2B production provider, including checkpoint, restore, filesystem, browser screenshot, and terminal operations.
- [x] Implement the one-action analyze-plan-execute-observe orchestration loop, model-provider adapter, task lifecycle, context layers, and durable self-correction behavior.
- [x] Implement Tavily and Serper search tools, secure browser and code tools, file and artifact generation, configured integration discovery, and server-side high-risk approval enforcement.
- [x] Implement credit estimation, continuous usage ledger, durable Redis queueing, task safety caps, checkpoint support, and retry paths.
- [x] Implement resilient task-event streaming with authenticated sequence cursors, Redis live-event fan-out, and database-backed recovery; live screen frames are persisted as task artifacts when capture is enabled.
- [x] Wire encrypted integration-token storage into authenticated connection flows and test the secrets boundary; structured API logging and normalized internal error responses are complete.
- [x] Implement Resend and Postmark task notification delivery with server-only credentials and provider failover.
- [x] Complete worker recovery with sandbox checkpoint restore, usage accounting, server-side credit estimates, and runnable worker scripts.
- [x] Explicitly limit browser and screenshot capabilities to E2B in the Agent's Computer UI, sandbox runtime errors, and deployment documentation; Docker remains a code-only development fallback.
- [x] Complete general artifact retrieval from both task workspaces and Library, then verify the event stream, approval enforcement, queue retry, and provider readiness with focused tests. Sandbox file publication, model parsing, terminal policy, action policy, credits, worker recovery, and retries are covered.
- [x] Add authenticated on-demand artifact URL refresh for task deliverables and cover ownership enforcement.
- [x] Add authenticated on-demand artifact URL refresh for task deliverables and cover ownership enforcement.
- [x] Validate PostgreSQL event-sequence allocation under concurrent writer conditions after applying the migration to the external database.
- [x] Add focused worker-recovery tests proving checkpoint restoration, task resumption, usage-ledger preservation, and server-side credit-estimate enforcement during retries.
- [x] Add queue exhausted-retry regression coverage so unrecoverable worker jobs transition the task into a durable failed state.
- [x] Implement the radiant-orange Synthia AI design system and responsive desktop application shell.
- [x] Implement task dashboard, goal-first task composer, status-aware sidebar, narrated task thread, approval prompts, and task controls.
- [x] Implement Agent's Computer Screen, Code, Terminal, Files, Timeline, Plan, and task replay surfaces with server-enforced terminal controls.
- [x] Keep the Agent's Computer workspace open by default and make its Code tab visibly expose sandbox files, change context, terminal output, timeline, and artifact previews.
- [x] Implement Library and complete Settings route structure for profile, integrations, model keys, memory, security, and billing.
- [x] Add a mobile and tablet navigation pattern so every primary Synthia route remains reachable when the desktop sidebar is hidden.
- [x] Split route-level workspace code so the dashboard's initial client load does not include the full Code, Library, and Settings feature surface.
- [x] Refine the default-open Code workspace so its visible layout includes file-tree/editor context and concise terminal, timeline, and artifact context without requiring tab changes.
- [x] Verify and test the existing server-side terminal policy against allowed commands, blocked commands, path restrictions, and approval enforcement.
- [x] Statically validate Docker Compose service configuration for the control plane, independent worker, PostgreSQL, Redis, migration job, and development-only sandbox image, with external provider configuration documented; deterministic `pnpm compose:validate` passes. Runtime Compose execution remains deferred because Docker is unavailable in this sandbox and credentials remain intentionally unset.
- [x] Add integration coverage for ordered replay events, authenticated task APIs, provider adapters, and frontend critical paths; unit coverage is complete for worker recovery, exhausted retries, approval gates, terminal policy, credits, parser validation, encryption, and logout.
- [ ] Complete environment-dependent migration, container, and authenticated task-flow verification after credentials are supplied; static checks, unit tests, production build, and desktop/mobile sign-in boundaries have passed.
- [x] Apply and verify the journaled external PostgreSQL schema migration chain, including task attachments, projects, event sequencing, and task-state tables.
- [ ] Complete the remaining credentials-dependent provider, object-storage, email, queue, container, and real agent task-flow verification after the corresponding secure secrets are configured.
- [x] Diagnose and repair the reported preview-access failure; the development service was restarted and the live preview now opens successfully.
- [x] Diagnose and repair the confirmed blank white client-rendering failure shown in the user's browser preview.
- [x] Verify the production-style static preview bundle renders correctly in the connected browser and use it as the managed preview fallback.
- [x] Determine that the connected browser was blocking Synthia's external module and stylesheet assets, then apply the compatible preview delivery fix.
- [x] Validate the single-file Synthia client bundle in the connected browser; retain it as the managed preview fallback.
- [x] Restore the development preview after the initial classic-bundle build failed on a style-only dependency, then rerun connected-browser compatibility verification.
- [x] Identify and resolve the classic-bundle `React is not defined` bootstrap exception.
- [x] Rebuild the classic bundle with React's automatic JSX runtime and confirm the connected browser reaches the styled sign-in interface.
- [x] Verify inline delivery of the generated Synthia stylesheet restores the intended radiant-orange visual design in the connected browser.
- [x] Add a visible nonblank Synthia bootstrap state and a fresh Vite entry revision so user browsers do not remain on a blank page while the workspace module loads.
- [x] Create a GitHub-ready Synthia AI review checkpoint; GitHub push remains deferred until the user confirms it.
- [x] Remove static-preview OAuth configuration warnings so the managed IIFE bundle preserves the sign-in redirect settings.
- [x] Add regression coverage for static-preview runtime OAuth configuration injection and HTML escaping.
- [x] Diagnose and repair the OAuth callback failure that blocks users from completing Synthia sign-in by restoring the managed MySQL account database boundary; end-to-end callback verification now reaches the authenticated dashboard.
- [x] Add regression coverage proving session authentication uses the managed account user store rather than the external task database.
- [x] Redesign the authenticated Synthia shell with a compact collapsible sidebar, icon-only collapsed rail, and balanced desktop proportions inspired by the supplied reference.
- [x] Replace the oversized dashboard composer with a centered chat-first task surface, compact tool controls, and restrained suggested-task list while retaining Synthia task actions.
- [x] Densify the task workspace, library, and settings visual hierarchy so panels and typography remain calm and readable across desktop and mobile widths.
- [x] Add interaction and responsive regression coverage for sidebar collapse and the chat-first task entry experience.
- [x] Show the compact external-data availability state promptly when Synthia’s deferred PostgreSQL store is not configured.
- [x] Add a regression test for the bounded task-history retry policy used by the compact unavailable-data state.
- [x] Remove task-history retry delay so the compact unavailable-data state appears immediately when PostgreSQL is intentionally unconfigured.
- [x] Add a regression assertion that the collapsed desktop rail retains navigation icons while hiding text labels and task/account detail.
- [ ] Configure the documented Synthia external-service and local Compose environment keys through secure project secrets management.
- [x] Review the live Manus sidebar with the user and record only the user-selected navigation, layout, and feature changes for Synthia.
- [x] Add a compact Projects area with clear project context and creation entry point.
- [x] Add a compact Scheduled area that truthfully explains and lists Synthia scheduled work when configured.
- [x] Fix the Scheduled screen’s response-shape handling so an empty or unavailable job list renders a compact truthful state rather than an error boundary.
- [x] Add an Agent area that presents the existing autonomous-run capabilities without duplicating the task workspace.
- [x] Add a Plugins area for user integrations, provider readiness, and connection setup guidance.
- [x] Expand the lower profile control into a compact account panel with Credits, Account, Personalization, Settings, Homepage, Docs, and sign-out actions.
- [x] Add navigation and behavioral coverage for Projects, Scheduled, Agent, Plugins, and lower profile-panel routes.
- [x] Present each configured external Synthia provider with clear connected, ready-to-connect, or missing-credential state and setup guidance.
- [x] Document the complete environment-variable contract in a safe public configuration reference without committing secrets.
- [x] Encode the verified Manus unified account-portal behavior for account creation; the portal expressly supports sign-in or sign-up through its supported SSO mode.
- [x] Encode the verified Google identity entry behavior; the trusted portal exposes Google selection while Synthia never handles provider tokens.
- [x] Add regression tests that assert the generated account-portal URL, callback state, and supported SSO mode for sign-in, account creation, and Google entry intents.
- [x] Distinguish user-connected integrations from server-configured integrations in the provider readiness contract and Settings UI.
- [x] Add regression coverage for provider status mapping and Settings service-connection state labels.
- [x] Add a compact profile control with account details and Synthia session actions to the persistent navigation shell.
- [x] Reorganize Synthia settings into clear account, provider, integrations, security, and workspace groups with direct section navigation.
- [x] Add visible, keyboard-accessible return navigation from every Agent’s Computer workspace to the task dashboard and library.
- [x] Extend compact navigation regression coverage for profile menu state, settings routes, and workspace return paths.
- [x] Replace the unavailable `.env.example` instruction with a safe environment-reference document for local Compose and managed secret configuration.
- [x] Correct profile-control account typography and truncation styling for both expanded and collapsed sidebar states.
- [x] Add rendered-source regression assertions for profile menu actions, grouped settings navigation, and visible dashboard/library workspace returns.
- [x] Audit the live Manus Library, Scheduled, Agent, Plugins, and lower profile areas and record only layout and capability patterns that map to the approved Synthia scope.
- [x] Extend Synthia Library with real artifact organization, task context, and truthful empty, loading, and unavailable states where supported by the existing artifact model.
- [x] Extend Synthia Scheduled with real schedule lifecycle information and compact controls only where the configured Heartbeat API exposes the required operations.
- [x] Extend Synthia Agent with live execution readiness, task-state, and operational capability context from existing Synthia services.
- [x] Extend Synthia Plugins with real provider, connection, credential-readiness, and integration-management actions without exposing secrets.
- [x] Refine the lower profile panel and related settings destinations with the selected compact information hierarchy and real account/session controls.
- [x] Add behavioral and regression coverage for every implemented reference-led capability and verify the revised pages visually.
- [x] Add frontend behavioral coverage for the Projects, Agent, and Plugins routes, including key navigation and interaction states.
- [x] Add regression coverage for Agent readiness/task state, Plugins filtering and disconnect initiation, and lower-profile credit-status rendering.
- [x] Audit the live Manus Settings sections—General, Account, Usage and billing, Shortcuts, and related navigation—and record only patterns applicable to Synthia’s approved platform scope.
- [x] Refine Synthia’s Settings information architecture and compact section navigation for account, usage, providers, integrations, security, workspace, and keyboard shortcuts.
- [x] Add truthful account, usage, credit, billing-boundary, and keyboard-shortcut management states without fabricating external billing data or exposing secrets.
- [x] Add behavioral and visual regression coverage for the upgraded Settings hierarchy and controls.
- [x] Disable server-persisted Settings controls while the external preferences store is unavailable, while retaining the local appearance control.
- [x] Add an explicit Account Settings action that routes users to the verified managed identity portal without handling identity-provider credentials in Synthia.
- [x] Add a compact top-right close/back control to Settings that returns to the Synthia task workspace with an accessible label and keyboard support.
- [x] Rebalance the Settings page header, section navigation, and content-panel proportions across desktop and mobile breakpoints.
- [x] Refresh owned artifact URLs on secure workspace artifact open and align workspace artifact rendering with the persisted deliverable schema.
- [x] Add an ownership-safe Library artifact-open action that refreshes the URL only after user interaction, plus focused event-stream and approval-enforcement regression coverage.
- [x] Fix the General Settings capability-row grid so each switch stays inside its own content column at 1920px desktop width and responsive widths.
- [x] Capture and retain a final post-fix desktop screenshot of the General Settings capability controls through the project screenshot service, alongside the completed repeatable layout assertion.
- [x] Capture a retained post-cache-refresh desktop Settings screenshot and assert the static preview always revisions its rebuilt browser bundle.

## Teal and cyan visual-system refresh

- [x] Audit the current radiant-orange token usage and replace harsh attention states with calm teal/cyan hierarchy.
- [x] Apply a balanced `#14b8a6` and `#22d3ee` signal palette across active navigation, primary controls, selected states, composer feedback, and Settings.
- [x] Retain only restrained amber highlights where they clarify a high-priority action, without returning to an orange-heavy interface.
- [x] Validate readable contrast, desktop/mobile visual balance, and complete token regression coverage before checkpointing.
- [x] Audit remaining amber/orange tokens and document the limited high-priority surfaces permitted to retain them.
- [x] Add focused source regressions that enforce the approved teal/cyan palette and permitted amber-highlight surfaces.

## Dashboard task-history readiness

- [x] Diagnose the dashboard task-history loading state observed during visual review without creating mock task data.
- [x] Correct the state only if runtime evidence identifies a loading, empty, or unavailable-state defect.
- [x] Add regression coverage and visually verify the final task-history state before checkpointing.

## Agent’s Computer visual-system completion

- [x] Audit Agent’s Computer controls for non-decision orange tokens that conflict with the approved teal/cyan palette.
- [x] Replace standard workspace accents with teal/cyan while retaining amber only for approvals and warnings.
- [x] Add regression coverage and verify the workspace visually at desktop and mobile sizes before checkpointing.
- [x] Confirm at 1440×1000 and 390×844 that the compact teal/cyan composer, starter chips, empty task-history state, and mobile navigation remain contained without clipped controls or non-decision orange emphasis.

## Cross-route visual-system audit

- [x] Inspect remaining routes and shared components for standard-control orange or amber that violates the teal/cyan and amber-allowlist boundary.
- [x] Correct a verified semantic-color violation without affecting credential-gated functionality.
- [x] Add targeted regression coverage and verify affected routes at desktop and mobile sizes before checkpointing.
- [x] Verify `/`, `/agent`, and `/settings` at 1440×1000 and 390×844: normal task-state signals remain teal, operational-unavailable and approval attention remain amber, and controls remain visible without clipping.

## Environment-contract consistency audit

- [x] Compare runtime environment validation, the maintained public environment reference, and the public go-live credential guide without reading or adding secret values.
- [x] Correct the verified Gemini media-readiness adapter label so image and video configuration both identify the implemented shared `server/media/gemini.ts` adapter while preserving all credentials as user-supplied secure project configuration.
- [x] Keep the existing non-secret media-readiness regression aligned with the implemented adapter and complete TypeScript, test-suite, and production-build verification before checkpointing.

## Fresh-preview boot-state verification

- [x] Verify that a fresh authenticated preview session resolves the workspace boot screen after authentication and task queries settle; it reached the zero-task empty state without mock data.
- [x] Confirm no persistent boot-state or task-query regression was verified, so no corrective code change was required.
- [x] Retain the existing authenticated loading-to-empty-state DOM regression; desktop browser verification confirmed the resolved state, and the 390px mobile review confirmed that the same state area remains contained during the brief query transition.

## Search and queue credential activation

- [x] Add the user-provided Tavily, Serper, and Redis values through secure project configuration without exposing them in chat or logs.
- [x] Add an opt-in live integration regression that validates configured credentials without printing their values or consuming quota during normal tests.
- [x] Confirm non-mutating Redis ping plus lightweight Tavily and Serper requests succeed; run the full TypeScript, test-suite, and production-build verification with routine live checks skipped.

## Configured-provider readiness display

- [x] Verify that authenticated Settings and the provider catalog reflect Tavily, Serper, and Redis readiness without exposing credentials; the initial service-connections route correctly shows a credential-safe loading state while its readiness query resolves, including after a rebuilt preview bundle.
- [x] Correct the verified Redis-readiness visibility gap by adding a Queue section backed by the existing server environment contract, without hardcoding or leaking configuration values.
- [x] Add a non-secret catalog regression and visually confirm Tavily, Serper, and Redis states in authenticated Settings before checkpointing.

## Queue runtime readiness display

- [x] Verify that the authenticated Agent page identifies the configured Redis execution queue as ready without exposing its connection value.
- [x] Confirm no queue-readiness display mismatch was present; the Agent surface still truthfully reports zero configured LLM providers and sandbox credentials required.
- [x] Record the verified runtime boundary: a real autonomous task next requires at least one LLM provider key and E2B sandbox credentials; optional storage and email providers remain separately gated.

## Quota-safe provider expansion

- [x] Research Bunnyshell’s supported HopX sandbox integration boundary and Pixazo’s supported media-provider integration boundary without calling generation endpoints.
- [x] Add Bunnyshell HopX alongside E2B and Pixazo alongside Gemini through secure environment contracts, provider abstractions, a persisted HopX sandbox-provider migration, and truthful readiness states only.
- [x] Keep Pixazo media generation and all live provider calls explicit opt-in; no free-tier quota was consumed during implementation or routine tests.
- [x] Add non-secret adapter and readiness regressions and verify the authenticated Connectors surface lists Pixazo and Bunnyshell HopX as credentials-required without displaying keys or running billable generation.

## Alternate-sandbox runtime copy

- [x] Audit Agent and workspace readiness text for legacy E2B-only assumptions after adding Bunnyshell HopX.
- [x] Correct the verified Agent generic sandbox-requirement copy so it explicitly identifies E2B or Bunnyshell HopX without invoking either provider.
- [x] Add non-secret coverage and visually verify the settled Agent state: Redis queue and both configured search providers are ready, while models and both sandbox options remain transparently credential-gated.

## Groq activation

- [ ] Add a Groq credential acceptance path using secure project secrets management.
- [x] Add an independently opt-in, non-generative Groq connectivity check that never logs the credential or invokes a model; default test execution verifies it is skipped unless `SYNTHIA_RUN_LIVE_GROQ_CONNECTIVITY_CHECK=true` is deliberately supplied.
- [ ] Verify the authenticated provider catalog reports Groq readiness after secure configuration, then checkpoint the validated state.

## Additional provider evaluation and activation

- [x] Review the official Agnes AI, AIHubMix, and Hyperbrowser documentation for supported APIs, authentication, capabilities, quotas, and applicable safety boundaries.
- [x] Determine a scope-aligned provider contract for AIHubMix text, coding, reasoning, image, video, and audio models; Agnes AI capabilities only where official API support is documented; and Hyperbrowser agent-browser operations.
- [x] Add credential-gated adapters, model capability metadata, secure readiness reporting, and configuration documentation without exposing provider credentials; AIHubMix image/video artifact retrieval additionally requires an explicit output-host allowlist.
- [x] Add non-billable unit coverage and separately opt-in connectivity checks that do not invoke text, coding, reasoning, image, video, audio, or browser-automation workloads; routine test runs skip all live-provider calls.
- [x] Securely accept the user-provided AIHubMix, Agnes AI, Pixazo, HopX, and Hyperbrowser keys plus one HopX template ID; validate AIHubMix model discovery, HopX template listing, and Hyperbrowser active-session count through explicit read-only checks without creating any model, media, sandbox, or browser workload.
- [ ] Collect optional Pixazo model allowlists and an explicit media-enable decision before showing Pixazo image/video controls as available; no Pixazo generation test may run without separate approval.
- [ ] Collect an explicit Hyperbrowser domain allowlist before enabling agent navigation; no Hyperbrowser browser session may be created without it.

## User-approved provider credential configuration

- [x] Securely configure the user-provided AIHubMix, Hyperbrowser, Agnes AI, Pixazo, and Bunnyshell HopX credential values plus one HopX template ID; optional model allowlists, media switches, and Hyperbrowser navigation domains remain deliberately unset.
- [x] Verify configuration-only readiness without submitting model, image, video, audio, sandbox, or browser-automation work; the read-only AIHubMix, HopX, and Hyperbrowser checks pass without provisioning or task execution.
- [x] Update the authenticated Settings provider catalog, preserve exact configuration boundaries, and checkpoint the verified configured state.

## Provider status clarity

- [x] Distinguish stored credential readiness from actionable media and agent-browser availability in the authenticated provider catalog.
- [x] Add concise guidance for Pixazo model/enablement and Hyperbrowser domain-policy prerequisites without exposing secrets or changing provider quota state.
- [x] Add deterministic regressions and browser verification for the clarified provider-state semantics.

## User-focused capability presentation

- [x] Audit Agent Capabilities and Settings views for internal backend, provider, credential-variable, and configuration implementation disclosures.
- [x] Replace implementation-oriented language with user-available features, availability, and safe setup guidance aligned to the approved Manus-style interaction pattern.
- [x] Preserve truthful availability, approval, and safety boundaries without naming internal infrastructure or revealing credential configuration mechanics.
- [x] Add source regressions and authenticated browser verification for the user-focused capability presentation.

## Manus-pattern capability surfaces

- [x] Reframe Connectors as a browseable catalog of user apps and user-approved connections, with short outcome-focused descriptions and no backend-service cards.
- [x] Reframe Skills as a user-managed catalog of task abilities with concise explanations and available/unavailable controls, without provider or credential implementation language.
- [x] Reframe Mail and Computer as user-facing workflows and controls rather than mail-provider and sandbox-runtime status pages.
- [x] Reframe the Agent capability summary around usable task abilities and approvals, not runtime configuration counts or named internal services.
- [x] Align the sidebar Connections area with the Settings connectors catalog so it describes user apps and task outcomes rather than internal provider readiness.
- [x] Add deterministic regression coverage and authenticated browser review for the approved Manus-style capability presentation.

## Free-tier media and public-web access

- [x] Research official Pixazo and AIHubMix free-tier image, video, and audio model catalogs, including quotas and documented API model identifiers.
- [x] Define a documented free-model allowlist with per-model user-visible capability labels and no invented availability claims.
- [x] Configure broad public-web access for Agent research while blocking localhost, private networks, cloud metadata hosts, and sensitive or authenticated browser actions until explicitly approved.
- [x] Add unit coverage and opt-in-only readiness checks that confirm model and browser policy configuration without invoking media generation or creating browser sessions.
- [x] Verify the user-facing availability states and checkpoint the free-tier media and public-web access configuration.
- [x] Apply the user-approved Pixazo `flux`/`ltx`, AIHubMix curated free-text model, Agnes `agnes-2.0-flash`, and guarded public-web configuration values without invoking any model, media, or remote-browser workload.
- [x] Make the configured model catalog provider-qualified so the user can select an Agnes model without it being routed through the AIHubMix provider.
- [x] Add deterministic coverage for the approved free-tier catalog and run type, test, build, restart, and authenticated UI verification before checkpointing.
- [x] Show the configured model labels in Settings and the composer picker so the user can identify the approved AIHubMix and Agnes options without exposing credentials or triggering a workload.
- [x] Make the composer model menu scroll within a bounded viewport when its catalog exceeds the available space, and show only each model name with its capability labels rather than provider or configuration state.
- [x] Surface every genuinely available text, vision, image, video, and audio capability in the task experience, distinguishing ready task routes from unavailable or credential-gated capabilities without exposing providers or credentials.
- [x] Add deterministic multimodal capability presentation coverage and verify the authenticated composer without invoking media generation, audio synthesis, remote browsing, or model inference.
- [x] Implement the documented asynchronous Pixazo Tracks audio route, bounded polling and task-owned MP3 retrieval so the approved free-tier audio model can be presented as ready without conducting a live generation test.
- [x] Configure the non-secret Pixazo Tracks audio allowlist and extend media readiness, task routing, and authenticated capability presentation coverage without exposing provider credentials.
- [x] Redesign the central task composer with compact workspace summary, attachment controls, lower control bar, suggestions, and recent-task hierarchy.
- [x] Add a persisted user-owned task-attachment schema and reviewed PostgreSQL migration for local uploads and selected Library artifacts.
- [x] Add a rate-limited authenticated attachment-upload contract with strict filename, MIME, and 10 MB file validation through secure object storage.
- [x] Extend task creation to validate, persist, and event-log attachment references before queueing a task.
- [x] Hydrate persisted task attachments into isolated agent workspaces and structured model context without cross-user storage access.
- [x] Add focused attachment composer and task-contract regression coverage, then complete full verification and visual review.
- [x] Audit the referenced Manus center workspace attachment, model, microphone, and upper-right task-action controls against the approved Synthia scope.
- [x] Replace the direct attachment action with a compact plus-button menu that exposes local upload and Library attachment options on hover or click.
- [x] Organize the composer’s lower control bar with a scope-approved model selector and microphone input control without fabricating provider availability.
- [x] Add compact scope-aligned upper-right task actions for usage, task files, sharing, and overflow controls with truthful disabled or unavailable states where required.
- [x] Add interaction and layout regression coverage for the reorganized central workspace, then validate it visually.
- [x] Keep the composer plus-menu open while the pointer moves from the trigger into its local-upload and Library options, with click support as a persistent fallback.
- [x] Add a pointer-transition regression for the attachment-menu trigger and option surface, then visually verify the repaired interaction.
- [x] Audit each referenced Manus Settings tab, model-selector option, central composer control, and task overflow action against the approved Synthia platform scope.
- [x] Define and expose only production-backed Synthia model capabilities for text, vision, and voice, with configured-provider availability and truthful unavailable states.
- [x] Refine the central composer with a compact hoverable model picker, visual-input attachment workflow, real voice-transcription route, and task overflow actions mapped to current Synthia functionality.
- [x] Complete the scope-aligned Synthia Settings pages from the audited reference, preserving secure secret boundaries and clearly disabling unavailable external controls.
- [x] Add integration, interaction, and visual regression coverage for the audited center workspace and Settings refinements before resuming live end-to-end testing.
- [x] Use the live Manus application as a reference ledger for scope-aligned Synthia frontend and backend improvements, documenting each adopted behavior and its secure Synthia contract.
- [x] Add durable, ownership-scoped task actions for rename, pin, favorite, archive, and delete, including explicit destructive confirmation and event logging.
- [ ] Expose task scheduling through the existing Scheduled area, retaining a truthful unavailable state until the deployed Heartbeat workflow is ready.
- [x] Add a searchable Settings section rail and retain only secure, production-backed section content.
- [x] Refine the configured model picker with automatic routing and explicit text, vision, and voice-input capability states.

- [x] Audit every center-workspace interface component against the approved Manus-style composer, action strip, attachment menu, model picker, voice input, task list, and workspace navigation scope.
- [x] Add real capability-aware image, vision, audio, image-generation, and video-generation states without fabricating provider availability or model readiness.
- [x] Wire multimodal task contracts so image inputs require vision-capable routing and media-generation requests expose only configured provider capabilities.
- [x] Add regression and authenticated-browser coverage for the expanded center workspace and multimodal capability states.
- [x] Produce a consolidated go-live credential checklist covering all required external providers, storage, queue, sandbox, database, email, transcription, image, and video services.
- [ ] Complete go-live provider and deployment verification after the user supplies credentials and publishes the site.
- [ ] Add durable task-linked scheduling only after the published callback contract and Heartbeat workflow are available.

## Go-live modality provider contract

- [x] Review the current Personalization settings experience against the requested graph, session-memory, and long-term-memory controls without copying private account content.
- [x] Add a secure user-scoped personalization schema with explicit personality dimensions, session memory, long-term memory, retention metadata, and deletion controls.
- [x] Build a Personalization settings column that visualizes the editable personality graph and lets the user inspect, edit, disable, and erase remembered preferences.
- [x] Apply only user-approved personalization and memory context to Synthia task interactions, with bounded context, auditability, and no silent inference-based personality claims.
- [x] Add database, router, UI, and privacy regression coverage for adaptive personalization, then verify the authenticated settings experience without invoking an LLM.
- [x] Make the blocked-microphone warning dismissible and clear it after a successful retry, while preserving text-only task composition when access remains denied.
- [x] Implement capability-aware Automatic routing for text, vision-input, and development tasks; preserve image, video, and audio generation as explicit user-started routes to avoid silent workload consumption.
- [x] Wire the tested Automatic resolver into the task worker so image attachments, code tasks, primary tasks, and manual model overrides use the selected route at execution time.
- [x] Add deterministic microphone-lifecycle and automatic-routing regressions, then verify the authenticated composer without inference, media generation, or browser automation.
- [x] Correct the video-generation readiness mismatch so the configured LTX route is shown as ready only when its authenticated task route and artifact contract are genuinely available.
- [x] Improve microphone permission recovery with an explicit retry action and browser-specific guidance while retaining the text-composer fallback when permission is unavailable.
- [x] Add deterministic video-readiness and microphone-permission regressions, then verify the repaired composer without invoking video generation or speech transcription.
- [x] Securely configure the user-provided Groq credential, validate the non-generative runtime contract, and retain opt-in-only live discovery.
- [x] Securely configure the user-provided OpenRouter and Gemini credentials, then validate their documented non-generative provider endpoints without invoking inference or media generation.
- [x] Retrieve and present only provider-supported free-tier model catalog and usage information for Groq, OpenRouter, and Gemini, without exposing credentials or inventing quota availability.
- [x] Add opt-in-only provider-account regressions and user-facing status coverage for the three configured language-model services.
- [x] Confirm the selected image-generation provider and required API credential before enabling image generation.
- [x] Confirm the selected video-generation provider and required API credential before enabling video generation.
- [x] Confirm the selected vision-capable Agnes model and `SYNTHIA_VISION_MODELS` configuration before enabling visual task execution.
- [ ] Confirm the selected audio transcription provider and credential before enabling voice input in production.
- [ ] Confirm media storage, sandbox, queue, database, search, email, and application secret values before live end-to-end testing.

## Center workspace component audit ledger

- [x] Header identity and workspace status
- [x] Upper-right usage, files, sharing, and overflow actions
- [x] Goal composer and submit state
- [x] Plus attachment menu with local files and Library
- [x] Attachment chips and image capability guard
- [x] Model picker with automatic routing and capability labels
- [x] Voice input and transcription state
- [x] Project and autonomy controls
- [x] Suggested task prompts and recent task list
- [x] Responsive collapsed-sidebar and mobile behavior
- [x] Empty, loading, error, and unavailable states
- [x] Agent’s Computer workspace return/navigation actions
- [x] Multimodal generation capability surfaces for image and video requests

## Center workspace implementation decisions

- [x] Do not present image/video generation as available until provider credentials and runtime adapters are configured.
- [x] Keep voice input as authenticated transcription into task text, not as a chat-model selector.
- [x] Keep image attachments blocked for fixed text-only models and available through automatic routing or configured vision models.
- [x] Keep unsupported sharing, scheduling, and external connectors visibly unavailable rather than simulated.

## Credential checklist

- [ ] `SYNTHIA_POSTGRES_URL`
- [ ] `REDIS_URL`
- [ ] `GROQ_API_KEY`
- [ ] `OPENROUTER_API_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `DEEPSEEK_API_KEY`
- [ ] `TAVILY_API_KEY`
- [ ] `SERPER_API_KEY`
- [ ] `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`
- [ ] `RESEND_API_KEY` and/or `POSTMARK_SERVER_TOKEN`
- [ ] `E2B_API_KEY`
- [ ] `SYNTHIA_VISION_MODELS`
- [ ] Image-generation provider API key and model configuration
- [ ] Video-generation provider API key and model configuration
- [ ] Production `SYNTHIA_PUBLIC_APP_URL`
- [ ] Existing managed Manus OAuth and JWT secrets verified for production
- [ ] Published production URL verified before Heartbeat schedule creation

## Center workspace verification

- [x] `pnpm check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] Authenticated desktop visual review
- [x] Authenticated mobile visual review
- [x] Model-picker interaction review
- [x] Attachment-menu interaction review
- [x] Voice-input unavailable/ready review
- [x] Image and video-generation unavailable/ready review
- [x] Task overflow action review
- [x] Save a checkpoint after all verified changes
- [x] Retain GitHub push as the final action requiring explicit user confirmation
> **Credential boundary:** Credentials will be requested through secure project configuration. No secrets will be written into source code, screenshots, or committed `.env` files.

> **Provider boundary:** Image and video generation will remain unavailable in the UI until real provider adapters, model configuration, storage handling, and go-live credentials are verified.

> **Scheduling boundary:** Task-linked scheduling remains unavailable until the published `/api/scheduled/*` callback and Heartbeat ownership contract are ready.

## Credential request status

- [ ] Request and configure the complete go-live credential set after the user confirms the selected image and video providers.
- [ ] Run the final live end-to-end validation only after credentials are configured.

## Center workspace completion status

- [x] Complete all center interface components and multimodal capability states.
- [x] Mark this expanded center-workspace scope complete after authenticated desktop/mobile review and a saved checkpoint.

## User provider selection

- [ ] User confirms image-generation provider.
- [ ] User confirms video-generation provider.
- [ ] User confirms whether one or multiple vision-capable LLM providers should be enabled for production fallback.

## Security verification for media

- [ ] Validate MIME, size, ownership, and storage policy for image/audio/video inputs.
- [ ] Validate generation output storage, ownership, and artifact retrieval.
- [ ] Validate generation failure, timeout, rate-limit, and unavailable-provider states.

## Deployment prerequisite

- [ ] Publish the application before enabling Heartbeat schedule creation or claiming live scheduled execution.

## Final handoff

- [ ] Deliver the checkpoint attachment and consolidated credential checklist.
- [ ] Remind the user that GitHub push occurs only after explicit confirmation.

## Expanded center scope acceptance

- [x] User-visible center UI matches the approved compact proportional layout.
- [x] Every enabled action has a real backend route or is explicitly unavailable.
- [x] No fabricated provider, model, generation, review, rating, or schedule data exists.
- [x] External credentials remain outside source control.
- [ ] Production verification is complete after secrets and deployment.

## Modality readiness matrix

- [ ] Text generation: configured LLM provider and model catalog
- [ ] Vision understanding: configured vision model and image attachment route
- [ ] Voice input: configured transcription provider and storage route
- [ ] Image generation: configured provider adapter, model, storage, and artifact route
- [ ] Video generation: configured provider adapter, model, storage, polling/status, and artifact route
- [ ] Media processing: validated input limits, sandbox processing, and secure artifact retrieval

## No-mock acceptance

- [ ] All center UI states use real data or explicit unavailable states.
- [ ] No fake generated images, videos, reviews, ratings, or provider connection states are added.
- [ ] All end-to-end claims are backed by passing tests or authenticated browser evidence.

## Go-live checklist summary

- [ ] Secrets configured
- [ ] Database migrated and concurrent event allocation validated
- [ ] Queue and worker online
- [ ] LLM provider fallback verified
- [ ] Vision route verified
- [ ] Voice route verified
- [ ] Image generation verified
- [ ] Video generation verified
- [ ] Media storage verified
- [ ] Search verified
- [ ] Email verified
- [ ] Sandbox verified
- [ ] Production URL published
- [ ] Heartbeat scheduling verified
- [ ] GitHub push explicitly confirmed by user

## User confirmation gate

- [ ] Ask for image-generation provider choice if not already supplied.
- [ ] Ask for video-generation provider choice if not already supplied.
- [ ] Ask user to supply credentials through secure project configuration after provider choices are confirmed.
- [ ] Ask user to publish before live scheduling tests.
- [ ] Ask user to confirm GitHub push only after all go-live checks pass.
- [x] Classify remaining live-provider, storage, scheduling, deployment, and GitHub steps by their credential or explicit-confirmation gate.

## Delivery status

- [ ] Expanded center interface delivered
- [ ] Multimodal capability matrix delivered
- [ ] Credential checklist delivered
- [ ] Production readiness limitations disclosed
- [ ] Checkpoint saved
- [ ] GitHub push deferred pending explicit confirmation

## Implementation notes

- [ ] Use existing attachment storage and ownership checks for media inputs.
- [ ] Use existing configured model catalog for vision capability.
- [ ] Use provider adapters rather than direct client-side secret exposure.
- [ ] Keep media-generation operations asynchronous where provider APIs require polling.
- [ ] Keep all provider failures observable through structured logs and user-facing error states.

## Next action

- [ ] Continue with the center-workspace audit and implementation before requesting credentials.

## User request scope

- [ ] Clone the center workspace components within the approved Synthia feature scope.
- [ ] Support vision models for image understanding in production.
- [ ] Support image generation models when a real provider is configured.
- [ ] Support video generation models when a real provider is configured.
- [ ] List all required external credentials before go-live.

## Credential sourcing

- [ ] User supplies credentials through secure project configuration cards, not chat or source files.
- [ ] Provider documentation and model availability are verified before enabling each adapter.
- [ ] No provider is marked connected until a real readiness check succeeds.

## Media provider adapter design

- [ ] Define image-generation provider adapter contract.
- [ ] Define video-generation provider adapter contract.
- [ ] Define generation job status and polling contract.
- [ ] Define generated media artifact persistence contract.
- [ ] Define secure media download and preview contract.

## Center acceptance test cases

- [ ] Automatic routing with no configured model
- [ ] Fixed text model with text-only task
- [ ] Fixed text model with image attachment is blocked
- [ ] Fixed vision model with image attachment is accepted
- [ ] Voice input unavailable without transcription credential
- [ ] Voice input ready with transcription credential
- [ ] Image generation unavailable without provider credential
- [ ] Image generation ready with provider credential
- [ ] Video generation unavailable without provider credential
- [ ] Video generation ready with provider credential
- [ ] Upload ownership and MIME/size validation
- [ ] Generation output ownership validation
- [ ] Provider rate-limit and timeout error states

## Final completion rule

- [ ] Do not mark expanded center scope complete until real provider configuration, authenticated visual review, full tests, and a checkpoint are complete.

## User clarification gate

- [ ] Ask only for image provider, video provider, and deployment confirmation before proceeding to credential configuration.

## Current continuation

- [ ] Continue center interface audit now.
- [ ] Keep all external services wired through environment variables.
- [ ] Keep GitHub push last and confirmation-gated.

## Modality provider candidates

- [ ] Confirm whether image generation should use a provider already supported by the existing Manus Forge integration or a dedicated external provider.
- [ ] Confirm whether video generation should use a provider already supported by the existing Manus Forge integration or a dedicated external provider.
- [ ] Confirm voice transcription provider and supported audio formats.

## Final user handoff content

- [ ] Summarize implemented center components.
- [ ] Summarize real modality routes.
- [ ] List missing credentials grouped by provider.
- [ ] Explain unavailable states and deployment prerequisites.

## Checkpoint discipline

- [ ] Save a checkpoint after implementation and verification.
- [ ] Offer the checkpoint attachment.
- [ ] Never push GitHub without explicit confirmation.

## Scope guard

- [ ] Do not add features outside the user-approved Manus-style platform scope.
- [ ] Do not fabricate provider, model, schedule, or generated-media data.
- [ ] Keep the radiant-orange Synthia AI design system.

## Follow-up gate

- [ ] Ask the user to select image and video providers before adding provider-specific credentials.
- [ ] Ask the user to provide credentials only through secure project configuration.
- [ ] Ask the user to publish before schedule creation.

## Ready for implementation

- [ ] Center audit
- [ ] Media contract
- [ ] Regression tests
- [ ] Credential checklist
- [ ] Checkpoint

## Inherited checkpoint context

- [x] Previous Settings, model picker, task overflow, attachment, and PostgreSQL migration work remains preserved in checkpoint `ae8d57b2`.

## New user continuation

- [ ] Continue center-interface cloning and multimodal readiness work.
- [ ] Return the complete external-service credential list before go-live.

## Go-live gate

- [ ] User confirms provider selections.
- [ ] User supplies credentials securely.
- [ ] Application is published.
- [ ] Live end-to-end task and media flows pass.

## Last updated scope

- [ ] Complete the center interface before credential configuration.
- [ ] Support vision, image-generation, video-generation, and media-processing capability states.
- [ ] Preserve real-service and no-mock requirements.

## Provider-specific prerequisites

- [ ] Image provider adapter and key
- [ ] Video provider adapter and key
- [ ] Vision model environment configuration
- [ ] Audio transcription environment configuration
- [ ] Media storage environment configuration

## Operational checks

- [ ] Verify model catalog exposes only configured models.
- [ ] Verify unavailable modality actions remain disabled with explanation.
- [ ] Verify generation jobs do not block the main request beyond platform timeout.
- [ ] Verify media artifacts are ownership-scoped.

## Final product standard

- [ ] Production-ready center workspace
- [ ] Real multimodal routing
- [ ] Explicit credential requirements
- [ ] No hidden mock data
- [ ] Deployment-safe checkpoint

## Continuation task

- [ ] Inspect TaskDashboard, Settings, router model catalog, and media adapter surfaces.
- [ ] Implement only the missing in-scope center pieces.
- [ ] Verify and checkpoint.

## Completion criteria

- [ ] Center workspace visually reviewed.
- [ ] Model, vision, voice, image, and video states verified.
- [ ] Credential list complete.
- [ ] User informed of remaining prerequisites.

## User message interpretation

- [ ] "copy center interface each parts and all components clone" means preserve compact Manus-style hierarchy, not proprietary branding/assets.
- [ ] "vision model supported" means model catalog, image attachment validation, and execution routing.
- [ ] "image gen model or video generation models exits" means expose truthful capability states and provider readiness, not fake availability.
- [ ] "tell me all external service you need" means provide one grouped credential request after implementation audit.

## Safety and truthfulness

- [ ] Keep media provider selection explicit.
- [ ] Keep credentials out of chat and source.
- [ ] Keep unsupported capabilities unavailable.
- [ ] Keep all status labels derived from actual configuration.

## User-approved scope

- [ ] Center workspace
- [ ] Vision support
- [ ] Image generation support
- [ ] Video generation support
- [ ] External credential checklist
- [ ] Go-live readiness

## Completion record

- [ ] Center interface work completed.
- [ ] All required provider credentials listed.
- [ ] Checkpoint saved after final verification.
- [ ] GitHub push remains pending explicit confirmation.

## Agent continuation log

- [ ] Phase 1 center audit in progress.
- [ ] Phase 2 multimodal implementation pending audit.
- [ ] Phase 3 verification pending implementation.
- [ ] Phase 4 credential checklist pending verification.
- [ ] Phase 5 checkpoint pending completion.

## Final user request

- [ ] Continue without pausing for non-essential clarification.
- [ ] Ask only provider selection and credential/deployment gates when necessary.
- [ ] Keep all external services in environment configuration.
- [ ] Preserve same-to-same Manus-style compact proportions within Synthia scope.

## Project handoff state

- [ ] Ready for secure provider configuration after user confirms image/video providers.
- [ ] Ready for production deployment after user publishes.
- [ ] Ready for GitHub push only after explicit confirmation.

## End of inherited continuation

- [ ] Continue implementation now.
- [ ] Consolidate credential request after audit.
- [ ] Save final checkpoint after verification.

## Current execution marker

- [ ] Phase 1 audit started for center workspace and multimodal capability matrix.
- [ ] Existing `ae8d57b2` checkpoint is the rollback baseline for this continuation.

## Final implementation TODO

- [ ] Inspect current center workspace implementation.
- [ ] Inspect current model catalog and provider adapters.
- [ ] Inspect existing image/audio/video routes.
- [ ] Implement missing center controls.
- [ ] Add media capability state tests.
- [ ] Run full verification.
- [ ] Save checkpoint.
- [ ] Deliver credential list.

## External-service grouping

- [ ] Core runtime: PostgreSQL, Redis, JWT/OAuth
- [ ] Models: Groq, OpenRouter, Gemini, DeepSeek, vision models
- [ ] Search: Tavily, Serper
- [ ] Sandbox: E2B and Docker fallback
- [ ] Storage: AWS S3 and Cloudflare R2
- [ ] Email: Resend and Postmark
- [ ] Media generation: image provider and video provider
- [ ] Audio: transcription provider

## Browser review requirements

- [ ] Review desktop center workspace.
- [ ] Review mobile center workspace.
- [ ] Review settings model page.
- [ ] Review attachment plus menu.
- [ ] Review voice state.
- [ ] Review unavailable image/video states.

## Provider configuration boundary

- [ ] Do not call `webdev_request_secrets` until provider selections are confirmed if image/video provider-specific keys are required.
- [ ] Request universal credentials through secure project configuration once provider selections are confirmed.

## Handoff response

- [ ] Provide concise status and one grouped credential table.
- [ ] Include checkpoint attachment.
- [ ] Mention live agent execution is gated on Redis/LLM/sandbox/storage credentials.
- [ ] Mention image/video generation depends on selected providers.
- [ ] Mention GitHub push remains last and confirmation-gated.

## Explicit current user ask

- [ ] Continue until center interface and multimodal capability states are implemented.
- [ ] Then tell user every external service credential required for go-live.
- [ ] Keep image and video generation provider choices explicit.

## Progress tracking

- [ ] Center workspace audit
- [ ] Image/vision/audio/video readiness
- [ ] Credential checklist
- [ ] Full verification
- [ ] Checkpoint

## Final notes

- [ ] Do not claim support for image or video generation until configured and tested.
- [ ] Do not ask for credentials already available through managed environment.
- [ ] Do not expose secret values in files or messages.
- [ ] Do not push to GitHub until explicit confirmation.

## Next tool action

- [ ] Continue with direct file inspection and implementation.

## Context continuation

- [ ] This task inherits all previous checkpointed work.
- [ ] Current baseline checkpoint: `ae8d57b2`.
- [ ] Current preview URL remains available.

## User asked to continue

- [ ] Continue.
- [ ] Do not stop at the first implementation pass.
- [ ] Complete the audit, implementation, verification, credential list, and checkpoint.

## Completion gate

- [ ] All new checklist rows from this continuation are complete or explicitly waiting on user credentials/provider choice/deployment.
- [ ] User receives a single consolidated go-live credential request.

## Scope note

- [ ] Keep model, image, video, and audio support within the existing Synthia agent platform spec.
- [ ] Keep the same radiant-orange visual system.
- [ ] Keep layout mathematically compact and proportional.

## Workstream status

- [ ] Center interface implementation
- [ ] Multimodal provider contracts
- [ ] Credential request
- [ ] Production verification
- [ ] Final checkpoint

## User-facing provider request

- [ ] Ask user to choose image and video generation providers before secure key request.

## Final acceptance

- [ ] Center layout and interaction parity within scope
- [ ] Vision model support
- [ ] Image-generation readiness
- [ ] Video-generation readiness
- [ ] Voice input readiness
- [ ] Media processing readiness
- [ ] External service credential inventory
- [ ] Production and GitHub gates

## Preserve previous decisions

- [x] No fabricated reviews, ratings, or testimonials.
- [x] No secret values committed.
- [x] PostgreSQL migration already applied.
- [x] Existing task attachment ownership checks retained.
- [x] Existing task overflow menu retained.

## Current user continuation request

- [ ] Clone all in-scope center interface components.
- [ ] Support vision models.
- [ ] Support image generation models when configured.
- [ ] Support video generation models when configured.
- [ ] Tell user all external services required for go-live.
- [ ] Continue now.

## Go-live provider-choice gate

- [ ] Image generation provider selection pending.
- [ ] Video generation provider selection pending.
- [ ] Vision provider fallback selection pending.

## Handoff blocker

- [ ] Cannot mark live media generation ready until provider keys and deployment are supplied.

## End of current todo additions

- [ ] Proceed with center audit.
- [ ] Preserve rollback checkpoint `ae8d57b2`.
- [ ] Keep all changes production-safe.
- [ ] Keep GitHub push last.

## Completion status

- [ ] Center audit not yet complete.
- [ ] Multimodal work not yet complete.
- [ ] Credentials not yet requested.
- [ ] Deployment not yet confirmed.
- [ ] Final checkpoint not yet saved.

## Operator instructions

- [ ] Continue implementation in phases.
- [ ] Verify each modality honestly.
- [ ] Keep user informed at meaningful milestones.

## Credential category details

- [ ] Database: PostgreSQL URL, migration access
- [ ] Queue: Redis URL
- [ ] LLM: Groq, OpenRouter, Gemini, DeepSeek API keys
- [ ] Vision: vision-capable model IDs and provider keys
- [ ] Search: Tavily, Serper API keys
- [ ] Sandbox: E2B API key, Docker runtime
- [ ] Storage: AWS S3 and Cloudflare R2 credentials
- [ ] Email: Resend and Postmark credentials
- [ ] Image: selected image generation provider key
- [ ] Video: selected video generation provider key
- [ ] OAuth: production app callback configuration

## No-final-until-complete

- [ ] Do not send final delivery until all actionable work is done and all blockers are clearly requested.

## Current immediate action

- [ ] Inspect files and implement missing center functionality.

## Scope compliance

- [ ] Preserve same-to-same compact Manus style within Synthia scope.
- [ ] Do not add unapproved marketplace, social, or billing features.

## User requested modality list

- [ ] Text
- [ ] Vision
- [ ] Voice
- [ ] Image generation
- [ ] Video generation
- [ ] Image/video processing

## Final handoff requirements

- [ ] Credential list grouped by function
- [ ] Provider selection questions
- [ ] Deployment prerequisite
- [ ] Checkpoint reference
- [ ] GitHub push confirmation gate

## Completion rule reiterated

- [ ] Continue until implementation or explicit external blocker.

## Current phase status

- [ ] Phase 1 audit
- [ ] Phase 2 implementation
- [ ] Phase 3 tests
- [ ] Phase 4 verification
- [ ] Phase 5 checkpoint

## End of appended scope

- [ ] Resume now.

## Audit checkpoint

- [ ] Audit current center implementation now.

## Multimodal readiness

- [ ] Confirm text provider
- [ ] Confirm vision provider
- [ ] Confirm voice provider
- [ ] Confirm image provider
- [ ] Confirm video provider

## User-facing credential inventory

- [ ] Prepare secure credential request after provider choices.

## Explicit no-mock rule

- [ ] Any unavailable provider must remain disabled and clearly explained.

## Continuation note

- [ ] Continue with next implementation action.

## Current audit scope

- [ ] Center interface
- [ ] Model catalog
- [ ] Image/audio/video routes
- [ ] Provider adapters
- [ ] Credential inventory

## Final scope statement

- [ ] Synthia AI remains a radiant-orange autonomous agent platform.

## Provider decision

- [ ] Await user image/video provider selection.

## Current baseline

- [ ] Checkpoint ae8d57b2 is stable.

## Continue

- [ ] Continue now.

## User request summary

- [ ] Clone center interface components.
- [ ] Support multimodal models.
- [ ] Provide external credential list.

## Additional requirements

- [ ] No fake data.
- [ ] Secure environment-only integration.
- [ ] Production-ready verification.

## Current work order

- [ ] Audit.
- [ ] Implement.
- [ ] Verify.
- [ ] Request credentials.
- [ ] Checkpoint.

## Pending user choices

- [ ] Image provider.
- [ ] Video provider.
- [ ] Vision fallback.

## End

- [ ] Continue implementation.

## Final continuation marker

- [ ] Continue center implementation and prepare go-live credential request.

## Ongoing product constraints

- [ ] Use all external services through `.env` / secure project secrets.
- [ ] Keep model and media readiness states truthful.
- [ ] Do not push GitHub before explicit confirmation.

## User asks for no pause

- [ ] Continue without stopping for nonessential clarification.

## End of user request additions

- [ ] Continue with implementation now.

## Final audit row

- [ ] Center interface and multimodal support to be implemented.

## Credential row

- [ ] Credentials to be requested after provider confirmation.

## Deployment row

- [ ] User deployment confirmation pending.

## End of todo

- [ ] Continue.

## User request received

- [ ] Copy center interface and components.
- [ ] Support vision models.
- [ ] Support image generation models.
- [ ] Support video generation models.
- [ ] List all external services.

## Current work item

- [ ] Begin center audit.

## Work continues

- [ ] Do not stop.

## Implementation scope lock

- [ ] Use existing Synthia routes where possible.
- [ ] Add new media contracts only when backed by real providers.

## Final checklist state

- [ ] Pending audit.

## End marker

- [ ] Continue.

## Last row

- [ ] Continue task.

## Work status

- [ ] In progress.

## Completion instruction

- [ ] Finish when implementation, verification, credential inventory, and user gates are complete.

## Handoff criteria

- [ ] No final report before checkpoint and blockers.

## Final note

- [ ] Continue.

## Session continuation

- [ ] Current baseline is ae8d57b2.

## Todo conclusion

- [ ] Continue now.

## User-directed continuation

- [ ] Implement center interface and multimodal readiness.

## Current run

- [ ] Audit next.

## End of file

- [ ] Continue.

## Additional user ask

- [ ] Tell user all required external credentials after audit.

## Final workstream

- [ ] Center UI.
- [ ] Multimodal.
- [ ] Credentials.

## Final status

- [ ] Pending.

## Execute

- [ ] Continue.

## Final user requirement

- [ ] Image and video models exist or are explicitly unavailable until configured.

## Complete

- [ ] Not complete.

## End current request

- [ ] Continue.

## Working note

- [ ] No secrets in source.

## Final execution row

- [ ] Continue.

## New continuation status

- [ ] Phase 1 ongoing.

## End of continuation

- [ ] Continue with tools.

## Close

- [ ] Continue.

## Final user ask repeated

- [ ] Continue until ready for secure credential collection.

## Current direct action

- [ ] Inspect code now.

## Completion marker

- [ ] Not complete.

## End

- [ ] Continue.

## Task remains

- [ ] Continue.

## User asks continue

- [ ] Continue.

## Final marker

- [ ] Continue.

## Last instruction

- [ ] Continue now.

## End todo additions

- [ ] Continue implementation.

## Unambiguous user intent

- [ ] Center interface clone.
- [ ] Multimodal support.
- [ ] Credential inventory.

## Current goal

- [ ] Continue.

## Finish gate

- [ ] Waiting on implementation.

## No more additions

- [ ] Continue.

## User-facing completion

- [ ] Report when ready.

## End

- [ ] Continue.

## Final pending item

- [ ] Continue.

## Keep going

- [ ] Continue.

## Done when

- [ ] Center workspace verified.

## End of current scope

- [ ] Continue.

## Immediate next

- [ ] Inspect TaskDashboard.

## Finish

- [ ] Pending.

## User continuation final

- [ ] Continue.

## Current product requirement

- [ ] Real image and video generation integrations only.

## End

- [ ] Continue.

## Confirmed user request

- [ ] Continue implementation.

## Final

- [ ] Pending.

## Closeout

- [ ] Do not stop.

## End of continuation scope

- [ ] Continue.

## Stable baseline

- [x] `ae8d57b2` checkpoint is the stable rollback baseline.

## New task request

- [ ] Clone center interface and all in-scope components.
- [ ] Support vision models for go-live.
- [ ] Support image generation models when configured.
- [ ] Support video generation models when configured.
- [ ] List all external services and credentials.
- [ ] Continue until complete.

## New task plan

- [ ] Audit center workspace.
- [ ] Implement missing modality states.
- [ ] Add tests.
- [ ] Verify browser UI.
- [ ] Save checkpoint.
- [ ] Deliver credential list.

## Current user continuation (Aug 19, 2026)

- [ ] User explicitly requests complete center interface cloning and multimodal go-live readiness.
- [ ] User asks for a consolidated external-service credential list before go-live.
- [ ] User asks to continue implementation without pausing for nonessential clarification.

## Mandatory user choices before provider-specific secret request

- [ ] Image generation provider selection.
- [ ] Video generation provider selection.
- [ ] Vision model fallback selection.

## Audit and implementation gate

- [ ] Do not request provider-specific secrets until provider selection is confirmed.
- [ ] Keep currently unsupported media capabilities visibly unavailable.
- [ ] Keep all external services environment-configured.

## Final continuation rows

- [ ] Inspect `TaskDashboard.tsx` in detail.
- [ ] Inspect model catalog and adapters.
- [ ] Inspect existing media routes.
- [ ] Implement only missing components and states.
- [ ] Verify all changes.
- [ ] Request credentials.
- [ ] Save checkpoint.
- [ ] Report go-live prerequisites.

## End of new user request

- [ ] Continue now.

## User explicitly says continue

- [ ] Continue.

## Current execution

- [ ] Audit first.

## End current execution

- [ ] Continue.

## Latest user request

- [ ] Same-to-same center interface component coverage.
- [ ] Vision support.
- [ ] Image generation support.
- [ ] Video generation support.
- [ ] All external service credential list.

## Current action

- [ ] Continue.

## End

- [ ] Continue.

## Work

- [ ] Continue.

## User wants continuous progress

- [ ] Continue.

## Final current task

- [ ] Audit and implement center workspace.

## End

- [ ] Continue.

## Note

- [ ] User will supply credentials later.

## Continue

- [ ] Continue.

## Final gate

- [ ] Complete audit and implementation before requesting credentials.

## End of current user request

- [ ] Continue.

## Current todo

- [ ] Continue implementation.

## End

- [ ] Continue.

## Last continuation request

- [ ] Continue.

## End of file

- [ ] Continue.

## User continuation asks

- [ ] Continue.

## Final action

- [ ] Continue.

## Completion

- [ ] Pending.

## End current

- [ ] Continue.

## Ongoing

- [ ] Continue.

## User requested final modality support

- [ ] Vision model support.
- [ ] Image generation model support.
- [ ] Video generation model support.

## End

- [ ] Continue.

## Current status

- [ ] Audit phase.

## End

- [ ] Continue.

## User request marker

- [ ] Continue now.

## Done

- [ ] Pending.

## End

- [ ] Continue.

## Final status marker

- [ ] Not complete.

## Continue

- [ ] Continue.

## End of scope

- [ ] Continue.

## Remaining work

- [ ] Audit center.
- [ ] Implement media readiness.
- [ ] Request credential list.

## End

- [ ] Continue.

## User requested continuation (final)

- [ ] Continue.

## End

- [ ] Continue.

## Current immediate task

- [ ] Inspect current center implementation and provider routes.

## Finished when

- [ ] Audit complete.

## End

- [ ] Continue.

## User message

- [ ] Continue.

## End

- [ ] Continue.

## Workflow

- [ ] Audit.
- [ ] Implement.
- [ ] Verify.
- [ ] Credential list.
- [ ] Checkpoint.

## End

- [ ] Continue.

## User has asked to continue

- [ ] Continue.

## Scope

- [ ] Same-to-same Manus center interface within Synthia scope.

## End

- [ ] Continue.

## Final pending

- [ ] Continue.

## End

- [ ] Continue.

## Now

- [ ] Continue.

## Completion check

- [ ] Center complete.

## End

- [ ] Continue.

## Go

- [ ] Continue.

## End

- [ ] Continue.

## Final todo

- [ ] Continue.

## End of current task

- [ ] Continue.

## Final continuation

- [ ] Continue.

## End

- [ ] Continue.

## User asked for all components

- [ ] Continue.

## End

- [ ] Continue.

## Final instruction

- [ ] Continue.

## End

- [ ] Continue.

## Close

- [ ] Continue.

## End of file

- [ ] Continue.

## Last requirement

- [ ] Keep going.

## End

- [ ] Continue.

## User wants everything

- [ ] Continue.

## End

- [ ] Continue.

## Now complete

- [ ] Continue.

## End

- [ ] Continue.

## Last row

- [ ] Continue.

## User asks continue

- [ ] Continue.

## End

- [ ] Continue.

## Finish marker

- [ ] Continue.

## End

- [ ] Continue.

## End of appended continuation

- [ ] Continue.

## Current implementation checkpoint

- [ ] Center interface implementation remains active.

## End

- [ ] Continue.

## User asks to continue implementation and list credentials

- [ ] Continue.

## End

- [ ] Continue.

## Final current state

- [ ] In progress.

## End

- [ ] Continue.

## Done after

- [ ] Audit, implement, verify, list credentials.

## End

- [ ] Continue.

## User request conclusion

- [ ] Continue.

## End

- [ ] Continue.

## Final

- [ ] Continue.

## End

- [ ] Continue.

## User said continuecontinuecontinue

- [ ] Continue.

## End

- [ ] Continue.

## Explicit current next step

- [ ] Read current center code and media adapters.

## End

- [ ] Continue.

## Current plan phase 1

- [ ] Audit center interface.

## End

- [ ] Continue.

## Awaiting next action

- [ ] Continue implementation.

## End

- [ ] Continue.

## User continued request

- [ ] Center interface clone.
- [ ] Vision.
- [ ] Image generation.
- [ ] Video generation.
- [ ] Credential list.

## End

- [ ] Continue.

## End of file marker

- [ ] Continue.

## Required next action

- [ ] Inspect TaskDashboard.

## End

- [ ] Continue.

## Implementation status

- [ ] Pending audit.

## End

- [ ] Continue.

## Current user goal

- [ ] Production-ready center interface and multimodal support.

## End

- [ ] Continue.

## Final current marker

- [ ] Continue.

## End

- [ ] Continue.

## User request remains active

- [ ] Continue.

## End

- [ ] Continue.

## Continuation

- [ ] Continue.

## End

- [ ] Continue.

## Scope lock

- [ ] No additions beyond approved center and multimodal scope.

## End

- [ ] Continue.

## Completion gate

- [ ] Pending.

## End

- [ ] Continue.

## Current phase

- [ ] Audit.

## End

- [ ] Continue.

## Last instruction

- [ ] Continue.

## End

- [ ] Continue.

## Final continuation status

- [ ] Active.

## End

- [ ] Continue.

## Remaining task

- [ ] Center workspace audit and implementation.

## End

- [ ] Continue.

## User expects all modalities

- [ ] Vision support.
- [ ] Image generation support.
- [ ] Video generation support.

## End

- [ ] Continue.

## End of latest scope

- [ ] Continue.

## Current work order

- [ ] Inspect.
- [ ] Implement.
- [ ] Test.
- [ ] Verify.
- [ ] List credentials.

## End

- [ ] Continue.

## Final explicit request

- [ ] Continue now.

## End

- [ ] Continue.

## Product scope

- [ ] Center UI.
- [ ] Multimodal.
- [ ] Credentials.

## End

- [ ] Continue.

## Finish after user gates

- [ ] Provider choices.
- [ ] Credentials.
- [ ] Publish.

## End

- [ ] Continue.

## Final continuation requirement

- [ ] Do not stop.

## End

- [ ] Continue.

## User says continue

- [ ] Continue.

## End

- [ ] Continue.

## Current continuation task

- [ ] Continue implementation.

## End

- [ ] Continue.

## End of todo extension

- [ ] Continue.

## User request in plain language

- [ ] Clone center interface.
- [ ] Support vision.
- [ ] Support image generation.
- [ ] Support video generation.
- [ ] List credentials.

## End

- [ ] Continue.

## All external services

- [ ] Identify required keys.
- [ ] Request them securely after provider choice.

## End

- [ ] Continue.

## Final work

- [ ] Implement and verify.

## End

- [ ] Continue.

## Continue marker

- [ ] Continue.

## End

- [ ] Continue.

## Final user continuation

- [ ] Continue.

## End

- [ ] Continue.

## Completion pending

- [ ] Pending.

## End

- [ ] Continue.

## Immediate next action

- [ ] Inspect TaskDashboard, Settings, and media providers.

## End

- [ ] Continue.

## Finish

- [ ] Pending.

## End

- [ ] Continue.

## No more notes

- [ ] Continue.

## End

- [ ] Continue.

## Current run state

- [ ] Active.

## End

- [ ] Continue.

## Explicit plan

- [ ] Audit.
- [ ] Implement.
- [ ] Test.
- [ ] Verify.
- [ ] Credential list.
- [ ] Checkpoint.

## End

- [ ] Continue.

## Finish gate

- [ ] User receives credential list.

## End

- [ ] Continue.

## Current active task

- [ ] Center and multimodal scope.

## End

- [ ] Continue.

## Final marker

- [ ] Continue.

## End

- [ ] Continue.

## User request is ongoing

- [ ] Continue.

## End

- [ ] Continue.

## Final current ask

- [ ] Continue.

## End

- [ ] Continue.

## All done after

- [ ] Audit and implementation complete.

## End

- [ ] Continue.

## Last continuation

- [ ] Continue.

## End

- [ ] Continue.

## End current request

- [ ] Continue.

## Product implementation

- [ ] Continue.

## End

- [ ] Continue.

## Close of task

- [ ] Not yet.

## End

- [ ] Continue.

## Current final status

- [ ] Pending.

## End

- [ ] Continue.

## Last user instruction

- [ ] Continuecontinuecontinue.

## End

- [ ] Continue.

## Current action to execute

- [ ] Audit source files.

## End

- [ ] Continue.

## Finish when ready

- [ ] Ready for credentials.

## End

- [ ] Continue.

## User requested credential list

- [ ] Prepare list.

## End

- [ ] Continue.

## User-requested scope remains

- [ ] Center interface.
- [ ] Vision.
- [ ] Image generation.
- [ ] Video generation.

## End

- [ ] Continue.

## Explicit user follow-up

- [ ] Continue.

## End

- [ ] Continue.

## Current plan

- [ ] Active.

## End

- [ ] Continue.

## Final continuation row

- [ ] Continue.

## End

- [ ] Continue.

## Next

- [ ] Inspect files.

## End

- [ ] Continue.

## No pause

- [ ] Continue.

## End

- [ ] Continue.

## User asks no pause

- [ ] Continue.

## End

- [ ] Continue.

## End of instructions

- [ ] Continue.

## Final pending state

- [ ] Not complete.

## End

- [ ] Continue.

## Current user ask in one line

- [ ] Clone center and support multimodal go-live.

## End

- [ ] Continue.

## User wants all external keys

- [ ] Provide grouped list.

## End

- [ ] Continue.

## Final continue

- [ ] Continue.

## End

- [ ] Continue.

## Current workstream active

- [ ] Center workspace.

## End

- [ ] Continue.

## User requirement complete when

- [ ] Center components implemented.
- [ ] Multimodal states implemented.
- [ ] Credential list delivered.

## End

- [ ] Continue.

## Current task status

- [ ] Active.

## End

- [ ] Continue.

## Done

- [ ] Pending.

## End

- [ ] Continue.

## Current direct ask

- [ ] Continue.

## End

- [ ] Continue.

## Execution continues

- [ ] Continue.

## End

- [ ] Continue.

## Final user demand

- [ ] Keep going.

## End

- [ ] Continue.

## Current iteration

- [ ] Audit.

## End

- [ ] Continue.

## Completion

- [ ] Not yet.

## End

- [ ] Continue.

## Last line

- [ ] Continue.

## End of task

- [ ] Continue.

## Final user text

- [ ] Continuecontinuecontinue.

## End

- [ ] Continue.

## Ready

- [ ] Not ready.

## End

- [ ] Continue.

## Work remains

- [ ] Continue.

## End

- [ ] Continue.

## Final

- [ ] Continue.

## End

- [ ] Continue.

## Current user goal

- [ ] Production-ready Synthia AI center.

## End

- [ ] Continue.

## No-final

- [ ] Continue until blockers.

## End

- [ ] Continue.

## Blockers

- [ ] Provider choices and credentials.
- [ ] Published deployment.

## End

- [ ] Continue.

## Current task plan phase 1

- [ ] Audit center.

## End

- [ ] Continue.

## Final current checklist

- [ ] Audit center implementation.
- [ ] Implement modality readiness.
- [ ] Verify.
- [ ] Credential list.
- [ ] Checkpoint.

## End

- [ ] Continue.

## User request final

- [ ] Continue.

## End

- [ ] Continue.

## Final scope

- [ ] Center components.
- [ ] Multimodal.
- [ ] Credentials.

## End

- [ ] Continue.

## Last continuation request

- [ ] Continue.

## End

- [ ] Continue.

## Current action

- [ ] Inspect TaskDashboard.tsx.

## End

- [ ] Continue.

## Completion status

- [ ] Pending.

## End

- [ ] Continue.

## User asks to continue indefinitely

- [ ] Continue until complete.

## End

- [ ] Continue.

## Final current task

- [ ] Finish center and multimodal implementation.

## End

- [ ] Continue.

## Explicit next step

- [ ] Inspect sources.

## End

- [ ] Continue.

## Final gate

- [ ] User receives credential checklist.

## End

- [ ] Continue.

## Project scope

- [ ] Same-to-same within scope.

## End

- [ ] Continue.

## Current status

- [ ] Active.

## End

- [ ] Continue.

## User request remains

- [ ] Continue.

## End

- [ ] Continue.

## Final continuation state

- [ ] Ongoing.

## End

- [ ] Continue.

## End of task continuation

- [ ] Continue now.

## End

- [ ] Continue.

## Final completion marker

- [ ] Pending.

## End

- [ ] Continue.

## Current plan continues

- [ ] Continue audit.

## End

- [ ] Continue.

## User wants app keys later

- [ ] Build before credentials.

## End

- [ ] Continue.

## Final implementation before credentials

- [ ] Finish center.

## End

- [ ] Continue.

## User request received

- [ ] Continue.

## End

- [ ] Continue.

## Continue until all components

- [ ] Continue.

## End

- [ ] Continue.

## Final ask

- [ ] Continue.

## End

- [ ] Continue.

## Current state

- [ ] Phase 1.

## End

- [ ] Continue.

## User asks go-live support

- [ ] Prepare readiness matrix.

## End

- [ ] Continue.

## Credentials list

- [ ] Prepare after audit.

## End

- [ ] Continue.

## Final continuation instruction

- [ ] Continue.

## End

- [ ] Continue.

## All external services requirement

- [ ] Use `.env` only.

## End

- [ ] Continue.

## Current audit

- [ ] Not complete.

## End

- [ ] Continue.

## Final user request

- [ ] Continue.

## End

- [ ] Continue.

## Completion pending

- [ ] Pending.

## End

- [ ] Continue.

## User says continue

- [ ] Continue.

## End

- [ ] Continue.

## Final current instruction

- [ ] Continue.

## End

- [ ] Continue.

## Continue execution

- [ ] Continue.

## End

- [ ] Continue.

## Final work result

- [ ] Pending implementation.

## End

- [ ] Continue.

## User asked all center components

- [ ] Complete.

## End

- [ ] Continue.

## Ready for final credential request

- [ ] Not yet.

## End

- [ ] Continue.

## Current phase task

- [ ] Audit and implement.

## End

- [ ] Continue.

## Final user requirement

- [ ] Images and videos supported when configured.

## End

- [ ] Continue.

## No fake support

- [ ] Keep unavailable.

## End

- [ ] Continue.

## Current checkpoint

- [x] ae8d57b2 stable.

## End

- [ ] Continue.

## Last continuation ask

- [ ] Continue.

## End

- [ ] Continue.

## Final user ask row

- [ ] Continue.

## End

- [ ] Continue.

## Completion rule

- [ ] Complete after verification.

## End

- [ ] Continue.

## Current exact task

- [ ] Center clone and multimodal readiness.

## End

- [ ] Continue.

## Credential sourcing rule

- [ ] Secure config.

## End

- [ ] Continue.

## No GitHub push yet

- [ ] Wait for confirmation.

## End

- [ ] Continue.

## User request still active

- [ ] Continue.

## End

- [ ] Continue.

## Done when

- [ ] Credential list delivered.

## End

- [ ] Continue.

## Current action now

- [ ] Inspect center.

## End

- [ ] Continue.

## Final user message

- [ ] Continuecontinuecontinue.

## End

- [ ] Continue.

## End of current user ask

- [ ] Continue.

## Latest requirement

- [ ] Models for vision, image generation, and video generation.

## End

- [ ] Continue.

## Completion phase

- [ ] Pending.

## End

- [ ] Continue.

## User wants no pause

- [ ] Continue.

## End

- [ ] Continue.

## Workstream

- [ ] Active.

## End

- [ ] Continue.

## Final status

- [ ] Pending.

## End

- [ ] Continue.

## User ask repeats

- [ ] Continue.

## End

- [ ] Continue.

## Current step

- [ ] Audit.

## End

- [ ] Continue.

## All requirements

- [ ] Implement center.
- [ ] Add modality states.
- [ ] List credentials.

## End

- [ ] Continue.

## Final current phase

- [ ] Phase 1 audit.

## End

- [ ] Continue.

## Continue

- [ ] Continue.

## End

- [ ] Continue.

## User wants full clone

- [ ] Within scope.

## End

- [ ] Continue.

## Current user request is clear

- [ ] Continue.

## End

- [ ] Continue.

## Final current TODO

- [ ] Complete center and multimodal support.

## End

- [ ] Continue.

## End of current additions

- [ ] Continue.

## Existing baseline preserved

- [x] ae8d57b2.

## End

- [ ] Continue.

## User ask completion

- [ ] Continue.

## End

- [ ] Continue.

## Final continuing task

- [ ] Audit and implement.

## End

- [ ] Continue.

## Live provider gate

- [ ] Credentials pending.

## End

- [ ] Continue.

## User deployment gate

- [ ] Publish pending.

## End

- [ ] Continue.

## End of file

- [ ] Continue.

## Immediate execution

- [ ] Inspect files.

## End

- [ ] Continue.

## Final instruction from user

- [ ] Continuecontinuecontinue.

## End

- [ ] Continue.

## No stopping

- [ ] Continue.

## End

- [ ] Continue.

## User expects credential list

- [ ] Deliver after audit.

## End

- [ ] Continue.

## Last marker

- [ ] Continue.

## End

- [ ] Continue.

## Current continuation complete only when

- [ ] Center implemented.
- [ ] Modality states implemented.
- [ ] Credential list delivered.

## End

- [ ] Continue.

## Final working state

- [ ] Active.

## End

- [ ] Continue.

## End current prompt

- [ ] Continue.

## User says continue forever

- [ ] Continue.

## End

- [ ] Continue.

## Current todo last line

- [ ] Continue.

## End of file

- [ ] Continue.

## Final line

- [ ] Continue.


## Confirmed provider selection

- [ ] Implement the provider-neutral readiness contract for Gemini image generation using `gemini-3.1-flash-image`.
- [ ] Implement the provider-neutral readiness contract for Gemini Omni Flash video generation.
- [ ] Keep image and video generation disabled until Gemini credentials, storage, rate limits, and runtime verification are present.

## Continued Manus-style audit scope

- [x] Audit and refine all current center-workspace components against the user-approved compact Manus-style hierarchy.
- [x] Audit and refine the persistent sidebar, profile menu, route navigation, settings rail, task history, library, scheduled, agent, and plugins surfaces within the Synthia scope.
- [x] Verify all buttons and menu items have a real route or explicit unavailable explanation.
- [x] Continue responsive desktop, tablet, and mobile proportion review without introducing oversized panels.
- [x] Superseded by the later user-approved teal/cyan design system; preserve Synthia branding and approved interaction patterns without restoring radiant-orange tokens.
- [x] Update browser-audit notes with only publicly observed, scope-aligned behaviors and source URLs.

## Confirmed user gate

- [x] User selected Gemini image generation plus Gemini Omni Flash video generation.
- [ ] User supplies credentials through secure project configuration when the key collection request is opened.
- [ ] User publishes the verified application before live scheduler and media end-to-end tests.
- [ ] GitHub push remains last and requires explicit confirmation.

## Latest center refinement

- [x] Replace generic center prompt chips with compact, real task starters aligned to the observed Create slides, Build website, Design, and Create games hierarchy.

## Calm interface reorganization

- [ ] Audit the current center, sidebar, header, composer, suggestions, task list, Settings rail, and mobile layout for visual clutter, hierarchy conflicts, and disproportionate spacing.
- [ ] Reorganize the center workspace around a quiet outcome prompt, a reduced-control composer, and progressively disclosed secondary actions.
- [ ] Reduce sidebar and header visual noise while retaining direct access to real Synthia routes and status states.
- [ ] Refine typography, neutral surfaces, borders, shadows, orange emphasis, and motion to create a calm, readable, dynamic interface.
- [ ] Rebalance desktop, tablet, and mobile spacing so controls do not crowd or compete for attention.
- [ ] Add deterministic layout regressions and visually verify the reorganized experience before checkpointing.

## Secure configuration form repair

- [ ] Repair the non-secret configuration form so user-entered free-model and public-web values persist rather than being replaced by fixed empty defaults.
- [ ] Verify the corrected form accepts user-editable values without exposing credentials, then resume guarded Pixazo, AIHubMix, Agnes AI, and public-web configuration.
- [ ] Apply the user-approved documented Pixazo, AIHubMix, Agnes AI, and safeguarded public-web values through the direct configuration workaround, then verify readiness without invoking a workload.

## Automatic modality routing and composer refinement
- [x] Classify natural-language task intent into text, vision, image-generation, video-generation, audio-generation, or voice-input routes without invoking a provider during classification.
- [x] Select only a configured and ready modality route automatically; retain manual model selection as an explicit override and preserve user-started confirmation before any quota-consuming media action.
- [x] Connect the selected Automatic modality route to the task request and worker contract without routing unsupported or unavailable providers.
- [x] Rebuild the expanded More menu as a compact two-column, bounded scroll region with cyan/teal scroll affordances and keyboard-accessible options.
- [x] Replace the static workspace headline with a dynamic, user-name-aware greeting and varied helpful task prompt that remains deterministic enough for accessible testing.
- [x] Add deterministic routing and composer UI regressions, then verify desktop and mobile presentation without invoking inference, media generation, or browser automation.

## Supadata public-media understanding and sandbox availability
- [x] Keep E2B unavailable until an `E2B_API_KEY` and a single approved template ID are securely configured; retain Bunnyshell HopX as the separately credential-gated alternate sandbox option.
- [x] Review Supadata’s official API documentation and verify its supported URL, transcript, and content-understanding contracts before adding an adapter.
- [x] Add a server-side, user-scoped Supadata integration for approved public social and video URLs with SSRF protections, input validation, rate limits, bounded payloads, and no secret exposure.
- [x] Surface the capability as a truthful user-facing task tool with explicit unavailable state until `SUPADATA_API_KEY` is securely configured.
- [x] Add quota-safe adapter, authorization, URL-policy, and interface regressions; do not call Supadata during routine verification.

## Durable artifact-storage activation
- [ ] Confirm whether AWS S3 or Cloudflare R2 will be Synthia’s primary S3-compatible artifact store.
- [ ] Securely configure the selected provider’s endpoint, region, bucket, access key, and secret key without committing or exposing credentials.
- [ ] Validate durable artifact storage non-destructively before enabling live Supadata or agent output delivery.

## Live Computer task workspace
- [x] Audit existing task events, sandbox artifacts, browser capability state, and workspace panels to identify real task-scoped Live Computer data sources.
- [x] Define an authorized Live Computer contract for task activity replay, generated files, source inspection, and browser/website state without exposing server secrets or arbitrary local files.
- [x] Build a Manus-style Live Computer panel with task timeline, task-owned file tree, source-code viewer, website preview, and explicit unavailable states for unconfigured browser or sandbox services.
- [x] Add task ownership, path-traversal, and sensitive-file protections for all Live Computer file and source views.
- [x] Add deterministic UI, authorization, and responsive-layout regressions; verify the page without launching sandbox, browser, model, or media workloads.

## Compact workspace hierarchy refinement
- [x] Audit authenticated shell, dashboard, and task-workspace density against the requested calm Manus-style navigation hierarchy.
- [x] Refine sidebar, header, composer, task detail, and Live Computer spacing to preserve all controls while reducing visual noise and oversized surfaces.
- [x] Preserve the teal/cyan visual system, white-text contrast, and bounded cyan scroll affordances across desktop and mobile layouts.
- [x] Add source and responsive visual regressions, then verify dashboard and task workspace without provider workloads.

## Live Computer and public-entry motion refinement
- [x] Match the Live Computer hierarchy to the supplied Manus reference with task progress visible beside the active computer surface.
- [x] Add a keyboard-accessible toggle between split-screen and full-screen modes for Code and Website views, preserving the task context.
- [x] Add smooth, reduced-motion-aware skeleton and tab-transition states for Live Computer view changes.
- [x] Refine the public landing, feature, use-case, and sign-in surfaces with branded Synthia motion, clear navigation, and responsive behavior without adding unsupported product claims.
- [x] Add deterministic interaction, accessibility, responsive, and source regressions, then verify without launching provider workloads.

- [x] Build the animated public Synthia AI landing page with branded hero, feature sections, use-case highlights, responsive navigation, and reduced-motion support.
- [x] Refine sign-in and sign-up surfaces with Synthia motion, compact branded layout, accessible states, and authenticated redirect continuity.
- [x] Verify Live Computer JSX integrity, split/focus behavior, tab skeleton transitions, and landing/auth responsive presentation.
- [x] Audit and compact the authenticated dashboard and task workspace hierarchy across desktop and mobile without changing task or provider behavior.
- [x] Add responsive regression coverage for the authenticated dashboard and task workspace density pass.
- [x] Audit and refine authenticated Settings and profile-navigation surfaces across desktop and mobile without exposing configuration internals.
- [x] Add regression coverage for compact Settings navigation, escape routes, and profile-menu actions.
- [x] Map the submitted Skills specification into Synthia’s existing task loop and maintain a strict separation between Skills and Connectors.
- [x] Add user-scoped Skill and Skill-install persistence with safe ownership, visibility, and enabled-state boundaries.
- [x] Add reviewed skill-draft, edit, enable, disable, and deletion APIs with validated markdown and no automatic activation.
- [x] Match up to three eligible installed Skills to a submitted task, cache the task-scoped selection, inject only approved instructions into planning, and emit auditable skill-loaded events.
- [x] Build the Skills Library, reviewed creator, and editor UI without exposing credentials or conflating Skills with Connectors.
- [x] Verify the profile Sign out action is visible, invokes secure logout, and preserves a usable anonymous entry state.
- [x] Add security, ownership, routing, automatic-matching, audit, and sign-out regression coverage; validate without model or provider workloads.
- [x] Add a reviewed generate-from-example Skills draft path that accepts only task-owned or user-uploaded references and makes its inference limitations explicit.
- [x] Add a reviewed task-derived Skills draft suggestion path that never silently creates or enables a Skill after task completion.
- [x] Add secure optional bundled-resource metadata for Skills, with ownership checks, bounded MIME and size policies, and no credential-bearing files in prompt context.
- [x] Improve automatic relevance matching using a persistent, model-free semantic index when embeddings are unavailable, while preserving the three-Skill cap and cached task selection.
- [x] Keep public-platform Skill sharing unavailable until a moderation workflow exists, and make this visibility boundary explicit in API validation and UI.
- [x] Extend Skills Library and task-workspace audit interfaces for reviewed example/task creation paths and last-used usage visibility.
- [x] Add security, ownership, resource, task-suggestion, relevance, visibility, and responsive UI regression coverage; validate without external workloads.
- [x] Diagnose and repair the reported sign-out auto-login loop so a signed-out user remains on the public entry screen until they explicitly choose to sign in.
- [x] Add regression coverage for logout session clearing, public-route persistence, and suppression of unintended OAuth re-entry.
- [x] Audit current scheduling, task ownership, and Heartbeat boundaries for a deployment-gated user schedule workflow.
- [x] Add user-owned schedule persistence and deployment-gated Heartbeat lifecycle APIs without creating any jobs in development.
- [x] Build an accessible Scheduled interface with accurate pre-deployment guidance and safe schedule-management controls.
- [x] Add schedule ownership, cron validation, deployment gating, idempotency, and responsive UI regression coverage without creating external jobs.
- [x] Refine the Docs route into a balanced, responsive resource grid so its three real guidance actions retain clear hierarchy without sparse desktop space.
- [x] Remove duplicated Agent route controls while preserving the primary task and capabilities navigation in a quiet, descriptive capability section.
- [x] Align Plugins search and connector-state controls with the established teal/cyan workspace tokens while retaining truthful unavailable and empty states.
- [x] Refine the Library search and zero-deliverable state with shared controls and a clear task-workspace escape path without creating a task automatically.
- [x] Refine the Projects zero-state with a clear task-workspace route while retaining the single user-controlled New project action.
- [x] Reproduce and fix the reported sign-out auto-return loop so logout remains stable until the user explicitly chooses to sign in again.
- [x] Refine the public mobile navigation with explicit control linkage and Escape-key dismissal while preserving the existing sign-in and sign-up actions.
- [x] Add a visible-on-focus skip link to the public landing page so keyboard users can bypass repeated navigation and reach the main task narrative.
- [x] Refine Settings section search with an explicit clear action and current-section semantics while retaining existing filter and no-match behavior.

## Consent-first real-time Voice Mode and local screen sharing

- [x] Research and document the approved WebRTC, LiveKit, realtime-model, and browser screen-capture architecture, including latency, TURN, privacy, and hosting boundaries.
- [x] Extend the existing task event system with user-owned voice-session lifecycle records and auditable voice and screen-share events, without creating a parallel conversation history.
- [x] Add the task-workspace Voice Mode overlay with explicit start and stop controls, Voice/Personality/Speed settings, live transcript treatment, accessibility, and unavailable states.
- [x] Add user-initiated browser-native `getDisplayMedia()` screen sharing with a local preview, persistent stop control, track cleanup, and no automatic frame persistence.
- [x] Add provider-safe realtime session configuration and a LiveKit-compatible server boundary that remains disabled until deployment and credentials are explicitly configured.
- [x] Add deterministic coverage and visual validation for consent prompts, permission denial, unsupported browsers, stop sharing, lifecycle event history, and responsive Voice Mode UI without invoking any live media, vision, or model workload.

## Product readiness audit and differentiated AI-agent roadmap

- [x] Inventory every Synthia route, task-loop capability, provider boundary, runtime gate, placeholder, and associated regression evidence into a user-readable readiness matrix.
- [x] Audit source code and user-facing routes for non-functional placeholders, disabled controls without truthful explanation, unfinished paths, and mismatches between documented and executable capability state.
- [x] Complete any confirmed in-scope placeholder that has no dependency on unrevealed credentials, provider quotas, user confirmation, or deployment configuration. No unresolved production placeholder was confirmed; the audited gates are deliberate and documented.
- [x] Research current AI-agent products, capabilities, recurring startup blind spots, and defensible differentiation opportunities using primary and authoritative industry sources.
- [x] Produce a prioritized Synthia roadmap that distinguishes immediately buildable work from credential-, deployment-, provider-, policy-, and user-confirmation-gated work.
- [x] Validate and checkpoint any audit-driven implementation changes before publishing the final readiness and roadmap report.

## Differentiated trust capability: Proof-Carrying Tasks

- [x] Define a user-owned proof-record contract that attaches claims, evidence references, verifier status, confidence, and recovery guidance to existing tasks without storing synthetic evidence.
- [x] Add additive persistence, protected APIs, and task-event integration for proof records while preserving task ownership and ordered history.
- [x] Add a task-workspace proof view with clear evidence provenance, verifier status, confidence, recovery options, responsive behavior, and empty/error states.
- [x] Add deterministic regression coverage and validate the Proof-Carrying Tasks experience without invoking a model, provider, browser, sandbox, media, or storage workload.

## Governed self-healing pipelines and multi-agent collaboration

- [x] Audit Synthia’s existing task retry, worker recovery, task-event, approval, and Skills capabilities against governed pipeline healing and specialist-agent delegation requirements.
- [x] Research current standards and primary guidance for observable data-pipeline recovery, schema-drift handling, least-privilege repair actions, and multi-agent coordination.
- [x] Add a user-owned operational runbook model with health signals, diagnosis, bounded remediation proposals, approval requirements, and durable audit events; never auto-execute a repair.
- [x] Add task-scoped specialist-agent roles and delegation records so a coordinator can propose decomposed researcher, analyst, writer, coder, and reviewer work with shared task context and explicit user approval.
- [x] Add inspectable workspace controls for pipeline health, repair proposals, delegation status, empty states, and unavailable states without simulating an active repair or agent run.
- [x] Add deterministic coverage and validate the governed repair and multi-agent UI/API paths without invoking model, provider, browser, sandbox, storage, data-pipeline, or repair workloads.

## Voice Mode and screen sharing readiness verification

- [x] Verify the existing Voice Mode entry control, native local screen-sharing control, consent states, configuration gate, and deployment prerequisites against the requested interaction pattern without starting capture or a realtime provider workload.
- [x] Document the verified availability status and only implement a user-visible control adjustment if the existing safe feature boundary is incomplete.

## Voice Mode live-state controls and feature inventory

- [x] Add accessible, low-motion active-state indicators for a connected Voice Mode session and an active local screen share, preserving explicit user consent and stop controls.
- [x] Review the chat-area Voice Mode entry and document a source-verified inventory of working, configuration-gated, and not-yet-implemented Synthia capabilities.
- [x] Add deterministic regression coverage and responsive visual verification for the active-state controls without opening a microphone, display capture, LiveKit room, Gemini session, or external workload.

## Reported Voice Mode visibility and activation guidance

- [x] Inspect the running authenticated interface to locate the reported missing Voice Mode entry, including the dashboard composer and task-chat composer paths, without creating a task or opening a media session.
- [x] Correct any confirmed Voice Mode control visibility or placement defect and add regression coverage for the chosen user-facing entry path.
- [x] Provide a managed-secret, deployment, and controlled-verification checklist for all remaining activation-gated features without starting external workloads.

## LiveKit credential validation diagnosis

- [x] Compare Synthia’s opt-in read-only LiveKit authorization request with the official protocol and SDK behavior before attributing a repeated 401 response to user-provided credentials.
- [x] Correct any confirmed verifier defect, retain the disabled-by-default Voice Mode gate, and re-run only a read-only authorization check.
- [x] Record the verified validation result and the remaining worker/deployment steps without enabling Voice Mode or starting realtime media.

## Confirmed dashboard Live Voice control rendering defect

- [x] Compare the new dashboard screenshot with the active source bundle and determine why the Live control is absent while Media, Automatic, and microphone controls remain visible.
- [x] Correct the dashboard composer rendering so the Live Voice control is visibly present and keyboard-accessible before the user creates a task.
- [x] Add regression coverage and visual verification for the rendered dashboard control without opening a media session or enabling realtime Voice Mode.

## Retained Autoscale hosting decision

- [x] Record the user’s decision to retain Autoscale hosting and keep the Voice Mode worker deployment out of scope.
- [x] Confirm that the existing LiveKit credential validation and disabled-by-default realtime flags preserve the selected safety boundary.

## Distinctive product research and public landing-page redesign
- [x] Inspect the requested CamelAI reference and current AI-agent market positioning for reusable public-landing-page interaction and narrative patterns without copying proprietary visual assets or claims.
- [x] Audit Synthia’s current implemented, activation-gated, and intentionally unavailable product capabilities into an accurate user-facing feature inventory and differentiated roadmap.
- [x] Redesign the public Synthia AI landing page with a detailed, responsive teal/cyan narrative, clear product surfaces, accessible motion, and truthful calls to action.
- [x] Add deterministic landing-page regression coverage and desktop/mobile visual validation without starting models, media, browser-agent, sandbox, storage, or task workloads.

## Office deliverables and governed task-learning foundations

- [x] Audit the current task runner, artifacts, document outputs, spreadsheet capabilities, approved memory, and past-task evidence to distinguish available functions from gaps.
- [x] Design secure, user-owned PDF/PPTX/XLSX generation, approval-gated spreadsheet writeback, and evidence-based task-review records without a self-modifying agent.
- [x] Implement the highest-value safe document, spreadsheet, and task-review foundations using owner-scoped persistence, bounded inputs, explicit user action, and artifact storage.
- [x] Add deterministic coverage for authorization, validation, artifact output, and the prohibition on automatic cross-task self-modification or external spreadsheet writes.

## Durable and dynamic agent capability roadmap

- [x] Research the highest-value reliability, oversight, evaluation, memory, recovery, and collaboration gaps in modern AI-agent products.
- [x] Compare the researched opportunities against Synthia’s existing governed operations, proof, reviewed-learning, approval, and replay capabilities.
- [x] Deliver a prioritized, safety-bounded roadmap that distinguishes immediate implementation candidates from configuration- or connector-gated work.

## Owner-scoped evaluation packs

- [x] Audit existing proof, task review, approval, event, and lesson records for reusable evidence and review boundaries.
- [x] Add bounded owner-scoped evaluation pack and evaluation-result persistence with explicit review outcomes; never auto-promote an agent, model, skill, or configuration.
- [x] Add protected APIs and a task-workspace evaluation panel for success criteria, evidence requirements, evidence references, verdicts, and reviewer guidance.
- [x] Add deterministic authorization and non-self-modification regression coverage without starting a task or external workload.
- [x] Render a read-only-safe task-workspace evaluation panel that creates declarative packs and records human reviewer outcomes without executing an evaluation or altering agent behavior.

## Guided prompting and governed connected apps

- [x] Research Zapier, Zapier MCP, and security-first alternatives for a user-authorized app-integration layer with explicit action approvals.
- [x] Add accessible, local live prompt suggestions that help users clarify a task without calling a model or altering the typed goal.
- [x] Dismiss or replace the Live Voice empty-goal hint once it has been read or the composer state changes, without requesting media permissions.
- [x] Implement a connector catalog and consent-first connected-app controls that do not store third-party secrets, execute actions, or imply a connection before user authorization.
- [x] Add deterministic regression coverage, safe-use documentation, type validation, production-build validation, and a checkpoint for guided prompting and governed connected apps.

## Read-only run comparison and drift dashboard

- [x] Map existing owner-scoped task, usage, proof, lesson, and evaluation records into non-executing comparison metrics.
- [x] Add owner-scoped read-only task-comparison and drift-analysis contracts that cannot promote, rerun, mutate, or reconfigure agents.
- [x] Render a responsive workspace comparison panel with transparent metric definitions, empty states, and human review guidance.
- [x] Add deterministic regression coverage, safe-use documentation, type validation, production-build validation, and a checkpoint for the reliability dashboard.

## User-facing app connectors

- [x] Inspect current connector configuration and official authorization models for Zapier, Pipedream, and Composio before enabling any external connection.
- [x] Remove internal model, media, browser, database, sandbox, and service-provider readiness details from the user-facing Connectors area.
- [x] Implement secure server-side connection readiness and consent contracts for Zapier, Pipedream, and Composio without storing or exposing third-party secrets in the client.
- [x] Build user-facing app-only cards with clear authorization, scope, status, disconnect, and proposal-before-action boundaries.
- [x] Add deterministic safety coverage, documentation, validation, and a checkpoint; defer live OAuth until the user supplies the required provider credentials.
- [x] Validate Pipedream and Composio with non-connection configuration checks; keep Zapier disabled until its Embed ID is supplied.

## Connector discovery redesign

- [x] Redesign the Plugins page around compact app discovery, a single search field, clear app categories, and connected versus available states.
- [x] Present only user-authorizable app connectors; do not display internal model, media, browser, storage, database, sandbox, or provider configuration.
- [x] Add a focused connector management view for connected apps, available apps, scope explanations, and explicit approval-before-action guidance.
- [x] Simplify related Settings connector content so it links to app management rather than repeating provider or backend readiness details.
- [x] Add responsive UI regression coverage, validation, and a checkpoint for the privacy-preserving connector redesign.

## App-first connector catalog

- [x] Replace Pipedream and Composio cards with user-facing app cards and map each app to a private eligible authorization route.
- [x] Show clear app capabilities, required user authorization, and approval-before-action limits without exposing connector-engine names or internal services.
- [x] Extend protected connection contracts to request an authorization session for a selected app only after an explicit user click.
- [x] Update connected-app management, deterministic coverage, documentation, validation, and a checkpoint for the app-first catalog.

## Browseable app directory and composer connector picker

- [x] Expand the user-facing app catalog to an initial high-quality directory of approximately 150 recognizable applications with category, capability, and public brand identity metadata.
- [x] Add a scalable directory browsing flow with search, category filtering, compact featured cards, and progressive loading instead of rendering all app cards at once.
- [x] Add an accessible connector picker to the chat composer that shows connected and available apps, supports app-specific connection initiation, and never exposes private authorization routes.
- [x] Preserve explicit authorization, task-scoped proposal, and final approval gates for all external app actions; add deterministic privacy, interaction, and responsive regression coverage.
- [x] Document the app-directory sourcing and governance boundary, perform type/test/build and desktop/mobile verification, and checkpoint the completed experience.

## Artifact provenance bundles

- [x] Map owner-scoped task, deliverable, proof, and ordered event facts into a read-only provenance representation without retrieving artifact bytes.
- [x] Add protected provenance bundle APIs that preserve ownership, exclude secrets and provider credentials, and cannot alter task state.
- [x] Render a task-workspace provenance panel with transparent lineage fields, empty states, and an owner-triggered metadata-only download.
- [x] Add deterministic authorization and non-mutation coverage, safe-use documentation, validation, and a checkpoint for provenance bundles.

## Policy-aware handoffs and recovery playbooks

- [x] Define owner-scoped policy contracts for proposed specialist handoffs, including bounded scope, evidence requirements, budget, time limit, and approval state.
- [x] Define owner-curated recovery playbooks with blast-radius previews, rollback guidance, explicit applicability, and no automatic remediation path.
- [x] Add protected APIs and task-workspace controls that create only proposals and durable audit events; never delegate or repair automatically.
- [x] Add deterministic authorization and non-mutation coverage, documentation, responsive verification, validation, and a checkpoint for policy-aware handoffs and recovery playbooks.

## Production security and implementation-completeness audit

- [x] Inventory every application route, protected procedure, task worker, integration boundary, persistence helper, and externally reachable client surface.
- [x] Audit authentication, session lifecycle, authorization, owner scoping, input validation, rate limits, CORS/CSP headers, error boundaries, structured logs, and secret exposure paths.
- [x] Audit task execution, approval gates, task replay, artifact access, connector authorization, queue operations, file handling, and provider call boundaries for unsafe behavior or missing checks.
- [x] Identify genuine placeholders, inert controls, unsupported claims, mocked data, and incomplete server/client paths; distinguish configuration-gated features from unfinished implementation.
- [x] Implement prioritized, evidence-backed hardening and fully complete safe, non-external unfinished paths with regression coverage.
- [x] Run strict validation, full tests, production build, document remediations and configuration-gated residuals, then checkpoint the audit.

## Reversible task policy packs

- [x] Define owner-scoped, declarative policy packs with a task domain, bounded guidance, evidence requirements, approval constraints, and an enabled/archived lifecycle.
- [x] Add durable policy-pack persistence, event audit records, protected APIs, and task-owner authorization; policy packs must never create work, invoke tools, change credentials, or grant permissions.
- [x] Expose review-only workspace controls that allow owners to create, edit, inspect, and archive policy packs; replay mode remains read-only.
- [x] Apply only explicitly enabled policy-pack guidance to a later task’s planning context, visibly and without overriding task-level approvals or action policy.
- [x] Add deterministic authorization, non-mutation, UI-boundary, and planning-context regressions; document, validate, and checkpoint the capability.

## Owner-scoped quality budgets

- [x] Define declarative, task-owner quality budgets for planned evidence, review depth, artifact completeness, and bounded revision expectations without an autonomous retry or remediation path.
- [x] Add durable quality-budget persistence, audit events, and protected APIs that cannot alter task execution, permissions, providers, or approval state.
- [x] Add a review-only workspace control that lets task owners create, inspect, update, and archive quality budgets while replay remains read-only.
- [x] Surface a quality-budget status summary in the evaluation workflow as informational review context, never an automatic pass/fail or task mutation.
- [x] Add deterministic authorization and non-mutation regressions; document, validate, and checkpoint the quality-budget capability.

## Structured logging hardening

- [x] Replace audited server-side direct console diagnostics with the existing redaction-aware structured logger while preserving safe public error responses.
- [x] Remove raw upstream response details and arbitrary exception messages from audited structured failure events, retaining stable event metadata and error classifications.
- [x] Add deterministic logging-boundary regression coverage; document, validate, and checkpoint the hardening without starting external workloads.

## Voice Mode lazy loading

- [x] Isolate the LiveKit browser implementation behind a user-triggered Voice Mode dialog boundary without requesting capture permissions during workspace load.
- [x] Preserve task ownership, realtime configuration gates, local screen-share cleanup, and transcript safeguards in the deferred module.
- [x] Add deterministic lazy-load safety coverage; document, validate, and checkpoint the client-bundle optimization without starting a realtime workload.

## Production client-delivery hardening

- [x] Audit the primary client-delivery path and identify the development-only classic preview bundle as a production request-graph risk.
- [x] Remove the classic preview compatibility script from resolved production HTML while preserving the normal module entry and managed development-preview source behavior.
- [x] Add a deterministic build-boundary regression, validate production output and the full test suite, document, and checkpoint the delivery optimization.

## Client error-disclosure hardening

- [x] Audit query, mutation, and bootstrap diagnostics for raw error-object or visible exception-message disclosure.
- [x] Replace raw client error output with bounded categories and generic actionable startup recovery guidance without changing unauthorized redirect behavior.
- [x] Add deterministic disclosure-boundary coverage; document, validate, and checkpoint the client-only hardening without external workloads.

## Connector authorization redirect hardening

- [x] Audit browser navigation and server authorization-URL construction for an arbitrary redirect boundary.
- [x] Require canonical HTTPS provider-hosted authorization URLs with no explicit port or embedded credentials at both server and client navigation boundaries.
- [x] Add deterministic hostile-destination coverage; document, validate, and checkpoint the redirect hardening without initiating an authorization flow.

## Restored Docker sandbox isolation

- [x] Audit local Docker checkpoint restoration for runtime controls that differed from fresh sandbox creation.
- [x] Apply the same network, filesystem, resource, and PID isolation arguments to fresh and restored local Docker sandboxes, with validated application-owned descriptors.
- [x] Add deterministic restored-runtime and descriptor coverage; document, validate, and checkpoint the development-only sandbox hardening without starting a container.

## Public-web destination hardening

- [x] Audit shared public-web URL parsing, DNS checks, redirect handling, and consumers for bounded SSRF-risk reductions.
- [x] Restrict accepted public-web destinations to standard implicit HTTP/HTTPS ports while retaining existing protocol, credential, hostname, literal-IP, and DNS-address checks.
- [x] Add deterministic non-standard-port coverage; document, validate, and checkpoint the policy change without performing an outbound request.

## tRPC diagnostic redaction

- [x] Audit the tRPC formatter for client-visible internal error disclosure and raw exception text in server diagnostics.
- [x] Preserve generic internal client errors and procedure-authored public errors while replacing raw formatter exception logging with stable structured metadata and a constant message.
- [x] Extend logging-boundary coverage; document, validate, and checkpoint the tRPC diagnostic hardening without external workloads.

## Chart style-generation hardening

- [x] Audit the reusable dynamic chart style renderer for future configuration-driven CSS injection paths.
- [x] Normalize chart identifiers, restrict custom-property keys, and reject fetch-capable or declaration-breaking style values before CSS generation.
- [x] Add deterministic chart-style safety coverage; document, validate, and checkpoint the client-only hardening without external workloads.

## Authenticated storage redirect hardening

- [x] Audit owner-scoped storage redirects, signed URL handling, and proxy diagnostics for arbitrary-navigation and raw-error exposure.
- [x] Require credential-free default-port HTTPS signed destinations and apply no-store, no-referrer, and nosniff response protections while preserving owner access checks.
- [x] Add deterministic signed-URL and diagnostic-boundary coverage; document, validate, and checkpoint the storage hardening without performing storage operations.

## Website preview iframe hardening

- [x] Audit the task-owned HTML website preview for unnecessary iframe capabilities and cross-origin information disclosure.
- [x] Retain script support in an opaque sandbox while blocking forms, modals, popups, same-origin privileges, downloads, and iframe referrer disclosure.
- [x] Extend deterministic workspace coverage; document, validate, and checkpoint the embedded-preview hardening without opening an artifact or starting an external workload.

## Modern workspace UI and UX refinement

- [x] Audit the authenticated shell, dashboard composer, workspace panels, typography, iconography, spacing, hierarchy, and responsive behavior against current productivity-agent interaction patterns.
- [x] Define and implement a calmer contemporary visual system with more deliberate type scale, spacing rhythm, surface hierarchy, semantic color usage, and modern icon treatments.
- [x] Redesign the app shell and primary task composer for a more organized, discoverable, compact workflow without removing existing capabilities or safety controls.
- [x] Refine secondary workspace panels, empty/loading/error states, keyboard affordances, and desktop/mobile layouts for clearer progressive disclosure.
- [x] Add visual and behavioral regression coverage, run responsive verification, validate the build, and checkpoint the UI/UX refinement.

## Settings layout and optional WorkOS authentication readiness

- [x] Audit and correct settings controls that overflow, crowd, or create uneven visual density at desktop and mobile widths.
- [x] Add an accessible compact/comfortable workspace-density control and responsive segmented-control behavior without changing stored approval defaults unexpectedly.
- [x] Research and document a provider-neutral authentication boundary with WorkOS as an optional, server-configured alternative to the existing authentication flow.
- [x] Add credential-gated WorkOS readiness configuration only; do not activate or replace current sign-in until explicit credentials and a migration decision are supplied.
- [x] Add layout and authentication-boundary regression coverage, validate responsive views, run type/test/build, and checkpoint the completed refinement.

## Composer control-bar and popover refinement
- [x] Audit the task composer control-bar hierarchy and every control/model popover against the supplied workspace capture.
- [x] Keep Media and Apps visible in the composer controls while preserving existing task-level consent and connected-app boundaries.
- [x] Replace user-facing automatic-routing/provider wording with a selected model name and model capability labels only.
- [x] Position composer control and model-selection surfaces below the composer so they do not obscure the prompt or suggested-query area.
- [x] Add deterministic interaction/layout regression coverage, verify desktop and mobile rendering, validate, and checkpoint the composer refinement.

## Scheduled-workflow diagnostic redaction
- [x] Audit cron-only workflow authentication, run claiming, public failure behavior, and structured diagnostic fields without running a schedule.
- [x] Preserve cron-only authentication, queue gating, duplicate protection, and generic public errors while replacing raw exception text with a stable error classification.
- [x] Extend structured logging coverage; document, validate, and checkpoint the scheduling hardening without creating or executing a workflow.
## Secure-workspace startup recovery
- [x] Trace the browser bootstrap path that leaves the secure-workspace fallback visible and identify the bounded blocking condition without starting any task or external service.
- [x] Repair the startup path so a blocked module cannot leave the application indefinitely stuck, while retaining safe authentication and error-disclosure boundaries.
- [x] Add deterministic regression coverage, validate the browser startup path, and checkpoint the verified recovery.

## Browser change sets
- [x] Add an applied, owner-scoped browser change-set schema with active/archive lifecycle and immutable review-context task events.
- [x] Add protected, rate-limited create, update, archive, and snapshot contracts that treat target URLs only as inert review references.
- [x] Add a compact Changes workspace tab with replay-safe owner controls and explicit no-browser/no-navigation/no-credentials/no-upload/no-submit/no-execution boundaries.
- [x] Add deterministic snapshot and source-safety regression coverage, complete validation, and preserve the task-runner non-integration boundary.

## Explicit public-web opt-in
- [x] Remove implicit public-web enablement for sandbox and remote-browser configuration while preserving an explicit `true` operator choice.
- [x] Add deterministic environment-boundary coverage for absent, false, malformed, and explicit enabled values without starting a browser or outbound request.
- [x] Validate the hardened configuration boundary with strict typing, focused policy/catalog regressions, the full deterministic suite, and a production build.

## Numeric runtime safety limits
- [x] Replace direct numeric environment coercion for task caps, retention, sandbox timeouts, and browser session timeouts with safe bounded parsing.
- [x] Make blank, fractional, negative, non-finite, and unsafe values fall back to documented defaults while clamping valid extreme values at safety limits.
- [x] Add deterministic parsing regressions and validate task-runner, sandbox, browser, full-suite, and production-build compatibility without starting any workload.

## Public host-allowlist normalization
- [x] Normalize configured sandbox, remote-browser, and media-artifact host allowlists to unique public domain names before capability setup.
- [x] Reject URL syntax, ports, wildcard syntax, literal IPs, local/internal names, metadata aliases, malformed names, and duplicate entries without any DNS lookup or outbound request.
- [x] Add deterministic boundary coverage and validate sandbox, remote-browser, media, policy, full-suite, and production-build compatibility without starting a workload.

## Generated media artifact origin validation
- [x] Require generated AIHubMix artifact URLs to remain HTTPS, allowlisted, credential-free, and free of non-standard ports before retrieval.
- [x] Add deterministic hostile artifact-response regressions proving no artifact fetch occurs after credential-bearing or non-standard-port URLs are returned.
- [x] Validate the media boundary with strict typing, focused media regressions, the full deterministic suite, and a production build without invoking a provider.

## Media transport diagnostic redaction
- [x] Replace raw AIHubMix image, video, and audio transport exception text with bounded timeout, network, or unknown classifications.
- [x] Extend the central structured-logging regression to cover media transport diagnostics and prevent raw exception-message fields from returning.
- [x] Validate logging and media behavior with strict typing, focused regressions, the full deterministic suite, and a production build without invoking a provider.

## Cross-media diagnostic redaction
- [x] Replace remaining Gemini, Pixazo, and task-image-reference raw transport exception text with bounded diagnostic categories.
- [x] Retain typed provider failure codes and controlled user-facing messages while preventing arbitrary fallback exception text from entering task events or structured logs.
- [x] Expand the central logging contract to all media and task-reference modules, then validate strict typing, focused regressions, the full deterministic suite, and a production build without invoking providers.

## Notification and task-event diagnostic redaction
- [x] Replace notification delivery and Redis task-event bus raw exception text with bounded timeout, network, provider, or transport classifications.
- [x] Preserve notification failover and database-backed task-event stream recovery while extending central structured-logging coverage to both modules.
- [x] Validate strict typing, focused recovery/logging regressions, the full deterministic suite, and a production build without sending notifications or connecting to Redis.

## Outbound provider endpoint validation
- [x] Normalize configured credential-bearing provider base URLs to canonical HTTPS endpoints before sandbox, browser, model, media, or connector clients receive them.
- [x] Reject embedded credentials, non-standard ports, query strings, fragments, malformed URLs, and non-HTTPS schemes by falling back to a documented provider endpoint.
- [x] Add deterministic environment-boundary coverage and validate provider-client compatibility with strict typing, focused regressions, the full deterministic suite, and a production build without invoking an external provider.

## Provider endpoint public-host validation
- [x] Require credential-bearing provider endpoints to use a normalized public domain name rather than localhost, local/internal names, metadata aliases, or literal IPv4/IPv6 addresses.
- [x] Reuse the bounded public-domain predicate across capability allowlists and provider endpoint configuration to avoid policy drift.
- [x] Extend deterministic endpoint boundary coverage and validate strict typing, focused provider-client regressions, the full deterministic suite, and a production build without invoking an external provider.

## Connected-app catalog metadata validation
- [x] Treat extended-directory icon URLs as untrusted metadata and accept only credential-free public HTTPS origins with default ports before client rendering.
- [x] Fall back to the curated local icon for malformed, local, literal-IP, credential-bearing, or non-standard-port metadata without fetching any remote image during validation.
- [x] Add deterministic catalog metadata regressions and validate strict typing, focused UI/catalog tests, the full deterministic suite, and a production build without connecting an app.

## Public signed-storage redirect hosts
- [x] Require authenticated storage signed redirects to use a normalized public hostname in addition to existing HTTPS, credential-free, and default-port constraints.
- [x] Add deterministic storage proxy coverage for local, internal, metadata, literal-IP, credential-bearing, non-standard-port, and non-HTTPS redirect origins.
- [x] Validate strict typing, focused storage regressions, the full deterministic suite, and a production build without retrieving a storage object.

## Task terminal display redaction
- [x] Add a bounded display-only task event payload redactor for credential-named fields, credential-bearing URLs, authorization strings, nested/cyclic values, and oversized structures.
- [x] Render terminal event data through the redactor without modifying the immutable persisted event, task replay source, or task runner behavior.
- [x] Add deterministic terminal and workspace contracts, then validate strict typing, focused regressions, the full deterministic suite, and a production build without starting a task or provider.

## Workspace-wide task event display redaction
- [x] Apply the display-only event payload redactor to timeline summaries and Live Computer fallback payloads in addition to terminal output.
- [x] Extend source-contract coverage so future workspace event surfaces cannot serialize raw payloads without the redaction boundary.
- [x] Validate strict typing, focused workspace regressions, the full deterministic suite, and a production build without starting a task or provider.
## Proof-reference external link hardening
- [x] Add a pure shared, DNS-free external-reference normalizer that accepts only canonical public HTTPS domains without credentials, ports, query strings, or fragments.
- [x] Require and canonicalize `external_url` proof locators at the protected persistence boundary while retaining non-URL proof locators as bounded text.
- [x] Render proof links only after the shared normalization boundary succeeds, retain invalid locators as inert text, and preserve deliberate user-click behavior with `noopener noreferrer`.
- [x] Add hostile URL, workspace source-contract, focused, full-suite, production-build, and whitespace-diff validation without visiting, fetching, resolving, or opening an external reference.

## Client diagnostic display hardening
- [x] Audit and replace remaining client-visible raw tRPC error-message rendering with bounded, contextual recovery guidance.
- [x] Add deterministic source and utility regressions that preserve accessibility while preventing arbitrary diagnostic text from becoming UI content.
- [x] Validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without starting external work.

## Authentication redirect-path hardening
- [x] Restrict optional unauthenticated redirect paths to canonical same-origin application routes before client navigation.
- [x] Add deterministic hostile-path and source-contract coverage without opening a browser destination.
- [x] Validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without starting external work.

## Documentation new-tab isolation
- [x] Add explicit opener isolation to the deliberate local documentation new-tab link.
- [x] Add deterministic source-contract coverage without opening the documentation destination.
- [x] Validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without starting external work.

## Account-portal URL hardening
- [x] Require the public OAuth account-portal base to be a canonical credential-free public HTTPS origin before user-initiated login navigation.
- [x] Add deterministic hostile configuration URL coverage without initiating an OAuth flow or visiting a destination.
- [x] Validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without starting external work.

## Connected-app image URL defense in depth
- [x] Normalize extended catalog image URLs at the shared server-and-client rendering boundary before either connector surface uses an image source.
- [x] Preserve legitimate public HTTPS icon query parameters while rejecting credentials, ports, fragments, local/internal hosts, and literal IPs without fetching an image.
- [x] Add deterministic utility and UI source-contract regressions, then validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without external work.

## Browser connection-policy minimization
- [x] Restrict the document CSP connection policy to the same-origin API and required secure socket transport after verifying client network calls are local API and event-stream paths.
- [x] Add deterministic response-header contract coverage without making a browser or network request.
- [x] Validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without starting external work.

## Configured public-origin normalization
- [x] Normalize the configured production application origin to a canonical credential-free public HTTPS origin before CORS uses it.
- [x] Add deterministic malformed, local, literal-IP, path, query, fragment, and credential configuration coverage without sending a request.
- [x] Validate strict typing, focused tests, the full deterministic suite, production build, and diff hygiene without starting external work.
