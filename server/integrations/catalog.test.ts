import { describe, expect, it } from "vitest";
import { serviceConnectionStatus, serviceReadinessForUser, systemServiceReadiness } from "./catalog";

describe("serviceConnectionStatus", () => {
  it("separates active providers from configured but inactive providers", () => {
    expect(serviceConnectionStatus(true, true)).toBe("active");
    expect(serviceConnectionStatus(true, false)).toBe("configured");
  });

  it("never reports an active provider when credentials are absent", () => {
    expect(serviceConnectionStatus(false, false)).toBe("credentials_required");
    expect(serviceConnectionStatus(false, true)).toBe("credentials_required");
  });

  it("distinguishes an actual user connection from configured or missing OAuth credentials", () => {
    const now = new Date("2026-08-19T00:00:00.000Z");
    const states = serviceReadinessForUser([{ provider: "google", expiresAt: new Date("2026-09-01T00:00:00.000Z") }], now);
    const google = states.find(service => service.id === "google");
    const slack = states.find(service => service.id === "slack");

    expect(google?.status).toBe("connected");
    expect(google?.active).toBe(true);
    expect(slack?.status).toBe(slack?.configured ? "ready_to_connect" : "missing_credentials");
    expect(slack?.active).toBe(false);
  });

  it("includes Redis as a credential-safe queue readiness service", () => {
    const redis = systemServiceReadiness().find(service => service.id === "redis");

    expect(redis).toMatchObject({
      label: "Redis",
      category: "queue",
      requiredEnvironment: ["REDIS_URL"],
    });
    expect(redis).not.toHaveProperty("value");
  });

  it("exposes Groq readiness metadata without exposing a configured key", () => {
    const groq = systemServiceReadiness().find(service => service.id === "groq");

    expect(groq).toMatchObject({
      label: "Groq",
      category: "model",
      requiredEnvironment: ["GROQ_API_KEY"],
    });
    expect(groq).not.toHaveProperty("value");
    expect(groq).not.toHaveProperty("apiKey");
  });

  it("lists the additional model and remote-browser providers with only required environment names", () => {
    const services = systemServiceReadiness();
    const agnes = services.find(service => service.id === "agnes");
    const aihubmix = services.find(service => service.id === "aihubmix");
    const hyperbrowser = services.find(service => service.id === "hyperbrowser");

    expect(agnes).toMatchObject({ label: "Agnes AI", category: "model", requiredEnvironment: ["AGNES_API_KEY", "AGNES_BASE_URL"] });
    expect(aihubmix).toMatchObject({ label: "AIHubMix", category: "model", requiredEnvironment: ["AIHUBMIX_API_KEY", "AIHUBMIX_BASE_URL", "AIHUBMIX_FALLBACK_BASE_URL"] });
    expect(hyperbrowser).toMatchObject({ label: "Hyperbrowser Agent Browser", category: "sandbox", requiredEnvironment: ["HYPERBROWSER_API_KEY", "SYNTHIA_AGENT_BROWSER_PROVIDER", "SYNTHIA_HYPERBROWSER_TIMEOUT_MINUTES", "SYNTHIA_HYPERBROWSER_ALLOWED_HOSTS"] });
    for (const service of [agnes, aihubmix, hyperbrowser]) {
      expect(service).not.toHaveProperty("value");
      expect(service).not.toHaveProperty("apiKey");
    }
  });

  it("keeps configured Pixazo and Hyperbrowser credentials distinct from actionable media and remote-browser capability", () => {
    const services = systemServiceReadiness();
    const pixazo = services.find(service => service.id === "pixazo");
    const hyperbrowser = services.find(service => service.id === "hyperbrowser");

    expect(pixazo).toMatchObject({ label: "Pixazo", category: "model" });
    expect(hyperbrowser).toMatchObject({ label: "Hyperbrowser Agent Browser", category: "sandbox" });
    expect(pixazo?.detail ?? "").not.toContain("API_KEY=");
    expect(hyperbrowser?.detail ?? "").not.toContain("API_KEY=");
  });
});
