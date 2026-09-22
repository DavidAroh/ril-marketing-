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
