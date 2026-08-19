import { beforeEach, describe, expect, it, vi } from "vitest";

const eventBusTestState = vi.hoisted(() => {
  const clients: any[] = [];
  class FakeRedis {
    listeners = new Map<string, Array<(...args: any[]) => void>>();
    publish = vi.fn().mockResolvedValue(1);
    subscribe = vi.fn().mockResolvedValue(1);
    unsubscribe = vi.fn().mockResolvedValue(1);
    quit = vi.fn().mockResolvedValue("OK");

    constructor() {
      clients.push(this);
    }

    on(event: string, callback: (...args: any[]) => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), callback]);
      return this;
    }

    emit(event: string, ...args: any[]) {
      for (const callback of this.listeners.get(event) ?? []) callback(...args);
    }
  }
  return { clients, FakeRedis };
});

vi.mock("ioredis", () => ({ default: eventBusTestState.FakeRedis }));
vi.mock("../_core/env", () => ({ ENV: { redisUrl: "redis://event-bus.test:6379", redisTlsEnabled: false } }));
vi.mock("../security/logger", () => ({ logger: { warn: vi.fn() } }));

import { isTaskEventBusConfigured, publishTaskEvent, subscribeTaskEvents } from "./taskEventBus";

describe("Synthia task event bus", () => {
  beforeEach(() => {
    eventBusTestState.clients.length = 0;
    vi.clearAllMocks();
  });

  it("delivers only positive integer sequence notifications for the subscribed task and disposes the subscriber", async () => {
    const onSequence = vi.fn();

    expect(isTaskEventBusConfigured()).toBe(true);
    publishTaskEvent("task-1", 4);
    const unsubscribe = subscribeTaskEvents("task-1", onSequence);
    const subscriber = eventBusTestState.clients.at(-1)!;

    subscriber.emit("message", "synthia:task-events:other-task", "7");
    subscriber.emit("message", "synthia:task-events:task-1", "invalid");
    subscriber.emit("message", "synthia:task-events:task-1", "0");
    subscriber.emit("message", "synthia:task-events:task-1", "5");

    expect(onSequence).toHaveBeenCalledTimes(1);
    expect(onSequence).toHaveBeenCalledWith(5);
    expect(subscriber.subscribe).toHaveBeenCalledWith("synthia:task-events:task-1");
    expect(eventBusTestState.clients[0].publish).toHaveBeenCalledWith("synthia:task-events:task-1", "4");

    unsubscribe();
    await Promise.resolve();
    expect(subscriber.unsubscribe).toHaveBeenCalledWith("synthia:task-events:task-1");
    expect(subscriber.quit).toHaveBeenCalledTimes(1);
  });
});
