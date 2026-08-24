import pino from "pino";
import { ENV } from "../_core/env";

export const REDACTED_PATHS = [
  "apiKey",
  "api_key",
  "accessToken",
  "refreshToken",
  "encryptedAccessToken",
  "encryptedRefreshToken",
  "token",
  "sessionToken",
  "sessionCookie",
  "secret",
  "clientSecret",
  "authorization",
  "cookie",
  "headers.authorization",
  "headers.cookie",
  "headers.x-api-key",
  "headers.x-goog-api-key",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.x-api-key",
  "req.headers.x-goog-api-key",
  "password",
];

export const logger = pino({
  level: ENV.logLevel,
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  base: { service: "synthia-ai" },
});
