import { describe, expect, it } from "vitest";
import { revisionedClassicPreviewScript } from "@shared/previewBundle";

describe("revisionedClassicPreviewScript", () => {
  it("replaces an existing preview revision instead of accumulating cache-busting query parameters", () => {
    const document = '<script defer src="/synthia-preview.js?v=stale"></script>';
    expect(revisionedClassicPreviewScript(document, "20260823-0644")).toBe(
      '<script defer src="/synthia-preview.js?v=20260823-0644"></script>',
    );
  });
});
