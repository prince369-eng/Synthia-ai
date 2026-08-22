import { describe, expect, it } from "vitest";
import { normalizeInternalNavigationPath } from "../client/src/lib/internalNavigation";

describe("normalizeInternalNavigationPath", () => {
  it("retains canonical same-origin application paths", () => {
    expect(normalizeInternalNavigationPath("/settings?section=security#controls")).toBe("/settings?section=security#controls");
    expect(normalizeInternalNavigationPath("/workspace/../plugins")).toBe("/plugins");
  });

  it("rejects external, protocol-relative, malformed, and non-path values", () => {
    for (const hostileValue of ["https://example.test", "//example.test", "/\\example.test", "javascript:alert(1)", "settings", "\u0000/unsafe", null]) {
      expect(normalizeInternalNavigationPath(hostileValue)).toBeNull();
    }
  });
});
