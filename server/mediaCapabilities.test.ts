import { describe, expect, it } from "vitest";
import { mediaReadiness } from "./mediaCapabilities";

describe("mediaReadiness", () => {
  it("enables the confirmed Gemini image and Gemini Omni Flash video paths only with credentials and model lists", () => {
    const result = mediaReadiness({
      geminiApiKey: "gemini-test-key",
      imageProvider: "gemini",
      imageModels: ["gemini-3.1-flash-image"],
      videoProvider: "gemini-omni-flash",
      videoModels: ["gemini-omni-flash"],
    });

    expect(result.image).toMatchObject({
      provider: "gemini",
      models: ["gemini-3.1-flash-image"],
      configured: true,
      route: "server/media/gemini-image.ts",
    });
    expect(result.video).toMatchObject({
      provider: "gemini-omni-flash",
      models: ["gemini-omni-flash"],
      configured: true,
      route: "server/media/gemini-video.ts",
    });
    expect(result.image.reason).toBeUndefined();
    expect(result.video.reason).toBeUndefined();
  });

  it("keeps generation unavailable when the selected provider has no credential", () => {
    const result = mediaReadiness({
      imageProvider: "gemini",
      imageModels: ["gemini-3.1-flash-image"],
      videoProvider: "gemini-omni-flash",
      videoModels: ["gemini-omni-flash"],
    });

    expect(result.image.configured).toBe(false);
    expect(result.video.configured).toBe(false);
    expect(result.image.reason).toContain("real image provider credential");
    expect(result.video.reason).toContain("real video provider credential");
  });

  it("requires an endpoint for the built-in Forge image path", () => {
    const withoutEndpoint = mediaReadiness({
      forgeApiKey: "forge-key",
      imageProvider: "forge",
      imageModels: ["MODEL_GPT_IMAGE_2"],
    });
    const withEndpoint = mediaReadiness({
      forgeApiUrl: "https://forge.example",
      forgeApiKey: "forge-key",
      imageProvider: "forge",
      imageModels: ["MODEL_GPT_IMAGE_2"],
    });

    expect(withoutEndpoint.image.configured).toBe(false);
    expect(withEndpoint.image.configured).toBe(true);
  });
});
