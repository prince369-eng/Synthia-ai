import { describe, expect, it } from "vitest";
import { resolveAutomaticTaskRoute } from "./automaticTaskRouting";

const readyMedia = {
  image: { configured: true, provider: "pixazo", models: ["flux"] },
  video: { configured: true, provider: "pixazo", models: ["ltx"] },
  audio: { configured: true, provider: "pixazo", models: ["tracks"] },
};

describe("resolveAutomaticTaskRoute", () => {
  it("selects a configured video model from a natural-language generation request without invoking a provider", () => {
    expect(resolveAutomaticTaskRoute({ goal: "Create a short launch video for this product.", attachments: [], media: readyMedia })).toEqual({
      kind: "video",
      reason: "natural_language_media",
      requestedKind: "video",
      provider: "pixazo",
      model: "ltx",
    });
  });

  it("does not claim an unavailable media provider is usable", () => {
    expect(resolveAutomaticTaskRoute({
      goal: "Generate an original poster for this event.",
      attachments: [],
      media: { ...readyMedia, image: { configured: false, provider: "pixazo", models: ["flux"] } },
    })).toEqual({ kind: "text", reason: "media_unavailable", requestedKind: "image" });
  });

  it("keeps voice capture as a browser permission flow instead of treating typed transcription instructions as audio generation", () => {
    expect(resolveAutomaticTaskRoute({ goal: "Transcribe this voice note into concise action items.", attachments: [], media: readyMedia })).toEqual({ kind: "text", reason: "text" });
  });

  it("selects visual analysis for image inputs when generation is not requested", () => {
    expect(resolveAutomaticTaskRoute({ goal: "Explain what is in this image.", attachments: [{ fileType: "image/png" }], media: readyMedia })).toEqual({ kind: "vision", reason: "vision_input" });
  });
});
