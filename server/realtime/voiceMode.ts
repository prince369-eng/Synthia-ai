import { AgentDispatchClient, AccessToken } from "livekit-server-sdk";
import { randomUUID } from "node:crypto";
import {
  createVoiceSessionForTask,
  updateVoiceSessionForUser,
  type VoiceSessionSettings,
} from "../db";
import { ENV } from "../_core/env";

export type VoiceModeAvailability = {
  available: boolean;
  reason?: string;
  provider: "gemini_live";
  transport: "livekit";
};

export function getVoiceModeAvailability(source = ENV): VoiceModeAvailability {
  if (!source.realtimeVoiceEnabled) {
    return { available: false, provider: "gemini_live", transport: "livekit", reason: "Voice Mode is disabled until an administrator explicitly enables the realtime service." };
  }
  if (source.realtimeProvider !== "gemini_live") {
    return { available: false, provider: "gemini_live", transport: "livekit", reason: "Voice Mode currently requires the approved Gemini Live realtime provider." };
  }
  if (!source.livekitUrl || !source.livekitApiKey || !source.livekitApiSecret) {
    return { available: false, provider: "gemini_live", transport: "livekit", reason: "Voice Mode needs a configured LiveKit URL, API key, and API secret." };
  }
  if (!source.geminiApiKey) {
    return { available: false, provider: "gemini_live", transport: "livekit", reason: "Voice Mode needs the server-side Gemini credential for the direct speech model." };
  }
  if (!source.realtimeVoiceWorkerReady) {
    return { available: false, provider: "gemini_live", transport: "livekit", reason: "Voice Mode needs the separately deployed, always-on agent worker before a live session can begin." };
  }
  return { available: true, provider: "gemini_live", transport: "livekit" };
}

function voiceRoomName(taskId: string) {
  return `synthia-voice-${taskId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
}

export async function createVoiceModeJoinCredentials(input: {
  taskId: string;
  userId: number;
  settings: VoiceSessionSettings;
}) {
  const availability = getVoiceModeAvailability();
  if (!availability.available) throw new Error(availability.reason ?? "Voice Mode is unavailable.");

  const roomName = voiceRoomName(input.taskId);
  const participantIdentity = `user-${input.userId}-${randomUUID().slice(0, 12)}`;
  const session = await createVoiceSessionForTask({ ...input, roomName, participantIdentity });
  try {
    const token = new AccessToken(ENV.livekitApiKey, ENV.livekitApiSecret, {
      identity: participantIdentity,
      name: `Synthia user ${input.userId}`,
      ttl: "10m",
      metadata: JSON.stringify({ taskId: input.taskId, voiceSessionId: session.id, source: "synthia_voice_mode" }),
    });
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: false });

    const dispatch = new AgentDispatchClient(ENV.livekitUrl, ENV.livekitApiKey, ENV.livekitApiSecret);
    await dispatch.createDispatch(roomName, ENV.livekitAgentName, {
      metadata: JSON.stringify({ taskId: input.taskId, userId: input.userId, sessionId: session.id, personality: input.settings.personality, speechRate: input.settings.speechRate }),
    });

    return { sessionId: session.id, roomName, participantIdentity, url: ENV.livekitUrl, token: await token.toJwt(), expiresInSeconds: 600 };
  } catch {
    const failureReason = "Voice Mode could not start. Review availability and try again.";
    await updateVoiceSessionForUser({ sessionId: session.id, taskId: input.taskId, userId: input.userId, action: "failed", failureReason });
    throw new Error(failureReason);
  }
}
