import { describe, expect, it } from "vitest";
import {
  injectStaticPreviewBundleRevision,
  publicRuntimeConfigScript,
  STATIC_PREVIEW_CACHE_CONTROL,
} from "./vite";

describe("publicRuntimeConfigScript", () => {
  it("injects only the public OAuth values and escapes HTML delimiters", () => {
    const script = publicRuntimeConfigScript({
      appId: "synthia-preview",
      oauthPortalUrl: "https://auth.example.test/</script><img src=x>",
    });

    expect(script).toContain("window.__SYNTHIA_PUBLIC_CONFIG__=");
    expect(script).toContain('"appId":"synthia-preview"');
    expect(script).toContain("\\u003c/script>\\u003cimg src=x>");
    expect(script).not.toContain("</script><img");
  });
});

describe("injectStaticPreviewBundleRevision", () => {
  it("keeps static preview assets out of browser caches after a rebuild", () => {
    expect(STATIC_PREVIEW_CACHE_CONTROL).toBe("no-store");
  });

  it("revises the classic preview bundle on every rebuilt static document", () => {
    const document = '<script src="/synthia-preview.js"></script>';

    expect(injectStaticPreviewBundleRevision(document, "1787130000000"))
      .toBe('<script src="/synthia-preview.js?v=1787130000000"></script>');
  });

  it("replaces an older preview revision instead of appending multiple query strings", () => {
    const document = '<script src="/synthia-preview.js?v=old-build"></script>';

    expect(injectStaticPreviewBundleRevision(document, "new-build"))
      .toBe('<script src="/synthia-preview.js?v=new-build"></script>');
  });
});
