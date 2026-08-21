import { fileURLToPath } from "node:url";
import { Agent, AgentSession, AutoSubscribe, cli, defineAgent, ServerOptions } from "@livekit/agents";
import { realtime } from "@livekit/agents-plugin-google";
import { ENV } from "../_core/env";

type VoiceDispatchMetadata = {
  personality?: "clear" | "warm" | "precise" | "creative";
  speechRate?: number;
};

function instructionsFor(metadata: VoiceDispatchMetadata) {
  const style = metadata.personality ?? "clear";
  const rate = metadata.speechRate ?? 1;
  return [
    "You are Synthia, a careful realtime assistant operating inside one user-owned task.",
    `Use a ${style} conversation style and speak at approximately ${rate}x natural speed.`,
    "Treat any shared screen as potentially sensitive. Describe only what is relevant to the user’s request.",
    "Never request passwords, recovery codes, payment details, or other secrets.",
    "Ask for confirmation before suggesting consequential external actions.",
  ].join(" ");
}

export default defineAgent({
  entry: async ctx => {
    await ctx.connect(undefined, AutoSubscribe.SUBSCRIBE_ALL);
    const metadata = (() => {
      try { return JSON.parse(ctx.job.metadata || "{}") as VoiceDispatchMetadata; } catch { return {}; }
    })();
    const realtimeModel = new realtime.RealtimeModel({
      apiKey: ENV.geminiApiKey,
      model: ENV.realtimeModel,
      voice: ENV.realtimeDefaultVoice,
      instructions: instructionsFor(metadata),
    });
    const session = new AgentSession();
    const agent = new Agent({ instructions: instructionsFor(metadata), llm: realtimeModel });
    await session.start({ agent, room: ctx.room, record: false });
    ctx.addShutdownCallback(async () => { await realtimeModel.close(); });
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: ENV.livekitAgentName,
    wsURL: ENV.livekitUrl,
    apiKey: ENV.livekitApiKey,
    apiSecret: ENV.livekitApiSecret,
  }));
}
