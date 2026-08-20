# Synthia AI Visual System

Synthia uses a warm-black workspace with **teal** (`#14b8a6`) and **cyan** (`#22d3ee`) as its primary signal colors. Teal communicates an active, selected, or ready state; cyan supports focus, interactive feedback, and readable active labels. The system deliberately avoids broad orange emphasis because repeated warm highlights reduce calmness and make unrelated controls compete for attention.

| Visual role | Color direction | Approved usage |
|---|---|---|
| Primary action | Teal to cyan | Submit, resume, selected navigation, active tabs, and configured capability controls |
| Focus and feedback | Cyan | Keyboard focus, linked labels, model capability cues, and current workspace context |
| Neutral surface | Warm near-black with white transparency | Panels, borders, empty states, and secondary controls |
| Completion | Emerald | Completed tasks and ready sandbox state |
| Error | Rose | Failed tasks, unavailable files, and failed provider actions |
| High-attention decision | Amber, limited | A recorded approval gate and a blocked visual-input warning only |

> **Allowlist rule.** Amber is not a general brand color. It is reserved for choices that require immediate user attention before an action can proceed. Legacy orange utility class names in historical workspace components are explicitly bridged to teal/cyan by the global stylesheet; their rendered colors must not reintroduce orange-heavy control states.
