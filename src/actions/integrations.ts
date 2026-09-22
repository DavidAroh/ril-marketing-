"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/supabase/organization";
import {
  disconnectBuffer,
  getBufferProfiles,
  publishToBuffer,
  type BufferProfile,
} from "@/lib/integrations/buffer";

export type { BufferProfile };

export interface IntegrationResult {
  ok: boolean;
  error?: string;
  channels?: BufferProfile[];
  publicationId?: string;
}

export async function refreshBufferChannels(): Promise<IntegrationResult> {
  try {
    const organizationId = await requireOrganizationId();
    const channels = await getBufferProfiles(organizationId);
    revalidatePath("/settings/ai");
    return { ok: true, channels };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function disconnectBufferAction(): Promise<IntegrationResult> {
  try {
    const organizationId = await requireOrganizationId();
    await disconnectBuffer(organizationId);
    revalidatePath("/settings/ai");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Publish an Approved asset to one Buffer channel (§6.9). Records a
 * Publication row either way: `published` with Buffer's id, or `failed`
 * with the error — the asset itself stays Approved on failure (§13).
 */
export async function publishAssetViaBuffer(
  assetId: string,
  profileId: string
): Promise<IntegrationResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();

    const { data: asset, error: assetError } = await supabase
      .from("content_assets")
      .select("id, title, body, status")
      .eq("id", assetId)
      .eq("organization_id", organizationId)
      .maybeSingle<{ id: string; title: string; body: string | null; status: string }>();
    if (assetError || !asset) return { ok: false, error: "Asset not found." };
    // Publishing executes the scheduled→published step on the asset's behalf;
    // the manual stepper still enforces §11 order everywhere else.
    if (asset.status !== "approved" && asset.status !== "scheduled") {
      return { ok: false, error: "Only approved or scheduled assets can be published." };
    }
    const text = asset.body?.trim() || asset.title;
    if (!text) return { ok: false, error: "Asset has no text to publish." };

    try {
      const externalId = await publishToBuffer(organizationId, profileId, text);
      const { data: pub } = await supabase
        .from("publications")
        .insert({
          organization_id: organizationId,
          content_asset_id: assetId,
          channel: "buffer",
          external_id: externalId,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single<{ id: string }>();
      await supabase
        .from("content_assets")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", assetId)
        .eq("organization_id", organizationId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("asset_approvals").insert({
        organization_id: organizationId,
        content_asset_id: assetId,
        actor_id: user?.id ?? null,
        from_status: asset.status,
        to_status: "published",
        note: "Published via Buffer.",
      });
      revalidatePath(`/library/${assetId}`);
      revalidatePath("/calendar");
      return { ok: true, publicationId: pub?.id };
    } catch (publishError) {
      const message =
        publishError instanceof Error ? publishError.message : "Publish failed.";
      await supabase.from("publications").insert({
        organization_id: organizationId,
        content_asset_id: assetId,
        channel: "buffer",
        status: "failed",
        error: message.slice(0, 1000),
      });
      return { ok: false, error: message };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
