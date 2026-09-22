import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALGORITHM_VERSION } from "@/lib/audience/scoring";
import {
  attachEventIds,
  groupEventsByAsset,
} from "@/lib/audience/analytics";
import { reviewTaskTitle } from "@/lib/audience/tasks";
import { analyseTopicEngagement } from "@/jobs/audience-insights/topic-engagement";
import { analyseFormatRegistration } from "@/jobs/audience-insights/format-registration";
import { analysePlatformLeadQuality } from "@/jobs/audience-insights/platform-lead-quality";
import { analyseHookCtaEffectiveness } from "@/jobs/audience-insights/hook-cta-effectiveness";
import type {
  ContentRow,
  LeadRow,
} from "@/lib/audience/analytics";
import type { DraftInsight } from "@/jobs/audience-insights/topic-engagement";

export interface GenerateOptions {
  organizationId: string;
  /** Defaults to previous ~30 days (§12). */
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  segmentIds?: string[];
  triggeredBy?: string;
}

export interface GenerateResult {
  runId: string;
  segmentsProcessed: number;
  insightsCreated: number;
  insightsUpdated: number;
  status: "COMPLETED" | "FAILED";
  error?: string;
}

/**
 * Scheduled insight generation (§12–§20).
 * Deterministic stats first; LLM optional only for summary polish (not wired by
 * default — evidence below is never invented). Idempotent via the partial
 * unique identity index: re-runs UPDATE the live PENDING/APPROVED row instead
 * of inserting duplicates; history is preserved by leaving SUPPRESSED rows
 * untouched (a new PENDING row is created for suppressed identities).
 */
