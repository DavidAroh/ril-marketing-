import { describe, expect, it, vi } from "vitest";
import { applyActiveConsentFilter, hasActiveConsent, type ConsentLead } from "./consent";

const mailable: ConsentLead = {
  email: "founder@example.com",
  marketing_consent: true,
  email_unsubscribed_at: null,
  email_suppressed_at: null,
};

describe("hasActiveConsent", () => {
  it("is true only with an address, opt-in, and no unsubscribe or suppression", () => {
    expect(hasActiveConsent(mailable)).toBe(true);
  });
  it("is false without an email address", () => {
    expect(hasActiveConsent({ ...mailable, email: null })).toBe(false);
  });
  it("is false without a recorded opt-in", () => {
    expect(hasActiveConsent({ ...mailable, marketing_consent: false })).toBe(false);
  });
  it("is false once unsubscribed", () => {
    expect(hasActiveConsent({ ...mailable, email_unsubscribed_at: "2026-09-01T00:00:00.000Z" })).toBe(false);
  });
  it("is false once suppressed by the provider", () => {
    expect(hasActiveConsent({ ...mailable, email_suppressed_at: "2026-09-01T00:00:00.000Z" })).toBe(false);
  });
});

describe("applyActiveConsentFilter", () => {
  it("applies the full predicate and preserves the builder for further chaining", () => {
    const builder = { eq: vi.fn(), is: vi.fn(), not: vi.fn() };
    builder.eq.mockReturnValue(builder);
    builder.is.mockReturnValue(builder);
    builder.not.mockReturnValue(builder);

    const result = applyActiveConsentFilter(builder);

    expect(result).toBe(builder);
    expect(builder.eq).toHaveBeenCalledWith("marketing_consent", true);
    expect(builder.is).toHaveBeenCalledWith("email_unsubscribed_at", null);
    expect(builder.is).toHaveBeenCalledWith("email_suppressed_at", null);
    expect(builder.not).toHaveBeenCalledWith("email", "is", null);
  });
});
