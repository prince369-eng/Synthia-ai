# Synthia public landing-page validation record — 2026-08-21

The public landing page was source-reviewed after the redesign and validated with the deterministic UI-layout suite. The focused suite passed 38 assertions, and the production build completed successfully. The checked implementation includes public navigation, keyboard skip navigation, accessible menu state, capability-availability sections, and motion that is guarded for reduced-motion preferences.

The managed preview session used for the captured desktop check was already authenticated. Therefore `/` correctly rendered the task dashboard rather than the public marketing route; this is expected application behavior, not a landing-page rendering failure. The public landing page remains the signed-out entry surface and can be reviewed by signing out or by opening the published site in a signed-out browser context. No model, media, browser-agent, sandbox, storage, task, or provider workload was started for this validation.
