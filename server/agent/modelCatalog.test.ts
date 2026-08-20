import { describe, expect, it } from "vitest";
import { configuredComposerModels } from "./modelCatalog";

describe("configuredComposerModels", () => {
  it("routes provider-qualified model entries to their own configured provider", () => {
    const models = configuredComposerModels({
      orchestratorProvider: "aihubmix",
      orchestratorModel: "glm-5.2-free",
      subtaskProvider: "",
      subtaskModel: "",
      availableModels: ["aihubmix:glm-5.2-free", "agnes:agnes-2.0-flash", "coding-glm-5.2-free"],
      visionModels: [],
      configuredProviders: { groq: false, agnes: true, aihubmix: true, openrouter: false, gemini: false, deepseek: false },
    });

    expect(models).toEqual([
      { id: "aihubmix:glm-5.2-free", provider: "aihubmix", model: "glm-5.2-free", label: "Primary", capabilities: ["text"] },
      { id: "agnes:agnes-2.0-flash", provider: "agnes", model: "agnes-2.0-flash", label: "Configured", capabilities: ["text"] },
      { id: "aihubmix:coding-glm-5.2-free", provider: "aihubmix", model: "coding-glm-5.2-free", label: "Configured", capabilities: ["text"] },
    ]);
  });

  it("omits entries whose provider is not configured rather than silently rerouting them", () => {
    const models = configuredComposerModels({
      orchestratorProvider: "aihubmix",
      orchestratorModel: "glm-5.2-free",
      subtaskProvider: "",
      subtaskModel: "",
      availableModels: ["agnes:agnes-2.0-flash"],
      visionModels: [],
      configuredProviders: { groq: false, agnes: false, aihubmix: true, openrouter: false, gemini: false, deepseek: false },
    });

    expect(models.map(model => model.id)).toEqual(["aihubmix:glm-5.2-free"]);
  });
});
