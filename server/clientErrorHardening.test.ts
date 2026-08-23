import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("client error disclosure hardening", () => {
  it("classifies client diagnostics without logging or rendering raw error details", () => {
    const main = readFileSync(new URL("../client/src/main.tsx", import.meta.url), "utf8");

    expect(main).toContain("function classifyClientError");
    expect(main).toContain('console.error("[Synthia client error]", { scope, category: classifyClientError(error) });');
    expect(main).toContain('reportClientError("query", error);');
    expect(main).toContain('reportClientError("mutation", error);');
    expect(main).toContain('reportClientError("bootstrap", error);');
    expect(main).toContain("function sanitizeDisplayedClientError");
    expect(main).toContain("error.message = clientErrorMessage(error);");
    expect(main).toContain('sanitizeDisplayedClientError(error);');
    expect(main).toContain('redirectToLoginIfUnauthorized(error);\n    reportClientError("query", error);\n    sanitizeDisplayedClientError(error);');
    expect(main).not.toContain('console.error("[API Query Error]", error);');
    expect(main).not.toContain('console.error("[API Mutation Error]", error);');
    expect(main).not.toContain('console.error("[Synthia bootstrap error]", error);');
    expect(main).not.toContain("synthia-bootstrap-error");
    expect(main).not.toContain("error.message.slice(0, 220)");
  });

  it("keeps optional authentication redirects constrained to normalized internal routes", () => {
    const auth = readFileSync(new URL("../client/src/_core/hooks/useAuth.ts", import.meta.url), "utf8");

    expect(auth).toContain('import { normalizeInternalNavigationPath } from "@/lib/internalNavigation";');
    expect(auth).toContain("const safeRedirectPath = normalizeInternalNavigationPath(redirectPath);");
    expect(auth).toContain("if (safeRedirectPath) {");
    expect(auth).toContain("window.location.href = safeRedirectPath;");
    expect(auth).not.toContain("window.location.href = redirectPath;");
  });

  it("keeps Voice Mode browser and realtime failures bounded before alert rendering", () => {
    const voiceMode = readFileSync(new URL("../client/src/components/VoiceModeDialog.tsx", import.meta.url), "utf8");

    expect(voiceMode).toContain('import { clientErrorMessage } from "@/lib/clientErrorDisplay";');
    expect(voiceMode).toContain("function isPermissionDenied(reason: unknown): boolean");
    expect(voiceMode).toContain('setError(isPermissionDenied(reason) ? "Microphone permission was not granted. Voice Mode has not started." : clientErrorMessage(reason, "Voice Mode could not connect. Please try again."));');
    expect(voiceMode).toContain('setError(isPermissionDenied(reason) ? "Screen sharing was not granted. Nothing was shared." : clientErrorMessage(reason, "Screen sharing could not start. Please try again."));');
    expect(voiceMode).not.toContain("const message = reason instanceof Error ? reason.message");
    expect(voiceMode).not.toContain("message.includes(\"Permission\")");
  });

  it("keeps Voice Mode availability details independent from backend configuration", () => {
    const voiceMode = readFileSync(new URL("../client/src/components/VoiceModeDialog.tsx", import.meta.url), "utf8");

    expect(voiceMode).toContain("<strong>Voice Mode is unavailable.</strong>");
    expect(voiceMode).toContain("It is not available in this workspace yet. Please try again later.");
    expect(voiceMode).not.toContain("availability.data?.reason");
    expect(voiceMode).not.toContain("realtime service configuration");
  });

  it("keeps the shared Error Boundary recovery-focused without rendering raw exception stacks", () => {
    const boundary = readFileSync(new URL("../client/src/components/ErrorBoundary.tsx", import.meta.url), "utf8");

    expect(boundary).toContain("Synthia could not load this view.");
    expect(boundary).toContain("Your task data has not been changed. Reload to try again.");
    expect(boundary).toContain("Reload Page");
    expect(boundary).not.toContain("this.state.error?.stack");
    expect(boundary).not.toContain("<pre");
  });

  it("routes feature-level task and workspace diagnostics through the bounded display helper", () => {
    const featureSources = [
      "../client/src/components/TaskOfficeControls.tsx",
      "../client/src/pages/Plugins.tsx",
      "../client/src/pages/Scheduled.tsx",
      "../client/src/pages/TaskDashboard.tsx",
      "../client/src/pages/Settings.tsx",
      "../client/src/pages/TaskWorkspace.tsx",
    ].map(path => readFileSync(new URL(path, import.meta.url), "utf8"));

    const routedPageSources = [
      "../client/src/pages/Agent.tsx",
      "../client/src/pages/Docs.tsx",
      "../client/src/pages/Library.tsx",
      "../client/src/pages/Plugins.tsx",
      "../client/src/pages/Projects.tsx",
      "../client/src/pages/Scheduled.tsx",
      "../client/src/pages/Settings.tsx",
      "../client/src/pages/TaskDashboard.tsx",
      "../client/src/pages/TaskWorkspace.tsx",
    ].map(path => readFileSync(new URL(path, import.meta.url), "utf8"));

    for (const source of [...featureSources, ...routedPageSources]) {
      expect(source).not.toMatch(/(?:\w+\.)?error\?\.message/);
      expect(source).not.toMatch(/(?:\w+\.)?error\.message/);
    }

    for (const source of featureSources.slice(0, 3)) {
      expect(source).toContain('clientErrorMessage');
    }
  });
});
