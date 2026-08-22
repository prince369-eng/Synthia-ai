import { describe, expect, it } from "vitest";
import { isPublicHostname, normalizeExternalReferenceUrl, normalizeExternalResourceUrl } from "@shared/externalReference";

describe("external proof reference URL boundary", () => {
  it("canonicalizes public HTTPS evidence URLs without doing network work", () => {
    expect(normalizeExternalReferenceUrl(" https://Evidence.Example.com/findings ")).toBe("https://evidence.example.com/findings");
    expect(normalizeExternalReferenceUrl("https://evidence.example.com")).toBe("https://evidence.example.com/");
    expect(isPublicHostname("evidence.example.com")).toBe(true);
  });

  it.each([
    "http://evidence.example.com/report",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "https://user:secret@evidence.example.com/report",
    "https://evidence.example.com:8443/report",
    "https://evidence.example.com/report?token=secret",
    "https://evidence.example.com/report#fragment",
    "https://localhost/report",
    "https://api.localhost/report",
    "https://metadata.google.internal/report",
    "https://instance-data/report",
    "https://127.0.0.1/report",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/report",
    "https://internal/report",
    "not a url",
  ])("rejects unsafe or non-canonical external proof references: %s", value => {
    expect(normalizeExternalReferenceUrl(value)).toBeNull();
  });

  it("permits public icon query parameters but rejects unsafe resource URL shapes without loading them", () => {
    expect(normalizeExternalResourceUrl("https://CDN.Example.com/icon.svg?viewbox=auto")).toBe("https://cdn.example.com/icon.svg?viewbox=auto");
    for (const hostileValue of [
      "http://cdn.example.com/icon.svg",
      "https://user:secret@cdn.example.com/icon.svg",
      "https://cdn.example.com:8443/icon.svg",
      "https://cdn.example.com/icon.svg#fragment",
      "https://localhost/icon.svg",
      "https://169.254.169.254/icon.svg",
      "https://[::1]/icon.svg",
    ]) {
      expect(normalizeExternalResourceUrl(hostileValue)).toBeNull();
    }
  });
});
