import pino from "pino";
import { describe, expect, it } from "vitest";
import { REDACTED_PATHS } from "./logger";

describe("structured logger redaction", () => {
  it("censors direct, nested, and request-header credential fields before serialization", () => {
    const lines: string[] = [];
    const testLogger = pino(
      { redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" } },
      { write: (line) => lines.push(String(line)) },
    );
    const credentialFields = {
      apiKey: "api-key-value",
      api_key: "api-key-snake-value",
      accessToken: "access-token-value",
      refreshToken: "refresh-token-value",
      token: "token-value",
      sessionToken: "session-token-value",
      sessionCookie: "session-cookie-value",
      secret: "secret-value",
      clientSecret: "client-secret-value",
      authorization: "authorization-value",
      cookie: "cookie-value",
      password: "password-value",
    };
    const secrets = {
      ...credentialFields,
      headers: {
        authorization: "nested-authorization-value",
        cookie: "nested-cookie-value",
        "x-api-key": "nested-api-key-value",
        "x-goog-api-key": "nested-goog-api-key-value",
      },
      req: {
        headers: {
          authorization: "request-authorization-value",
          cookie: "request-cookie-value",
          "x-api-key": "request-api-key-value",
          "x-goog-api-key": "request-goog-api-key-value",
        },
      },
      event: "safe_event",
    };

    testLogger.info(secrets, "safe log message");

    const serialized = lines.join("");
    for (const value of Object.values(credentialFields)) {
      expect(serialized).not.toContain(value);
    }
    for (const value of Object.values(secrets.headers)) {
      expect(serialized).not.toContain(value);
    }
    for (const value of Object.values(secrets.req.headers)) {
      expect(serialized).not.toContain(value);
    }
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).toContain("safe_event");
  });
});
