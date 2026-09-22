import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isRegistrationToken,
  newRegistrationToken,
} from "@/lib/audience/guards";

export { isRegistrationToken, newRegistrationToken };

/**
 * Registration-link attribution seam (PRD §6.16, §7 Registration Link).
 * Campaign Management mints one tracked token per content asset/channel;
 * registrations arriving with that token attribute back to the exact asset.
 * Token format is validated purely (`isRegistrationToken`) — unit tested.
 */

export async function createRegistrationLink(
  organizationId: string,
  contentAssetId: string,
  channel: string
): Promise<{ id: string; token: string }> {
  const supabase = await createClient();
  const { data: asset, error: assetError } = await supabase
    .from("content_assets")
    .select("id")
    .eq("id", contentAssetId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (assetError) throw new Error(`Asset lookup failed: ${assetError.message}`);
  if (!asset) throw new Error("Content asset not found in your organization.");

  const token = newRegistrationToken();
  const { data, error } = await supabase
    .from("registration_links")
    .insert({
      organization_id: organizationId,
      content_asset_id: contentAssetId,
      channel: channel.trim().slice(0, 60) || "direct",
      token,
    })
    .select("id, token")
    .single<{ id: string; token: string }>();
  if (error || !data) {
    throw new Error(`Could not mint registration link: ${error?.message}`);
  }
  return data;
}

export interface ResolvedRegistration {
  assetId: string;
  campaignId: string | null;
  segmentId: string | null;
  channel: string;
}

/**
 * Server-side resolver for future capture endpoints (landing pages, forms).
 * Uses the privileged client because public click traffic carries no session;
 * callers must rate-limit and never expose this as an open oracle.
 */
export async function resolveRegistrationLink(
  organizationId: string,
  token: string
): Promise<ResolvedRegistration | null> {
  if (!isRegistrationToken(token)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("registration_links")
    .select(
      "channel, content_assets(id, campaign_id, audience_segment_id)"
    )
    .eq("organization_id", organizationId)
    .eq("token", token)
    .maybeSingle<{
      channel: string;
      content_assets: {
        id: string;
        campaign_id: string | null;
        audience_segment_id: string | null;
      } | null;
    }>();
  if (error || !data?.content_assets) return null;
  return {
    assetId: data.content_assets.id,
    campaignId: data.content_assets.campaign_id,
    segmentId: data.content_assets.audience_segment_id,
    channel: data.channel,
  };
}
