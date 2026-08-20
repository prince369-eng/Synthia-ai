# Composer and Personalization Verification Record

## Authenticated Workspace Recovery — 2026-08-20

After the verified restart, the authenticated workspace recovered from its normal session-loading screen to the task composer. The composer rendered the **Automatic** task-routing control, Media control, and voice-input control without retaining the earlier blocked-microphone warning. No microphone permission prompt, task, model inference, media generation, browser automation, or other provider workload was started during this verification.

The absent warning confirms that a stale previous denial is not rendered after a fresh workspace recovery. The explicit retry and dismiss behavior remains covered by deterministic composer tests; a physical microphone permission attempt requires a user-initiated browser action and was not performed.

## Personalization Layout Review — 2026-08-20

The authenticated Personalization page rendered a two-column layout: editable interaction-preference sliders on the left and a **Your personality web** graph plus memory-boundary controls on the right. The graph is explicitly described as a summary of selected communication preferences rather than an inferred personality score. The page also states that personalization is secondary to the active task and safety controls. No memory was created, edited, deleted, or sent to a model during this visual review.

The lower Personalization controls exposed independent toggles for personalization, session memory, and long-term memory; a user-created-note area with long-term and 24-hour-session options; explicit empty states; and visible retention boundaries. Returning to the authenticated workspace showed the **Automatic** task-routing control and no stale microphone warning. No task was submitted during the review.
