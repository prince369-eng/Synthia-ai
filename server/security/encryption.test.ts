import { afterEach, describe, expect, it, vi } from "vitest";

const originalKey = process.env.SYNTHIA_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.SYNTHIA_ENCRYPTION_KEY;
  else process.env.SYNTHIA_ENCRYPTION_KEY = originalKey;
  vi.resetModules();
});

describe("integration secret encryption", () => {
  it("round-trips an integration token through AES-256-GCM", async () => {
    process.env.SYNTHIA_ENCRYPTION_KEY = "a".repeat(64);
    vi.resetModules();
    const { decryptSecret, encryptSecret } = await import("./encryption");
    const encrypted = encryptSecret("sensitive-provider-token");
    expect(encrypted).not.toContain("sensitive-provider-token");
    expect(decryptSecret(encrypted)).toBe("sensitive-provider-token");
  });

  it("rejects persistence attempts when the application encryption key is absent", async () => {
    delete process.env.SYNTHIA_ENCRYPTION_KEY;
    vi.resetModules();
    const { encryptSecret } = await import("./encryption");
    expect(() => encryptSecret("token")).toThrow("SYNTHIA_ENCRYPTION_KEY is required");
  });
});
