# Live Composer Diagnostic Note

## Observation recorded 2026-08-23

After a managed development-service restart, the authenticated workspace rendered the account identity and the composer shell but did not resolve the protected recent-task query. The sidebar continued to display `Loading tasks…`, while the browser remained authenticated. The read-only PostgreSQL diagnostic simultaneously confirmed that the canonical task tables were reachable and that the authenticated application-user record existed.

This narrows the recurring composer failure to the protected RPC request path or its client transport rather than provider dispatch, task-worker execution, or missing baseline PostgreSQL task tables. No additional task was submitted during this observation.

## Follow-up observation

An authenticated, read-only direct request to `tasks.list` returned a successful empty list. Returning immediately to the React workspace nevertheless left the application at `Loading Synthia workspace…`. The confirmed discrepancy now points to client-side authentication/bootstrap or transport lifecycle behavior rather than the protected task-list procedure itself. A direct malformed diagnostic request also exposed a development tRPC stack trace; the server formatter has been changed to omit serialized stack fields.

The duplicate-root prevention change was validated deterministically and deployed to the restarted preview, but the connected browser still displayed the loading state. The remaining issue is therefore not resolved by eliminating the duplicate preview/module mount and requires focused inspection of the client authentication query lifecycle.

The connected-browser bridge subsequently timed out while waiting for the client to advance beyond its loading state. This browser-bridge timeout is recorded as diagnostic evidence only; it does not establish a server failure because authenticated `auth.me` and `tasks.list` requests returned successfully when invoked directly.

The static-preview response was then changed from an embedded multi-megabyte compatibility bundle to one versioned same-origin classic script. Focused delivery tests and a production build passed. After restart, the connected browser still showed `Loading Synthia workspace…`; therefore response payload size and duplicate bundle delivery are not sufficient explanations for the observed loading state.

## Fresh-preview reproduction

The earlier public proxy was confirmed to serve a stale inline compatibility bundle. A fresh same-origin proxy served the current versioned classic bundle and bounded RPC lifecycle script. The user reproduced the composer failure there with the approved text-only prompt. No bounded lifecycle, composer-boundary, or tRPC-error log record reached the server from that submission.

A separate authenticated browser observation on the fresh proxy initially rendered the authenticated shell and then resolved to the current composer with an empty, owner-scoped task list. This proves that the current classic client can complete authentication and read-only task listing. The remaining discrepancy is localized to the composer mutation transport or its client-visible error object, not provider dispatch or worker execution. No further task was submitted during this observation.

## Confirmed proxy-origin boundary and repair

A preview-only, protected no-op mutation was added to exercise the same batched `POST` and SuperJSON response path as the composer without persisting a task, queueing work, or calling any provider. The authenticated no-op request initially failed on the temporary reverse-proxy preview host before reaching the tRPC adapter. The server CORS guard accepted configured public origins but did not recognize that proxied host as the browser's exact same origin.

The origin guard now permits a request only when its `Origin` exactly matches the request's externally visible protocol and host, using the existing forwarded-HTTPS convention. This does not broaden cross-origin access: configured-origin checks remain in place, and non-matching origins remain rejected.

After restart, the same authenticated no-op mutation completed in the browser. The bounded on-page status reported completion, the workspace loaded with an empty task list, and no task was created or executed. This verifies the protected mutation transport and response envelope through the repaired preview boundary. A user task submission has not been repeated automatically.
