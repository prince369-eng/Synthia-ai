import { describe, expect, it } from "vitest";
import { resolveAutomaticTaskRoute } from "../../shared/automaticTaskRouting";

const readyMedia = {
  image: { configured: true, provider: "pixazo" as const, models: ["flux"] },
  video: { configured: true, provider: "pixazo" as const, models: ["ltx"] },
  audio: { configured: true, provider: "pixazo" as const, models: ["tracks"] },
};

describe("Automatic public-media routing", () => {
  it("chooses configured public-video understanding from an eligible social URL without calling a provider", () => {
    expect(resolveAutomaticTaskRoute({
      goal: "Analyze the key takeaways in https://www.youtube.com/watch?v=abc123 for a product brief.",
      attachments: [],
      media: readyMedia,
      publicMedia: { configured: true },
    })).toEqual({
      kind: "public_video",
      reason: "public_media",
      requestedKind: "public_video",
      provider: "supadata",
      sourceUrl: "https://www.youtube.com/watch?v=abc123",
    });
  });

  it("preserves a no-provider fallback when the public-media credential is absent", () => {
    expect(resolveAutomaticTaskRoute({
      goal: "Summarize https://www.tiktok.com/@creator/video/12345 for me.",
      attachments: [],
      media: readyMedia,
      publicMedia: { configured: false },
    })).toEqual({
      kind: "text",
      reason: "public_media_unavailable",
      requestedKind: "public_video",
      sourceUrl: "https://www.tiktok.com/@creator/video/12345",
    });
  });
});
