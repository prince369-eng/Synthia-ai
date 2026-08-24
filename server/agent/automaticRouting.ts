import type { ComposerModel } from "./modelCatalog";
import type { LlmProviderName } from "./llm";

export type ModelSelection = { provider: LlmProviderName; model: string };

export type AutomaticRoute = {
  model: ModelSelection | undefined;
  candidates: ModelSelection[];
  reason: "manual" | "vision_input" | "code_task" | "primary" | "first_available" | "no_compatible_model" | "no_configured_model";
};

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function selectionFor(model: ComposerModel): ModelSelection {
  return { provider: model.provider, model: model.model };
}

function isCodeFocused(model: ComposerModel) {
  return /(?:^|[-_/])(?:code|coding|coder)(?:[-_/]|$)/i.test(model.model);
}

function orderedSelections(groups: ComposerModel[][]) {
  const seen = new Set<string>();
  return groups.flatMap(group => group.flatMap(model => {
    const selection = selectionFor(model);
    const id = `${selection.provider}:${selection.model}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [selection];
  }));
}

function route(candidates: ModelSelection[], reason: AutomaticRoute["reason"]): AutomaticRoute {
  return { model: candidates[0], candidates, reason };
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
  if (input.selectedModel) return route([input.selectedModel], "manual");

  const hasVisualInput = input.attachments.some(attachment => IMAGE_MIME_TYPES.has(attachment.fileType));
  if (hasVisualInput) {
    const visionModels = input.models.filter(model => model.capabilities.includes("vision"));
    const candidates = orderedSelections([
      visionModels.filter(isCodeFocused),
      visionModels.filter(model => model.label === "Primary"),
      visionModels,
    ]);
    return candidates.length ? route(candidates, "vision_input") : route([], "no_compatible_model");
  }

  if (input.involvesCode) {
    const candidates = orderedSelections([
      input.models.filter(isCodeFocused),
      input.models.filter(model => model.label === "Primary"),
      input.models,
    ]);
    return candidates.length ? route(candidates, "code_task") : route([], "no_configured_model");
  }

  const candidates = orderedSelections([
    input.models.filter(model => model.label === "Primary"),
    input.models,
  ]);
  if (candidates.length) return route(candidates, input.models.some(model => model.label === "Primary") ? "primary" : "first_available");
  return route([], "no_configured_model");
}
