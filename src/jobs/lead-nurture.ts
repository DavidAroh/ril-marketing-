import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUnsubscribeToken, hashUnsubscribeToken } from "@/lib/email/tokens";
import { hasActiveConsent } from "@/lib/email/consent";
import {
  advanceEnrollment,
  deterministicEnvelopeId,
  type EnrollmentCursor,
  type NurtureStepLite,
} from "@/lib/nurture/schedule";
import { processEmailDeliveryBatch } from "@/jobs/email-delivery";

type Admin = ReturnType<typeof createAdminClient>;
type DueEnrollment = { id: string; organization_id: string; sequence_id: string; lead_id: string; current_step: number };
type Sequence = { id: string; name: string; status: string; audience_segment_id: string | null; created_by: string | null; approved_by: string | null };
type Step = { id: string; step_order: number; delay_hours: number; email_subject: string; email_body: string };
type Lead = { id: string; email: string | null; name: string | null; marketing_consent: boolean; email_unsubscribed_at: string | null; email_suppressed_at: string | null };

// How long a claimed enrolment is reserved before another runner may retry it.
const LOCK_MS = 15 * 60_000;

/**
 * Advance every due nurture enrolment by one step. Each step reuses the shared
 * Resend delivery pipeline behind the same consent, unsubscribe and idempotency
 * guarantees as a hand-queued campaign — no new send path exists here.
 */
