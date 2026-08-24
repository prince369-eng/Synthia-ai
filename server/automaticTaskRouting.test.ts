import { describe, expect, it } from "vitest";
import { resolveAutomaticTaskRoute } from "@shared/automaticTaskRouting";

describe("automatic media task routing", () => {
  it("persists an ordered compatible media candidate list while retaining the selected primary route", () => {
    const route = resolveAutomaticTaskRoute({
      goal: "Create a short launch video for the product.",
      attachments: [],
      media: {
        image: { configured: false },
        video: {
          configured: true,
          provider: "pixazo",
          models: ["ltx"],
          candidates: [
            { provider: "pixazo", model: "ltx" },
            { provider: "aihubmix", model: "wan" },
          ],
        },
        audio: { configured: false },
      },
    });

    expect(route).toEqual({
      kind: "video",
      reason: "natural_language_media",
      requestedKind: "video",
      provider: "pixazo",
      model: "ltx",
      candidates: [
        { provider: "pixazo", model: "ltx" },
        { provider: "aihubmix", model: "wan" },
      ],
    });
  });

  it("uses the configured primary media route when no additional candidate exists", () => {
    const route = resolveAutomaticTaskRoute({
      goal: "Generate an image for this campaign.",
      attachments: [],
      media: {
        image: {
          configured: true,
          provider: "pixazo",
          models: ["flux"],
          candidates: [{ provider: "pixazo", model: "flux" }],
        },
        video: { configured: false },
        audio: { configured: false },
      },
    });

    expect(route).toMatchObject({ kind: "image", provider: "pixazo", model: "flux" });
  });
});
