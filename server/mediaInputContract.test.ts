import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attachmentMimeSchema, MEDIA_CONFIGURATION_UNAVAILABLE_MESSAGE } from "./routers";

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

  it("returns bounded availability guidance instead of configuration exception text", () => {
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(MEDIA_CONFIGURATION_UNAVAILABLE_MESSAGE).toBe("Media generation is not available for this workspace yet. Please try again after capability access has been enabled.");
    expect(routerSource).toContain("message: MEDIA_CONFIGURATION_UNAVAILABLE_MESSAGE");
    expect(routerSource).not.toContain('throw new TRPCError({ code: "PRECONDITION_FAILED", message });');
  });
});
