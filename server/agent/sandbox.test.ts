import { describe, expect, it } from "vitest";
import { assertViewOnlyTerminalCommand } from "./sandbox";

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
