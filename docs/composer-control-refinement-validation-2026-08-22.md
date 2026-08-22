# Composer Control Refinement Validation

The task composer was inspected in the authenticated managed workspace at desktop width. The baseline capture showed the composer control row with attachment, task controls, media, app, model, live voice, microphone, and start controls visible in one compact line. The original open surfaces rose above that control row and covered the task-entry area.

The refinement moves attachment, task-control, media, app, and model surfaces below their corresponding triggers. The composer now keeps the task-entry text area visually clear. Attachment and app selection surfaces are click-open rather than transient hover-only controls, preserving their existing approval and selected-app constraints. The model trigger excludes any non-model `Automatic` label and instead shows a concrete available model, a task-recommended media model when applicable, or the neutral `Models` label when no concrete model is configured.

Focused validation passed with strict TypeScript and 57 composer/layout assertions. After rebuilding the managed preview, the service again reached its normal listening state; its subsequent capture remained at the existing workspace loading state rather than presenting an actionable error. No task, model, media, browser, sandbox, connector, or external workload was started during this verification.
