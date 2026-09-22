import "server-only";
import { createClient } from "@/lib/supabase/server";
import { platformLeadStats, type LeadRow } from "@/lib/audience/analytics";
import type { SegmentScoreSignals } from "@/types/audience";

/**
 * Lead-scoring segment signals (PRD §6.15): lets AI Lead Scoring weight
 * segment-level historical conversion patterns alongside individual signals.
 * Pure quality rates — never volume — plus the count of approved insights
 * available as scoring context.
 */
export async function getSegmentScoreSignals(
  organizationId: string,
  segmentId: string
): Promise<SegmentScoreSignals> {
  const supabase = await createClient();

  const { data: segment, error: segError } = await supabase
    .from("audience_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (segError) throw new Error(`Segment lookup failed: ${segError.message}`);
  if (!segment) throw new Error("Segment not found in your organization.");

  const [{ data: leads, error: leadsError }, { count: approved }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, source_platform, is_qualified, is_converted")
        .eq("organization_id", organizationId)
        .eq("audience_segment_id", segmentId)
        .limit(5000),
      supabase
        .from("audience_insights")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("segment_id", segmentId)
        .eq("status", "APPROVED"),
    ]);
  if (leadsError) throw new Error(`Lead lookup failed: ${leadsError.message}`);

  const rows = ((leads ?? []) as Array<
    Pick<LeadRow, "id" | "is_qualified" | "is_converted"> & {
      source_platform: string | null;
    }
  >).map((l) => ({
    ...l,
    organization_id: organizationId,
    email: null,
    audience_segment_id: segmentId,
    source_content_asset_id: null,
    created_at: new Date().toISOString(),
  }));
  const qualified = rows.filter((l) => l.is_qualified).length;
  const converted = rows.filter((l) => l.is_converted).length;
  const baseline = rows.length > 0 ? qualified / rows.length : 0;

  const byPlatform = platformLeadStats(
    rows.filter((l) => l.source_platform && l.source_platform.trim()),
    (l) => (l.source_platform as string).trim().toLowerCase()
  );

  return {
    segmentId,
    leads: rows.length,
    qualifiedRate: baseline,
    conversionRate: rows.length > 0 ? converted / rows.length : 0,
    byPlatform: [...byPlatform.values()].map((p) => ({
      platform: p.key,
      leads: p.leads,
      qualifiedRate: p.qualifiedRate,
      conversionRate: p.conversionRate,
      qualityLift:
        baseline > 0
          ? Number(((p.qualifiedRate - baseline) / baseline).toFixed(3))
          : p.qualifiedRate > 0
            ? 1
            : 0,
    })),
    approvedInsights: approved ?? 0,
  };
}
