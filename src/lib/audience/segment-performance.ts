import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  summarizeFormats,
  type AssetCounters,
  type FormatSignal,
} from "@/lib/audience/analytics";

export type { FormatSignal };

/**
 * Supporting metrics for the segment detail page — aggregated
 * server-side/database-side, capped at 500 assets. Never ships raw events
 * to the browser.
 */
export async function getSegmentFormatSignals(
  organizationId: string,
  segmentId: string
): Promise<FormatSignal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select("format, views, clicks, shares, comments, saves, registrations")
    .eq("organization_id", organizationId)
    .eq("audience_segment_id", segmentId)
    .limit(500);
  if (error) return [];
  return summarizeFormats((data ?? []) as AssetCounters[]);
}
