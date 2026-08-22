import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_SESSION_TTL_MS } from "./_core/sdk";
import { normalizeSignedStorageRedirect, normalizeStorageKey } from "./_core/storageProxy";

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

  it("accepts only credential-free default-port HTTPS signed URLs", () => {
    expect(normalizeSignedStorageRedirect("https://storage.example.com/object?signature=abc")).toBe("https://storage.example.com/object?signature=abc");
    expect(normalizeSignedStorageRedirect("http://storage.example.com/object")).toBeNull();
    expect(normalizeSignedStorageRedirect("https://user:secret@storage.example.com/object")).toBeNull();
    expect(normalizeSignedStorageRedirect("https://storage.example.com:8443/object")).toBeNull();
    expect(normalizeSignedStorageRedirect("javascript:alert(1)")).toBeNull();
  });

  it("keeps proxy failure diagnostics classified rather than raw", () => {
    const source = readFileSync(new URL("./_core/storageProxy.ts", import.meta.url), "utf8");
    expect(source).toContain("errorType: errorKind(err)");
    expect(source).not.toContain("err instanceof Error ? err.message");
  });
});
