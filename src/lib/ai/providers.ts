/**
 * Supported AI providers. The user picks a name, pastes a key, picks a
 * model — everything else (endpoints, headers, test strategy) lives here.
 * Model IDs are curated and validated server-side; update them here as
 * vendors release new models. Generation always falls back to the grounded
 * template generator, so a stale ID degrades gracefully instead of failing.
 */

export type ProviderKey = "openai" | "anthropic" | "gemini";

export interface ProviderDef {
  key: ProviderKey;
  label: string;
  keyPlaceholder: string;
  keyHelp: string;
  baseUrl: string;
  defaultModel: string;
  models: Array<{ id: string; label: string }>;
}

export const PROVIDERS: Record<ProviderKey, ProviderDef> = {
  openai: {
    key: "openai",
    label: "OpenAI",
    keyPlaceholder: "Starts with sk-…",
    keyHelp: "Create one in your OpenAI account under API keys, then paste it here.",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini (fast, cheap — recommended)" },
      { id: "gpt-4o", label: "GPT-4o (strongest)" },
      { id: "o4-mini", label: "o4 mini (reasoning)" },
    ],
  },
  anthropic: {
    key: "anthropic",
    label: "Claude",
    keyPlaceholder: "Starts with sk-ant-…",
    keyHelp: "Create one in your Anthropic Console under API keys, then paste it here.",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-5",
    models: [
      { id: "claude-sonnet-4-5", label: "Sonnet (balanced — recommended)" },
      { id: "claude-haiku-4-5", label: "Haiku (fast, cheap)" },
      { id: "claude-opus-4-1", label: "Opus (strongest)" },
    ],
  },
  gemini: {
    key: "gemini",
    label: "Gemini",
    keyPlaceholder: "Starts with AIza…",
    keyHelp: "Create one in Google AI Studio under API keys, then paste it here.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    models: [
      { id: "gemini-2.5-flash", label: "2.5 Flash (balanced — recommended)" },
      { id: "gemini-2.0-flash", label: "2.0 Flash (fast, cheap)" },
      { id: "gemini-2.5-pro", label: "2.5 Pro (strongest)" },
    ],
  },
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS) as ProviderKey[];

export function getProvider(key: string | null | undefined): ProviderDef {
  if (key === "anthropic" || key === "gemini" || key === "openai") {
    return PROVIDERS[key];
  }
  return PROVIDERS.openai;
}

export function isProviderKey(value: string | null | undefined): value is ProviderKey {
  return value === "openai" || value === "anthropic" || value === "gemini";
}

/** Server-side allowlist: only curated models can be saved or used. */
export function isSupportedModel(provider: ProviderKey, model: string): boolean {
  return PROVIDERS[provider].models.some((m) => m.id === model);
}

export function defaultModel(provider: ProviderKey): string {
  return PROVIDERS[provider].defaultModel;
}
