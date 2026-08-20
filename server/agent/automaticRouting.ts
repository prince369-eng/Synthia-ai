import type { ComposerModel } from "./modelCatalog";
import type { LlmProviderName } from "./llm";

export type ModelSelection = { provider: LlmProviderName; model: string };

export type AutomaticRoute = {
  model: ModelSelection | undefined;
  reason: "manual" | "vision_input" | "code_task" | "primary" | "first_available" | "no_configured_model";
};

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function selectionFor(model: ComposerModel): ModelSelection {
  return { provider: model.provider, model: model.model };
}

/**
 * Resolves Synthia's Automatic setting without invoking a model. Manual selections
 * always win. Automatic uses an available vision model for image inputs and an
 * available code-focused model for development tasks, then falls back to the
 * configured primary route or the first ready route. Media generation remains an
 * explicit user-started action and is intentionally not launched here.
 */
export function resolveAutomaticTaskModel(input: {
  selectedModel?: ModelSelection;
  involvesCode: boolean;
  attachments: Array<{ fileType: string }>;
  models: ComposerModel[];
}): AutomaticRoute {
  if (input.selectedModel) return { model: input.selectedModel, reason: "manual" };

  const hasVisualInput = input.attachments.some(attachment => IMAGE_MIME_TYPES.has(attachment.fileType));
  if (hasVisualInput) {
    const visionModel = input.models.find(model => model.capabilities.includes("vision"));
    if (visionModel) return { model: selectionFor(visionModel), reason: "vision_input" };
  }

  if (input.involvesCode) {
    const codeModel = input.models.find(model => /(?:^|[-_/])(?:code|coding|coder)(?:[-_/]|$)/i.test(model.model));
    if (codeModel) return { model: selectionFor(codeModel), reason: "code_task" };
  }

  const primaryModel = input.models.find(model => model.label === "Primary");
  if (primaryModel) return { model: selectionFor(primaryModel), reason: "primary" };
  if (input.models[0]) return { model: selectionFor(input.models[0]), reason: "first_available" };
  return { model: undefined, reason: "no_configured_model" };
}
