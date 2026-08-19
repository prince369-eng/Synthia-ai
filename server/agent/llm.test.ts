import { describe, expect, it } from "vitest";
import { parseStructuredModelOutput } from "./llm";

describe("structured model output parsing", () => {
  it("accepts direct JSON agent decisions", () => {
    expect(parseStructuredModelOutput<{ narration: string }>(`{"narration":"Inspecting the task."}`)).toEqual({ narration: "Inspecting the task." });
  });

  it("accepts JSON fenced by a provider despite the JSON-only instruction", () => {
    expect(parseStructuredModelOutput<{ action: { kind: string } }>("```json\n{\"action\":{\"kind\":\"complete\"}}\n```"))
      .toEqual({ action: { kind: "complete" } });
  });

  it("rejects malformed model content before action validation", () => {
    expect(() => parseStructuredModelOutput("this is not JSON")).toThrow("valid JSON");
  });
});
