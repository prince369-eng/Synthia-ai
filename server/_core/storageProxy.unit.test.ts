import { describe, expect, it } from "vitest";
import { normalizeSignedStorageRedirect, normalizeStorageKey } from "./storageProxy";

describe("authenticated storage proxy normalization", () => {
  it("preserves valid scoped storage keys and public HTTPS signed redirects", () => {
    expect(normalizeStorageKey("task-artifacts/42/report.pdf")).toBe("task-artifacts/42/report.pdf");
    expect(normalizeSignedStorageRedirect("https://bucket.s3.example.com/object?signature=opaque")).toBe(
      "https://bucket.s3.example.com/object?signature=opaque",
    );
  });

  it("rejects traversal-shaped storage keys", () => {
    expect(normalizeStorageKey("../private.txt")).toBeNull();
    expect(normalizeStorageKey("task-artifacts//report.pdf")).toBeNull();
    expect(normalizeStorageKey("task-artifacts\\report.pdf")).toBeNull();
  });

  it("rejects signed redirects to credential-bearing, local, internal, metadata, and literal-IP origins", () => {
    for (const value of [
      "https://token@bucket.s3.example.com/object",
      "https://localhost/object",
      "https://bucket.internal/object",
      "https://metadata.google.internal/object",
      "https://127.0.0.1/object",
      "https://[::1]/object",
      "https://bucket.s3.example.com:8443/object",
      "http://bucket.s3.example.com/object",
    ]) {
      expect(normalizeSignedStorageRedirect(value)).toBeNull();
    }
  });
});
