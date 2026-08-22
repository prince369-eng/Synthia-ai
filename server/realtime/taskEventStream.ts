import type { Express, Request, Response } from "express";
import { getTaskForUser, listTaskEventsSince } from "../db";
import { createContext } from "../_core/context";
import { isTaskEventBusConfigured, subscribeTaskEvents } from "./taskEventBus";
import { logger } from "../security/logger";

const TASK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asSequence(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function send(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function registerTaskEventStream(app: Express) {
  app.get("/api/tasks/:taskId/events", async (req: Request<{ taskId: string }>, res) => {
    if (!TASK_ID.test(req.params.taskId)) {
      res.status(400).json({ error: "Invalid task identifier." });
      return;
    }
    const context = await createContext({ req, res, info: {} } as unknown as Parameters<typeof createContext>[0]);
    if (!context.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const task = await getTaskForUser(req.params.taskId, context.user.id);
    if (!task) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    let lastSequence = asSequence(req.query.after);
    let closed = false;
    let inFlight = false;
    const flushEvents = async () => {
      if (closed || inFlight) return;
      inFlight = true;
      try {
        const events = await listTaskEventsSince(task.id, lastSequence);
        for (const event of events) {
          lastSequence = event.sequenceNumber;
          send(res, "task_event", event);
        }
      } catch (error) {
        send(res, "stream_error", { message: "Event recovery temporarily failed." });
        logger.error({ event: "task_event_stream_error", taskId: task.id, errorKind: error instanceof Error ? error.name : "unknown" }, "Task event stream recovery failed");
      } finally {
        inFlight = false;
      }
    };
    await flushEvents();
    const heartbeat = setInterval(() => send(res, "heartbeat", { sequenceNumber: lastSequence }), 15_000);
    const unsubscribe = subscribeTaskEvents(task.id, sequenceNumber => {
      if (sequenceNumber > lastSequence) void flushEvents();
    });
    const recovery = setInterval(() => void flushEvents(), isTaskEventBusConfigured() ? 15_000 : 1_000);
    req.once("close", () => {
      closed = true;
      clearInterval(heartbeat);
      clearInterval(recovery);
      unsubscribe();
      res.end();
    });
  });
}
