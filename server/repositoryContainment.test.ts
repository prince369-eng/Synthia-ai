import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("repository credential containment", () => {
  it("ignores root environment configuration variants without relying on secret contents", () => {
    const ignorePolicy = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");

    expect(ignorePolicy).toContain(".env\n");
    expect(ignorePolicy).toContain(".env.*\n");
    expect(ignorePolicy).toContain(".envrc\n");
    expect(ignorePolicy).toContain("dist/\n");
    expect(ignorePolicy).toContain("coverage/\n");
    expect(ignorePolicy).toContain("*.log\n");
  });
});
