import {
  MIN_SAMPLES,
  calculateConfidence,
  recencyFromMedianAgeDays,
} from "@/lib/audience/scoring";
import {
  groupBy,
  medianAgeDays,
  summarizeAssets,
  type ContentRow,
} from "@/lib/audience/analytics";
import type { DraftInsight } from "@/jobs/audience-insights/topic-engagement";

/**
 * §17 — (hook, CTA, segment) vs action metrics.
 * Skipped entirely when no hook/CTA metadata exists — never fabricated.
 */
export function analyseHookCtaEffectiveness(args: {
  assets: ContentRow[];
  now?: Date;
}): DraftInsight[] {
  const { assets, now = new Date() } = args;
  const withMeta = assets.filter(
    (a) =>
      (a.hook && a.hook.trim().length > 0) ||
      (a.cta && a.cta.trim().length > 0)
  );
  if (withMeta.length === 0) return [];

  const byCombo = groupBy(withMeta, (a) =>
    `${(a.hook ?? "").trim().toLowerCase()}:::${(a.cta ?? "").trim().toLowerCase()}`
  );
  const overall = summarizeAssets("__all__", assets);
  const drafts: DraftInsight[] = [];

  for (const [combo, rows] of byCombo) {
    if (rows.length < MIN_SAMPLES.HOOK_CTA_EFFECTIVENESS) continue;
    const stats = summarizeAssets(combo, rows);
    // Action metric: clicks + registrations per view.
    const actionRate =
      stats.totalViews > 0
        ? (rows.reduce((s, r) => s + r.clicks + r.registrations, 0)) /
          stats.totalViews
        : 0;
    const baselineAction =
      overall.totalViews > 0
        ? assets.reduce((s, r) => s + r.clicks + r.registrations, 0) /
          overall.totalViews
        : 0;
    const lift =
      baselineAction > 0
        ? (actionRate - baselineAction) / baselineAction
        : actionRate > 0
          ? 1
          : 0;
    if (lift <= 0.1) continue;

    const hook = rows[0].hook?.trim() || null;
    const cta = rows[0].cta?.trim() || null;
    const confidence_score = calculateConfidence({
      sampleSize: stats.count,
      completeness: 1,
      consistency:
        rows.filter((r) => r.clicks + r.registrations > 0).length /
        Math.max(1, rows.length),
      recency: recencyFromMedianAgeDays(medianAgeDays(rows, now)),
      effectStrength: Math.min(1, Math.abs(lift) / 2),
    });

    drafts.push({
      category: "HOOK_CTA_EFFECTIVENESS",
      topic: null,
      format: rows[0].format?.trim() || null,
      platform: rows[0].platform?.trim() || null,
      hook,
      cta,
      confidence_score,
      confidence_explanation: `n=${stats.count} assets, action rate ${(actionRate * 100).toFixed(2)}% vs ${(baselineAction * 100).toFixed(2)}% baseline.`,
      signal_strength: "STABLE",
      summary: `${hook ? `Hook "${hook}"` : "This hook/CTA combination"}${cta ? ` with CTA "${cta}"` : ""} drove a ${(actionRate * 100).toFixed(2)}% action rate across ${stats.count} assets.`,
      recommendation: `Reuse ${hook ? `the "${hook}" hook` : "this hook"}${cta ? ` with the "${cta}" CTA` : ""} for this segment.`,
      sample_size: stats.count,
      source_content_asset_ids: stats.assetIds,
      source_event_ids: [],
      source_lead_ids: [],
      metrics: {
        actionRate: Number(actionRate.toFixed(4)),
        baselineActionRate: Number(baselineAction.toFixed(4)),
        lift: Number(lift.toFixed(3)),
      },
    });
  }

  return drafts.sort((a, b) => b.confidence_score - a.confidence_score);
}
