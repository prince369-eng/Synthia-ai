import { describe, expect, it } from "vitest";
import { serviceConnectionStatus, serviceReadinessForUser } from "./catalog";

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
});
