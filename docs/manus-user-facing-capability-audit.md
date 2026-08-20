# Manus User-Facing Capability Audit

## 2026-08-20 — Workspace Entry Surface

The authenticated Manus workspace was inspected as a visual and interaction reference for the approved Synthia scope. Its primary entry surface presents **outcomes and user actions**: a goal prompt, suggested work, and concise capability starters such as **Create slides**, **Build website**, **Design**, **Create games**, and **More**. It does not disclose runtime providers, infrastructure, secret-variable names, database choices, or sandbox implementation details in this task-entry context.

For Synthia, this supports treating Agent Capabilities and Settings as a catalog of what a user can do, what is available for their workspace, and what action is needed to enable a feature. Internal services, credential variable names, and backend architecture are not user-facing labels.

## 2026-08-20 — User-Supplied Settings References

The supplied screenshots establish the detailed interaction target. **Connectors** has an *Added connectors* view and a browsable app catalog. Cards identify the application and describe the user outcome, such as managing repositories, accessing the web through the user’s browser, or searching mail. The visible state is a connection checkmark or an add action; no runtime provider, queue, database, model vendor, secret name, or server configuration is shown.

**Skills** presents a catalog of task abilities with an icon, a short user-oriented description, an official marker where applicable, and an enabled/disabled toggle. **Mail** presents an email-to-task workflow, approved senders, and user-manageable workflow addresses. **My Computer** presents selectable cloud/local workspace modes and a user action to create a persistent cloud workspace. These surfaces describe usable functionality and controls rather than Synthia’s implementation architecture.

### Applied Synthia Translation

| Manus-style surface | Synthia user-facing equivalent | Must not show |
|---|---|---|
| Added / browse connectors | Connected apps and browseable task connections | Internal AI, search, queue, sandbox, storage, or secret-provider services |
| Added skills | Task abilities with a short explanation and a safe availability control | Provider counts, backend policy terms, or credential/setup mechanics |
| Mail workflow | Email-created tasks and approved sender controls | Mail transport vendors or delivery credentials |
| My Computer | Task computer and optional persistent workspace choices | Sandbox vendors, templates, runtime images, or host details |
| Agent overview | Capabilities available to the active task and approval state | Configuration counts, database/queue state, and internal service names |

## Verification — Synthia Authenticated Workspace

The authenticated Synthia review confirmed the translated surfaces resolve to user-facing language. **Connectors** now presents GitHub, Google, Notion, and Slack as apps with task outcomes and an availability state. **Skills** presents Web research, Agent’s Computer, Create deliverables, and Approvals as task abilities. **Mail** presents task updates and email-created tasks. **Computer** presents Agent’s Computer and an optional personal-computer connection. The **Agent** page presents task intelligence, web research, Agent’s Computer, active tasks, and approvals without displaying model vendors, queues, databases, sandbox providers, or secret/configuration names.

The sidebar **Connections** page uses the same user-app vocabulary and preserves an empty state for no connected apps. Apps that are not integrated for this workspace accurately show as unavailable rather than offering a non-functional connection action.
