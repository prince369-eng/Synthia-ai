import { ENV } from "../_core/env";
import { describe, expect, it } from "vitest";

const liveConnectivityEnabled = process.env.SYNTHIA_RUN_LIVE_AIHUBMIX_CONNECTIVITY_CHECK === "true";
const canRun = liveConnectivityEnabled && Boolean(ENV.aihubmixApiKey);

describe.skipIf(!canRun)("AIHubMix live connectivity", () => {
  it("lists available models without starting a chat, code, reasoning, image, video, audio, or browser workload", async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`${ENV.aihubmixBaseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${ENV.aihubmixApiKey}` },
        signal: controller.signal,
      });
      expect(response.ok).toBe(true);
      const payload = await response.json() as { data?: unknown };
      expect(Array.isArray(payload.data)).toBe(true);
    } finally {
      clearTimeout(timeout);
    }
  });
});
