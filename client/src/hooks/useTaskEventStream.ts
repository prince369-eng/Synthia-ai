import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";

export function useTaskEventStream(taskId: string | undefined) {
  const utils = trpc.useUtils();
  const lastSequence = useRef(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    const source = new EventSource(`/api/tasks/${encodeURIComponent(taskId)}/events?after=${lastSequence.current}`);
    const onEvent = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const payload = JSON.parse(message.data) as { sequenceNumber?: number };
        if (typeof payload.sequenceNumber === "number") lastSequence.current = Math.max(lastSequence.current, payload.sequenceNumber);
      } catch {
        // The next typed query refresh is the source of truth if a malformed payload is received.
      }
      setConnected(true);
      void utils.tasks.get.invalidate({ taskId });
      void utils.tasks.list.invalidate();
    };
    const onError = () => setConnected(false);
    source.addEventListener("task_event", onEvent);
    source.addEventListener("error", onError);
    return () => source.close();
  }, [taskId, utils.tasks.get, utils.tasks.list]);

  return { connected };
}
