import { describe, expect, it } from "vitest";
import { DEFAULT_SESSION_TTL_MS } from "./_core/sdk";
import { normalizeStorageKey } from "./_core/storageProxy";

describe("production hardening guards", () => {
  it("uses a bounded seven-day session lifetime", () => {
    expect(DEFAULT_SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1_000);
  });

  it("rejects ambiguous and traversal-like storage keys before any storage lookup", () => {
    expect(normalizeStorageKey("tasks/task-1/report.pdf")).toBe("tasks/task-1/report.pdf");
    expect(normalizeStorageKey("../secrets.env")).toBeNull();
    expect(normalizeStorageKey("tasks//report.pdf")).toBeNull();
    expect(normalizeStorageKey("tasks\\report.pdf")).toBeNull();
    expect(normalizeStorageKey("/tasks/report.pdf")).toBeNull();
  });
});
