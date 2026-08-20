import { Sandbox as E2BDesktopSandbox } from "@e2b/desktop";
import { Sandbox as HopxSandbox } from "@hopx-ai/sdk";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { ENV } from "../_core/env";

const execFile = promisify(execFileCallback);

export type SandboxProviderName = "e2b" | "hopx" | "docker";

export type SandboxDescriptor = {
  provider: SandboxProviderName;
  providerSandboxId: string;
  region: string;
  maxSessionSeconds: number;
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type SandboxScreenshot = {
  contentType: "image/png";
  bytes: Uint8Array;
};

export type SandboxFile = {
  path: string;
  content: string | Uint8Array;
};

export interface SandboxProvider {
  readonly name: SandboxProviderName;
  create(taskId: string): Promise<SandboxDescriptor>;
  execute(descriptor: SandboxDescriptor, command: string, timeoutMs?: number): Promise<CommandResult>;
  readFile(descriptor: SandboxDescriptor, path: string): Promise<string>;
  writeFile(descriptor: SandboxDescriptor, file: SandboxFile): Promise<void>;
  openUrl(descriptor: SandboxDescriptor, url: string): Promise<void>;
  screenshot(descriptor: SandboxDescriptor): Promise<SandboxScreenshot>;
  checkpoint(descriptor: SandboxDescriptor): Promise<string>;
  restore(checkpointRef: string): Promise<SandboxDescriptor>;
  destroy(descriptor: SandboxDescriptor): Promise<void>;
}

function configuredProvider(): SandboxProviderName {
  if (ENV.sandboxProvider === "e2b") return "e2b";
  if (ENV.sandboxProvider === "hopx") return "hopx";
  if (ENV.sandboxProvider === "docker") return "docker";
  if (ENV.sandboxProvider !== "auto") {
    throw new Error("SYNTHIA_SANDBOX_PROVIDER must be auto, e2b, hopx, or docker.");
  }
  return ENV.e2bApiKey ? "e2b" : ENV.hopxApiKey ? "hopx" : "docker";
}

function dockerContainerName(taskId: string) {
  return `synthia-${taskId.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 42)}`;
}

function requireSafePath(path: string) {
  if (!path.startsWith("/workspace/") || path.includes("\0") || path.split("/").includes("..")) {
    throw new Error("Sandbox file access is restricted to /workspace.");
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export class E2BSandboxProvider implements SandboxProvider {
  readonly name = "e2b" as const;

  private async connect(descriptor: SandboxDescriptor) {
    if (!ENV.e2bApiKey) throw new Error("E2B_API_KEY is required for the E2B sandbox provider.");
    return E2BDesktopSandbox.connect(descriptor.providerSandboxId, { apiKey: ENV.e2bApiKey });
  }

  async create(taskId: string): Promise<SandboxDescriptor> {
    if (!ENV.e2bApiKey) throw new Error("E2B_API_KEY is required for the E2B sandbox provider.");
    const timeoutMs = ENV.e2bSandboxTimeoutSeconds * 1_000;
    const options = {
      apiKey: ENV.e2bApiKey,
      timeoutMs,
      metadata: { application: "synthia-ai", taskId },
      resolution: [1440, 900] as [number, number],
    };
    const sandbox = ENV.e2bTemplateId
      ? await E2BDesktopSandbox.create(ENV.e2bTemplateId, options)
      : await E2BDesktopSandbox.create(options);
    await sandbox.updateNetwork(
      ENV.sandboxAllowedHosts.length > 0
        ? { allowOut: ENV.sandboxAllowedHosts }
        : { allowInternetAccess: false },
    );
    return {
      provider: "e2b",
      providerSandboxId: sandbox.sandboxId,
      region: ENV.sandboxRegion,
      maxSessionSeconds: ENV.e2bSandboxTimeoutSeconds,
    };
  }

  async execute(descriptor: SandboxDescriptor, command: string, timeoutMs = 120_000): Promise<CommandResult> {
    const sandbox = await this.connect(descriptor);
    const result = await sandbox.commands.run(command, { timeoutMs });
    return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
  }

  async readFile(descriptor: SandboxDescriptor, path: string): Promise<string> {
    requireSafePath(path);
    const sandbox = await this.connect(descriptor);
    return sandbox.files.read(path);
  }

  async writeFile(descriptor: SandboxDescriptor, file: SandboxFile): Promise<void> {
    requireSafePath(file.path);
    const sandbox = await this.connect(descriptor);
    await sandbox.files.write(file.path, typeof file.content === "string" ? file.content : toArrayBuffer(file.content));
  }

  async openUrl(descriptor: SandboxDescriptor, url: string): Promise<void> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only HTTP(S) URLs may be opened in the sandbox browser.");
    }
    const sandbox = await this.connect(descriptor);
    await sandbox.open(parsed.toString());
  }

  async screenshot(descriptor: SandboxDescriptor): Promise<SandboxScreenshot> {
    const sandbox = await this.connect(descriptor);
    return { contentType: "image/png", bytes: await sandbox.screenshot() };
  }

  async checkpoint(descriptor: SandboxDescriptor): Promise<string> {
    const sandbox = await this.connect(descriptor);
    const [fork] = await sandbox.fork({ count: 1 });
    if (fork instanceof Error) throw fork;
    await sandbox.kill();
    return fork.sandboxId;
  }

  async restore(checkpointRef: string): Promise<SandboxDescriptor> {
    if (!ENV.e2bApiKey) throw new Error("E2B_API_KEY is required for the E2B sandbox provider.");
    const sandbox = await E2BDesktopSandbox.connect(checkpointRef, { apiKey: ENV.e2bApiKey });
    return {
      provider: "e2b",
      providerSandboxId: sandbox.sandboxId,
      region: ENV.sandboxRegion,
      maxSessionSeconds: ENV.e2bSandboxTimeoutSeconds,
    };
  }

  async destroy(descriptor: SandboxDescriptor): Promise<void> {
    const sandbox = await this.connect(descriptor);
    await sandbox.kill();
  }
}

export class HopxSandboxProvider implements SandboxProvider {
  readonly name = "hopx" as const;

  private assertConfigured() {
    if (!ENV.hopxApiKey || !ENV.hopxTemplateId) {
      throw new Error("HOPX_API_KEY and HOPX_TEMPLATE_ID are required for the HopX sandbox provider.");
    }
  }

  private async connect(descriptor: SandboxDescriptor) {
    this.assertConfigured();
    return HopxSandbox.connect(descriptor.providerSandboxId, ENV.hopxApiKey, ENV.hopxBaseUrl);
  }

  async create(taskId: string): Promise<SandboxDescriptor> {
    this.assertConfigured();
    if (ENV.sandboxAllowedHosts.length > 0) {
      throw new Error("HopX cannot enforce SYNTHIA_SANDBOX_ALLOWED_HOSTS; use E2B when outbound host allowlisting is required.");
    }
    const sandbox = await HopxSandbox.create({
      apiKey: ENV.hopxApiKey,
      baseURL: ENV.hopxBaseUrl,
      templateId: ENV.hopxTemplateId,
      region: ENV.sandboxRegion,
      timeoutSeconds: ENV.hopxSandboxTimeoutSeconds,
      internetAccess: false,
      envVars: { SYNTHIA_TASK_ID: taskId },
    });
    return {
      provider: "hopx",
      providerSandboxId: sandbox.sandboxId,
      region: ENV.sandboxRegion,
      maxSessionSeconds: ENV.hopxSandboxTimeoutSeconds,
    };
  }

  async execute(descriptor: SandboxDescriptor, command: string, timeoutMs = 120_000): Promise<CommandResult> {
    const sandbox = await this.connect(descriptor);
    const result = await sandbox.commands.run(command, { timeout: timeoutMs });
    return { exitCode: result.exit_code, stdout: result.stdout, stderr: result.stderr };
  }

  async readFile(descriptor: SandboxDescriptor, path: string): Promise<string> {
    requireSafePath(path);
    return (await this.connect(descriptor)).files.read(path);
  }

  async writeFile(descriptor: SandboxDescriptor, file: SandboxFile): Promise<void> {
    requireSafePath(file.path);
    const sandbox = await this.connect(descriptor);
    if (typeof file.content === "string") await sandbox.files.write(file.path, file.content);
    else await sandbox.files.writeBytes(file.path, Buffer.from(file.content));
  }

  async openUrl(descriptor: SandboxDescriptor, url: string): Promise<void> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only HTTP(S) URLs may be opened in the sandbox browser.");
    }
    const encodedUrl = Buffer.from(parsed.toString(), "utf8").toString("base64");
    const result = await this.execute(descriptor, `url=$(printf %s '${encodedUrl}' | base64 -d); xdg-open "$url"`, 30_000);
    if (result.exitCode !== 0) throw new Error(result.stderr || "The HopX desktop browser could not open the URL.");
  }

  async screenshot(descriptor: SandboxDescriptor): Promise<SandboxScreenshot> {
    const response = await (await this.connect(descriptor)).desktop.screenshot();
    const base64 = response.image.replace(/^data:image\/[^;]+;base64,/, "");
    return { contentType: "image/png", bytes: new Uint8Array(Buffer.from(base64, "base64")) };
  }

  async checkpoint(): Promise<string> {
    throw new Error("HopX does not expose a documented sandbox snapshot API. Use E2B when checkpoint and restore are required.");
  }

  async restore(): Promise<SandboxDescriptor> {
    throw new Error("HopX does not expose a documented sandbox restore API. Use E2B when checkpoint and restore are required.");
  }

  async destroy(descriptor: SandboxDescriptor): Promise<void> {
    await (await this.connect(descriptor)).kill();
  }
}

