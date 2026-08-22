import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({
  ENV: {
    aihubmixApiKey: "test-key",
    aihubmixBaseUrl: "https://aihubmix.com/v1",
    aihubmixImageModels: ["openai/gpt-image-1.5"],
    aihubmixVideoModels: ["seedance-1.0"],
    aihubmixAudioModels: ["tts-1"],
    aihubmixAudioVoice: "alloy",
    aihubmixArtifactAllowedHosts: ["cdn.aihubmix.com"],
    aihubmixGenerationEnabled: true,
  },
}));

vi.mock("../security/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { generateAIHubMixAudio, generateAIHubMixImage, generateAIHubMixVideo } from "./aihubmix";
import { mediaReadiness } from "../mediaCapabilities";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("AIHubMix media contracts", () => {
  it("does not report AIHubMix image or video ready until an artifact host is explicitly allowlisted", () => {
    const base = {
      aihubmixApiKey: "present",
      aihubmixGenerationEnabled: true,
      imageProvider: "aihubmix",
      imageModels: ["openai/gpt-image-1.5"],
      videoProvider: "aihubmix",
      videoModels: ["seedance-1.0"],
    };
    expect(mediaReadiness({ ...base, aihubmixArtifactAllowedHosts: [] }).image.configured).toBe(false);
    expect(mediaReadiness({ ...base, aihubmixArtifactAllowedHosts: [] }).video.configured).toBe(false);
    expect(mediaReadiness({ ...base, aihubmixArtifactAllowedHosts: ["cdn.aihubmix.com"] }).image.configured).toBe(true);
  });

  it("uses the documented namespaced image prediction and task-retrieval routes without exposing the credential", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ task_id: "image-task-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed", output: { url: "https://cdn.aihubmix.com/image.png" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(Buffer.from("image"), { status: 200, headers: { "content-type": "image/png" } }));
    globalThis.fetch = fetchMock;
    const generated = await generateAIHubMixImage({ prompt: "Create a compact teal workspace illustration.", aspectRatio: "1:1" });
    expect(generated).toMatchObject({ kind: "image", provider: "aihubmix", model: "openai/gpt-image-1.5", interactionId: "image-task-1", mimeType: "image/png" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://aihubmix.com/v1/models/openai/gpt-image-1.5/predictions");
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ input: { prompt: "Create a compact teal workspace illustration.", size: "1024x1024" } });
    expect(String((fetchMock.mock.calls[0][1] as RequestInit).body)).not.toContain("test-key");
  });

  it.each([
    "https://user:pass@cdn.aihubmix.com/image.png",
    "https://cdn.aihubmix.com:444/image.png",
  ])("rejects a generated artifact URL with unsafe origin syntax before fetching it: %s", async unsafeUrl => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ task_id: "image-task-unsafe" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed", output: { url: unsafeUrl } }), { status: 200 }));
    globalThis.fetch = fetchMock;

    await expect(generateAIHubMixImage({ prompt: "Create a safe artifact test." })).rejects.toThrow("unsafe artifact URL");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the documented video lifecycle and requests cleanup after retrieving the complete MP4", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "video-task-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(Buffer.from("video"), { status: 200, headers: { "content-type": "video/mp4" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const generated = await generateAIHubMixVideo({ prompt: "A short autonomous workspace animation.", aspectRatio: "16:9" });
    expect(generated).toMatchObject({ kind: "video", provider: "aihubmix", interactionId: "video-task-1", mimeType: "video/mp4" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://aihubmix.com/v1/videos");
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toMatchObject({ model: "seedance-1.0", aspect_ratio: "16:9" });
  });

  it("uses the documented direct binary TTS route and constrains the configured voice contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(Buffer.from("audio"), { status: 200, headers: { "content-type": "audio/mpeg", "x-request-id": "audio-request-1" } }));
    globalThis.fetch = fetchMock;
    const generated = await generateAIHubMixAudio({ prompt: "Synthia is ready to continue." });
    expect(generated).toMatchObject({ kind: "audio", provider: "aihubmix", model: "tts-1", interactionId: "audio-request-1", mimeType: "audio/mpeg" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://aihubmix.com/v1/audio/speech");
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ model: "tts-1", input: "Synthia is ready to continue.", voice: "alloy", response_format: "mp3" });
  });
});
