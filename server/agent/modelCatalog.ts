import type { LlmProviderName } from "./llm";

import { ENV } from "../_core/env";

const PROVIDERS = ["groq", "agnes", "aihubmix", "openrouter", "gemini", "deepseek"] as const satisfies readonly LlmProviderName[];

export type ComposerModel = {
  id: string;
  provider: LlmProviderName;
  model: string;
  label: "Primary" | "Subtask" | "Configured";
  capabilities: Array<"text" | "vision">;
};

type ComposerModelCatalogInput = {
  orchestratorProvider: string;
  orchestratorModel: string;
  subtaskProvider: string;
  subtaskModel: string;
  availableModels: string[];
  visionModels: string[];
  configuredProviders: Record<LlmProviderName, boolean>;
};

function isLlmProvider(value: string): value is LlmProviderName {
  return (PROVIDERS as readonly string[]).includes(value);
}

function explicitModelEntry(value: string, fallbackProvider: string) {
  const separator = value.indexOf(":");
  if (separator > 0) {
    const provider = value.slice(0, separator).trim();
    const model = value.slice(separator + 1).trim();
    if (isLlmProvider(provider) && model) return { provider, model };
  }
  return { provider: fallbackProvider, model: value.trim() };
}

/**
 * Converts the administrator-owned model allowlist into safe, provider-qualified
 * composer options. Legacy unqualified entries continue to use the primary provider.
 */
export function configuredComposerModels(input: ComposerModelCatalogInput): ComposerModel[] {
  const entries = [
    { provider: input.orchestratorProvider, model: input.orchestratorModel, label: "Primary" as const },
    { provider: input.subtaskProvider, model: input.subtaskModel, label: "Subtask" as const },
    ...input.availableModels.map(value => ({ ...explicitModelEntry(value, input.orchestratorProvider), label: "Configured" as const })),
  ];
  const seen = new Set<string>();

  return entries.flatMap(entry => {
    if (!isLlmProvider(entry.provider) || !entry.model || !input.configuredProviders[entry.provider]) return [];
    const id = `${entry.provider}:${entry.model}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      provider: entry.provider,
      model: entry.model,
      label: entry.label,
      capabilities: ["text", ...(input.visionModels.includes(id) ? ["vision" as const] : [])],
    }];
  });
}

/**
 * Returns the same credential-gated model catalog for the UI and task worker.
 * Only provider readiness is inspected; credentials themselves never leave ENV.
 */
export function runtimeConfiguredComposerModels() {
  return configuredComposerModels({
    orchestratorProvider: ENV.orchestratorProvider,
    orchestratorModel: ENV.orchestratorModel,
    subtaskProvider: ENV.subtaskProvider,
    subtaskModel: ENV.subtaskModel,
    availableModels: ENV.availableModels,
    visionModels: ENV.visionModels,
    configuredProviders: {
      groq: Boolean(ENV.groqApiKey),
      agnes: Boolean(ENV.agnesApiKey),
      aihubmix: Boolean(ENV.aihubmixApiKey),
      openrouter: Boolean(ENV.openRouterApiKey),
      gemini: Boolean(ENV.geminiApiKey),
      deepseek: Boolean(ENV.deepseekApiKey),
    },
  });
}