export class DockerSandboxProvider implements SandboxProvider {
  readonly name = "docker" as const;

  async create(taskId: string): Promise<SandboxDescriptor> {
    if (ENV.isProduction) {
      throw new Error("Docker sandboxes are disabled in production. Configure E2B instead.");
    }
    const name = dockerContainerName(taskId);
    await execFile("docker", [
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=256m",
      "--tmpfs",
      "/workspace:rw,nosuid,size=512m",
      "--memory",
      "1g",
      "--cpus",
      "1",
      "--pids-limit",
      "256",
      ENV.dockerSandboxImage,
      "sleep",
      "infinity",
    ]);
    return {
      provider: "docker",
      providerSandboxId: name,
      region: "local",
      maxSessionSeconds: 7_200,
    };
  }

  async execute(descriptor: SandboxDescriptor, command: string, timeoutMs = 120_000): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execFile(
        "docker",
        ["exec", descriptor.providerSandboxId, "/bin/sh", "-lc", command],
        { timeout: timeoutMs, maxBuffer: 1_000_000 },
      );
      return { exitCode: 0, stdout, stderr };
    } catch (error: unknown) {
      const failure = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number };
      return {
        exitCode: typeof failure.code === "number" ? failure.code : 1,
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? failure.message,
      };
    }
  }

  async readFile(descriptor: SandboxDescriptor, path: string): Promise<string> {
    requireSafePath(path);
    const result = await this.execute(descriptor, `cat -- '${path.replace(/'/g, "'\\''")}'`);
    if (result.exitCode !== 0) throw new Error(result.stderr || "The sandbox file could not be read.");
    return result.stdout;
  }

  async writeFile(descriptor: SandboxDescriptor, file: SandboxFile): Promise<void> {
    requireSafePath(file.path);
    const content = (typeof file.content === "string" ? Buffer.from(file.content, "utf8") : Buffer.from(file.content)).toString("base64");
    const escapedPath = file.path.replace(/'/g, "'\\''");
    const result = await this.execute(descriptor, `printf %s '${content}' | base64 -d > '${escapedPath}'`);
    if (result.exitCode !== 0) throw new Error(result.stderr || "The sandbox file could not be written.");
  }

  async openUrl(): Promise<void> {
    throw new Error("The local Docker fallback does not include browser automation. Configure E2B for desktop browsing.");
  }

  async screenshot(): Promise<SandboxScreenshot> {
    throw new Error("The local Docker fallback does not include a desktop stream. Configure E2B for live screenshots.");
  }

  async checkpoint(descriptor: SandboxDescriptor): Promise<string> {
    const checkpointRef = `${descriptor.providerSandboxId}-checkpoint`;
    await execFile("docker", ["commit", descriptor.providerSandboxId, checkpointRef]);
    return checkpointRef;
  }

  async restore(checkpointRef: string): Promise<SandboxDescriptor> {
    if (!/^[a-zA-Z0-9_.:-]+$/.test(checkpointRef)) throw new Error("Invalid Docker checkpoint reference.");
    const name = `${checkpointRef.replace(/[^a-zA-Z0-9_.-]/g, "-")}-${Date.now()}`;
    await execFile("docker", ["run", "--detach", "--rm", "--name", name, "--network", "none", checkpointRef, "sleep", "infinity"]);
    return { provider: "docker", providerSandboxId: name, region: "local", maxSessionSeconds: 7_200 };
  }

  async destroy(descriptor: SandboxDescriptor): Promise<void> {
    await execFile("docker", ["rm", "--force", descriptor.providerSandboxId]);
  }
}

