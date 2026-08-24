import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production client bundle hardening", () => {
  it("retains the preview compatibility bundle in source but removes it from production HTML", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
    const packageManifest = readFileSync(new URL("../package.json", import.meta.url), "utf8");

    expect(html).not.toContain('<script defer src="/synthia-preview.js"></script>');
    expect(viteConfig).toContain('name: "synthia-production-preview-guard"');
    expect(viteConfig).toContain('isProductionBuild = config.command === "build" && config.mode === "production";');
    expect(viteConfig).toContain("const previewBundle = path.resolve(PROJECT_ROOT, \"client\", \"public\", \"synthia-preview.js\");");
    expect(viteConfig).toContain("return revisionedClassicPreviewScript(html, revision);");
    expect(viteConfig).toContain("if (isProductionBuild) {");
    expect(viteConfig).toContain("return html;");
    expect(viteConfig).toContain('delete bundle["synthia-preview.js"];');
    expect(packageManifest).toContain('"build": "vite build && esbuild server/_core/index.ts');
    expect(packageManifest).not.toMatch(/"build": [^\n]*synthia-preview\.js/);
    expect(packageManifest).toContain('"build:preview": "pnpm build && esbuild client/src/main.tsx');
    expect(packageManifest).toContain('"dev": "pnpm build:preview && SYNTHIA_STATIC_PREVIEW=true');
  });

  it("keeps measured client vendors in stable chunks rather than inflating application route entries", () => {
    const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

    expect(viteConfig).toContain("function synthiaManualChunks(id: string)");
    expect(viteConfig).toContain('return "livekit-runtime";');
    expect(viteConfig).toContain('return "radix-ui";');
    expect(viteConfig).toContain('return "lucide-icons";');
    expect(viteConfig).toContain('return "data-client";');
    expect(viteConfig).toContain('return "react-runtime";');
    expect(viteConfig).toContain("manualChunks: synthiaManualChunks");
  });
});
