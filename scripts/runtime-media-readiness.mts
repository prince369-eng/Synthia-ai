import { ENV } from "../server/_core/env";
import { mediaReadiness } from "../server/mediaCapabilities";

const readiness = mediaReadiness(ENV);
console.log(JSON.stringify({
  image: { provider: readiness.image.provider, models: readiness.image.models, configured: readiness.image.configured },
  video: { provider: readiness.video.provider, models: readiness.video.models, configured: readiness.video.configured },
  audio: { provider: readiness.audio.provider, models: readiness.audio.models, configured: readiness.audio.configured },
}, null, 2));
