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
import type { DraftInsight } from "@/jobs/audience-insights/topic-engagement";

/**
 * §15 — (segment, format) vs registration outcomes.
 * Optimises for registration rate, never impressions.
 */
export function analyseFormatRegistration(args: {
  assets: ContentRow[];
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
}): DraftInsight[] {
  const { assets, rangeStart, rangeEnd, now = new Date() } = args;
  const byFormat = groupBy(
    assets.filter((a) => a.format && a.format.trim().length > 0),
    (a) => a.format!.trim().toLowerCase()
  );
  if (byFormat.size < 2) return [];

  const overall = summarizeAssets("__all__", assets);
  const drafts: DraftInsight[] = [];

  for (const [formatKey, rows] of byFormat) {
    if (rows.length < MIN_SAMPLES.FORMAT_REGISTRATION) continue;
    const stats = summarizeAssets(formatKey, rows);
    const { recent, baseline } = splitRecentBaseline(rows, rangeStart, rangeEnd);
    const recentStats = summarizeAssets(`${formatKey}::recent`, recent);
    const baselineStats = summarizeAssets(
      `${formatKey}::baseline`,
      baseline.length > 0 ? baseline : rows
    );
    const lift =
      overall.registrationRate > 0
        ? (stats.registrationRate - overall.registrationRate) /
          overall.registrationRate
        : stats.registrationRate > 0
          ? 1
          : 0;
    if (lift <= 0.1) continue; // only surface formats beating the baseline

    const withRegs = rows.filter((r) => r.registrations > 0).length;
    const consistency = rows.length > 0 ? withRegs / rows.length : 0;

    const confidence_score = calculateConfidence({
      sampleSize: stats.count,
      completeness: 1,
      consistency,
      recency: recencyFromMedianAgeDays(medianAgeDays(rows, now)),
      effectStrength: Math.min(1, Math.abs(lift) / 2),
    });

    const label = rows[0].format!.trim();
    drafts.push({
      category: "FORMAT_REGISTRATION",
      topic: null,
      format: label,
      platform: null,
      hook: null,
      cta: null,
      confidence_score,
      confidence_explanation: `n=${stats.count} assets, registration rate ${(stats.registrationRate * 100).toFixed(2)}% vs ${(overall.registrationRate * 100).toFixed(2)}% baseline.`,
      signal_strength: signalStrengthFromLift(
        recentStats.registrationRate,
        baselineStats.registrationRate,
        recent.length
      ),
      summary: `${label} produced a ${(stats.registrationRate * 100).toFixed(2)}% registration rate across ${stats.count} assets — above the segment baseline.`,
      recommendation: `Prioritise ${label} when generating content for this segment.`,
      sample_size: stats.count,
      source_content_asset_ids: stats.assetIds,
      source_event_ids: [],
      source_lead_ids: [],
      metrics: {
        registrationRate: Number(stats.registrationRate.toFixed(4)),
        baselineRegistrationRate: Number(overall.registrationRate.toFixed(4)),
        lift: Number(lift.toFixed(3)),
      },
    });
  }

  return drafts.sort((a, b) => b.confidence_score - a.confidence_score);
}
