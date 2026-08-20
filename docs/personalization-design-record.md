# Synthia Adaptive Personalization Design Record

## User-requested scope

Synthia will provide a dedicated **Personalization** column in Settings where a signed-in user can review and control an editable personality graph, session memory, and long-term memory. The feature must adapt future conversations and task planning to the user’s explicit preferences and retained memory, rather than making opaque or unsupported claims about personality.

## Reference review

On 2026-08-20, the requested direct Manus Personalization route returned a 404. The authenticated Manus workspace entry page was available and confirmed the compact, task-first composition hierarchy already used as the interaction reference for Synthia. No private account content, profile data, or hidden settings values were copied or retained from the reference account.

## Synthia privacy and product boundaries

| Area | Product rule |
|---|---|
| Personality graph | User-editable dimensions only; values are never inferred silently from protected or sensitive traits. |
| Session memory | Scoped to the active signed-in session and removable as a whole. |
| Long-term memory | User-scoped structured records with source, purpose, status, timestamps, and explicit deletion. |
| Adaptation | Adds only bounded, active user-approved context to task planning and language-model prompts. |
| Transparency | Settings shows enabled state, stored records, graph values, and clear/disable controls. |
| Safety | No LLM call is required to view, change, or delete personalization data. |

The implementation will use Synthia’s existing PostgreSQL task-data boundary, authenticated tRPC procedures, parameterized queries, structured logging, and client-side loading, empty, error, and disabled states.
