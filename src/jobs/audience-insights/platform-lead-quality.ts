import {
  MIN_SAMPLES,
  calculateConfidence,
} from "@/lib/audience/scoring";
import {
  platformLeadStats,
  type ContentRow,
  type LeadRow,
} from "@/lib/audience/analytics";
import type { DraftInsight } from "@/jobs/audience-insights/topic-engagement";

/**
 * §16 — (segment, platform) vs lead quality.
 * Quality = qualified / converted rates. Volume is never treated as quality.
 */
export function analysePlatformLeadQuality(args: {
  leads: LeadRow[];
  assets: ContentRow[];
  now?: Date;
}): DraftInsight[] {
  const { leads } = args;
  const byPlatform = platformLeadStats(
    leads.filter((l) => l.source_platform && l.source_platform.trim().length > 0),
    (l) => l.source_platform!.trim().toLowerCase()
  );
  if (byPlatform.size === 0) return [];

  const totalLeads = leads.length;
  const totalQualified = leads.filter((l) => l.is_qualified).length;
  const baselineQualifiedRate =
    totalLeads > 0 ? totalQualified / totalLeads : 0;

  const drafts: DraftInsight[] = [];
  for (const stats of byPlatform.values()) {
    if (stats.leads < MIN_SAMPLES.PLATFORM_LEAD_QUALITY) continue;
    const lift =
      baselineQualifiedRate > 0
        ? (stats.qualifiedRate - baselineQualifiedRate) / baselineQualifiedRate
        : stats.qualifiedRate > 0
          ? 1
          : 0;
    if (lift <= 0.05 && stats.conversionRate <= 0) continue;

    const confidence_score = calculateConfidence({
      sampleSize: stats.leads,
      completeness:
        stats.leadIds.length === stats.leads ? 1 : stats.leadIds.length / Math.max(1, stats.leads),
      consistency: Math.min(1, stats.qualifiedRate + stats.conversionRate),
      recency: 0.6,
      effectStrength: Math.min(1, Math.abs(lift)),
    });

    drafts.push({
      category: "PLATFORM_LEAD_QUALITY",
      topic: null,
      format: null,
      platform: stats.key,
      hook: null,
      cta: null,
      confidence_score,
      confidence_explanation: `n=${stats.leads} leads, qualified ${(stats.qualifiedRate * 100).toFixed(1)}% vs ${(baselineQualifiedRate * 100).toFixed(1)}% baseline.`,
      signal_strength: "STABLE",
      summary: `Leads from ${stats.key} qualified at ${(stats.qualifiedRate * 100).toFixed(1)}% (${stats.qualified}/${stats.leads}) with ${(stats.conversionRate * 100).toFixed(1)}% converting.`,
      recommendation: `Weight ${stats.key} higher in distribution for this segment; investigate what makes its leads qualify.`,
      sample_size: stats.leads,
      source_content_asset_ids: [],
      source_event_ids: [],
      source_lead_ids: stats.leadIds,
      metrics: {
        qualifiedRate: Number(stats.qualifiedRate.toFixed(4)),
        baselineQualifiedRate: Number(baselineQualifiedRate.toFixed(4)),
        conversionRate: Number(stats.conversionRate.toFixed(4)),
        lift: Number(lift.toFixed(3)),
      },
    });
  }

  return drafts.sort((a, b) => b.confidence_score - a.confidence_score);
}
