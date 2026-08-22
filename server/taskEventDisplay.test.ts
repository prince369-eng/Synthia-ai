import { describe, expect, it } from "vitest";
import { redactTaskEventPayload } from "../client/src/lib/taskEventDisplay";

describe("task event terminal display redaction", () => {
  it("redacts sensitive field values and credential-shaped text without mutating the source payload", () => {
    const payload = {
      apiKey: "secret-api-value",
      output: "Authorization: Bearer token-value https://owner:password@example.com/file?access_token=query-token",
      nested: { client_secret: "client-secret-value", detail: "safe detail" },
    };

    const rendered = redactTaskEventPayload(payload);
    const serialized = JSON.stringify(rendered);

    expect(serialized).not.toContain("secret-api-value");
    expect(serialized).not.toContain("token-value");
    expect(serialized).not.toContain("password@example.com");
    expect(serialized).not.toContain("query-token");
    expect(serialized).toContain("safe detail");
    expect(payload.apiKey).toBe("secret-api-value");
    expect(payload.nested.client_secret).toBe("client-secret-value");
  });

  it("bounds deeply nested and oversized payloads for terminal display", () => {
    const deep: { child?: unknown } = {};
    let cursor = deep;
    for (let index = 0; index < 10; index += 1) {
      cursor.child = {};
      cursor = cursor.child as { child?: unknown };
    }

    const rendered = redactTaskEventPayload({ deep, entries: Array.from({ length: 102 }, (_, index) => index) }) as Record<string, unknown>;
    expect(JSON.stringify(rendered.deep)).toContain("redacted nested value");
    expect(rendered.entries).toEqual(expect.arrayContaining(["[2 additional items omitted]"]));
  });
});
