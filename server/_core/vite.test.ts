import { describe, expect, it } from "vitest";
import { publicRuntimeConfigScript } from "./vite";

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
