import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rollupCampaign } from "@/lib/audience/analytics";
import type { Campaign, CampaignRollup } from "@/types/audience";

/**
 * Campaign segment-reach rollups (PRD §6.18): alongside CPL/CPA/ROI tracking
 * owned by Campaign Management, the intelligence layer contributes per-segment
 * reach, registration and lead-quality numbers.
 */
export async function listCampaignRollups(
  organizationId: string
): Promise<CampaignRollup[]> {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*, segment:audience_segments(id, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load campaigns: ${error.message}`);
  const rows = (campaigns ?? []) as Array<
    Campaign & { segment: { id: string; name: string } | null }
  >;
  if (rows.length === 0) return [];

  const campaignIds = rows.map((c) => c.id);
  const [{ data: assets }, { data: leads }] = await Promise.all([
    supabase
      .from("content_assets")
      .select("id, campaign_id, views, registrations")
      .eq("organization_id", organizationId)
      .in("campaign_id", campaignIds)
      .limit(2000),
    supabase
      .from("leads")
      .select("id, source_content_asset_id, is_qualified, is_converted")
      .eq("organization_id", organizationId)
      .limit(5000),
  ]);

  const assetRows = ((assets ?? []) as Array<{
    id: string;
    campaign_id: string | null;
    views: number;
    registrations: number;
  }>).map((a) => ({
    ...a,
    views: Number(a.views ?? 0),
    registrations: Number(a.registrations ?? 0),
  }));
  const leadRows = (leads ?? []) as Array<{
    id: string;
    source_content_asset_id: string | null;
    is_qualified: boolean;
    is_converted: boolean;
  }>;

  return rows.map((c) => {
    const { segment, ...campaign } = c;
    const stats = rollupCampaign(c.id, { assets: assetRows, leads: leadRows });
    return {
      ...campaign,
      segment_name: segment?.name ?? null,
      ...stats,
    } satisfies CampaignRollup;
  });
}

export async function listSegmentCampaigns(
  organizationId: string,
  segmentId: string
): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("audience_segment_id", segmentId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load campaigns: ${error.message}`);
  return (data ?? []) as Campaign[];
}
