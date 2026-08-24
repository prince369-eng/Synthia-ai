import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./env";
import { callDataApi } from "./dataApi";

const originalFetch = globalThis.fetch;
const originalForgeApiUrl = ENV.forgeApiUrl;
const originalForgeApiKey = ENV.forgeApiKey;

afterEach(() => {
  globalThis.fetch = originalFetch;
  ENV.forgeApiUrl = originalForgeApiUrl;
  ENV.forgeApiKey = originalForgeApiKey;
  vi.restoreAllMocks();
});

describe("core Data API adapter", () => {
  it("does not issue a request until its server-side configuration is present", async () => {
    ENV.forgeApiUrl = "";
    ENV.forgeApiKey = "";
    globalThis.fetch = vi.fn();

    await expect(callDataApi("Youtube/search")).rejects.toThrow("BUILT_IN_FORGE_API_URL is not configured");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns a bounded error without an upstream response body or status text", async () => {
    ENV.forgeApiUrl = "https://forge.example.test";
    ENV.forgeApiKey = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("provider-body secret=do-not-disclose", {
      status: 503,
      statusText: "provider status detail",
    }));

    await expect(callDataApi("Youtube/search")).rejects.toThrow("Data API request failed with HTTP 503");
    await expect(callDataApi("Youtube/search")).rejects.not.toThrow(/provider-body|status detail|secret/);
  });
});
