import type { SandboxProvider, SandboxProviderName, SandboxScreenshot, SandboxDescriptor } from "./sandbox";
import { assertViewOnlyTerminalCommand, sandboxProviderFor } from "./sandbox";

type PersistedSandbox = {
  provider: SandboxProviderName;
  providerSandboxId: string | null;
  region: string;
  maxSessionSeconds: number;
  status: "booting" | "active" | "checkpointed" | "destroyed";
};

export type LiveComputerAvailability = {
  available: boolean;
  provider?: SandboxProviderName;
  sandboxStatus?: PersistedSandbox["status"];
  canCaptureScreen: boolean;
  reason: string;
};

export type LiveComputerFile = { path: string; name: string; depth: number };

const MAX_FILE_COUNT = 180;
const MAX_SOURCE_CHARACTERS = 96_000;
const MAX_SCREENSHOT_BYTES = 1_500_000;
const SENSITIVE_SEGMENT = /(^|\/)(?:\.env(?:\.[^/]*)?|\.git|node_modules)(?:\/|$)|(?:^|[._-])(?:secret|token|credential|private[_-]?key|password)(?:[._-]|$)/i;

export function liveComputerAvailability(sandbox: PersistedSandbox | undefined): LiveComputerAvailability {
  if (!sandbox || !sandbox.providerSandboxId || sandbox.status === "destroyed") {
    return {
      available: false,
      canCaptureScreen: false,
      reason: "No active task sandbox is available. Live Computer opens only task workspaces created during an agent task.",
    };
  }
  const canCaptureScreen = sandbox.provider !== "docker";
  return {
    available: true,
    provider: sandbox.provider,
    sandboxStatus: sandbox.status,
    canCaptureScreen,
    reason: canCaptureScreen
      ? "Read-only task workspace inspection is available. Refreshing the screen is user initiated."
      : "This task used Docker. Files and code can be inspected, but Docker does not provide a graphical task screen.",
  };
}

export function descriptorFromSandbox(sandbox: PersistedSandbox): SandboxDescriptor {
  if (!sandbox.providerSandboxId) throw new Error("The task sandbox no longer has a provider session.");
  return {
    provider: sandbox.provider,
    providerSandboxId: sandbox.providerSandboxId,
    region: sandbox.region,
    maxSessionSeconds: sandbox.maxSessionSeconds,
  };
}

export function assertSafeLiveComputerPath(path: string) {
  if (!path.startsWith("/workspace/") || path.includes("\0") || path.split("/").includes("..") || SENSITIVE_SEGMENT.test(path)) {
    throw new Error("Live Computer can only open non-sensitive files inside this task's /workspace directory.");
  }
  if (path.length > 512) throw new Error("The requested workspace path is too long.");
  return path;
}

function availableProvider(sandbox: PersistedSandbox, provider?: SandboxProvider) {
  return provider ?? sandboxProviderFor(sandbox.provider);
}

export async function listLiveComputerFiles(input: { sandbox: PersistedSandbox; provider?: SandboxProvider }): Promise<LiveComputerFile[]> {
  const command = assertViewOnlyTerminalCommand("find /workspace");
  const response = await availableProvider(input.sandbox, input.provider).execute(descriptorFromSandbox(input.sandbox), command, 10_000);
  if (response.exitCode !== 0) throw new Error("The task workspace could not be listed.");
  return response.stdout
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(value => value.startsWith("/workspace/") && !SENSITIVE_SEGMENT.test(value))
    .slice(0, MAX_FILE_COUNT)
    .map(path => ({ path, name: path.split("/").at(-1) ?? path, depth: Math.max(0, path.split("/").length - 3) }));
}

export async function readLiveComputerSource(input: { sandbox: PersistedSandbox; path: string; provider?: SandboxProvider }) {
  const path = assertSafeLiveComputerPath(input.path);
  const content = await availableProvider(input.sandbox, input.provider).readFile(descriptorFromSandbox(input.sandbox), path);
  const source = content.slice(0, MAX_SOURCE_CHARACTERS);
  return {
    path,
    content: source,
    truncated: content.length > source.length,
  };
}

export function screenshotAsDataUrl(screenshot: SandboxScreenshot) {
  if (screenshot.bytes.byteLength > MAX_SCREENSHOT_BYTES) throw new Error("The task screen capture is too large to display safely.");
  return `data:${screenshot.contentType};base64,${Buffer.from(screenshot.bytes).toString("base64")}`;
}

export async function captureLiveComputerScreen(input: { sandbox: PersistedSandbox; provider?: SandboxProvider }) {
  if (input.sandbox.provider === "docker") throw new Error("This Docker task has no graphical screen. Inspect its files or source instead.");
  const screenshot = await availableProvider(input.sandbox, input.provider).screenshot(descriptorFromSandbox(input.sandbox));
  return { dataUrl: screenshotAsDataUrl(screenshot), capturedAt: new Date().toISOString() };
}
