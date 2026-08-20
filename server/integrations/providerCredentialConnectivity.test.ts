import { Sandbox as HopxSandbox } from "@hopx-ai/sdk";
import { HyperbrowserClient } from "@hyperbrowser/sdk";
import { describe, expect, it } from "vitest";
import { ENV } from "../_core/env";

const shouldRun = process.env.SYNTHIA_RUN_LIVE_PROVIDER_CREDENTIAL_CHECK === "true";
const liveIt = shouldRun ? it : it.skip;
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchJson(url: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    expect(response.ok).toBe(true);
    return await response.json() as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

describe("provider credential connectivity", () => {
  liveIt("validates AIHubMix through its documented non-generative model-management endpoint", async () => {
    expect(ENV.aihubmixApiKey).toBeTruthy();
    const payload = await fetchJson("https://aihubmix.com/api/v1/models", ENV.aihubmixApiKey);
    expect(Array.isArray((payload as { data?: unknown }).data)).toBe(true);
  });

  liveIt("validates the HopX key and selected template through read-only template listing without provisioning a sandbox", async () => {
    expect(ENV.hopxApiKey).toBeTruthy();
    expect(ENV.hopxTemplateId).toBeTruthy();
    const templates = await HopxSandbox.listTemplates({
      apiKey: ENV.hopxApiKey,
      baseURL: ENV.hopxBaseUrl,
    });
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.some(template => template.id === ENV.hopxTemplateId || template.name === ENV.hopxTemplateId)).toBe(true);
  });

  liveIt("validates Hyperbrowser through its read-only active-session count without creating a browser session", async () => {
    expect(ENV.hyperbrowserApiKey).toBeTruthy();
    const client = new HyperbrowserClient({
      apiKey: ENV.hyperbrowserApiKey,
      baseUrl: ENV.hyperbrowserBaseUrl,
      timeout: REQUEST_TIMEOUT_MS,
    });
    const response = await client.sessions.getActiveSessionsCount();
    expect(response).toBeDefined();
  });

  it("keeps Agnes AI and Pixazo configuration-only until a documented non-generative endpoint or an explicitly approved live workload is available", () => {
    expect(Boolean(ENV.agnesApiKey)).toBe(true);
    expect(Boolean(ENV.pixazoApiKey)).toBe(true);
  });
});
