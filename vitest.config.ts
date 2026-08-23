import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [["server/**/*.dom.test.tsx", "jsdom"]],
    include: ["server/**/*.test.ts", "server/**/*.test.tsx", "server/**/*.spec.ts", "server/**/*.spec.tsx", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "client/src/**/*.spec.ts", "client/src/**/*.spec.tsx", "runner/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
