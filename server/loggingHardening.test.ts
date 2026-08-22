import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("./", import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("structured logging hardening", () => {
  it("keeps request, connector, event-stream, and infrastructure failure logs on the redaction-aware logger", () => {
    const modules = [
      "routers.ts",
      "_core/index.ts",
      "_core/llm.ts",
      "_core/notification.ts",
      "_core/oauth.ts",
      "_core/sdk.ts",
      "_core/trpc.ts",
      "_core/vite.ts",
      "integrations/appConnectors.ts",
      "realtime/taskEventStream.ts",
      "scheduledWorkflows.ts",
    ];

    for (const path of modules) {
      const contents = source(path);
      expect(contents).toContain("logger");
      expect(contents).not.toMatch(/console\.(log|warn|error|info)/);
      expect(contents).not.toMatch(/logger\.(error|warn)\(\{[^\n]*error\.message/);
      expect(contents).not.toMatch(/logger\.(error|warn)\([\s\S]*?,\s*error\.message\s*\)/);
    }
  });

  it("retains central redaction coverage for high-risk credential fields", () => {
    const loggerSource = source("security/logger.ts");

    expect(loggerSource).toContain('"apiKey"');
    expect(loggerSource).toContain('"accessToken"');
    expect(loggerSource).toContain('"refreshToken"');
    expect(loggerSource).toContain('"authorization"');
    expect(loggerSource).toContain('"password"');
  });
});
