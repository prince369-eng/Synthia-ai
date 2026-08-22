import type { Request, Response } from "express";
import { enqueueTaskCycle, isQueueConfigured } from "./agent/queue";
import {
  appendTaskEvent,
  attachScheduledWorkflowRunTask,
  claimScheduledWorkflowRun,
  createTaskForUser,
  DEFAULT_AUTONOMY_SETTINGS,
} from "./db";
import { sdk } from "./_core/sdk";
import { logger } from "./security/logger";

const roundedMinute = (date: Date) => new Date(Math.floor(date.getTime() / 60_000) * 60_000);

/**
 * Heartbeat-only endpoint. It deliberately ignores request bodies: the trusted
 * scheduler task UID supplied by the authenticated cron identity selects the
 * persisted user workflow, while the unique run slot prevents retry duplicates.
 */
export async function runScheduledWorkflow(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }
    if (!isQueueConfigured()) {
      res.status(503).json({ error: "queue-unavailable", taskUid: user.taskUid, timestamp: new Date().toISOString() });
      return;
    }

    const startedAt = new Date();
    const claimed = await claimScheduledWorkflowRun(user.taskUid, roundedMinute(startedAt));
    if (!claimed.workflow || !claimed.accepted || !claimed.runId) {
      res.json({ ok: true, skipped: claimed.workflow ? "duplicate" : "orphan" });
      return;
    }

    const task = await createTaskForUser({
      userId: claimed.workflow.userId,
      title: claimed.workflow.name,
      goal: claimed.workflow.goal,
      plan: [
        { id: "analyze", title: "Analyze the scheduled objective and constraints", state: "active" },
        { id: "execute", title: "Execute the scheduled workflow", state: "pending" },
        { id: "deliver", title: "Verify results and prepare deliverables", state: "pending" },
      ],
      autonomySettings: claimed.workflow.autonomySettings as typeof DEFAULT_AUTONOMY_SETTINGS,
      involvesCode: false,
      estimateBand: "standard",
      estimatedCreditsMin: 0,
      estimatedCreditsMax: 0,
    });
    if (!task) throw new Error("Scheduled task creation returned no task.");

    await attachScheduledWorkflowRunTask({
      runId: claimed.runId,
      workflowId: claimed.workflow.id,
      taskId: task.id,
      executedAt: startedAt,
    });
    await appendTaskEvent(task.id, {
      type: "status_change",
      payload: {
        status: "queued",
        summary: "Task queued by its approved schedule.",
        scheduledWorkflowId: claimed.workflow.id,
        scheduled: true,
      },
    });
    await enqueueTaskCycle(task.id);
    res.status(202).json({ ok: true, workflowId: claimed.workflow.id, taskId: task.id });
  } catch (error) {
    logger.error(
      {
        event: "scheduled_workflow_failed",
        errorType: error instanceof Error ? error.name : "unknown",
        method: req.method,
      },
      "Scheduled workflow invocation failed",
    );
    res.status(500).json({ error: "scheduled-workflow-failed" });
  }
}
