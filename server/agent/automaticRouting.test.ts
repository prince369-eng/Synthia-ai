import { describe, expect, it } from "vitest";
import { resolveAutomaticTaskModel } from "./automaticRouting";

const models = [
  { id: "aihubmix:glm-5.2-free", provider: "aihubmix" as const, model: "glm-5.2-free", label: "Primary" as const, capabilities: ["text"] },
  { id: "aihubmix:coding-glm-5.2-free", provider: "aihubmix" as const, model: "coding-glm-5.2-free", label: "Configured" as const, capabilities: ["text"] },
  { id: "agnes:agnes-2.0-flash", provider: "agnes" as const, model: "agnes-2.0-flash", label: "Configured" as const, capabilities: ["text", "vision"] },
];

describe("resolveAutomaticTaskModel", () => {
  it("preserves a user's explicit model selection", () => {
    expect(resolveAutomaticTaskModel({ selectedModel: { provider: "agnes", model: "agnes-2.0-flash" }, involvesCode: true, attachments: [{ fileType: "image/png" }], models })).toEqual({ model: { provider: "agnes", model: "agnes-2.0-flash" }, reason: "manual" });
  });

  it("selects an available vision route for visual attachments", () => {
    expect(resolveAutomaticTaskModel({ involvesCode: false, attachments: [{ fileType: "image/webp" }], models })).toEqual({ model: { provider: "agnes", model: "agnes-2.0-flash" }, reason: "vision_input" });
  });

  it("selects an available code-focused route for development tasks", () => {
    expect(resolveAutomaticTaskModel({ involvesCode: true, attachments: [], models })).toEqual({ model: { provider: "aihubmix", model: "coding-glm-5.2-free" }, reason: "code_task" });
  });

  it("falls back to the configured primary route for ordinary tasks", () => {
    expect(resolveAutomaticTaskModel({ involvesCode: false, attachments: [], models })).toEqual({ model: { provider: "aihubmix", model: "glm-5.2-free" }, reason: "primary" });
  });
});
