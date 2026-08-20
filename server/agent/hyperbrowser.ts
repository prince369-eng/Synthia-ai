import { HyperbrowserClient } from "@hyperbrowser/sdk";
import { ENV } from "../_core/env";

export type HyperbrowserSessionStatus = "active" | "closed" | "close-error" | "error";

export type HyperbrowserSessionDescriptor = {
  provider: "hyperbrowser";
  providerSessionId: string;
  status: HyperbrowserSessionStatus;
  wsEndpoint: string;
  liveUrl?: string;
  computerActionEndpoint?: string;
  maxSessionMinutes: number;
};

type HyperbrowserSessionClient = Pick<HyperbrowserClient, "sessions">;

const MIN_SESSION_MINUTES = 5;
const MAX_SESSION_MINUTES = 30;
const REQUEST_TIMEOUT_MS = 30_000;

function boundedTimeoutMinutes(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.max(MIN_SESSION_MINUTES, Math.min(MAX_SESSION_MINUTES, Math.floor(value)));
}

export function isHyperbrowserConfigured() {
  return Boolean(ENV.hyperbrowserApiKey);
}

export function hyperbrowserSessionRequest(timeoutMinutes = ENV.hyperbrowserTimeoutMinutes) {
  const allowOut = ENV.hyperbrowserAllowedHosts.length > 0 ? ENV.hyperbrowserAllowedHosts : undefined;
  return {
    timeoutMinutes: boundedTimeoutMinutes(timeoutMinutes),
    screen: { width: 1440, height: 900 },
    acceptCookies: false,
    adblock: true,
    trackers: true,
    annoyances: true,
    useProxy: false,
    useStealth: false,
    useUltraStealth: false,
    solveCaptchas: false,
    enableWebRecording: false,
    enableVideoWebRecording: false,
    enableLogCapture: false,
    saveDownloads: false,
    disablePasswordManager: true,
    viewOnlyLiveView: true,
    allowInternetAccess: true,
    ...(allowOut ? { allowOut } : {}),
  };
}

export function createHyperbrowserClient(apiKey = ENV.hyperbrowserApiKey): HyperbrowserSessionClient {
  if (!apiKey) throw new Error("HYPERBROWSER_API_KEY is required for the Hyperbrowser agent-browser provider.");
  return new HyperbrowserClient({
    apiKey,
    baseUrl: ENV.hyperbrowserBaseUrl,
    timeout: REQUEST_TIMEOUT_MS,
  });
}

export async function createHyperbrowserSession(input: {
  taskId: string;
  timeoutMinutes?: number;
  client?: HyperbrowserSessionClient;
}): Promise<HyperbrowserSessionDescriptor> {
  if (!input.taskId.trim()) throw new Error("A task ID is required to create a Hyperbrowser session.");
  const client = input.client ?? createHyperbrowserClient();
  const session = await client.sessions.create(hyperbrowserSessionRequest(input.timeoutMinutes));
  return {
    provider: "hyperbrowser",
    providerSessionId: session.id,
    status: session.status,
    wsEndpoint: session.wsEndpoint,
    liveUrl: session.liveUrl,
    computerActionEndpoint: session.computerActionEndpoint,
    maxSessionMinutes: boundedTimeoutMinutes(input.timeoutMinutes ?? ENV.hyperbrowserTimeoutMinutes),
  };
}

export async function stopHyperbrowserSession(input: {
  sessionId: string;
  client?: HyperbrowserSessionClient;
}): Promise<void> {
  if (!input.sessionId.trim()) throw new Error("A Hyperbrowser session ID is required for cleanup.");
  const client = input.client ?? createHyperbrowserClient();
  await client.sessions.stop(input.sessionId);
}
