import { describe, expect, it } from "vitest";
import { assertDockerSandboxId, assertViewOnlyTerminalCommand, dockerSandboxRunArguments, sandboxOperationFailure } from "./sandbox";

describe("interactive terminal policy", () => {
  it("permits bounded read-only inspection commands within the workspace", () => {
    expect(assertViewOnlyTerminalCommand("pwd")).toBe("pwd");
    expect(assertViewOnlyTerminalCommand("ls -la /workspace")).toBe("ls -la /workspace");
    expect(assertViewOnlyTerminalCommand("cat /workspace/readme.md")).toBe("cat /workspace/readme.md");
    expect(assertViewOnlyTerminalCommand("git diff")).toBe("git diff");
  });

  it("rejects execution, chaining, traversal, and non-workspace paths", () => {
    for (const command of ["rm -rf /workspace", "cat /etc/passwd", "cat /workspace/../secret", "pwd && whoami", "curl https://example.com"]) {
      expect(() => assertViewOnlyTerminalCommand(command)).toThrow("Interactive terminal access is limited");
    }
  });
});

describe("local Docker sandbox isolation", () => {
  it("uses the same bounded runtime controls for fresh and restored container starts", () => {
    const args = dockerSandboxRunArguments("synthia-restore-checkpoint-123", "synthia-checkpoint:latest");
    expect(args).toEqual(expect.arrayContaining(["--network", "none", "--read-only", "--pids-limit", "256", "--tmpfs", "/workspace:rw,nosuid,size=512m"]));
    expect(args.slice(-3)).toEqual(["synthia-checkpoint:latest", "sleep", "infinity"]);
  });

  it("accepts only application-owned Docker sandbox descriptors", () => {
    expect(assertDockerSandboxId("synthia-task_123.abc")).toBe("synthia-task_123.abc");
    for (const value of ["", "other-container", "--privileged", "synthia-../../host", "synthia-task with space"]) {
      expect(() => assertDockerSandboxId(value)).toThrow("Invalid Docker sandbox descriptor");
    }
  });
});

describe("sandbox failure boundary", () => {
  it("returns stable operation-specific failures without command or provider detail", () => {
    expect(sandboxOperationFailure("openUrl").message).toBe("The sandbox browser could not open the requested URL.");
    expect(sandboxOperationFailure("readFile").message).toBe("The sandbox file could not be read.");
    expect(sandboxOperationFailure("writeFile").message).toBe("The sandbox file could not be written.");
    expect(sandboxOperationFailure("checkpoint").message).toBe("The sandbox checkpoint could not be created.");
  });
});
