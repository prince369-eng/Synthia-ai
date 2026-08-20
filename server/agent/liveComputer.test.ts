import { describe, expect, it } from "vitest";
import type { SandboxProvider } from "./sandbox";
import { assertSafeLiveComputerPath, captureLiveComputerScreen, listLiveComputerFiles, liveComputerAvailability, readLiveComputerSource } from "./liveComputer";

const activeSandbox = {
  provider: "docker" as const,
  providerSandboxId: "task-sandbox-1",
  region: "local",
  maxSessionSeconds: 900,
  status: "active" as const,
};

function providerFixture(overrides: Partial<Pick<SandboxProvider, "execute" | "readFile" | "screenshot">> = {}) {
  return {
    execute: async () => ({ stdout: "/workspace\n/workspace/src\n/workspace/src/App.tsx\n/workspace/.env\n/workspace/secret-token.txt\n", stderr: "", exitCode: 0 }),
    readFile: async () => "export const taskOwned = true;",
    screenshot: async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" as const }),
    ...overrides,
  } as unknown as SandboxProvider;
}

describe("Live Computer task workspace safeguards", () => {
  it("reports a truthful unavailable state before an agent task creates a sandbox", () => {
    expect(liveComputerAvailability(undefined)).toMatchObject({ available: false, canCaptureScreen: false });
    expect(liveComputerAvailability({ ...activeSandbox, status: "destroyed" })).toMatchObject({ available: false, canCaptureScreen: false });
  });

  it("limits task workspace files to non-sensitive paths", async () => {
    const files = await listLiveComputerFiles({ sandbox: activeSandbox, provider: providerFixture() });
    expect(files.map(file => file.path)).toEqual(["/workspace/src", "/workspace/src/App.tsx"]);
  });

  it("rejects traversal and sensitive files before a sandbox is contacted", () => {
    expect(() => assertSafeLiveComputerPath("/workspace/src/../.env")).toThrow(/non-sensitive/i);
    expect(() => assertSafeLiveComputerPath("/workspace/.env")).toThrow(/non-sensitive/i);
    expect(() => assertSafeLiveComputerPath("/etc/passwd")).toThrow(/workspace/i);
  });

  it("opens only an authorized task workspace path through the read-only provider", async () => {
    const readFile = async () => "export const safe = true;";
    await expect(readLiveComputerSource({ sandbox: activeSandbox, path: "/workspace/src/App.tsx", provider: providerFixture({ readFile }) })).resolves.toEqual({
      path: "/workspace/src/App.tsx",
      content: "export const safe = true;",
      truncated: false,
    });
  });

  it("does not offer a graphical capture path for Docker tasks", async () => {
    await expect(captureLiveComputerScreen({ sandbox: activeSandbox, provider: providerFixture() })).rejects.toThrow(/no graphical screen/i);
  });
});
