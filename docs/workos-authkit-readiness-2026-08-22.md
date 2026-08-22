# Optional WorkOS AuthKit Readiness

**Status:** Design and configuration readiness only. Synthia's existing Manus-backed session flow remains the active authentication path. No WorkOS credential, login redirect, session, user migration, or identity-provider switch is initiated by this document or its associated UI work.

## Evidence-based integration boundary

WorkOS AuthKit can provide an alternative application authentication system, but it must not be introduced as a silent replacement for Synthia's current signed-in users. AuthKit sessions return access and refresh tokens; WorkOS directs applications to store access tokens in secure cookies and validate them on each backend request. Its access tokens contain a stable subject and session identifier, and refresh-token rotation must replace the prior refresh token safely.[1]

For an application that already has an authentication system, WorkOS documents **Standalone Connect** as the compatible path for acting as an OAuth authorization server while retaining the existing application login. Its Login URI receives a temporary `external_auth_id`; only after Synthia authenticates the user with its existing session may the server complete the WorkOS flow. WorkOS then owns OAuth consent and token issuance rather than Synthia exposing provider credentials or granting access automatically.[2]

## Synthia implementation decision

| Area | Current decision | Safety rationale |
|---|---|---|
| Active sign-in | Keep the existing Manus-backed session route active | Prevents an unreviewed account migration or sign-out regression. |
| WorkOS mode | Optional, server-configured readiness only | No login control is shown as active without valid configuration and an operator-approved rollout. |
| Identity linkage | Require an explicit local identity-link record before sharing user identity between providers | Prevents accidental account collisions based only on display name or email. |
| Sessions | Validate provider-specific sessions server-side and issue Synthia's own scoped session only after a verified identity mapping | Keeps authorization and owner scope within Synthia's existing protection model. |
| Redirects | Require allowlisted HTTPS callback and sign-out URLs | Prevents open redirects and preserves CSRF/session boundaries. |
| Migration | Plan a separate, approved migration with reversible cohort rollout | WorkOS notes that migrations may require user export/import and webhook management.[3] |

WorkOS readiness requires four configuration values supplied through the project secret controls: `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI`, and `WORKOS_COOKIE_PASSWORD`. These values are intentionally not fabricated, copied from any other integration, or enabled until the project owner provides them. A production rollout also requires registered redirect and sign-out URLs in the WorkOS dashboard plus a tested rollback plan.

## References

[1]: https://workos.com/docs/authkit/sessions "WorkOS AuthKit Sessions"
[2]: https://workos.com/docs/authkit/connect/standalone "WorkOS Standalone Connect"
[3]: https://workos.com/docs/migrate/other-services "WorkOS Migrate from Other Services"
