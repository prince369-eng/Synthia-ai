import { describe, expect, it } from "vitest";
import { configuredProviderDefaults } from "./env";

describe("configuredProviderDefaults", () => {
  it("uses the user-approved free-tier, vision, Pixazo, and public-facing task defaults when no non-secret override exists", () => {
    const result = configuredProviderDefaults({});

    expect(result.availableModels).toEqual([
      "aihubmix:glm-5.2-free",
      "aihubmix:gemini-3.7-flash-free",
      "aihubmix:coding-glm-5.2-free",
      "aihubmix:coding-kimi-k3-free",
      "aihubmix:gpt-oss-20b-free",
      "agnes:agnes-2.0-flash",
    ]);
    expect(result.visionModels).toEqual(["agnes:agnes-2.0-flash"]);
    expect(result).toMatchObject({ imageProvider: "pixazo", imageModels: ["flux"], videoProvider: "pixazo", videoModels: ["ltx"], audioProvider: "pixazo", audioModels: ["tracks"], pixazoAudioModels: ["tracks"], pixazoGenerationEnabled: "true" });
  });

  it("honors an explicit production override for a capability configuration", () => {
    const result = configuredProviderDefaults({ SYNTHIA_IMAGE_PROVIDER: "gemini", SYNTHIA_IMAGE_MODELS: "gemini-3.1-flash-image", PIXAZO_IMAGE_MODELS: "custom-flux", PIXAZO_AUDIO_MODELS: "custom-tracks", SYNTHIA_PIXAZO_GENERATION_ENABLED: "false" });

    expect(result.imageProvider).toBe("gemini");
    expect(result.imageModels).toEqual(["gemini-3.1-flash-image"]);
    expect(result.pixazoImageModels).toEqual(["custom-flux"]);
    expect(result.pixazoAudioModels).toEqual(["custom-tracks"]);
    expect(result.pixazoGenerationEnabled).toBe("false");
  });
});
