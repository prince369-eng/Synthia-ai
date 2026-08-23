# Design System and UI Change Guide

Synthia uses a compact dark workspace with a teal/cyan accent system. The goal is an organized tool surface that stays readable during long task sessions, not a large marketing-style dashboard.

## Visual rules

| Element | Rule |
|---|---|
| Background | Use the established deep green-black and layered surface tokens from `client/src/index.css`. |
| Accent | Use teal/cyan to communicate focus, selected state, progress, and safe action. Do not reintroduce harsh orange as the dominant workspace color. |
| Typography | Keep labels compact, readable, and hierarchically restrained. Avoid oversized headings inside tool panels. |
| Spacing | Preserve consistent small-to-medium gaps; panels should not feel crowded or excessively padded. |
| Panels | Prefer light borders, soft surface contrast, and controlled radius over heavy shadows. |
| Icons | Use existing Lucide icons consistently with accessible labels and tooltips. |
| Motion | Limit UI motion to transform/opacity transitions under roughly 300 ms; honor reduced-motion preferences. |

## Layout rules

The authenticated UI is built around `SynthiaAppShell`: navigation must remain collapsible, pages must retain a visible escape route, and content must not overflow behind shell controls. Keep primary actions near their content rather than in a distant fixed region.

For pages with dense operational content, use a progressive structure:

1. A compact title and status context.
2. The primary work surface.
3. Secondary inspection/review panels.
4. Advanced details behind an explicit disclosure, tab, or popover.

## Responsive and accessibility rules

Use semantic headings, labels, buttons, and form controls. Ensure keyboard focus is visible. Do not rely on hover as the only path to an action. Popovers must stay within desktop and mobile viewports, have bounded scrolling, and close predictably. Pair background and text semantic colors so content remains readable in dark mode.

## Before changing UI

Read `client/src/index.css`, the relevant page, `SynthiaAppShell`, and its associated DOM or source-contract test. Add a new component only when an existing component cannot express the interaction. Do not add a generic card grid simply because data exists; preserve the task-oriented information hierarchy.

## Page-specific boundaries

| Area | Preserve |
|---|---|
| Composer | Compact controls, anchored apps picker, readable prompt area, user-scoped action feedback. |
| Task Workspace | Progress/evidence hierarchy, safe task-event presentation, back navigation, no raw runtime diagnostics. |
| Settings | User-focused capability wording; do not expose backend service names, environment details, or credentials. |
| Plugins/connectors | Describe what a user can authorize and do, not the provider infrastructure behind it. |
| Network Labs | Strong review/approval state separation; never show “validated” unless evidence was accepted. |

## UI verification

At minimum, run the affected DOM/source contract. Then inspect the rendered page at desktop and mobile width. Screenshot availability can vary in managed preview; do not change infrastructure just to work around a missing preview URL.