export function createSandboxProvider(): SandboxProvider {
  const provider = configuredProvider();
  return provider === "e2b" ? new E2BSandboxProvider() : provider === "hopx" ? new HopxSandboxProvider() : new DockerSandboxProvider();
}

export function sandboxProviderFor(provider: SandboxProviderName): SandboxProvider {
  return provider === "e2b" ? new E2BSandboxProvider() : provider === "hopx" ? new HopxSandboxProvider() : new DockerSandboxProvider();
}

const SHELL_CONTROL_CHARACTERS = /[;&|`$<>()\r\n\\]/;
const SAFE_WORKSPACE_PATH = /^\/workspace(?:\/[A-Za-z0-9._/-]+)?$/;

function isSafeWorkspacePath(value: string) {
  return SAFE_WORKSPACE_PATH.test(value) && !value.split("/").includes("..");
}

function isSafeLsOption(value: string) {
  return /^-[aAlhF]+$/.test(value);
}

export function assertViewOnlyTerminalCommand(command: string) {
  const normalized = command.trim();
  if (normalized.length === 0 || normalized.length > 512 || SHELL_CONTROL_CHARACTERS.test(normalized)) {
    throw new Error("Interactive terminal access is limited to safe workspace inspection commands.");
  }
  const tokens = normalized.split(/\s+/);
  const [binary, ...argumentsList] = tokens;
  const allowed =
    (binary === "pwd" && argumentsList.length === 0) ||
    (binary === "ls" && argumentsList.every(argument => isSafeLsOption(argument) || isSafeWorkspacePath(argument))) ||
    (binary === "find" && argumentsList.length === 1 && argumentsList[0] === "/workspace") ||
    (["cat", "head", "tail"].includes(binary) && argumentsList.length === 1 && isSafeWorkspacePath(argumentsList[0]!)) ||
    (binary === "git" && ["status", "diff"].includes(argumentsList[0] ?? "") && argumentsList.slice(1).every(isSafeWorkspacePath));
  if (!allowed) throw new Error("Interactive terminal access is limited to safe workspace inspection commands.");
  return normalized;
}
