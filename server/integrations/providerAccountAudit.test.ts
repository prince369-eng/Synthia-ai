import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("provider account audit safety contract", () => {
  it("reports provider-returned usage fields without inventing a credit balance or serializing credentials", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/provider-account-audit.mjs"),
      "utf8",
    );

    expect(source).toContain("reportedTotalCredits");
    expect(source).toContain("reportedTotalUsage");
    expect(source).not.toContain("accountCreditBalance");
    expect(source).not.toMatch(/credentialAccepted:\s*apiKey/);
    expect(source).not.toMatch(/apiKey\s*:/);
  });
});
