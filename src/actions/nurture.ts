"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { getUserRole, requireReviewer } from "@/lib/audience/access";
import { hasActiveConsent } from "@/lib/email/consent";
import { firstStepPlan, type NurtureStepLite } from "@/lib/nurture/schedule";

export type NurtureActionResult = { ok: boolean; error?: string; message?: string };

const MANAGER_ROLES = ["owner", "admin", "marketing_manager"];

async function requireNurtureManager(organizationId: string) {
  const role = await getUserRole(organizationId);
  if (!role || !MANAGER_ROLES.includes(role)) {
    throw new Error("Nurture settings require an owner, admin or marketing manager.");
  }
  return role;
}

export async function saveNurtureSettings(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireNurtureManager(organizationId);
  const enabled = z.enum(["true", "false"]).parse(formData.get("lead_capture_enabled")) === "true";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("nurture_settings").upsert(
    { organization_id: organizationId, lead_capture_enabled: enabled, updated_by: user?.id ?? null },
    { onConflict: "organization_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/nurture");
}

const sequenceSchema = z.object({
  name: z.string().trim().min(3).max(160),
  trigger: z.enum(["lead_captured", "manual"]).default("lead_captured"),
  audience_segment_id: z.union([z.string().uuid(), z.literal("")]).default(""),
});

export async function createNurtureSequence(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireNurtureManager(organizationId);
  const parsed = sequenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the sequence details.");
  const supabase = await createClient();
  if (parsed.data.audience_segment_id) {
    const { data: segment } = await supabase.from("audience_segments").select("id").eq("organization_id", organizationId).eq("id", parsed.data.audience_segment_id).maybeSingle();
    if (!segment) throw new Error("Choose an audience segment from this workspace.");
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("nurture_sequences").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    trigger: parsed.data.trigger,
    audience_segment_id: parsed.data.audience_segment_id || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/nurture");
  redirect("/nurture");
}

export async function transitionNurtureSequence(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireNurtureManager(organizationId);
  const id = z.string().uuid().parse(formData.get("id"));
  const to = z.enum(["active", "paused", "archived", "draft"]).parse(formData.get("to"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sequence, error: fetchError } = await supabase.from("nurture_sequences")
    .select("id,status,created_by").eq("organization_id", organizationId).eq("id", id).maybeSingle<{id:string;status:string;created_by:string|null}>();
  if (fetchError || !sequence) throw new Error("Nurture sequence not found.");
  const allowed = to === "active" ? ["draft", "paused"].includes(sequence.status)
    : to === "paused" ? sequence.status === "active"
    : to === "draft" ? sequence.status === "paused"
    : sequence.status !== "archived";
  if (!allowed) throw new Error("That sequence can’t make this status change.");
  const patch: Record<string, string | null> = { status: to };
  if (to === "active") {
    await requireReviewer(organizationId);
    if (!user?.id || sequence.created_by === user.id) throw new Error("A different workspace reviewer must activate this sequence.");
    const { count } = await supabase.from("nurture_steps").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("sequence_id", id);
    if (!count) throw new Error("Add at least one step before activating this sequence.");
    patch.approved_by = user.id;
  }
  const { error } = await supabase.from("nurture_sequences").update(patch).eq("organization_id", organizationId).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nurture");
}

const stepSchema = z.object({
  sequence_id: z.string().uuid(),
  delay_hours: z.coerce.number().int().min(0).max(8760),
  email_subject: z.string().trim().min(2).max(200),
  email_body: z.string().trim().min(10).max(12000),
});

export async function addNurtureStep(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireNurtureManager(organizationId);
  const parsed = stepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the step details.");
  const supabase = await createClient();
  const { data: sequence } = await supabase.from("nurture_sequences").select("id,status").eq("organization_id", organizationId).eq("id", parsed.data.sequence_id).maybeSingle<{id:string;status:string}>();
  if (!sequence) throw new Error("Nurture sequence not found.");
  if (sequence.status === "archived") throw new Error("Archived sequences can’t take new steps.");
  const { data: last } = await supabase.from("nurture_steps").select("step_order").eq("organization_id", organizationId).eq("sequence_id", parsed.data.sequence_id).order("step_order", { ascending: false }).limit(1).maybeSingle<{step_order:number}>();
  const stepOrder = (last?.step_order ?? 0) + 1;
  const { error } = await supabase.from("nurture_steps").insert({
    organization_id: organizationId,
    sequence_id: parsed.data.sequence_id,
    step_order: stepOrder,
    delay_hours: parsed.data.delay_hours,
    email_subject: parsed.data.email_subject,
    email_body: parsed.data.email_body,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/nurture");
}

export async function removeNurtureStep(formData: FormData): Promise<void> {
  const organizationId = await requireOrganizationId();
  await requireNurtureManager(organizationId);
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("nurture_steps").delete().eq("organization_id", organizationId).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nurture");
}

export async function enrollLeadInSequence(leadId: string, formData: FormData): Promise<NurtureActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const lead = z.string().uuid().safeParse(leadId);
    const sequenceId = z.string().uuid().safeParse(formData.get("sequence_id"));
    if (!lead.success || !sequenceId.success) return { ok: false, error: "Choose a lead and sequence from this workspace." };
    const supabase = await createClient();
    const [{ data: leadRow }, { data: sequence }] = await Promise.all([
      supabase.from("leads").select("id,email,marketing_consent,email_unsubscribed_at,email_suppressed_at").eq("organization_id", organizationId).eq("id", lead.data).maybeSingle(),
      supabase.from("nurture_sequences").select("id,status").eq("organization_id", organizationId).eq("id", sequenceId.data).maybeSingle<{id:string;status:string}>(),
    ]);
    if (!leadRow) return { ok: false, error: "Lead not found in this workspace." };
    if (!sequence) return { ok: false, error: "Nurture sequence not found." };
    if (sequence.status !== "active") return { ok: false, error: "Only an active sequence can enrol a lead." };
    if (!hasActiveConsent(leadRow)) return { ok: false, error: "This lead has no active marketing consent, so it can’t be enrolled." };
    const { data: steps } = await supabase.from("nurture_steps").select("step_order,delay_hours").eq("organization_id", organizationId).eq("sequence_id", sequenceId.data);
    const plan = firstStepPlan((steps ?? []) as NurtureStepLite[]);
    if (!plan) return { ok: false, error: "This sequence has no steps yet." };
    const admin = createAdminClient();
    const { data: inserted } = await admin.from("nurture_enrollments").upsert(
      { organization_id: organizationId, sequence_id: sequenceId.data, lead_id: lead.data, status: "active", current_step: plan.current_step, next_run_at: plan.next_run_at },
      { onConflict: "sequence_id,lead_id", ignoreDuplicates: true }
    ).select("id");
    revalidatePath(`/leads/${lead.data}`);
    revalidatePath("/nurture");
    if (!inserted?.length) return { ok: true, message: "This lead is already enrolled in that sequence." };
    return { ok: true, message: "Lead enrolled. The first step sends after its configured delay." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not enrol this lead." }; }
}

export async function cancelLeadEnrollment(leadId: string, formData: FormData): Promise<NurtureActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const lead = z.string().uuid().safeParse(leadId);
    const enrollmentId = z.string().uuid().safeParse(formData.get("enrollment_id"));
    if (!lead.success || !enrollmentId.success) return { ok: false, error: "Choose an enrolment to cancel." };
    const admin = createAdminClient();
    const { data: cancelled } = await admin.from("nurture_enrollments")
      .update({ status: "cancelled", next_run_at: null })
      .eq("organization_id", organizationId).eq("id", enrollmentId.data).eq("lead_id", lead.data).in("status", ["active"])
      .select("id").maybeSingle();
    revalidatePath(`/leads/${lead.data}`);
    revalidatePath("/nurture");
    if (!cancelled) return { ok: false, error: "That enrolment is no longer active." };
    return { ok: true, message: "Enrolment cancelled. No further steps will send." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not cancel this enrolment." }; }
}
