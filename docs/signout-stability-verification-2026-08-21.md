# Sign-out Stability Verification — 21 August 2026

## Verified behavior

After selecting **Sign out**, an authenticated browser session was checked by navigating directly to the protected `/settings` route. The application remained on Synthia's public sign-in entry screen rather than restoring the authenticated workspace or opening the account portal automatically.

## Repair boundary

The client now blocks stale `auth.me` query results and preview bearer state from projecting an authenticated user after an explicit sign-out marker has been set. The marker is cleared only through a user-initiated sign-in entry point.

## Validation

Focused authentication regression coverage, strict TypeScript validation, the full non-billable test suite, and the production build passed. The verification did not invoke any model, media, browser-agent, sandbox, storage, or external-provider workload.
