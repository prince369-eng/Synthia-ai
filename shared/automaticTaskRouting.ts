export type AutomaticMediaKind = "image" | "video" | "audio";
export type AutomaticTaskRouteKind = "text" | "vision" | AutomaticMediaKind;

export type AutomaticMediaCapability = {
  configured?: boolean;
  provider?: string | null;
  models?: string[];
};

export type AutomaticTaskRoute = {
  kind: AutomaticTaskRouteKind;
  reason: "natural_language_media" | "media_unavailable" | "vision_input" | "text";
  requestedKind?: AutomaticMediaKind;
  provider?: "gemini" | "pixazo" | "aihubmix";
  model?: string;
};

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SUPPORTED_MEDIA_PROVIDERS = new Set(["gemini", "pixazo", "aihubmix"]);

const VOICE_INPUT_PATTERN = /\b(?:transcribe|dictat(?:e|ion)|speech[ -]?to[ -]?text|voice note|recording)\b/i;
const VIDEO_PATTERN = /\b(?:generate|create|make|produce|render|animate)\b[^.\n]{0,80}\b(?:video|clip|film|movie|animation)\b|\b(?:video|clip|film|movie|animation)\b[^.\n]{0,80}\b(?:generate|create|make|produce|render|animate)\b/i;
const IMAGE_PATTERN = /\b(?:generate|create|make|produce|render|design)\b[^.\n]{0,80}\b(?:image|illustration|poster|logo|portrait|artwork|picture)\b|\b(?:image|illustration|poster|logo|portrait|artwork|picture)\b[^.\n]{0,80}\b(?:generate|create|make|produce|render|design)\b/i;
const AUDIO_PATTERN = /\b(?:generate|create|make|produce|compose|narrate)\b[^.\n]{0,80}\b(?:audio|music|soundtrack|voiceover|voice[- ]over|narration|sound effect)\b|\b(?:audio|music|soundtrack|voiceover|voice[- ]over|narration|sound effect)\b[^.\n]{0,80}\b(?:generate|create|make|produce|compose|narrate)\b/i;

function requestedMediaKind(goal: string): AutomaticMediaKind | undefined {
  const normalized = goal.replace(/\s+/g, " ").trim();
  if (!normalized || VOICE_INPUT_PATTERN.test(normalized)) return undefined;
  if (VIDEO_PATTERN.test(normalized)) return "video";
  if (IMAGE_PATTERN.test(normalized)) return "image";
  if (AUDIO_PATTERN.test(normalized)) return "audio";
  return undefined;
}

/**
 * Classifies a task without calling any model or provider. A media route is returned
 * only when the user’s natural-language goal requests it and a configured provider
 * exposes a usable model. Typed voice capture remains an explicit browser permission
 * flow; it is never activated by task text.
 */
export function resolveAutomaticTaskRoute(input: {
  goal: string;
  attachments: Array<{ fileType: string }>;
  media: Record<AutomaticMediaKind, AutomaticMediaCapability | undefined>;
}): AutomaticTaskRoute {
  const requestedKind = requestedMediaKind(input.goal);
  if (requestedKind) {
    const capability = input.media[requestedKind];
    const provider = capability?.provider?.toLowerCase();
    const model = capability?.models?.[0]?.trim();
    if (capability?.configured && model && provider && SUPPORTED_MEDIA_PROVIDERS.has(provider)) {
      return { kind: requestedKind, reason: "natural_language_media", requestedKind, provider: provider as AutomaticTaskRoute["provider"], model };
    }
    return { kind: "text", reason: "media_unavailable", requestedKind };
  }

  if (input.attachments.some(attachment => IMAGE_MIME_TYPES.has(attachment.fileType))) {
    return { kind: "vision", reason: "vision_input" };
  }
  return { kind: "text", reason: "text" };
}
