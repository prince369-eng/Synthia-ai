# Scheduled Workflows Verification

## 2026-08-21

The authenticated Scheduled page was reviewed after the deployment-gated workflow implementation and control-layout repair. On desktop, the page presents the published-only guidance, a full-width reviewed-schedule form, paired name and UTC-cron fields at the desktop breakpoint, a full-width task-objective field, and the disabled creation action. The account has no saved schedules and no schedule mutation or external Heartbeat job was created during this verification.

The responsive implementation uses a single-column form grid by default and switches to two columns only at the `md` breakpoint. The dedicated `synthia-schedule-form` class prevents generic compact-card sizing rules from affecting form children.
