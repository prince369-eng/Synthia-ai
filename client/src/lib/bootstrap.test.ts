import { describe, expect, it } from "vitest";
import { shouldMountSynthiaWorkspace } from "./bootstrap";

describe("shouldMountSynthiaWorkspace", () => {
  it("allows exactly the first compatible preview bundle to mount the workspace root", () => {
    expect(shouldMountSynthiaWorkspace(undefined)).toBe(true);
    expect(shouldMountSynthiaWorkspace(false)).toBe(true);
    expect(shouldMountSynthiaWorkspace(true)).toBe(false);
  });
});
