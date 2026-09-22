import { z } from "zod";
import type {
  AiProvider,
  DraftSpec,
  GenerationContext,
  RepurposeKind,
} from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildPrompt } from "@/lib/ai/prompt";

const draftSchema = z.object({
  channel: z.string().max(60).nullable().default(null),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(20).max(20000),
  topic: z.string().max(120).nullable().default(null),
  format: z.string().max(120).nullable().default(null),
  platform: z.string().max(120).nullable().default(null),
  hook: z.string().max(200).nullable().default(null),
  cta: z.string().max(200).nullable().default(null),
});

const responseSchema = z.object({
  drafts: z.array(draftSchema).min(1).max(10),
});

/**
 * Claude driver (Anthropic Messages API). Same grounding prompt and same
 * strict draft validation as every other driver — only the wire format
 * differs, so output quality guarantees can't drift per provider.
 */
export class AnthropicProvider implements AiProvider {
  readonly modelLabel: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(args: { apiKey: string; model: string }) {
    this.apiKey = args.apiKey;
    this.model = args.model;
    this.modelLabel = args.model;
  }

  async generate(kind: RepurposeKind, ctx: GenerationContext): Promise<DraftSpec[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          max_tokens: 3000,
          temperature: 0.7,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildPrompt(kind, ctx) }],
        }),
      });
      if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      const text = (json as { content?: Array<{ text?: string }> }).content?.find(
        (b) => typeof b.text === "string"
      )?.text;
      if (!text) throw new Error("Empty Claude response");
      const parsed = responseSchema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error("Claude response failed validation");
      return parsed.data.drafts.map((d) => ({
        ...d,
        kind: kind === "social_pack" ? ("social" as const) : kind === "short_form" ? ("short_clip" as const) : kind,
        metadata: { generator: this.model, kind },
      }));
    } finally {
      clearTimeout(timer);
    }
  }
}
