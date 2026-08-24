import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../_core/env";
import { searchWeb } from "./search";

const environmentSnapshot = {
  tavilyApiKey: ENV.tavilyApiKey,
  serperApiKey: ENV.serperApiKey,
  searchPrimary: ENV.searchPrimary,
};

afterEach(() => {
  ENV.tavilyApiKey = environmentSnapshot.tavilyApiKey;
  ENV.serperApiKey = environmentSnapshot.serperApiKey;
  ENV.searchPrimary = environmentSnapshot.searchPrimary;
  vi.unstubAllGlobals();
});

describe("agent search provider failures", () => {
  it("retains only provider and numeric status when an upstream response contains sensitive detail", async () => {
    ENV.tavilyApiKey = "tavily-test-key";
    ENV.serperApiKey = undefined;
    ENV.searchPrimary = "tavily";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "provider-internal-token" }), { status: 503 })));

    await expect(searchWeb("safe query")).rejects.toThrow("No configured search provider completed the request (tavily:http_503).");
    await expect(searchWeb("safe query")).rejects.not.toThrow("provider-internal-token");
  });

  it("reports a bounded unavailable marker for transport failures", async () => {
    ENV.tavilyApiKey = "tavily-test-key";
    ENV.serperApiKey = undefined;
    ENV.searchPrimary = "tavily";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failure with internal endpoint")));

    await expect(searchWeb("safe query")).rejects.toThrow("No configured search provider completed the request (tavily:unavailable).");
  });
});
