import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankScore } from "@/lib/audience/scoring";
import type {
  AudienceInsight,
  RecommendationItem,
} from "@/types/audience";

export const MAX_RECOMMENDATIONS = 50;

/**
 * Reusable server-side recommendation service (§29, §30).
 * SECURITY: hard-filters status = 'APPROVED' at the query level (§10).
 * Never rely on frontend filtering.
 */
export async function getAudienceRecommendations(
  organizationId: string,
  segmentId: string,
  limit = 10
): Promise<{ segmentId: string; recommendations: RecommendationItem[] }> {
  const safeLimit = Math.min(MAX_RECOMMENDATIONS, Math.max(1, limit));
  const supabase = await createClient();

  // Ownership check: segment must belong to the caller's org.
  const { data: segment, error: segError } = await supabase
    .from("audience_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (segError) throw new Error(`Segment lookup failed: ${segError.message}`);
  if (!segment) throw new Error("Segment not found in your organization.");

  const { data, error } = await supabase
    .from("audience_insights")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("segment_id", segmentId)
    .eq("status", "APPROVED")
    .order("confidence_score", { ascending: false })
    .limit(safeLimit * 3);

  if (error) throw new Error(`Recommendation query failed: ${error.message}`);

  const ranked = ((data ?? []) as AudienceInsight[])
    .map((i) => ({
      insightId: i.id,
      category: i.category,
      topic: i.topic,
      format: i.format,
      platform: i.platform,
      hook: i.hook,
      cta: i.cta,
      confidenceScore: Number(i.confidence_score),
      signalStrength: i.signal_strength,
      recommendation: i.recommendation,
      sampleSize: i.sample_size,
      rankScore: rankScore({
        confidenceScore: Number(i.confidence_score),
        signalStrength: i.signal_strength,
        sampleSize: i.sample_size,
        generatedAt: i.created_at,
      }),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, safeLimit);

  return { segmentId, recommendations: ranked };
}

/** Same gate for the privileged cron/admin path (defence in depth). */
export async function getAudienceRecommendationsAdmin(
  organizationId: string,
  segmentId: string,
  limit = 10
): Promise<{ segmentId: string; recommendations: RecommendationItem[] }> {
  const safeLimit = Math.min(MAX_RECOMMENDATIONS, Math.max(1, limit));
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("audience_insights")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("segment_id", segmentId)
    .eq("status", "APPROVED")
    .order("confidence_score", { ascending: false })
    .limit(safeLimit * 3);
  if (error) throw new Error(`Recommendation query failed: ${error.message}`);
  const ranked = ((data ?? []) as AudienceInsight[])
    .map((i) => ({
      insightId: i.id,
      category: i.category,
      topic: i.topic,
      format: i.format,
      platform: i.platform,
      hook: i.hook,
      cta: i.cta,
      confidenceScore: Number(i.confidence_score),
      signalStrength: i.signal_strength,
      recommendation: i.recommendation,
      sampleSize: i.sample_size,
      rankScore: rankScore({
        confidenceScore: Number(i.confidence_score),
        signalStrength: i.signal_strength,
        sampleSize: i.sample_size,
        generatedAt: i.created_at,
      }),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, safeLimit);
  return { segmentId, recommendations: ranked };
}

/**
 * Content Calendar shape (§30): distinct proven topics/formats/platforms/hooks/CTAs.
 */
export async function getCalendarSignals(
  organizationId: string,
  segmentId: string
): Promise<{
  topics: string[];
  formats: string[];
  platforms: string[];
  hooks: string[];
  ctas: string[];
}> {
  const { recommendations } = await getAudienceRecommendations(
    organizationId,
    segmentId,
    50
  );
  const uniq = (vals: Array<string | null>) =>
    [...new Set(vals.filter((v): v is string => Boolean(v && v.trim())))];
  return {
    topics: uniq(recommendations.map((r) => r.topic)),
    formats: uniq(recommendations.map((r) => r.format)),
    platforms: uniq(recommendations.map((r) => r.platform)),
    hooks: uniq(recommendations.map((r) => r.hook)),
    ctas: uniq(recommendations.map((r) => r.cta)),
  };
}
