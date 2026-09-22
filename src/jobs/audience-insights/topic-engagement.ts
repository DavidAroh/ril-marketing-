import {
  MIN_SAMPLES,
  calculateConfidence,
  recencyFromMedianAgeDays,
  signalStrengthFromLift,
} from "@/lib/audience/scoring";
import {
  medianAgeDays,
  splitRecentBaseline,
  summarizeAssets,
  groupBy,
  type ContentRow,
} from "@/lib/audience/analytics";

import type { InsightCategory, SignalStrength } from "@/types/audience";

export interface DraftInsight {
  category: InsightCategory;
  topic: string | null;
  format: string | null;
  platform: string | null;
  hook: string | null;
  cta: string | null;
  confidence_score: number;
  confidence_explanation: string;
  signal_strength: SignalStrength;
  summary: string;
  recommendation: string;
  sample_size: number;
  source_content_asset_ids: string[];
  source_event_ids: string[];
  source_lead_ids: string[];
  metrics: Record<string, number | string>;
}

/**
 * §14 — engagement performance by (segment, topic).
 * Uses only counters present on the asset row; never assumes missing metrics.
 */
export function analyseTopicEngagement(args: {
  assets: ContentRow[];
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
}): DraftInsight[] {
  const { assets, rangeStart, rangeEnd, now = new Date() } = args;
  const byTopic = groupBy(
    assets.filter((a) => a.topic && a.topic.trim().length > 0),
    (a) => a.topic!.trim().toLowerCase()
  );
  if (byTopic.size === 0) return [];

  const overall = summarizeAssets("__all__", assets);
  const drafts: DraftInsight[] = [];

  for (const [topic, rows] of byTopic) {
    if (rows.length < MIN_SAMPLES.TOPIC_ENGAGEMENT) continue;
    const stats = summarizeAssets(topic, rows);
    const { recent, baseline } = splitRecentBaseline(rows, rangeStart, rangeEnd);
    const recentStats = summarizeAssets(`${topic}::recent`, recent);
    const baselineStats = summarizeAssets(
      `${topic}::baseline`,
      baseline.length > 0 ? baseline : rows
    );

    const lift =
      overall.engagementRate > 0
        ? (stats.engagementRate - overall.engagementRate) /
          overall.engagementRate
        : 0;
    // Consistency: share of assets above the segment median engagement.
    const rates = rows
      .map((r) => {
        const v = r.views > 0 ? (r.clicks + r.shares + r.comments + r.saves) / r.views : 0;
        return v;
      })
      .sort((a, b) => a - b);
    const median = rates[Math.floor(rates.length / 2)] ?? 0;
    const above = rates.filter((r) => r >= median).length;
    const consistency = rows.length > 0 ? above / rows.length : 0;

    const confidence_score = calculateConfidence({
      sampleSize: stats.count,
      completeness: 1,
      consistency,
      recency: recencyFromMedianAgeDays(medianAgeDays(rows, now)),
      effectStrength: Math.min(1, Math.abs(lift)),
    });

    const signal_strength = signalStrengthFromLift(
      recentStats.engagementRate,
      baselineStats.engagementRate,
      recent.length
    );

    const label = rows[0].topic!.trim();
    const pct = (stats.engagementRate * 100).toFixed(1);
    drafts.push({
      category: "TOPIC_ENGAGEMENT",
      topic: label,
      format: null,
      platform: null,
      hook: null,
      cta: null,
      confidence_score,
      confidence_explanation: `n=${stats.count} assets, engagement ${pct}% vs segment baseline ${(overall.engagementRate * 100).toFixed(1)}%.`,
      signal_strength,
      summary: `Content about "${label}" earned ${pct}% engagement across ${stats.count} assets in the analysis window.`,
      recommendation: `Keep "${label}" in the topic mix for this segment and test follow-up angles.`,
      sample_size: stats.count,
      source_content_asset_ids: stats.assetIds,
      source_event_ids: [],
      source_lead_ids: [],
      metrics: {
        engagementRate: Number(stats.engagementRate.toFixed(4)),
        baselineEngagementRate: Number(overall.engagementRate.toFixed(4)),
        lift: Number(lift.toFixed(3)),
        views: stats.totalViews,
      },
    });
  }

  return drafts.sort((a, b) => b.confidence_score - a.confidence_score);
}
