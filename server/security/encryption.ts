import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ENV } from "../_core/env";

const VERSION = "v1";

function key() {
  const encoded = ENV.encryptionKey;
  if (!encoded) throw new Error("SYNTHIA_ENCRYPTION_KEY is required before saving connected-service tokens.");
  const candidate = /^[a-f0-9]{64}$/i.test(encoded) ? Buffer.from(encoded, "hex") : Buffer.from(encoded, "base64");
  if (candidate.length !== 32) throw new Error("SYNTHIA_ENCRYPTION_KEY must be a 32-byte base64 value or 64-character hex value.");
  return candidate;
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string) {
  const [version, ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) throw new Error("The encrypted secret format is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}
