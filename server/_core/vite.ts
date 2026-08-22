import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { logger } from "../security/logger";

export const STATIC_PREVIEW_CACHE_CONTROL = "no-store";

export function publicRuntimeConfigScript(configValues?: {
  appId?: string;
  oauthPortalUrl?: string;
}) {
  const config = JSON.stringify({
    appId: configValues?.appId ?? process.env.VITE_APP_ID ?? "",
    oauthPortalUrl:
      configValues?.oauthPortalUrl ?? process.env.VITE_OAUTH_PORTAL_URL ?? "",
  }).replace(/</g, "\\u003c");

  return `<script>window.__SYNTHIA_PUBLIC_CONFIG__=${config};</script>`;
}

export function injectStaticPreviewBundleRevision(document: string, revision: string) {
  return document.replace(
    /src="\/synthia-preview\.js(?:\?[^\"]*)?"/,
    `src="/synthia-preview.js?v=${encodeURIComponent(revision)}"`
  );
}

export function inlineStaticPreviewCompatibilityBundle(document: string, bundle: string) {
  const compatibilityBundle = bundle.replace(/<\/script/gi, "<\\/script");
  const withoutModuleEntry = document.replace(
    /\s*<script type="module" crossorigin src="\/assets\/[^\"]+\.js"><\/script>/,
    ""
  );

  return withoutModuleEntry.replace(
    "</body>",
    () => `<script data-synthia-preview-compatibility="true">${compatibilityBundle}</script></body>`
  );
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace("</head>", `${publicRuntimeConfigScript()}</head>`);
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    logger.error({ event: "static_build_directory_missing" }, "Static build directory is missing; build the client before serving static assets");
  }

  const inlinePreviewStyles = process.env.SYNTHIA_STATIC_PREVIEW === "true";
  app.use(express.static(distPath, {
    index: inlinePreviewStyles ? false : "index.html",
    setHeaders(response) {
      if (inlinePreviewStyles) {
        response.setHeader("Cache-Control", STATIC_PREVIEW_CACHE_CONTROL);
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (_req, res, next) => {
    if (!inlinePreviewStyles) {
      res.sendFile(path.resolve(distPath, "index.html"));
      return;
    }
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let document = await fs.promises.readFile(indexPath, "utf8");
      const stylesheet = document.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
      if (stylesheet?.[1]) {
        const cssPath = path.resolve(distPath, `.${stylesheet[1]}`);
        const css = await fs.promises.readFile(cssPath, "utf8");
        document = document.replace(stylesheet[0], `<style id="synthia-preview-styles">${css}</style>`);
      }
      const previewBundlePath = path.resolve(distPath, "synthia-preview.js");
      const previewBundleStat = await fs.promises.stat(previewBundlePath);
      document = injectStaticPreviewBundleRevision(document, String(previewBundleStat.mtimeMs));
      const previewBundle = await fs.promises.readFile(previewBundlePath, "utf8");
      document = inlineStaticPreviewCompatibilityBundle(document, previewBundle);
      document = document.replace("</head>", `${publicRuntimeConfigScript()}</head>`);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": STATIC_PREVIEW_CACHE_CONTROL }).end(document);
    } catch (error) {
      next(error);
    }
  });
}
