import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  getAudienceRecommendations,
  getCalendarSignals,
} from "@/lib/audience/recommendations";
import type { Activity, ContentBrief } from "@/types/audience";

function uniq(vals: Array<string | null>): string[] {
  return [...new Set(vals.filter((v): v is string => Boolean(v && v.trim())))];
}

/**
 * Content Repurposing brief (PRD §6.3, acceptance criterion 3):
 * Activity → Audience Segment → approved insights → generation guidance.
 * Only APPROVED intelligence is ever supplied; the repurposing engine receives
 * proven topics/formats/platforms/hooks/CTAs plus a deterministic guidance
 * line — no autonomous generation happens here.
 */
export async function buildContentBrief(
  organizationId: string,
  activityId: string,
  limit = 5
): Promise<ContentBrief> {
  const supabase = await createClient();
  const { data: activity, error } = await supabase
    .from("activities")
    .select("*, segment:audience_segments(id, name)")
    .eq("organization_id", organizationId)
    .eq("id", activityId)
    .maybeSingle<
      Activity & { segment: { id: string; name: string } | null }
    >();
  if (error) throw new Error(`Activity lookup failed: ${error.message}`);
  if (!activity) throw new Error("Activity not found in your organization.");
  if (!activity.audience_segment_id || !activity.segment) {
    throw new Error("Activity is not tagged to an audience segment yet.");
  }

  const { recommendations } = await getAudienceRecommendations(
    organizationId,
    activity.audience_segment_id,
    limit
  );
  const calendar = await getCalendarSignals(
    organizationId,
    activity.audience_segment_id
  );

  const top = recommendations[0];
  const guidance = top
    ? `For "${activity.segment.name}", lead with ${top.format ?? top.topic ?? "proven angles"} ` +
      `(confidence ${Math.round(top.confidenceScore * 100)}%, signal ${top.signalStrength.toLowerCase()}).` +
      (calendar.platforms.length > 0
        ? ` Prioritise ${calendar.platforms.slice(0, 3).join(", ")}.`
        : "")
    : `No approved intelligence for "${activity.segment.name}" yet — review pending insights before generating.`;

  return {
    activityId: activity.id,
    activityTitle: activity.title,
    segmentId: activity.audience_segment_id,
    segmentName: activity.segment.name,
    generatedAt: new Date().toISOString(),
    topics: uniq(recommendations.map((r) => r.topic)),
    formats: calendar.formats,
    platforms: calendar.platforms,
    hooks: calendar.hooks,
    ctas: calendar.ctas,
    guidance,
    recommendations,
  };
}
