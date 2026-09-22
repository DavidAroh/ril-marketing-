import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface ContentAssetRow {
  id: string;
  organization_id: string;
  title: string;
  body: string | null;
  channel: string | null;
  topic: string | null;
  format: string | null;
  platform: string | null;
  hook: string | null;
  cta: string | null;
  status: string;
  sensitivity: string;
  scheduled_for: string | null;
  published_at: string | null;
  audience_segment_id: string | null;
  campaign_id: string | null;
  source_activity_id: string | null;
  generation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AssetFilters {
  status?: string;
  channel?: string;
  activityId?: string;
  campaignId?: string;
  q?: string;
  page?: number;
}

export async function listAssets(
  organizationId: string,
  filters: AssetFilters = {}
): Promise<{ assets: ContentAssetRow[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  let query = supabase
    .from("content_assets")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.channel && filters.channel !== "all") query = query.eq("channel", filters.channel);
  if (filters.activityId) query = query.eq("source_activity_id", filters.activityId);
  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
  }
  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load assets: ${error.message}`);
  return { assets: (data ?? []) as ContentAssetRow[], total: count ?? 0 };
}

export async function getAsset(
  organizationId: string,
  assetId: string
): Promise<ContentAssetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load asset: ${error.message}`);
  return (data ?? null) as ContentAssetRow | null;
}

export interface AssetApprovalRow {
  id: string;
  actor_id: string | null;
  from_status: string;
  to_status: string;
  note: string | null;
  created_at: string;
}

export async function listAssetApprovals(
  organizationId: string,
  assetId: string
): Promise<AssetApprovalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_approvals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("content_asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Failed to load approvals: ${error.message}`);
  return (data ?? []) as AssetApprovalRow[];
}

export async function listScheduled(
  organizationId: string,
  from: string,
  to: string
): Promise<ContentAssetRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["scheduled", "published"])
    .gte("scheduled_for", from)
    .lte("scheduled_for", to)
    .order("scheduled_for")
    .limit(500);
  if (error) throw new Error(`Failed to load calendar: ${error.message}`);
  return (data ?? []) as ContentAssetRow[];
}