export async function processNurtureBatch(options: { limit?: number } = {}) {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const { data: due, error } = await admin
    .from("nurture_enrollments")
    .select("id,organization_id,sequence_id,lead_id,current_step")
    .eq("status", "active")
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Could not read the nurture queue: ${error.message}`);
  const results: Array<{ id: string; status: string; detail?: string }> = [];
  for (const enrollment of (due ?? []) as DueEnrollment[]) {
    try {
      results.push({ id: enrollment.id, ...(await runEnrollmentStep(admin, enrollment, nowIso)) });
    } catch (err) {
      const detail = err instanceof Error ? err.message.slice(0, 800) : "Nurture step failed.";
      results.push({ id: enrollment.id, status: "error", detail });
    }
  }
  return { processed: results.length, results };
}

async function runEnrollmentStep(
  admin: Admin,
  enrollment: DueEnrollment,
  nowIso: string
): Promise<{ status: string; detail?: string }> {
  const org = enrollment.organization_id;
  // Exclusive claim: reserve this due enrolment by pushing next_run_at into a
  // short lock window. A concurrent runner's `next_run_at <= now` guard then
  // misses, so only one runner acts on this step; a crash auto-recovers after
  // the window because the envelope and delivery upserts are idempotent.
  const { data: claimed, error: claimError } = await admin
    .from("nurture_enrollments")
    .update({ next_run_at: new Date(Date.now() + LOCK_MS).toISOString() })
    .eq("id", enrollment.id)
    .eq("organization_id", org)
    .eq("status", "active")
    .eq("current_step", enrollment.current_step)
    .lte("next_run_at", nowIso)
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(`Could not claim nurture enrollment: ${claimError.message}`);
  if (!claimed) return { status: "skipped", detail: "Already claimed or changed." };

  const [sequenceResult, stepResult, leadResult] = await Promise.all([
    admin.from("nurture_sequences").select("id,name,status,audience_segment_id,created_by,approved_by").eq("organization_id", org).eq("id", enrollment.sequence_id).maybeSingle<Sequence>(),
    admin.from("nurture_steps").select("id,step_order,delay_hours,email_subject,email_body").eq("organization_id", org).eq("sequence_id", enrollment.sequence_id).order("step_order", { ascending: true }),
    admin.from("leads").select("id,email,name,marketing_consent,email_unsubscribed_at,email_suppressed_at").eq("organization_id", org).eq("id", enrollment.lead_id).maybeSingle<Lead>(),
  ]);
  if (sequenceResult.error || stepResult.error || leadResult.error) throw new Error("Could not load nurture records; enrollment will retry.");
  const sequence = sequenceResult.data;
  const stepRows = stepResult.data;
  const lead = leadResult.data;
  const steps = (stepRows ?? []) as Step[];

  if (!sequence) { await terminate(admin, enrollment, org, "cancelled"); return { status: "cancelled", detail: "Sequence no longer exists." }; }
  if (!lead) { await terminate(admin, enrollment, org, "cancelled"); return { status: "cancelled", detail: "Lead no longer exists." }; }
  // Consent recheck at the exact moment of send — the whole point of the engine.
  if (!hasActiveConsent(lead)) { await terminate(admin, enrollment, org, "suppressed"); return { status: "suppressed" }; }
  // A paused/archived/draft sequence must not send; leave the lock in place so
  // it retries (and resumes) if the sequence is reactivated within the window.
  if (sequence.status !== "active") return { status: "held", detail: `Sequence is ${sequence.status}.` };
  if (!sequence.created_by || !sequence.approved_by || sequence.created_by === sequence.approved_by) return { status: "held", detail: "Sequence requires a separate reviewer." };

  const step = steps.find((row) => row.step_order === enrollment.current_step);
  if (!step) {
    // Step removed under us — advance past it without sending anything.
    const cursor = advanceEnrollment(steps as NurtureStepLite[], enrollment.current_step, new Date());
    await applyCursor(admin, enrollment, org, cursor);
    return { status: cursor.status === "completed" ? "completed" : "advanced", detail: "Step missing; skipped." };
  }

  // Envelope: one scheduled + authorized email_campaigns row per step, with a
  // deterministic id so a retry reuses it instead of duplicating a send. It
  // carries the sequence's reviewer provenance and a `nurture` metadata marker
  // that keeps these rows out of the /email ledger.
  const envelopeId = deterministicEnvelopeId(enrollment.id, step.id);
  const { error: envelopeError } = await admin.from("email_campaigns").upsert(
    [{
      id: envelopeId, organization_id: org, campaign_id: null,
      audience_segment_id: sequence.audience_segment_id,
      name: `Nurture · ${sequence.name} · step ${step.step_order}`.slice(0, 160),
      subject: step.email_subject.slice(0, 200), preview_text: "",
      body: step.email_body.slice(0, 12000), status: "scheduled",
      delivery_authorized_at: nowIso, created_by: sequence.created_by, approved_by: sequence.approved_by,
      metadata: { nurture: true, nurture_enrollment_id: enrollment.id, nurture_sequence_id: sequence.id, nurture_step: step.step_order, nurture_step_id: step.id },
    }],
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (envelopeError) throw new Error(`Could not stage the nurture email: ${envelopeError.message}`);

  // Exactly one delivery for this lead against the envelope. The stored hash is
  // derived from this delivery id, matching what the unsubscribe endpoint checks.
  const deliveryId = randomUUID();
  const { error: deliveryError } = await admin.from("email_campaign_deliveries").upsert(
    [{
      id: deliveryId, organization_id: org, campaign_id: envelopeId, lead_id: lead.id, status: "queued",
      unsubscribe_token_hash: hashUnsubscribeToken(createUnsubscribeToken(org, deliveryId, lead.id)),
    }],
    { onConflict: "campaign_id,lead_id", ignoreDuplicates: true }
  );
  if (deliveryError) throw new Error(`Could not queue the nurture delivery: ${deliveryError.message}`);

  const send = await processEmailDeliveryBatch({ organizationId: org, campaignId: envelopeId, limit: 1 });
  const { data: delivery, error: deliveryReadError } = await admin.from("email_campaign_deliveries").select("status,sent_at").eq("organization_id", org).eq("campaign_id", envelopeId).eq("lead_id", lead.id).maybeSingle<{status:string;sent_at:string|null}>();
  if (deliveryReadError || !delivery) throw new Error("Could not verify nurture delivery; enrollment will retry.");
  if (["queued", "sending", "failed"].includes(delivery.status)) return { status: "held", detail: `Delivery ${delivery.status}; later steps are waiting.` };
  if (["cancelled", "unsubscribed", "bounced", "complained"].includes(delivery.status)) {
    await terminate(admin, enrollment, org, delivery.status === "cancelled" ? "cancelled" : "suppressed");
    return { status: "cancelled", detail: `Delivery ${delivery.status}.` };
  }
  if (!delivery.sent_at) return { status: "held", detail: "Waiting for confirmed delivery." };
  const cursor = advanceEnrollment(steps as NurtureStepLite[], enrollment.current_step, new Date());
  await applyCursor(admin, enrollment, org, cursor);
  return {
    status: cursor.status === "completed" ? "completed" : "advanced",
    detail: `sent:${send.sent} pending:${send.pending} failed:${send.failed}`,
  };
}

/** Terminal state (suppressed by consent, or cancelled by a vanished parent). */
async function terminate(admin: Admin, enrollment: DueEnrollment, org: string, status: "suppressed" | "cancelled") {
  const { error } = await admin.from("nurture_enrollments").update({ status, next_run_at: null }).eq("id", enrollment.id).eq("organization_id", org).eq("status", "active");
  if (error) throw new Error(`Could not stop nurture enrollment: ${error.message}`);
}

/** Move the cursor, guarded on the step we claimed so a racing runner can't double-advance. */
async function applyCursor(admin: Admin, enrollment: DueEnrollment, org: string, cursor: EnrollmentCursor) {
  const { error } = await admin.from("nurture_enrollments").update({ status: cursor.status, current_step: cursor.current_step, next_run_at: cursor.next_run_at }).eq("id", enrollment.id).eq("organization_id", org).eq("status", "active").eq("current_step", enrollment.current_step);
  if (error) throw new Error(`Could not advance nurture enrollment: ${error.message}`);
}
