import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("package-manager dependency build policy", () => {
  it("pins pnpm 10 and records reviewed allow and deny decisions for install hooks", () => {
    const workspacePolicy = readFileSync(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8");
    const packageManifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      packageManager?: string;
      scripts?: Record<string, string>;
    };

    expect(packageManifest.packageManager).toMatch(/^pnpm@10\.4\.1\+/);
    expect(packageManifest.scripts).not.toHaveProperty("preinstall");
    expect(packageManifest.scripts).not.toHaveProperty("install");
    expect(packageManifest.scripts).not.toHaveProperty("postinstall");
    expect(packageManifest.scripts).not.toHaveProperty("prepare");

    expect(workspacePolicy).toContain("strictDepBuilds: true");
    expect(workspacePolicy).toContain("onlyBuiltDependencies:");
    expect(workspacePolicy).toContain("  - '@tailwindcss/oxide'");
    expect(workspacePolicy).toContain("  - esbuild");
    expect(workspacePolicy).toContain("ignoredBuiltDependencies:");
    expect(workspacePolicy).toContain("  - '@google/genai'");
    expect(workspacePolicy).toContain("  - '@livekit/local-inference'");
    expect(workspacePolicy).toContain("  - msgpackr-extract");
    expect(workspacePolicy).toContain("  - protobufjs");
  });
});
