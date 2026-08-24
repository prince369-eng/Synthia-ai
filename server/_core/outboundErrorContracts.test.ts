import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const coreDirectory = path.resolve(import.meta.dirname);

describe("core outbound error contracts", () => {
  it("retains numeric status while excluding provider-controlled response text and status text", () => {
    const contracts = [
      { file: "imageGeneration.ts", messages: ["Image generation request failed with HTTP", "List image models failed with HTTP"] },
      { file: "map.ts", messages: ["Google Maps API request failed with HTTP"] },
      { file: "llm.ts", messages: ["LLM invoke failed with HTTP", "List LLM models failed with HTTP"] },
    ];

    for (const contract of contracts) {
      const source = fs.readFileSync(path.join(coreDirectory, contract.file), "utf8");
      expect(source).not.toContain("response.text()");
      expect(source).not.toContain("response.statusText");
      for (const message of contract.messages) {
        expect(source).toContain(message);
      }
    }
  });
});
