import { describe, expect, it } from "vitest";
import { attachmentMimeSchema } from "./routers";

describe("media input contract", () => {
  it("accepts supported image and video inputs for secure task attachment storage", () => {
    expect(attachmentMimeSchema.safeParse("image/png").success).toBe(true);
    expect(attachmentMimeSchema.safeParse("image/webp").success).toBe(true);
    expect(attachmentMimeSchema.safeParse("video/mp4").success).toBe(true);
    expect(attachmentMimeSchema.safeParse("video/webm").success).toBe(true);
    expect(attachmentMimeSchema.safeParse("video/quicktime").success).toBe(true);
  });

  it("rejects unsupported executable and arbitrary media types", () => {
    expect(attachmentMimeSchema.safeParse("application/javascript").success).toBe(false);
    expect(attachmentMimeSchema.safeParse("video/mpeg").success).toBe(false);
    expect(attachmentMimeSchema.safeParse("audio/wav").success).toBe(false);
  });
});
