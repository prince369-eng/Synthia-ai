import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./env";
import { notifyOwner } from "./notification";

const originalFetch = globalThis.fetch;
const originalForgeApiUrl = ENV.forgeApiUrl;
const originalForgeApiKey = ENV.forgeApiKey;

afterEach(() => {
  globalThis.fetch = originalFetch;
  ENV.forgeApiUrl = originalForgeApiUrl;
  ENV.forgeApiKey = originalForgeApiKey;
  vi.restoreAllMocks();
});

describe("owner notification delivery", () => {
  it("returns a client-safe unavailable response without requesting a missing configuration", async () => {
    ENV.forgeApiUrl = "";
    ENV.forgeApiKey = "";
    globalThis.fetch = vi.fn();

    await expect(notifyOwner({ title: "Operational notice", content: "A bounded test." }))
      .rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: "Notifications are unavailable. Try again later.",
      });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("retains client-correctable payload validation", async () => {
    await expect(notifyOwner({ title: "", content: "A bounded test." }))
      .rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Notification title is required.",
      });
  });
});
