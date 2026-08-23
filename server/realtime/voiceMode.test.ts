import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RoomServiceClient } from "livekit-server-sdk";
import { describe, expect, it } from "vitest";
import { ENV } from "../_core/env";
import { getVoiceModeAvailability } from "./voiceMode";

function configuredRealtime(overrides: Record<string, unknown> = {}) {
  return {
    ...ENV,
    realtimeVoiceEnabled: true,
    realtimeProvider: "gemini_live",
    realtimeVoiceWorkerReady: true,
    livekitUrl: "wss://example.livekit.cloud",
    livekitApiKey: "livekit-key",
    livekitApiSecret: "livekit-secret",
    geminiApiKey: "gemini-key",
    ...overrides,
  } as typeof ENV;
}

describe("Voice Mode availability gate", () => {
  it("remains disabled unless an operator explicitly enables realtime Voice Mode", () => {
    const availability = getVoiceModeAvailability(configuredRealtime({ realtimeVoiceEnabled: false }));

    expect(availability).toMatchObject({ available: false, provider: "gemini_live", transport: "livekit" });
    expect(availability.reason).toContain("disabled");
  });

  it("refuses an incomplete deployment before a browser can request a room token", () => {
    const workerMissing = getVoiceModeAvailability(configuredRealtime({ realtimeVoiceWorkerReady: false }));
    const credentialsMissing = getVoiceModeAvailability(configuredRealtime({ livekitApiSecret: "" }));
    const providerMismatch = getVoiceModeAvailability(configuredRealtime({ realtimeProvider: "other" }));

    expect(workerMissing.available).toBe(false);
    expect(workerMissing.reason).toContain("always-on agent worker");
    expect(credentialsMissing.available).toBe(false);
    expect(credentialsMissing.reason).toContain("LiveKit URL, API key, and API secret");
    expect(providerMismatch.available).toBe(false);
    expect(providerMismatch.reason).toContain("Gemini Live");
  });

  it("reports an eligible realtime boundary only when every server-side prerequisite is deliberate", () => {
    expect(getVoiceModeAvailability(configuredRealtime())).toEqual({ available: true, provider: "gemini_live", transport: "livekit" });
  });

  it("persists bounded recovery guidance rather than raw dispatch exceptions", () => {
    const source = readFileSync(resolve(process.cwd(), "server/realtime/voiceMode.ts"), "utf8");

    expect(source).toContain('const failureReason = "Voice Mode could not start. Review availability and try again.";');
    expect(source).not.toContain("const failureReason = error instanceof Error ? error.message");
  });

  it.skipIf(process.env.SYNTHIA_LIVEKIT_CONNECTIVITY_TEST !== "true")("validates configured LiveKit credentials through a read-only room-list authorization request", async () => {
    expect(ENV.livekitUrl).toMatch(/^wss?:\/\//);
    expect(ENV.livekitApiKey).not.toHaveLength(0);
    expect(ENV.livekitApiSecret).not.toHaveLength(0);

    const serviceUrl = ENV.livekitUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
    const client = new RoomServiceClient(serviceUrl, ENV.livekitApiKey, ENV.livekitApiSecret, { requestTimeout: 8_000 });
    const rooms = await client.listRooms();

    expect(Array.isArray(rooms)).toBe(true);
  });
});
