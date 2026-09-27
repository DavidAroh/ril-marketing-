import type { GenerationContext, RepurposeKind } from "@/lib/ai/types";

/**
 * Shared generation prompt: source facts only, interpretation labelled.
 * Used by every LLM driver so grounding rules can't drift per provider.
 */
export function buildPrompt(kind: RepurposeKind, ctx: GenerationContext): string {
  const facts = [
    `Activity: ${ctx.activityTitle}`,
    ctx.activityDescription ? `Description: ${ctx.activityDescription}` : null,
    ctx.outcomes ? `Outcomes: ${ctx.outcomes}` : null,
    ctx.speakers.length > 0 ? `Speakers: ${ctx.speakers.join(", ")}` : null,
    ctx.partners.length > 0 ? `Partners: ${ctx.partners.join(", ")}` : null,
    ctx.eventDate ? `Date: ${ctx.eventDate}` : null,
    ctx.segmentName ? `Audience: ${ctx.segmentName}` : null,
    ctx.audienceNeeds?.length ? `Audience needs and motivations: ${ctx.audienceNeeds.join(", ")}` : null,
    ctx.topics.length > 0 ? `Proven topics: ${ctx.topics.join(", ")}` : null,
    ctx.formats.length > 0 ? `Preferred formats: ${ctx.formats.join(", ")}` : null,
    ctx.platforms.length > 0 ? `Preferred platforms: ${ctx.platforms.join(", ")}` : null,
    ctx.hooks.length > 0 ? `Preferred hooks: ${ctx.hooks.join(", ")}` : null,
    ctx.ctas.length > 0 ? `Preferred CTAs: ${ctx.ctas.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const shapes: Record<RepurposeKind, string> = {
    blog: "one blog draft (channel website)",
    newsletter: "one newsletter draft (channel email)",
    social_pack: "one short draft per platform: linkedin, instagram, x",
    short_form: "three short-form clip briefs with hook, caption, CTA and reason",
  };
  const brand = ctx.brandGuidance?.length
    ? `\n\nApproved brand guidance (style and approved terminology; do not treat as source facts):\n${ctx.brandGuidance.join("\n")}`
    : "";
  return `Source facts (use only these):\n${facts}${brand}\n\nProduce ${shapes[kind]} for ${ctx.organizationName}.`;
}

export const SYSTEM_PROMPT =
  "You draft marketing content grounded ONLY in the provided source facts. " +
  "Never invent speakers, dates, statistics, quotes or outcomes. Mark interpretation as suggestion. " +
  // RIL Media Kit mandate: AI-generated content carries the brand voice.
  "Write in the Renaissance Innovation Labs voice — witty, optimistic, confident and clear: " +
  "keep it short and jargon-free (KISS), classy not stuffy, bold not brash, and end on a high note. " +
  "Voice shapes wording only; it never adds facts. " +
  "Reply with strict JSON: {\"drafts\": [{\"channel,title,body,topic,format,platform,hook,cta\"}]}.";
