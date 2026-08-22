# Public-Web Standard-Port Hardening

**Date:** 2026-08-22  
**Scope:** Outbound destinations accepted for public-web research and provider-returned media artifacts.

## Finding

Synthia’s shared public-web policy already rejected unsupported protocols, credential-bearing URLs, private/local hostnames, literal IP addresses, and public-looking hostnames that resolve to a private address. It did not restrict an otherwise valid public hostname to the conventional HTTP or HTTPS port. That left an unnecessary path toward alternate services hosted on arbitrary ports.

## Implemented Boundary

Public-web destinations must now use an implicit standard port. The URL parser normalizes explicit `:80` for HTTP and `:443` for HTTPS as their respective default ports, so conventional URLs continue to work. Any non-default explicit port is rejected before DNS resolution or use by the sandbox, media, or public-video consumers.

| Destination property | Result |
|---|---|
| `https://public.example/path` | Allowed only after the existing public-DNS checks succeed. |
| `http://public.example/path` | Allowed only after the existing public-DNS checks succeed. |
| `https://public.example:8443/path` | Rejected as a non-standard public-web port. |
| Private, local, metadata, literal-IP, credential-bearing, or non-HTTP(S) destinations | Continue to be rejected. |

The shared policy remains a preflight control. It does not claim to pin DNS resolution inside third-party browser or media providers after handoff. Those provider paths remain configuration-gated, approval-first, and disabled unless separately configured. Pixazo artifact retrieval continues to reject HTTP redirects.

## Validation

The public-web policy regression now includes a public hostname on port `8443` and verifies that it is rejected alongside existing protocol, private-address, metadata, credential, and literal-IP cases.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused public-web policy test | Passed: 9 assertions. |
| `pnpm test` | Passed: 46 test files and 218 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client chunk advisories are unrelated to this server-side destination policy. |

No public-web navigation, task, model, media, browser agent, sandbox, storage, connector authorization, scheduled workflow, or external provider workload was started while applying or validating this policy change.
