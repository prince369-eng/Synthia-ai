import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("client error disclosure hardening", () => {
  it("classifies client diagnostics without logging or rendering raw error details", () => {
    const main = readFileSync(new URL("../client/src/main.tsx", import.meta.url), "utf8");

    expect(main).toContain("function classifyClientError");
    expect(main).toContain('console.error("[Synthia client error]", { scope, category: classifyClientError(error) });');
    expect(main).toContain('reportClientError("query", error);');
    expect(main).toContain('reportClientError("mutation", error);');
    expect(main).toContain('reportClientError("bootstrap", error);');
    expect(main).not.toContain('console.error("[API Query Error]", error);');
    expect(main).not.toContain('console.error("[API Mutation Error]", error);');
    expect(main).not.toContain('console.error("[Synthia bootstrap error]", error);');
    expect(main).not.toContain("synthia-bootstrap-error");
    expect(main).not.toContain("error.message.slice(0, 220)");
  });
});
