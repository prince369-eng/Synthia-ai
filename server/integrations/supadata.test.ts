import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ appendTaskEvent: vi.fn(), createDeliverable: vi.fn() }));
vi.mock("../agent/artifactStorage", () => ({ getTaskArtifactUrl: vi.fn(), putTaskArtifact: vi.fn() }));
vi.mock("../agent/publicWebPolicy", () => ({ assertPublicWebDestination: vi.fn() }));
vi.mock("../security/rateLimit", () => ({ enforceRateLimit: vi.fn(), RateLimitError: class RateLimitError extends Error {} }));
vi.mock("../security/logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

import { ENV } from "../_core/env";
import { appendTaskEvent } from "../db";
import { assertPublicWebDestination } from "../agent/publicWebPolicy";
import { enforceRateLimit } from "../security/rateLimit";
import { executeSupadataPublicVideoUnderstanding, SupadataRequestError } from "./supadata";

const originalKey = ENV.supadataApiKey;
const originalFetch = globalThis.fetch;

afterEach(() => {
  ENV.supadataApiKey = originalKey;
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

describe("executeSupadataPublicVideoUnderstanding", () => {
  it("does not make a provider request until a server-side Supadata credential is configured", async () => {
    ENV.supadataApiKey = "";
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(executeSupadataPublicVideoUnderstanding({
      taskId: "task-1",
      userId: 1,
      sourceUrl: "https://www.youtube.com/watch?v=abc123",
      prompt: "Summarize this public video.",
    })).rejects.toMatchObject({ code: "CONFIGURATION_REQUIRED" } satisfies Partial<SupadataRequestError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records a bounded task-event message when an unknown provider exception occurs", async () => {
    ENV.supadataApiKey = "test-key";
    vi.mocked(assertPublicWebDestination).mockResolvedValue(new URL("https://www.youtube.com/watch?v=abc123"));
    vi.mocked(enforceRateLimit).mockResolvedValue(undefined);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:443 secret=should-not-render"));

    await expect(executeSupadataPublicVideoUnderstanding({
      taskId: "task-1",
      userId: 1,
      sourceUrl: "https://www.youtube.com/watch?v=abc123",
      prompt: "Summarize this public video.",
    })).rejects.toMatchObject({
      code: "PROVIDER_FAILED",
      message: "Public video understanding could not be completed. Try again shortly.",
    } satisfies Partial<SupadataRequestError>);

    expect(appendTaskEvent).toHaveBeenLastCalledWith("task-1", {
      type: "error",
      payload: {
        code: "PROVIDER_FAILED",
        message: "Public video understanding could not be completed. Try again shortly.",
      },
    });
  });
});
