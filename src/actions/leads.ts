"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { scoreLead } from "@/lib/leads/scoring";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const FUNNEL_STAGES = [
  "awareness",
  "engagement",
  "captured",
  "nurturing",
  "converted",
  "retention",
] as const;

export async function setLeadStage(
  leadId: string,
  stage: string
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    if (!(FUNNEL_STAGES as readonly string[]).includes(stage)) {
      return { ok: false, error: "That stage isn't recognised." };
    }
    const supabase = await createClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("is_qualified, is_converted")
      .eq("id", leadId)
      .eq("organization_id", organizationId)
      .maybeSingle<{ is_qualified: boolean; is_converted: boolean }>();
    if (!lead) return { ok: false, error: "Lead not found." };

    const { count: events } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId);
    const { score, reason } = scoreLead({
      is_qualified: lead.is_qualified,
      is_converted: stage === "converted" ? true : lead.is_converted,
      funnel_stage: stage,
      eventCount: events ?? 0,
    });

    const { error } = await supabase
      .from("leads")
      .update({
        funnel_stage: stage,
        is_converted: stage === "converted" ? true : lead.is_converted,
        score,
        score_reason: reason,
      })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const noteSchema = z.object({
  notes: z.string().trim().max(5000).optional().default(""),
  owner_cleared: z.string().optional(),
});

export async function saveLeadNotes(
  leadId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const parsed = noteSchema.safeParse({
      notes: formData.get("notes") ?? "",
      owner_cleared: formData.get("owner_cleared") ?? undefined,
    });
    if (!parsed.success) return { ok: false, error: "Note is too long." };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const patch: Record<string, unknown> = { notes: parsed.data.notes || null };
    if (!parsed.data.owner_cleared && user) patch.owner_id = user.id;
    if (parsed.data.owner_cleared) patch.owner_id = null;
    const { error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", leadId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setLeadQualified(
  leadId: string,
  qualified: boolean
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .update({ is_qualified: qualified })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const followUpSchema = z.object({
  title: z.string().trim().min(2).max(180),
  due_at: z.string().optional().transform((value) => value || null),
});

export async function createLeadFollowUp(leadId: string, formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    if (!z.string().uuid().safeParse(leadId).success) return { ok: false, error: "Choose a valid lead." };
    const parsed = followUpSchema.safeParse({ title: formData.get("title"), due_at: formData.get("due_at") ?? "" });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the follow-up details." };
    if (parsed.data.due_at && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.due_at)) return { ok: false, error: "Choose a valid due date." };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("lead_follow_ups").insert({ organization_id: organizationId, lead_id: leadId, title: parsed.data.title, due_at: parsed.data.due_at, created_by: user?.id ?? null });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Could not save follow-up." }; }
}

export async function completeLeadFollowUp(leadId: string, followUpId: string, complete: boolean): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    if (!z.string().uuid().safeParse(leadId).success || !z.string().uuid().safeParse(followUpId).success) return { ok: false, error: "Choose a valid follow-up." };
    const supabase = await createClient();
    const { error } = await supabase.from("lead_follow_ups").update({ completed_at: complete ? new Date().toISOString() : null }).eq("organization_id", organizationId).eq("lead_id", leadId).eq("id", followUpId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Could not update follow-up." }; }
}
