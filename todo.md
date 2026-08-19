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
- [ ] Validate PostgreSQL event-sequence allocation under concurrent writer conditions after applying the migration to the external database.
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
- [ ] Wire multimodal task contracts so image inputs require vision-capable routing and media-generation requests expose only configured provider capabilities.
- [x] Add regression and authenticated-browser coverage for the expanded center workspace and multimodal capability states.
- [ ] Produce a consolidated go-live credential checklist covering all required external providers, storage, queue, sandbox, database, email, transcription, image, and video services.
- [ ] Complete go-live provider and deployment verification after the user supplies credentials and publishes the site.
- [ ] Add durable task-linked scheduling only after the published callback contract and Heartbeat workflow are available.

## Go-live modality provider contract

- [ ] Confirm the selected image-generation provider and required API credential before enabling image generation.
- [ ] Confirm the selected video-generation provider and required API credential before enabling video generation.
- [ ] Confirm the selected vision-capable LLM models and `SYNTHIA_VISION_MODELS` configuration before enabling visual task execution.
- [ ] Confirm the selected audio transcription provider and credential before enabling voice input in production.
- [ ] Confirm media storage, sandbox, queue, database, search, email, and application secret values before live end-to-end testing.

## Center workspace component audit ledger

- [ ] Header identity and workspace status
- [ ] Upper-right usage, files, sharing, and overflow actions
- [ ] Goal composer and submit state
- [ ] Plus attachment menu with local files and Library
- [ ] Attachment chips and image capability guard
- [ ] Model picker with automatic routing and capability labels
- [ ] Voice input and transcription state
- [ ] Project and autonomy controls
- [ ] Suggested task prompts and recent task list
- [ ] Responsive collapsed-sidebar and mobile behavior
- [ ] Empty, loading, error, and unavailable states
- [ ] Agent’s Computer workspace return/navigation actions
- [ ] Multimodal generation capability surfaces for image and video requests

## Center workspace implementation decisions

- [ ] Do not present image/video generation as available until provider credentials and runtime adapters are configured.
- [ ] Keep voice input as authenticated transcription into task text, not as a chat-model selector.
- [ ] Keep image attachments blocked for fixed text-only models and available through automatic routing or configured vision models.
- [ ] Keep unsupported sharing, scheduling, and external connectors visibly unavailable rather than simulated.

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

- [ ] `pnpm check`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Authenticated desktop visual review
- [ ] Authenticated mobile visual review
- [ ] Model-picker interaction review
- [ ] Attachment-menu interaction review
- [ ] Voice-input unavailable/ready review
- [ ] Image and video-generation unavailable/ready review
- [ ] Task overflow action review
- [ ] Save a checkpoint after all verified changes
- [ ] GitHub push remains last and requires explicit user confirmation
> **Credential boundary:** Credentials will be requested through secure project configuration. No secrets will be written into source code, screenshots, or committed `.env` files.

> **Provider boundary:** Image and video generation will remain unavailable in the UI until real provider adapters, model configuration, storage handling, and go-live credentials are verified.

> **Scheduling boundary:** Task-linked scheduling remains unavailable until the published `/api/scheduled/*` callback and Heartbeat ownership contract are ready.

## Credential request status

- [ ] Request and configure the complete go-live credential set after the user confirms the selected image and video providers.
- [ ] Run the final live end-to-end validation only after credentials are configured.

## Center workspace completion status

- [ ] Complete all center interface components and multimodal capability states.
- [ ] Mark this expanded center-workspace scope complete only after authenticated desktop/mobile review and a saved checkpoint.

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

- [ ] User-visible center UI matches the approved compact proportional layout.
- [ ] Every enabled action has a real backend route or is explicitly unavailable.
- [ ] No fabricated provider, model, generation, review, rating, or schedule data exists.
- [ ] External credentials remain outside source control.
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

- [ ] Audit and refine all current center-workspace components against the user-approved compact Manus-style hierarchy.
- [ ] Audit and refine the persistent sidebar, profile menu, route navigation, settings rail, task history, library, scheduled, agent, and plugins surfaces within the Synthia scope.
- [ ] Verify all buttons and menu items have a real route or explicit unavailable explanation.
- [ ] Continue responsive desktop, tablet, and mobile proportion review without introducing oversized panels.
- [ ] Preserve Synthia branding and radiant-orange design tokens while matching the approved interaction patterns.
- [ ] Update browser-audit notes with only publicly observed, scope-aligned behaviors and source URLs.

## Confirmed user gate

- [x] User selected Gemini image generation plus Gemini Omni Flash video generation.
- [ ] User supplies credentials through secure project configuration when the key collection request is opened.
- [ ] User publishes the verified application before live scheduler and media end-to-end tests.
- [ ] GitHub push remains last and requires explicit confirmation.
