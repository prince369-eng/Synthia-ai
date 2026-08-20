import { ENV } from "../_core/env";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHyperbrowserSession,
  hyperbrowserSessionRequest,
  isHyperbrowserConfigured,
  stopHyperbrowserSession,
} from "./hyperbrowser";

const environmentSnapshot = {
  hyperbrowserApiKey: ENV.hyperbrowserApiKey,
  hyperbrowserTimeoutMinutes: ENV.hyperbrowserTimeoutMinutes,
  hyperbrowserAllowedHosts: [...ENV.hyperbrowserAllowedHosts],
};

afterEach(() => {
  ENV.hyperbrowserApiKey = environmentSnapshot.hyperbrowserApiKey;
  ENV.hyperbrowserTimeoutMinutes = environmentSnapshot.hyperbrowserTimeoutMinutes;
  ENV.hyperbrowserAllowedHosts = [...environmentSnapshot.hyperbrowserAllowedHosts];
});

describe("Hyperbrowser agent-browser safety contract", () => {
  it("keeps paid or privacy-sensitive browser options disabled and clamps session duration", () => {
    ENV.hyperbrowserAllowedHosts = ["docs.example.test"];
    const request = hyperbrowserSessionRequest(999);

    expect(request).toMatchObject({
      timeoutMinutes: 30,
      acceptCookies: false,
      useProxy: false,
      useStealth: false,
      useUltraStealth: false,
      solveCaptchas: false,
      enableWebRecording: false,
      enableVideoWebRecording: false,
      saveDownloads: false,
      disablePasswordManager: true,
      viewOnlyLiveView: true,
      allowOut: ["docs.example.test"],
    });
  });

  it("requires an API key before constructing a provider client", async () => {
    ENV.hyperbrowserApiKey = "";
    expect(isHyperbrowserConfigured()).toBe(false);
    await expect(createHyperbrowserSession({ taskId: "task-1" })).rejects.toThrow("HYPERBROWSER_API_KEY");
  });

  it("maps only task-safe session fields and uses idempotent stop through an injected client", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "session-1",
      status: "active",
      wsEndpoint: "wss://browser.example.test/session-1",
      liveUrl: "https://live.example.test/session-1",
      computerActionEndpoint: "https://computer.example.test/session-1",
    });
    const stop = vi.fn().mockResolvedValue({ success: true });
    const client = { sessions: { create, stop } } as never;

    const session = await createHyperbrowserSession({ taskId: "task-1", timeoutMinutes: 2, client });
    await stopHyperbrowserSession({ sessionId: session.providerSessionId, client });

    expect(session).toEqual({
      provider: "hyperbrowser",
      providerSessionId: "session-1",
      status: "active",
      wsEndpoint: "wss://browser.example.test/session-1",
      liveUrl: "https://live.example.test/session-1",
      computerActionEndpoint: "https://computer.example.test/session-1",
      maxSessionMinutes: 5,
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ timeoutMinutes: 5 }));
    expect(stop).toHaveBeenCalledWith("session-1");
  });
});
