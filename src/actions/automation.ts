"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/audience/access";

async function requireAutomationManager(organizationId: string) {
  const role = await getUserRole(organizationId);
  if (!role || !["owner", "admin", "marketing_manager"].includes(role)) {
    throw new Error("Automation settings require an owner, admin or marketing manager.");
  }
  return role;
}

export async function saveAutomationSettings(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireAutomationManager(organizationId);
  const enabled = z.enum(["true", "false"]).parse(formData.get("activity_to_drafts_enabled")) === "true";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("automation_settings").upsert({ organization_id: organizationId, activity_to_drafts_enabled: enabled, updated_by: user?.id ?? null }, { onConflict: "organization_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/automation");
}

export async function retryAutomationEvent(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireAutomationManager(organizationId);
  const id = z.string().uuid().parse(formData.get("id"));
  const admin = createAdminClient();
  const { data, error } = await admin.from("automation_events").update({ status: "queued", attempts: 0, error: null, processed_at: null }).eq("organization_id", organizationId).eq("id", id).eq("status", "failed").select("id").maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Only failed automation jobs can be retried.");
  revalidatePath("/settings/automation");
}
