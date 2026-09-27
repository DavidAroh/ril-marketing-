import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashUnsubscribeToken } from "@/lib/email/tokens";

export async function unsubscribeFromMarketing(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const admin = createAdminClient();
  const tokenHash = hashUnsubscribeToken(token);
  const { data: delivery } = await admin.from("email_campaign_deliveries").select("id,organization_id,lead_id").eq("unsubscribe_token_hash", tokenHash).maybeSingle<{id:string;organization_id:string;lead_id:string}>();
  if (!delivery) return false;
  const now = new Date().toISOString();
  const [{ error: leadError }, { error: deliveryError }] = await Promise.all([
    admin.from("leads").update({ marketing_consent: false, email_unsubscribed_at: now }).eq("organization_id", delivery.organization_id).eq("id", delivery.lead_id),
    admin.from("email_campaign_deliveries").update({ status: "unsubscribed", error: "Recipient unsubscribed." }).eq("organization_id", delivery.organization_id).eq("lead_id", delivery.lead_id).in("status", ["queued", "sending"]),
  ]);
  return !leadError && !deliveryError;
}
