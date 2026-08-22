# Synthia AI Modern Workspace UI/UX Audit

**Author:** Manus AI  
**Date:** 2026-08-22  
**Scope:** Authenticated Synthia AI workspace, dashboard composer, Plugins directory, and Settings shell.

## Observed baseline

The current workspace has a consistent teal-on-warm-dark palette and already exposes the correct safety-first controls. However, the product surfaces rely too often on similarly weighted rounded cards, small low-contrast helper text, and dense repeated controls. The result is competent but visually flat: the dashboard feels sparse, whereas Plugins reads as an uninterrupted wall of equal-priority cards. Settings is more structured, but its typography and visual rhythm do not yet match the editorial quality of the public entry.

| Surface | What to retain | Primary refinement |
|---|---|---|
| Dashboard composer | Clear goal-first interaction and safety messaging | Establish a stronger focused working surface, compact secondary controls, and calmer hierarchy around the primary prompt. |
| Plugins | Real app identities, search, categories, progressive browse, explicit approval boundary | Introduce grouped rhythm, more legible app cards, and avoid equal visual weight for every metadata line. |
| Settings | Clear sections and a readable left navigation | Improve spacing, information density, and cross-page brand continuity. |
| Task workspace | Durable audit, proof, operations, and approval controls | Use progressive disclosure so evidence and governance remain visible without competing with the main work. |

## Design decision

Synthia will use a **calm command-center** visual direction: warm near-black surfaces, a restrained graphite elevation scale, and cyan reserved for action, active, live, or approval-relevant states. The product will pair a distinctive display face for sparse high-level Synthia moments with a compact technical sans for navigation, metadata, and controls. It will favor section-level hierarchy, explicit state labels, and progressive disclosure rather than more decorative cards or persistent dashboards.

> The interface remains a governed agent workspace. Styling must make scope, proposed activity, progress, evidence, and intervention understandable; it must not make an unapproved external action appear automatic or already completed.

## Evidence-informed patterns

The interface should distinguish user conversation from agent activity, then present a legible path to review and intervention rather than forcing both streams into one dense panel. The agent UI research specifically identifies the transparency layer, proactive state communication, override controls, and structured recovery as central to trusted agent products. [1] The second analysis similarly argues for an activity feed, intervention points, confidence gradients, and visible scope boundaries rather than a conventional chatbot-only interface. [2]

| Pattern | Synthia implementation boundary |
|---|---|
| Primary work surface | Keep the dashboard composer as the visual anchor. Collapse supporting capabilities into grouped, discoverable controls. |
| Activity and proof | Keep task events, proof, operations, and approvals in distinct workspace panels with contextual summaries rather than duplicating them in the composer. |
| Intervention | Retain explicit approval language and action states. Make review-required states more visually prominent than routine metadata. |
| Confidence and status | Use semantic hierarchy and labels for pending review, blocked, ready, or active states. Do not imply success or execution without a persisted fact. |
| Dense catalog navigation | Use filters, featured cards, compact metadata, and progressive loading so 156 app choices remain browsable. |

## References

[1] [Fuselab Creative, “Agent UX: designing UI for AI agents in 2026”](https://fuselabcreative.com/ui-design-for-ai-agents/)

[2] [The Skins Factory, “AI Agent UX Design: What the Interface Needs to Get Right”](https://www.theskinsfactory.com/uiux-design-blog/ai-agent-ux-design)
