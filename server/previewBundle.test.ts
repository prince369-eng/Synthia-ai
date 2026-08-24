import { describe, expect, it } from "vitest";
import { revisionedClassicPreviewScript } from "@shared/previewBundle";

describe("revisionedClassicPreviewScript", () => {
  it("replaces an existing preview revision instead of accumulating cache-busting query parameters", () => {
    const document = '<script defer src="/synthia-preview.js?v=stale"></script>';
    expect(revisionedClassicPreviewScript(document, "20260823-0644")).toBe(
      '<script defer src="/synthia-preview.js?v=20260823-0644"></script>',
    );
  });

  it("injects one cache-busted classic preview fallback when the source document has no static tag", () => {
    expect(revisionedClassicPreviewScript("<head>\n</head><body></body>", "20260824-1030")).toBe(
      '<head>\n    <script defer src="/synthia-preview.js?v=20260824-1030"></script>\n  </head><body></body>',
    );
  });
});
