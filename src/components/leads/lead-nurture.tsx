"use client";

import { useActionState } from "react";
import { enrollLeadInSequence, cancelLeadEnrollment, type NurtureActionResult } from "@/actions/nurture";
import { Button } from "@/components/ui/button";
import { StatusStamp } from "@/components/ui/status-stamp";

type Enrollment = { id: string; sequence_name: string; status: string; current_step: number; next_run_at: string | null };
type SequenceOption = { id: string; name: string };
const empty: NurtureActionResult | null = null;

export function LeadNurture({ leadId, hasConsent, sequences, enrollments }: { leadId: string; hasConsent: boolean; sequences: SequenceOption[]; enrollments: Enrollment[] }) {
  const [enrollState, enrollAction, enrolling] = useActionState<NurtureActionResult | null, FormData>(async (_state, form) => enrollLeadInSequence(leadId, form), empty);
  const [cancelState, cancelAction, cancelling] = useActionState<NurtureActionResult | null, FormData>(async (_state, form) => cancelLeadEnrollment(leadId, form), empty);
  return (
    <section className="slip flex flex-col gap-4 p-5 sm:p-6">
      <div><p className="dateline">Automated nurture</p><h2 className="mt-1 text-base font-bold">Email sequences</h2><p className="mt-1 text-sm text-muted-foreground">Enrol this lead into an active drip sequence. Each step re-checks consent before it sends; enrolment is blocked without active marketing consent.</p></div>
      {hasConsent ? (sequences.length ? (
        <form action={enrollAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="sr-only" htmlFor="nurture-sequence">Sequence</label>
          <select id="nurture-sequence" name="sequence_id" required className="h-10 rounded-md border border-border bg-card px-3 text-sm"><option value="">Choose an active sequence…</option>{sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name}</option>)}</select>
          <Button type="submit" variant="outline" disabled={enrolling}>{enrolling ? "Enrolling…" : "Enrol lead"}</Button>
        </form>
      ) : <p className="text-sm text-muted-foreground">No active sequences yet. Activate one in the Nurture workspace first.</p>) : <p className="text-sm text-muted-foreground">This lead has no active marketing consent, so it can’t be enrolled.</p>}
      {enrollState?.ok === false ? <p role="alert" className="text-sm text-destructive">{enrollState.error}</p> : null}
      {enrollState?.ok ? <p className="text-sm text-muted-foreground">{enrollState.message}</p> : null}
      {cancelState?.ok === false ? <p role="alert" className="text-sm text-destructive">{cancelState.error}</p> : null}
      {enrollments.length ? <ul className="ledger">{enrollments.map((enrollment) => <li key={enrollment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><div className="flex items-center gap-2"><StatusStamp status={enrollment.status} /><p className="text-sm font-medium">{enrollment.sequence_name}</p></div><p className="dateline mt-1">Step {enrollment.current_step}{enrollment.status === "active" && enrollment.next_run_at ? ` · next ${new Date(enrollment.next_run_at).toLocaleString("en-GB")}` : ""}</p></div>{enrollment.status === "active" ? <form action={cancelAction}><input type="hidden" name="enrollment_id" value={enrollment.id} /><Button type="submit" size="sm" variant="ghost" disabled={cancelling}>Cancel</Button></form> : null}</li>)}</ul> : <p className="text-sm text-muted-foreground">Not enrolled in any sequence yet.</p>}
    </section>
  );
}
