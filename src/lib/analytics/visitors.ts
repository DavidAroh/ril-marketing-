import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeLiveVisitorStats,
  EMPTY_LIVE_VISITOR_STATS,
  LIVE_WINDOW_MINUTES,
  type LiveVisitorStats,
  type VisitorEvent,
} from "@/lib/analytics/visitor-stats";

interface PageviewRow {
  created_at: string;
  metadata: { visitor_id?: unknown; device?: unknown } | null;
}

/**
 * Distinct visitors across the RIL site in the live window (§6.26).
 * Reads site-wide through the service role: anonymous landing traffic isn't
 * attributable to a member's workspace, and the widget measures audience,
 * not the team. Swallows every failure — the widget falls back to zero.
 */
export async function getLiveVisitorStats(): Promise<LiveVisitorStats> {
  try {
    const admin = createAdminClient();
    const since = new Date(
      Date.now() - 2 * LIVE_WINDOW_MINUTES * 60_000
    ).toISOString();
    const { data, error } = await admin
      .from("analytics_events")
      .select("created_at, metadata")
      .eq("event_type", "pageview")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error || !data) return EMPTY_LIVE_VISITOR_STATS;

    const events: VisitorEvent[] = data.map((row: PageviewRow) => ({
      createdAt: row.created_at,
      visitorId:
        typeof row.metadata?.visitor_id === "string"
          ? row.metadata.visitor_id
          : null,
      device:
        typeof row.metadata?.device === "string" ? row.metadata.device : "Other",
    }));
    return computeLiveVisitorStats(events);
  } catch {
    return EMPTY_LIVE_VISITOR_STATS;
  }
}
