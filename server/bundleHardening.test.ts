import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production client bundle hardening", () => {
  it("retains the preview compatibility bundle in source but removes it from production HTML", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

    expect(html).toContain('<script defer src="/synthia-preview.js"></script>');
    expect(viteConfig).toContain('name: "synthia-production-preview-guard"');
    expect(viteConfig).toContain('isProductionBuild = config.command === "build" && config.mode === "production";');
    expect(viteConfig).toContain("const previewBundle = path.resolve(PROJECT_ROOT, \"client\", \"public\", \"synthia-preview.js\");");
    expect(viteConfig).toContain("return revisionedClassicPreviewScript(html, revision);");
    expect(viteConfig).toContain('html.replace(/\\s*<script defer src="\\/synthia-preview\\.js"><\\/script>/, "")');
  });
});
