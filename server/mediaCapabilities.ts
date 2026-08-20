export type MediaProviderEnvironment = {
  forgeApiUrl?: string;
  forgeApiKey?: string;
  geminiApiKey?: string;
  imageProvider?: string;
  imageModels?: string[];
  videoProvider?: string;
  videoModels?: string[];
  videoApiKey?: string;
  pixazoApiKey?: string;
  pixazoGenerationEnabled?: boolean;
  aihubmixApiKey?: string;
  aihubmixGenerationEnabled?: boolean;
  aihubmixArtifactAllowedHosts?: string[];
  audioProvider?: string;
  audioModels?: string[];
};

export type MediaCapability = {
  provider: string | null;
  models: string[];
  configured: boolean;
  route: string;
  reason?: string;
};

function credentialFor(provider: string, environment: MediaProviderEnvironment): string {
  if (provider === "gemini" || provider === "gemini-omni-flash") return environment.geminiApiKey ?? "";
  if (provider === "forge") return environment.forgeApiKey ?? "";
  if (provider === "pixazo") return environment.pixazoGenerationEnabled ? environment.pixazoApiKey ?? "" : "";
  if (provider === "aihubmix") return environment.aihubmixGenerationEnabled ? environment.aihubmixApiKey ?? "" : "";
  return environment.videoApiKey ?? "";
}

export function mediaReadiness(environment: MediaProviderEnvironment): {
  image: MediaCapability;
  video: MediaCapability;
  audio: MediaCapability;
} {
  const imageProvider = environment.imageProvider?.trim() || null;
  const imageModels = environment.imageModels ?? [];
  const imageConfigured = Boolean(
    imageProvider &&
      imageModels.length > 0 &&
      credentialFor(imageProvider, environment) &&
      (imageProvider !== "forge" || environment.forgeApiUrl) &&
      (imageProvider !== "aihubmix" || (environment.aihubmixArtifactAllowedHosts?.length ?? 0) > 0),
  );
  const videoProvider = environment.videoProvider?.trim() || null;
  const videoModels = environment.videoModels ?? [];
  const videoConfigured = Boolean(
    videoProvider &&
      videoModels.length > 0 &&
      credentialFor(videoProvider, environment) &&
      (videoProvider !== "aihubmix" || (environment.aihubmixArtifactAllowedHosts?.length ?? 0) > 0),
  );

  const audioProvider = environment.audioProvider?.trim() || null;
  const audioModels = environment.audioModels ?? [];
  const audioConfigured = Boolean(audioProvider && audioModels.length > 0 && credentialFor(audioProvider, environment));

  return {
    image: {
      provider: imageProvider,
      models: imageModels,
      configured: imageConfigured,
      route: imageProvider === "gemini" ? "server/media/gemini.ts" : imageProvider === "pixazo" ? "server/media/pixazo.ts" : imageProvider === "aihubmix" ? "server/media/aihubmix.ts" : "server/_core/imageGeneration.ts",
      reason: imageConfigured
        ? undefined
        : imageProvider === "aihubmix"
          ? "Add AIHUBMIX_API_KEY, an allowlisted AIHUBMIX_IMAGE_MODELS value, AIHUBMIX_ARTIFACT_ALLOWED_HOSTS, and SYNTHIA_AIHUBMIX_GENERATION_ENABLED=true before enabling image generation."
          : "Add a real image provider credential and at least one configured image model before enabling generation.",
    },
    video: {
      provider: videoProvider,
      models: videoModels,
      configured: videoConfigured,
      route: videoProvider === "gemini-omni-flash" ? "server/media/gemini.ts" : videoProvider === "pixazo" ? "server/media/pixazo.ts" : videoProvider === "aihubmix" ? "server/media/aihubmix.ts" : "server/media/video.ts",
      reason: videoConfigured
        ? undefined
        : videoProvider === "aihubmix"
          ? "Add AIHUBMIX_API_KEY, an allowlisted AIHUBMIX_VIDEO_MODELS value, AIHUBMIX_ARTIFACT_ALLOWED_HOSTS, and SYNTHIA_AIHUBMIX_GENERATION_ENABLED=true before enabling video generation."
          : "Add a real video provider credential and at least one configured video model before enabling generation.",
    },
    audio: {
      provider: audioProvider,
      models: audioModels,
      configured: audioConfigured,
      route: audioProvider === "pixazo" ? "server/media/pixazo.ts" : audioProvider === "aihubmix" ? "server/media/aihubmix.ts" : "server/media/audio.ts",
      reason: audioConfigured
        ? undefined
        : audioProvider === "pixazo"
          ? "Add a real audio provider credential and at least one configured audio model before enabling generation."
          : "Add a real audio provider credential and at least one configured audio model before enabling generation.",
    },
  };
}
