import { z } from "zod";
import type {
  AiProvider,
  DraftSpec,
  GenerationContext,
  RepurposeKind,
} from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildPrompt } from "@/lib/ai/prompt";

const llmDraftSchema = z.object({
  channel: z.string().max(60).nullable().default(null),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(20).max(20000),
  topic: z.string().max(120).nullable().default(null),
  format: z.string().max(120).nullable().default(null),
  platform: z.string().max(120).nullable().default(null),
  hook: z.string().max(200).nullable().default(null),
  cta: z.string().max(200).nullable().default(null),
});

const llmResponseSchema = z.object({
  drafts: z.array(llmDraftSchema).min(1).max(10),
});

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * OpenAI-compatible chat-completions driver (works with OpenAI, Azure,
 * OpenRouter, Ollama, vLLM, …). Strict-validates every draft; anything
 * off-schema throws so the caller falls back to the grounded template
 * generator instead of storing junk.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly modelLabel: string;
  private readonly config: LlmConfig;

  constructor(config: LlmConfig) {
    this.config = config;
    this.modelLabel = config.model;
  }

  async generate(kind: RepurposeKind, ctx: GenerationContext): Promise<DraftSpec[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildPrompt(kind, ctx) },
            ],
          }),
        }
      );
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      const content = (json as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty LLM response");
      const parsed = llmResponseSchema.safeParse(JSON.parse(content));
      if (!parsed.success) throw new Error("LLM response failed validation");
      return parsed.data.drafts.map((d) => ({
        ...d,
        kind: kind === "social_pack" ? ("social" as const) : kind === "short_form" ? ("short_clip" as const) : kind,
        metadata: { generator: this.config.model, kind },
      }));
    } finally {
      clearTimeout(timer);
    }
  }
}
