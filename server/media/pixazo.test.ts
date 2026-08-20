import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({
  ENV: {
    pixazoApiKey: "pixazo-test-key",
    pixazoBaseUrl: "https://api.pixazo.example",
    pixazoGenerationEnabled: true,
    pixazoImageModels: ["flux"],
    pixazoVideoModels: ["ltx"],
  },
}));

vi.mock("../security/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { generatePixazoImage, generatePixazoVideo, PixazoMediaError } from "./pixazo";

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
});
