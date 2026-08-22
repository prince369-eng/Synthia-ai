import { describe, expect, it } from "vitest";
import { boundedPositiveInteger, configuredProviderDefaults, isExplicitlyEnabled, publicHostnameAllowlist, safeProviderBaseUrl } from "./env";

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

  it("requires an explicit true value before public-web capability configuration is enabled", () => {
    expect(isExplicitlyEnabled(undefined)).toBe(false);
    expect(isExplicitlyEnabled("")).toBe(false);
    expect(isExplicitlyEnabled("false")).toBe(false);
    expect(isExplicitlyEnabled("TRUE")).toBe(false);
    expect(isExplicitlyEnabled("true")).toBe(true);
  });

  it("falls back for malformed safety limits and clamps valid values at their configured maximum", () => {
    const taskTimeout = { min: 60, max: 86_400 };
    expect(boundedPositiveInteger(undefined, 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("", 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("NaN", 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("Infinity", 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("-1", 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("59", 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("3600.5", 7_200, taskTimeout)).toBe(7_200);
    expect(boundedPositiveInteger("3600", 7_200, taskTimeout)).toBe(3_600);
    expect(boundedPositiveInteger("90000", 7_200, taskTimeout)).toBe(86_400);
  });

  it("normalizes host allowlists to unique public domain names without URL or local-network syntax", () => {
    expect(publicHostnameAllowlist(" Docs.Example.Test.,docs.example.test,cdn.aihubmix.com ")).toEqual([
      "docs.example.test",
      "cdn.aihubmix.com",
    ]);
    expect(publicHostnameAllowlist("https://example.test,example.test:443,127.0.0.1,::1,localhost,api.local,metadata.google.internal,*.example.test,example")).toEqual([]);
  });

  it("keeps only canonical HTTPS provider bases before credentialed clients use them", () => {
    const fallback = "https://provider.example/v1";
    expect(safeProviderBaseUrl("https://provider.example/v1/", fallback)).toBe("https://provider.example/v1");
    for (const value of [
      "http://provider.example/v1",
      "https://token@provider.example/v1",
      "https://provider.example:8443/v1",
      "https://provider.example/v1?target=other",
      "https://provider.example/v1#fragment",
      "not a url",
    ]) expect(safeProviderBaseUrl(value, fallback)).toBe(fallback);
  });
});
