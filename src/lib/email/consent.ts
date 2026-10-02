/**
 * Single source of truth for "may we email this lead right now".
 *
 * The rule appears at three moments in delivery — when an audience is queued
 * (`src/actions/email.ts`), when a message is about to be sent
 * (`src/jobs/email-delivery.ts`), and when a nurture step comes due
 * (`src/jobs/lead-nurture.ts`). Keeping the predicate here means those moments
 * can never quietly disagree about what consent means.
 *
 * A lead is mailable only with a recorded marketing opt-in, an email address,
 * and neither an unsubscribe nor a provider suppression (bounce/complaint).
 */

export type ConsentLead = {
  email: string | null;
  marketing_consent: boolean;
  email_unsubscribed_at: string | null;
  email_suppressed_at: string | null;
};

/** Runtime recheck used right before a send. */
export function hasActiveConsent(lead: ConsentLead): boolean {
  return Boolean(
    lead.email &&
      lead.marketing_consent &&
      !lead.email_unsubscribed_at &&
      !lead.email_suppressed_at
  );
}

// The minimal slice of a PostgREST filter builder this helper drives. The real
// builders (typed per table) satisfy this at runtime; the localized cast below
// keeps the shared predicate in one place without leaking `any` to callers.
type ConsentFilterOps = {
  eq(column: string, value: unknown): ConsentFilterOps;
  is(column: string, value: unknown): ConsentFilterOps;
  not(column: string, operator: string, value: unknown): ConsentFilterOps;
};

/**
 * Apply the active-consent predicate to a `leads` query, preserving the
 * caller's builder type so the chain (`.range`, `await`, …) keeps working.
 */
export function applyActiveConsentFilter<Q>(query: Q): Q {
  const q = query as unknown as ConsentFilterOps;
  return q
    .eq("marketing_consent", true)
    .is("email_unsubscribed_at", null)
    .is("email_suppressed_at", null)
    .not("email", "is", null) as unknown as Q;
}
