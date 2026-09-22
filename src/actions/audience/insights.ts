"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { requireReviewer } from "@/lib/audience/access";
import { reviewNoteSchema, suppressSchema } from "@/lib/validation/audience";
import type { InsightStatus } from "@/types/audience";

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

async function recordTransition(args: {
  organizationId: string;
  insightId: string;
  from: InsightStatus;
  to: InsightStatus;
  note: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("insight_approvals").insert({
    organization_id: args.organizationId,
    insight_id: args.insightId,
    actor_id: user?.id ?? null,
    from_status: args.from,
    to_status: args.to,
    note: args.note,
  });
  if (error) throw new Error(`Approval audit failed: ${error.message}`);
}

async function completeTasks(organizationId: string, insightId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("insight_id", insightId)
    .eq("status", "open");
}

async function currentStatus(
  organizationId: string,
  insightId: string
): Promise<InsightStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audience_insights")
    .select("status")
    .eq("id", insightId)
    .eq("organization_id", organizationId)
    .maybeSingle<{ status: InsightStatus }>();
  return data?.status ?? null;
}

/**
 * AI recommends, humans decide (§3). Approval / suppression are explicit,
 * role-gated, audit-trailed, and revalidate the review UI + recommendations.
 */
export async function approveInsight(
  insightId: string,
  note?: string
): Promise<ReviewResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const from = await currentStatus(organizationId, insightId);
    if (!from) return { ok: false, error: "Insight not found." };

    const noteParsed = reviewNoteSchema.safeParse({ note: note ?? "" });
    const { error } = await supabase
      .from("audience_insights")
      .update({
        status: "APPROVED",
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        review_note: noteParsed.success ? noteParsed.data.note || null : null,
        suppressed_by: null,
        suppressed_at: null,
        suppression_reason: null,
      })
      .eq("id", insightId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };

    await recordTransition({
      organizationId,
      insightId,
      from,
      to: "APPROVED",
      note: noteParsed.success ? noteParsed.data.note || null : null,
    });
    await completeTasks(organizationId, insightId);

    revalidatePath("/audience/insights");
    revalidatePath(`/audience/insights/${insightId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function suppressInsight(
  insightId: string,
  reason: string
): Promise<ReviewResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const parsed = suppressSchema.safeParse({ reason });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reason." };
    }

    const from = await currentStatus(organizationId, insightId);
    if (!from) return { ok: false, error: "Insight not found." };

    const { error } = await supabase
      .from("audience_insights")
      .update({
        status: "SUPPRESSED",
        suppressed_by: user?.id ?? null,
        suppressed_at: new Date().toISOString(),
        suppression_reason: parsed.data.reason,
      })
      .eq("id", insightId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };

    await recordTransition({
      organizationId,
      insightId,
      from,
      to: "SUPPRESSED",
      note: parsed.data.reason,
    });
    await completeTasks(organizationId, insightId);

    revalidatePath("/audience/insights");
    revalidatePath(`/audience/insights/${insightId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function annotateInsight(
  insightId: string,
  note: string
): Promise<ReviewResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();

    const parsed = reviewNoteSchema.safeParse({ note });
    if (!parsed.success) {
      return { ok: false, error: "Note is too long." };
    }

    const { error } = await supabase
      .from("audience_insights")
      .update({ review_note: parsed.data.note || null })
      .eq("id", insightId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/audience/insights/${insightId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
