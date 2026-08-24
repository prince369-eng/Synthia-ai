import { afterEach, describe, expect, it, vi } from "vitest";

const warnMock = vi.hoisted(() => vi.fn());

vi.mock("../_core/env", () => ({
  ENV: {
    forgeApiUrl: "",
    forgeApiKey: "",
    geminiApiKey: "gemini-test-key",
    imageProvider: "gemini",
    imageModels: ["gemini-3.1-flash-image"],
    videoProvider: "gemini-omni-flash",
    videoModels: ["gemini-omni-flash-preview"],
    videoApiKey: "",
  },
}));

vi.mock("../security/logger", () => ({ logger: { warn: warnMock, error: vi.fn() } }));

import { generateGeminiImage, generateGeminiVideo, GeminiMediaError } from "./gemini";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  warnMock.mockReset();
  globalThis.fetch = originalFetch;
});

describe("Gemini media interactions", () => {
  it("sends an image generation request only from the server and decodes the returned artifact", async () => {
    const imageBytes = Buffer.from("synthia-image");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "interaction-image-1",
      status: "completed",
      steps: [{ type: "model_output", content: [{ type: "image", mime_type: "image/png", data: imageBytes.toString("base64") }] }],
    }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const result = await generateGeminiImage({ prompt: "Create a precise radiant orange workspace icon.", aspectRatio: "1:1" });

    expect(result).toMatchObject({ kind: "image", provider: "gemini", model: "gemini-3.1-flash-image", interactionId: "interaction-image-1", mimeType: "image/png" });
    expect(result.bytes.equals(imageBytes)).toBe(true);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect((request.headers as Record<string, string>)["x-goog-api-key"]).toBe("gemini-test-key");
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "gemini-3.1-flash-image",
      response_format: { type: "image", aspect_ratio: "1:1" },
    });
  });

  it("sends the documented Omni Flash text-to-video contract and decodes a task-owned video payload", async () => {
    const videoBytes = Buffer.from("synthia-video");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "interaction-video-1",
      status: "completed",
      steps: [{ type: "model_output", content: [{ type: "video", mime_type: "video/mp4", data: videoBytes.toString("base64") }] }],
    }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const result = await generateGeminiVideo({ prompt: "A compact autonomous workspace animates into view.", aspectRatio: "9:16" });

    expect(result).toMatchObject({ kind: "video", provider: "gemini-omni-flash", model: "gemini-omni-flash-preview", mimeType: "video/mp4" });
    expect(result.bytes.equals(videoBytes)).toBe(true);
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toMatchObject({
      model: "gemini-omni-flash-preview",
      response_format: { type: "video", aspect_ratio: "9:16" },
      generation_config: { video_config: { task: "text_to_video" } },
    });
  });

  it("rejects a response without the expected generated media rather than persisting invalid output", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "interaction-empty", status: "completed", steps: [] }), { status: 200 }));

    await expect(generateGeminiImage({ prompt: "Generate a workflow illustration." }))
      .rejects.toEqual(expect.objectContaining<Partial<GeminiMediaError>>({ code: "INVALID_RESPONSE" }));
  });

  it("logs only bounded status metadata for an upstream provider failure", async () => {
    const upstreamDetail = "provider body that must never enter a structured log";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: upstreamDetail }), { status: 502 }));

    await expect(generateGeminiImage({ prompt: "Generate a workflow illustration." }))
      .rejects.toEqual(expect.objectContaining<Partial<GeminiMediaError>>({ code: "PROVIDER_ERROR" }));

    expect(warnMock).toHaveBeenCalledWith(
      { event: "gemini_media_provider_error", status: 502 },
      "Gemini media generation request failed",
    );
    expect(JSON.stringify(warnMock.mock.calls)).not.toContain(upstreamDetail);
  });
});
