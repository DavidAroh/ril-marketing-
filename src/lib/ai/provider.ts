import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/supabase/organization";
import type {
  AiProvider,
  DraftSpec,
  GenerationContext,
  RepurposeKind,
  ResolvedAiConfig,
} from "@/lib/ai/types";
import { TemplateProvider } from "@/lib/ai/template";
import { OpenAiCompatibleProvider } from "@/lib/ai/openai-compatible";
import { AnthropicProvider } from "@/lib/ai/anthropic";
import {
  defaultModel,
  getProvider,
  isSupportedModel,
  type ProviderKey,
} from "@/lib/ai/providers";

export type { ProviderKey };

export interface ResolvedLlmConfig extends ResolvedAiConfig {
  provider: ProviderKey;
}

export async function resolveAiConfig(
  organizationId: string
): Promise<ResolvedLlmConfig> {
  const envKey = process.env.AI_API_KEY;
  if (envKey) {
    const provider = getProvider(process.env.AI_PROVIDER).key;
    const model = process.env.AI_MODEL ?? defaultModel(provider);
    return {
      mode: "llm",
      provider,
      model: isSupportedModel(provider, model) ? model : defaultModel(provider),
      baseUrl: process.env.AI_API_BASE_URL ?? getProvider(provider).baseUrl,
      apiKey: envKey,
    };
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("integrations")
      .select("status, config")
      .eq("organization_id", organizationId)
      .eq("key", "ai")
      .maybeSingle<{ status: string; config: Record<string, string> }>();
    const apiKey = data?.status === "connected" ? (data?.config?.apiKey ?? null) : null;
    if (apiKey) {
      const def = getProvider(data?.config?.provider);
      const provider = def.key;
      const storedModel = data?.config?.model ?? def.defaultModel;
      return {
        mode: "llm",
        provider,
        model: isSupportedModel(provider, storedModel)
          ? storedModel
          : def.defaultModel,
        baseUrl: data?.config?.baseUrl || def.baseUrl,
        apiKey,
      };
    }
  } catch {
    // fall through to template
  }
  return { mode: "template", provider: "openai", model: "template-v1", baseUrl: null, apiKey: null };
}

function buildLlm(config: ResolvedLlmConfig & { apiKey: string }): AiProvider {
  if (config.provider === "anthropic") {
    return new AnthropicProvider({ apiKey: config.apiKey, model: config.model });
  }
  // OpenAI and Gemini both speak the OpenAI-compatible wire format.
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? getProvider(config.provider).baseUrl,
    model: config.model,
  });
}

/**
 * Generate repurposing drafts for an activity. Tries the configured LLM per
 * kind; any failure falls back to the grounded template generator so the
 * flow always produces reviewable drafts. Returns the model label for the
 * ai_generations traceability row.
 */
export async function generateRepurposing(
  organizationId: string,
  kinds: RepurposeKind[],
  ctx: GenerationContext
): Promise<{ model: string; drafts: DraftSpec[] }> {
  const config = await resolveAiConfig(organizationId);
  if (config.mode === "template" || !config.apiKey) {
    const provider = new TemplateProvider();
    const drafts: DraftSpec[] = [];
    for (const kind of kinds) drafts.push(...(await provider.generate(kind, ctx)));
    return { model: provider.modelLabel, drafts };
  }

  const llm = buildLlm({ ...config, apiKey: config.apiKey });
  const template = new TemplateProvider();
  const drafts: DraftSpec[] = [];
  let usedLlm = false;
  for (const kind of kinds) {
    try {
      drafts.push(...(await llm.generate(kind, ctx)));
      usedLlm = true;
    } catch {
      drafts.push(...(await template.generate(kind, ctx)));
    }
  }
  return { model: usedLlm ? llm.modelLabel : template.modelLabel, drafts };
}

/** Admin read of the AI integration row (server settings page). Never leaks the key. */
export async function getAiIntegration(organizationId: string): Promise<{
  status: string;
  provider: ProviderKey;
  hasKey: boolean;
  last4: string | null;
  updatedAt: string | null;
  model: string;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integrations")
    .select("status, config, updated_at")
    .eq("organization_id", organizationId)
    .eq("key", "ai")
    .maybeSingle<{
      status: string;
      config: Record<string, string>;
      updated_at: string;
    }>();
  const storedKey = data?.config?.apiKey ?? "";
  const provider = getProvider(data?.config?.provider);
  return {
    status: data?.status ?? "not_connected",
    provider: provider.key,
    hasKey: storedKey.length > 0,
    last4: storedKey.length >= 4 ? storedKey.slice(-4) : null,
    updatedAt: data?.updated_at ?? null,
    model: isSupportedModel(provider.key, data?.config?.model ?? "")
      ? (data?.config?.model as string)
      : provider.defaultModel,
  };
}

/**
 * Free connectivity check per provider (never spends a generation call).
 * Resolves blanks from the stored/env config so "Test" works without
 * retyping the key.
 */
export async function testAiConnection(input: {
  provider?: string;
  apiKey?: string;
  model?: string;
}): Promise<{ ok: boolean; models?: number; error?: string }> {
  const organizationId = await requireOrganizationId().catch(() => null);
  const provider = getProvider(input.provider);
  let apiKey = input.apiKey?.trim() || "";
  if (!apiKey && organizationId) {
    const stored = await getAiIntegration(organizationId);
    if (stored.provider === provider.key && stored.hasKey) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("integrations")
        .select("config")
        .eq("organization_id", organizationId)
        .eq("key", "ai")
        .maybeSingle<{ config: Record<string, string> }>();
      apiKey = data?.config?.apiKey ?? "";
    }
  }
  if (!apiKey && provider.key === getProvider(process.env.AI_PROVIDER).key) {
    apiKey = process.env.AI_API_KEY ?? "";
  }
  if (!apiKey) return { ok: false, error: "No API key to test — enter one first." };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const check =
        provider.key === "anthropic"
          ? await fetch("https://api.anthropic.com/v1/models", {
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
              },
              signal: controller.signal,
            })
          : provider.key === "gemini"
            ? await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
                { signal: controller.signal }
              )
            : await fetch(`${provider.baseUrl.replace(/\/$/, "")}/models`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: controller.signal,
              });
      if (check.status === 401 || check.status === 403) {
        return { ok: false, error: "Key rejected. Double-check it and try again." };
      }
      if (!check.ok) {
        return { ok: false, error: `No reply from ${provider.label} (HTTP ${check.status}). Try again in a moment.` };
      }
      const json = (await check.json().catch(() => null)) as
        | { data?: unknown[]; models?: unknown[] }
        | null;
      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.models)
          ? json.models
          : undefined;
      return { ok: true, models: list?.length };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, error: `Could not reach ${provider.label}. Check your connection and try again.` };
  }
}
