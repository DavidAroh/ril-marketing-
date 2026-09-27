"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/audience/access";
import { decryptSecret, encryptSecret, isEncryptionEnabled } from "@/lib/crypto/secret-box";
import { verifyGoogleAnalyticsConnection, type GoogleAnalyticsConfig } from "@/lib/integrations/google-analytics";

type Result = { ok: boolean; error?: string; message?: string };
const settingsSchema = z.object({
  credentialsJson: z.string().trim().max(12000).default(""),
  ga4PropertyId: z.string().trim().regex(/^\d{4,20}$/, "Enter the numeric GA4 property ID."),
  searchConsoleSiteUrl: z.string().trim().min(4).max(300),
});

async function requireAnalyticsManager(organizationId: string) {
  const role = await getUserRole(organizationId);
  if (!role || !["owner", "admin", "marketing_manager"].includes(role)) throw new Error("Analytics settings require an owner, admin or marketing manager.");
}

function validateSearchConsoleProperty(value: string) {
  if (value.startsWith("sc-domain:")) {
    const domain = value.slice("sc-domain:".length).toLowerCase();
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw new Error("Use a valid Search Console domain property such as sc-domain:example.org.");
    return `sc-domain:${domain}`;
  }
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a Search Console URL-prefix property or sc-domain property."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Use the HTTPS URL-prefix property exactly as it appears in Search Console.");
  return url.href;
}

export async function saveGoogleAnalyticsSettings(formData: FormData): Promise<Result> {
  try {
    const organizationId = await requireOrganizationId();
    await requireAnalyticsManager(organizationId);
    if (!isEncryptionEnabled()) return { ok: false, error: "Set AI_CONFIG_SECRET before storing Google credentials." };
    const parsed = settingsSchema.safeParse({ credentialsJson: formData.get("credentialsJson") ?? "", ga4PropertyId: formData.get("ga4PropertyId"), searchConsoleSiteUrl: formData.get("searchConsoleSiteUrl") });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the Google Analytics settings." };
    const admin = createAdminClient();
    const { data: current } = await admin.from("integrations").select("config").eq("organization_id", organizationId).eq("key", "google_analytics").maybeSingle<{ config: Record<string, string> }>();
    const credentialsJson = parsed.data.credentialsJson || decryptSecret(current?.config.credentials ?? "");
    if (!credentialsJson) return { ok: false, error: "Paste a Google service-account JSON key file." };
    let searchConsoleSiteUrl: string;
    try { searchConsoleSiteUrl = validateSearchConsoleProperty(parsed.data.searchConsoleSiteUrl); }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Enter a valid Search Console property." }; }
    const config: GoogleAnalyticsConfig = { credentialsJson, ga4PropertyId: parsed.data.ga4PropertyId, searchConsoleSiteUrl };
    await verifyGoogleAnalyticsConnection(config);
    const { error } = await admin.from("integrations").upsert({
      organization_id: organizationId,
      key: "google_analytics",
      display_name: "Google Analytics 4 and Search Console",
      status: "connected",
      config: { credentials: encryptSecret(credentialsJson), ga4PropertyId: config.ga4PropertyId, searchConsoleSiteUrl },
    }, { onConflict: "organization_id,key" });
    if (error) return { ok: false, error: "Could not save the verified Google connection." };
    revalidatePath("/settings/ai");
    revalidatePath("/reports");
    return { ok: true, message: "GA4 and Search Console access verified and saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not connect Google Analytics." };
  }
}

export async function disconnectGoogleAnalytics(): Promise<Result> {
  try {
    const organizationId = await requireOrganizationId();
    await requireAnalyticsManager(organizationId);
    const { error } = await createAdminClient().from("integrations").update({ status: "not_connected", config: {} }).eq("organization_id", organizationId).eq("key", "google_analytics");
    if (error) return { ok: false, error: "Could not disconnect Google Analytics." };
    revalidatePath("/settings/ai");
    revalidatePath("/reports");
    return { ok: true, message: "Google Analytics and Search Console disconnected." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not disconnect Google Analytics." }; }
}
