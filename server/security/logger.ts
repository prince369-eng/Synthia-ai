import pino from "pino";
import { ENV } from "../_core/env";

const REDACTED_PATHS = [
  "apiKey",
  "accessToken",
  "refreshToken",
  "encryptedAccessToken",
  "encryptedRefreshToken",
  "authorization",
  "headers.authorization",
  "req.headers.authorization",
  "password",
];

export const logger = pino({
  level: ENV.logLevel,
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  base: { service: "synthia-ai" },
});
