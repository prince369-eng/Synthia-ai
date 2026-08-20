import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({
  ENV: {
    pixazoApiKey: "pixazo-test-key",
    pixazoBaseUrl: "https://api.pixazo.example",
    pixazoGenerationEnabled: true,
    pixazoImageModels: ["flux"],
    pixazoVideoModels: ["ltx"],
    pixazoAudioModels: ["tracks"],
  },
}));

vi.mock("../security/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("../agent/publicWebPolicy", () => ({ assertPublicWebDestination: vi.fn(async (value: string) => new URL(value)) }));

import { generatePixazoAudio, generatePixazoImage, generatePixazoVideo, PixazoMediaError } from "./pixazo";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("Pixazo media adapter", () => {
  it("uses the documented image route only when the explicit generation switch is enabled", async () => {
    const imageBytes = Buffer.from("pixazo-image");
    const fetchMock = vi.fn().mockResolvedValue(new Response(imageBytes, {
      status: 200,
      headers: { "content-type": "image/png", "x-request-id": "pixazo-image-1" },
    }));
    globalThis.fetch = fetchMock;

    const result = await generatePixazoImage({ prompt: "Create a compact teal agent workspace illustration.", aspectRatio: "1:1" });

    expect(result).toMatchObject({ kind: "image", provider: "pixazo", model: "flux", interactionId: "pixazo-image-1", mimeType: "image/png" });
    expect(result.bytes.equals(imageBytes)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pixazo.example/flux/text-to-image",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect((request.headers as Record<string, string>)["Ocp-Apim-Subscription-Key"]).toBe("pixazo-test-key");
    expect(JSON.parse(String(request.body))).toMatchObject({ prompt: "Create a compact teal agent workspace illustration.", aspect_ratio: "1:1" });
  });

  it("rejects unsupported reference media before any Pixazo request is issued", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(generatePixazoVideo({ prompt: "Animate the workspace status update.", referenceAttached: true }))
      .rejects.toEqual(expect.objectContaining<Partial<PixazoMediaError>>({ code: "INVALID_REQUEST" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits Tracks, polls its documented status route, and retrieves only a bounded audio artifact", async () => {
    const audioBytes = Buffer.from("pixazo-tracks-audio");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ request_id: "tracks_019d1234-aaaa-bbbb-cccc-1234567890ab", status: "QUEUED" }), { status: 202, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "COMPLETED", output: { media_url: ["https://artifacts.pixazo.example/tracks.mp3"], media_type: "audio/mpeg" } }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(audioBytes, { status: 200, headers: { "content-type": "audio/mpeg" } }));
    globalThis.fetch = fetchMock;

    const result = await generatePixazoAudio({ prompt: "A calming ambient instrumental for focused work." });

    expect(result).toMatchObject({ kind: "audio", provider: "pixazo", model: "tracks", interactionId: "tracks_019d1234-aaaa-bbbb-cccc-1234567890ab", mimeType: "audio/mpeg" });
    expect(result.bytes.equals(audioBytes)).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.pixazo.example/tracks/v1/generate", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://api.pixazo.example/v2/requests/status/tracks_019d1234-aaaa-bbbb-cccc-1234567890ab", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.any(URL), expect.objectContaining({ redirect: "error" }));
  });
});
