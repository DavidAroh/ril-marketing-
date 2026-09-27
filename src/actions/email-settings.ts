"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { getUserRole } from "@/lib/audience/access";
import { decryptSecret, encryptSecret, isEncryptionEnabled } from "@/lib/crypto/secret-box";
import { verifyResendSender } from "@/lib/integrations/resend";

type Result = { ok: boolean; error?: string; message?: string };
async function requireEmailManager(orgId: string) {
  const role = await getUserRole(orgId);
  if (!role || !["owner", "admin", "marketing_manager"].includes(role)) throw new Error("Email provider settings require an owner, admin or marketing manager.");
}

const settingsSchema = z.object({
  apiKey: z.string().trim().max(500).default(""),
  fromEmail: z.string().trim().email().max(320),
  fromName: z.string().trim().min(1).max(120),
  replyTo: z.union([z.literal(""), z.string().trim().email().max(320)]).default(""),
  webhookSecret: z.string().trim().max(500).default(""),
});

export async function saveResendSettings(formData: FormData): Promise<Result> {
  try {
    const organizationId = await requireOrganizationId();
    await requireEmailManager(organizationId);
    if (!isEncryptionEnabled()) return { ok: false, error: "Set AI_CONFIG_SECRET (at least 8 characters) before storing an email API key." };
    const parsed = settingsSchema.safeParse({
      apiKey: formData.get("apiKey") ?? "", fromEmail: formData.get("fromEmail"),
      fromName: formData.get("fromName") ?? "Renaissance Innovation Labs",
      replyTo: formData.get("replyTo") ?? "", webhookSecret: formData.get("webhookSecret") ?? "",
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the provider settings." };
    const admin = createAdminClient();
    const { data: current } = await admin.from("integrations").select("config").eq("organization_id", organizationId).eq("key", "email_resend").maybeSingle<{ config: Record<string,string> }>();
    const key = parsed.data.apiKey || "";
    const apiKey = key || (current?.config.apiKey ? decryptSecret(current.config.apiKey) : "");
    if (!apiKey.startsWith("re_")) return { ok: false, error: "Enter a valid Resend API key." };
    const verified = await verifyResendSender(apiKey, parsed.data.fromEmail);
    if (!verified.ok) return { ok: false, error: verified.error ?? "Could not verify the sender." };
    const webhookSecret = parsed.data.webhookSecret || (current?.config.webhookSecret ? decryptSecret(current.config.webhookSecret) : "");
    if (webhookSecret && !webhookSecret.startsWith("whsec_")) return { ok: false, error: "Webhook signing secret should start with whsec_." };
    const { error } = await admin.from("integrations").upsert({
      organization_id: organizationId, key: "email_resend", display_name: "Resend email delivery", status: "connected",
      config: { apiKey: encryptSecret(apiKey), webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : "", fromEmail: parsed.data.fromEmail, fromName: parsed.data.fromName, replyTo: parsed.data.replyTo },
    }, { onConflict: "organization_id,key" });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/email");
    return { ok: true, message: "Resend sender verified and settings saved." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not save Resend settings." }; }
}

export async function disconnectResend(): Promise<Result> {
  try {
    const organizationId = await requireOrganizationId();
    await requireEmailManager(organizationId);
    const admin = createAdminClient();
    const { error } = await admin.from("integrations").update({ status: "not_connected", config: {} }).eq("organization_id", organizationId).eq("key", "email_resend");
    if (error) return { ok: false, error: error.message };
    revalidatePath("/email");
    return { ok: true, message: "Resend disconnected. Queued deliveries are retained and will wait for reconnection." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not disconnect Resend." }; }
}
