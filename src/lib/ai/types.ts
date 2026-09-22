/**
 * Provider-agnostic AI layer (PRD §8). Generation requests flow through the
 * `AiProvider` interface so the model vendor can change without rebuilding
 * callers. Every draft is grounded in caller-supplied facts; drafts that
 * reach the library are always `ai_generated` pending human review.
 */

export type RepurposeKind = "blog" | "newsletter" | "social_pack" | "short_form";

export const REPURPOSE_KINDS: Array<{ kind: RepurposeKind; label: string }> = [
  { kind: "blog", label: "Blog post" },
  { kind: "newsletter", label: "Newsletter" },
  { kind: "social_pack", label: "Social pack" },
  { kind: "short_form", label: "Short-form briefs" },
];

/** Facts the generator may use — nothing else may be asserted as fact. */
export interface GenerationContext {
  organizationName: string;
  activityTitle: string;
  activityDescription: string | null;
  outcomes: string | null;
  speakers: string[];
  partners: string[];
  eventDate: string | null;
  segmentName: string | null;
  /** Proven topics/formats/platforms/hooks/CTAs from APPROVED insights. */
  topics: string[];
  formats: string[];
  platforms: string[];
  hooks: string[];
  ctas: string[];
}

export interface DraftSpec {
  kind: Exclude<RepurposeKind, "social_pack" | "short_form"> | "social" | "short_clip";
  channel: string | null;
  title: string;
  body: string;
  topic: string | null;
  format: string | null;
  platform: string | null;
  hook: string | null;
  cta: string | null;
  metadata: Record<string, unknown>;
}

export interface AiProvider {
  /** Model label recorded on the ai_generations row for traceability. */
  readonly modelLabel: string;
  generate(kind: RepurposeKind, ctx: GenerationContext): Promise<DraftSpec[]>;
}

export interface ResolvedAiConfig {
  mode: "llm" | "template";
  model: string;
  baseUrl: string | null;
  apiKey: string | null;
}
