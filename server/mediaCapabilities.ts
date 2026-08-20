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
  return environment.videoApiKey ?? "";
}

export function mediaReadiness(environment: MediaProviderEnvironment): {
  image: MediaCapability;
  video: MediaCapability;
} {
  const imageProvider = environment.imageProvider?.trim() || null;
  const imageModels = environment.imageModels ?? [];
  const imageConfigured = Boolean(
    imageProvider &&
      imageModels.length > 0 &&
      credentialFor(imageProvider, environment) &&
      (imageProvider !== "forge" || environment.forgeApiUrl),
  );
  const videoProvider = environment.videoProvider?.trim() || null;
  const videoModels = environment.videoModels ?? [];
  const videoConfigured = Boolean(
    videoProvider &&
      videoModels.length > 0 &&
      credentialFor(videoProvider, environment),
  );

  return {
    image: {
      provider: imageProvider,
      models: imageModels,
      configured: imageConfigured,
      route: imageProvider === "gemini" ? "server/media/gemini.ts" : imageProvider === "pixazo" ? "server/media/pixazo.ts" : "server/_core/imageGeneration.ts",
      reason: imageConfigured
        ? undefined
        : "Add a real image provider credential and at least one configured image model before enabling generation.",
    },
    video: {
      provider: videoProvider,
      models: videoModels,
      configured: videoConfigured,
      route: videoProvider === "gemini-omni-flash" ? "server/media/gemini.ts" : videoProvider === "pixazo" ? "server/media/pixazo.ts" : "server/media/video.ts",
      reason: videoConfigured
        ? undefined
        : "Add a real video provider credential and at least one configured video model before enabling generation.",
    },
  };
}