export async function generateAudienceInsights(
  options: GenerateOptions
): Promise<GenerateResult> {
  const admin = createAdminClient();
  const end = options.dateRangeEnd ?? new Date();
  const start =
    options.dateRangeStart ??
    new Date(end.getTime() - 30 * 86_400_000);

  const { data: run, error: runError } = await admin
    .from("audience_insight_generation_runs")
    .insert({
      organization_id: options.organizationId,
      status: "RUNNING",
      date_range_start: start.toISOString().slice(0, 10),
      date_range_end: end.toISOString().slice(0, 10),
      algorithm_version: ALGORITHM_VERSION,
    })
    .select("id")
    .single<{ id: string }>();
  if (runError || !run) {
    throw new Error(`Could not start generation run: ${runError?.message}`);
  }
  const runId = run.id;

  try {
    let segQuery = admin
      .from("audience_segments")
      .select("id")
      .eq("organization_id", options.organizationId);
    if (options.segmentIds?.length) {
      segQuery = segQuery.in("id", options.segmentIds);
    }
    const { data: segments, error: segError } = await segQuery;
    if (segError) throw new Error(segError.message);
    const segmentIds = ((segments ?? []) as Array<{ id: string }>).map(
      (s) => s.id
    );

    let created = 0;
    let updated = 0;

    for (const segmentId of segmentIds) {
      const { data: assets } = await admin
        .from("content_assets")
        .select("*")
        .eq("organization_id", options.organizationId)
        .eq("audience_segment_id", segmentId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .limit(2000);
      const { data: leads } = await admin
        .from("leads")
        .select("*")
        .eq("organization_id", options.organizationId)
        .eq("audience_segment_id", segmentId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .limit(2000);

      const assetRows = ((assets ?? []) as ContentRow[]).map((a) => ({
        ...a,
        views: Number(a.views ?? 0),
        clicks: Number(a.clicks ?? 0),
        shares: Number(a.shares ?? 0),
        comments: Number(a.comments ?? 0),
        saves: Number(a.saves ?? 0),
        registrations: Number(a.registrations ?? 0),
      }));
      const leadRows = (leads ?? []) as LeadRow[];

      // Traceability: pull the Analytics Events behind this segment's assets
      // so every insight links back to the events that produced it (PRD data
      // model — same principle as AI Generation → Source Asset).
      let eventsByAsset = new Map<string, string[]>();
      const assetIds = assetRows.map((a) => a.id);
      if (assetIds.length > 0) {
        const { data: events } = await admin
          .from("analytics_events")
          .select("id, content_asset_id")
          .eq("organization_id", options.organizationId)
          .in("content_asset_id", assetIds.slice(0, 500))
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .limit(5000);
        eventsByAsset = groupEventsByAsset(
          ((events ?? []) as Array<{ id: string; content_asset_id: string | null }>)
        );
      }

      const drafts: DraftInsight[] = attachEventIds(
        [
          ...analyseTopicEngagement({
            assets: assetRows,
            rangeStart: start,
            rangeEnd: end,
          }),
          ...analyseFormatRegistration({
            assets: assetRows,
            rangeStart: start,
            rangeEnd: end,
          }),
          ...analysePlatformLeadQuality({ leads: leadRows, assets: assetRows }),
          ...analyseHookCtaEffectiveness({ assets: assetRows }),
        ],
        eventsByAsset
      );

      for (const draft of drafts) {
        const { outcome, id } = await upsertInsight(
          admin,
          options.organizationId,
          segmentId,
          draft,
          runId,
          start,
          end
        );
        if (outcome === "created") {
          created += 1;
          // Command-Centre task so Marketing never misses a pending review.
          if (id) {
            await admin.from("tasks").insert({
              organization_id: options.organizationId,
              type: "insight_review",
              title: reviewTaskTitle(draft),
              status: "open",
              insight_id: id,
            });
          }
        }
        if (outcome === "updated") updated += 1;
      }
    }

    await admin
      .from("audience_insight_generation_runs")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        segments_processed: segmentIds.length,
        insights_created: created,
      })
      .eq("id", runId);

    return {
      runId,
      segmentsProcessed: segmentIds.length,
      insightsCreated: created,
      insightsUpdated: updated,
      status: "COMPLETED",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await createAdminClient()
      .from("audience_insight_generation_runs")
      .update({
        status: "FAILED",
        completed_at: new Date().toISOString(),
        error: message.slice(0, 2000),
      })
      .eq("id", runId);
    return {
      runId,
      segmentsProcessed: 0,
      insightsCreated: 0,
      insightsUpdated: 0,
      status: "FAILED",
      error: message,
    };
  }
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function upsertInsight(
  admin: SupabaseAdmin,
  organizationId: string,
  segmentId: string,
  draft: DraftInsight,
  runId: string,
  start: Date,
  end: Date
): Promise<{ outcome: "created" | "updated" | "skipped"; id: string | null }> {
  const norm = (v: string | null) => v ?? "";
  let existingQuery = admin
    .from("audience_insights")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("segment_id", segmentId)
    .eq("category", draft.category)
    .in("status", ["PENDING_REVIEW", "APPROVED"])
    .limit(1);
  // NULL-safe identity match (mirrors COALESCE(col,'') in the unique index).
  const dims = {
    topic: norm(draft.topic),
    format: norm(draft.format),
    platform: norm(draft.platform),
    hook: norm(draft.hook),
    cta: norm(draft.cta),
  } as const;
  for (const [col, val] of Object.entries(dims)) {
    existingQuery =
      val === "" ? existingQuery.is(col, null) : existingQuery.eq(col, val);
  }
  // NOTE: exact-null matching — rows store NULL while the unique index uses
  // COALESCE(col,''); NULL = NULL never matches in Postgres, so normalise by
  // matching null-identity columns with IS NULL explicitly below when needed.
  const { data: existing } = await existingQuery.maybeSingle<{
    id: string;
    status: string;
  }>();

  const payload = {
    organization_id: organizationId,
    segment_id: segmentId,
    category: draft.category,
    topic: draft.topic,
    format: draft.format,
    platform: draft.platform,
    hook: draft.hook,
    cta: draft.cta,
    confidence_score: draft.confidence_score,
    signal_strength: draft.signal_strength,
    summary: draft.summary,
    recommendation: draft.recommendation,
    sample_size: draft.sample_size,
    date_range_start: start.toISOString().slice(0, 10),
    date_range_end: end.toISOString().slice(0, 10),
    source_event_ids: draft.source_event_ids,
    source_content_asset_ids: draft.source_content_asset_ids,
    source_lead_ids: draft.source_lead_ids,
    generation_run_id: runId,
    algorithm_version: ALGORITHM_VERSION,
  };

  if (existing) {
    // Preserve human review state: never flip APPROVED/SUPPRESSED by re-run.
    // Refresh evidence + metrics on PENDING rows; refresh evidence only on APPROVED.
    const patch =
      existing.status === "APPROVED"
        ? {
            sample_size: payload.sample_size,
            date_range_start: payload.date_range_start,
            date_range_end: payload.date_range_end,
            source_event_ids: payload.source_event_ids,
            source_content_asset_ids: payload.source_content_asset_ids,
            source_lead_ids: payload.source_lead_ids,
            generation_run_id: runId,
            algorithm_version: ALGORITHM_VERSION,
          }
        : payload;
    const { error } = await admin
      .from("audience_insights")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { outcome: "updated", id: existing.id };
  }

  const { data: inserted, error } = await admin
    .from("audience_insights")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();
  if (error) {
    // Race between concurrent runs hitting the identity index — treat as update.
    if (error.code === "23505") return { outcome: "updated", id: null };
    throw new Error(error.message);
  }
  return { outcome: "created", id: inserted.id };
}
