/**
 * Pure nurture cadence logic — no I/O, no `server-only`, fully unit-testable.
 *
 * The drip model: a step's `delay_hours` is the wait *before* that step sends.
 * On enrolment the cursor points at the first step with `next_run_at = now +
 * step.delay_hours`. When a due step is sent, the cursor advances to the next
 * higher `step_order`, scheduled `now + thatStep.delay_hours` later; when no
 * higher step remains the enrolment completes.
 */

import { createHash } from "node:crypto";

export type NurtureStepLite = { step_order: number; delay_hours: number };

export type EnrollmentCursor = {
  status: "active" | "completed";
  current_step: number;
  next_run_at: string | null;
};

const HOUR_MS = 3_600_000;

/** ISO timestamp `delayHours` after `from` (never earlier than `from`). */
export function nextRunAtFor(delayHours: number, from: Date = new Date()): string {
  return new Date(from.getTime() + Math.max(0, delayHours) * HOUR_MS).toISOString();
}

/**
 * Stable UUID for the per-step "envelope" `email_campaigns` row, derived only
 * from the enrolment and step ids. Re-deriving it means a retried or
 * crash-resumed step reuses the same campaign row (`upsert onConflict:'id'`,
 * `ignoreDuplicates`), so a step can never mint a duplicate send.
 */
export function deterministicEnvelopeId(enrollmentId: string, stepId: string): string {
  const hex = createHash("sha256")
    .update(`ril-nurture-envelope-v1:${enrollmentId}:${stepId}`)
    .digest("hex");
  const b = hex.slice(0, 32).split("");
  // Shape as an RFC 4122 v5 UUID (version nibble 5, variant bits 10xx).
  b[12] = "5";
  b[16] = ((parseInt(b[16], 16) & 0x3) | 0x8).toString(16);
  const s = b.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** Cursor for a freshly enrolled lead, or null when the sequence has no steps. */
export function firstStepPlan(
  steps: NurtureStepLite[],
  from: Date = new Date()
): { current_step: number; next_run_at: string } | null {
  const first = [...steps].sort((a, b) => a.step_order - b.step_order)[0];
  if (!first) return null;
  return { current_step: first.step_order, next_run_at: nextRunAtFor(first.delay_hours, from) };
}

/**
 * Cursor after the step at `currentStep` has been sent: advance to the next
 * higher `step_order`, or complete when none remains.
 */
export function advanceEnrollment(
  steps: NurtureStepLite[],
  currentStep: number,
  from: Date = new Date()
): EnrollmentCursor {
  const next = [...steps]
    .sort((a, b) => a.step_order - b.step_order)
    .find((step) => step.step_order > currentStep);
  if (!next) return { status: "completed", current_step: currentStep, next_run_at: null };
  return {
    status: "active",
    current_step: next.step_order,
    next_run_at: nextRunAtFor(next.delay_hours, from),
  };
}
