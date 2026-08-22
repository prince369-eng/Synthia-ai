import { describe, expect, it } from "vitest";
import {
  inlineStaticPreviewCompatibilityBundle,
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

describe("inlineStaticPreviewCompatibilityBundle", () => {
  it("uses the Synthia-owned compatibility bundle in static preview without requesting the gateway-blocked module asset", () => {
    const document = '<head><script type="module" crossorigin src="/assets/index-a1b2.js"></script></head><body><div id="root"></div></body>';
    const result = inlineStaticPreviewCompatibilityBundle(document, "window.__SYNTHIA_BOOTSTRAPPED__ = true;");

    expect(result).not.toContain('src="/assets/index-a1b2.js"');
    expect(result).toContain('data-synthia-preview-compatibility="true"');
    expect(result).toContain("window.__SYNTHIA_BOOTSTRAPPED__ = true;");
    expect(result).toContain("</body>");
  });

  it("escapes script terminators in the trusted bundle before it is embedded in the preview document", () => {
    const result = inlineStaticPreviewCompatibilityBundle("<body></body>", 'const marker = "</script><img>";');

    expect(result).toContain('<\\/script><img>');
    expect(result).not.toContain('</script><img>');
  });
});
