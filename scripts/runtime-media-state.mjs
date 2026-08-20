const clean = (value) => (value ?? "").trim();

const state = {
  SYNTHIA_IMAGE_PROVIDER: clean(process.env.SYNTHIA_IMAGE_PROVIDER) || "<default>",
  SYNTHIA_IMAGE_MODELS: clean(process.env.SYNTHIA_IMAGE_MODELS) || "<default>",
  SYNTHIA_VIDEO_PROVIDER: clean(process.env.SYNTHIA_VIDEO_PROVIDER) || "<default>",
  SYNTHIA_VIDEO_MODELS: clean(process.env.SYNTHIA_VIDEO_MODELS) || "<default>",
  SYNTHIA_AUDIO_PROVIDER: clean(process.env.SYNTHIA_AUDIO_PROVIDER) || "<default>",
  SYNTHIA_AUDIO_MODELS: clean(process.env.SYNTHIA_AUDIO_MODELS) || "<default>",
  PIXAZO_IMAGE_MODELS: clean(process.env.PIXAZO_IMAGE_MODELS) || "<default>",
  PIXAZO_VIDEO_MODELS: clean(process.env.PIXAZO_VIDEO_MODELS) || "<default>",
  PIXAZO_AUDIO_MODELS: clean(process.env.PIXAZO_AUDIO_MODELS) || "<default>",
  SYNTHIA_PIXAZO_GENERATION_ENABLED: clean(process.env.SYNTHIA_PIXAZO_GENERATION_ENABLED) || "<default>",
  pixazoCredentialPresent: Boolean(clean(process.env.PIXAZO_API_KEY)),
  geminiCredentialPresent: Boolean(clean(process.env.GEMINI_API_KEY)),
};

console.log(JSON.stringify(state, null, 2));
