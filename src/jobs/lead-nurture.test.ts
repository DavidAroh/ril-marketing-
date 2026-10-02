import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { databaseMock } from "@/test/database-mock";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/jobs/email-delivery", () => ({ processEmailDeliveryBatch: mocks.send }));
import { processNurtureBatch } from "./lead-nurture";

function setup(status: string, readError = false, selfApproved = false) {
  const db = databaseMock(q => {
    if (q.operation !== "select") return { data: q.columns ? { id: "enrollment" } : null };
    if (q.table === "nurture_enrollments") return { data: [{ id: "enrollment", organization_id: "org", sequence_id: "sequence", lead_id: "lead", current_step: 1 }] };
    if (q.table === "nurture_sequences") return readError ? { error: { message: "Temporary outage" } } : { data: { id: "sequence", name: "Test", status: "active", created_by: "author", approved_by: selfApproved ? "author" : "reviewer" } };
    if (q.table === "nurture_steps") return { data: [{ id: "step1", step_order: 1, delay_hours: 0, email_subject: "One", email_body: "First" }, { id: "step2", step_order: 2, delay_hours: 24, email_subject: "Two", email_body: "Second" }] };
    if (q.table === "leads") return { data: { id: "lead", email: "optin@example.com", marketing_consent: true, email_unsubscribed_at: null, email_suppressed_at: null } };
    return { data: { status, sent_at: ["sent", "delivered", "opened", "clicked"].includes(status) ? "2026-10-01T00:00:00Z" : null } };
  });
  mocks.admin.mockReturnValue(db);
  return db;
}
beforeEach(() => {
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "x".repeat(32));
  mocks.send.mockResolvedValue({ sent: 0, pending: 0, failed: 0 });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("nurture cadence with durable delivery retries", () => {
  it.each(["queued", "sending", "failed"])("keeps the cursor on the current step while delivery is %s", async status => {
    const db = setup(status);
    expect((await processNurtureBatch()).results[0].status).toBe("held");
    expect(db.queries.some(q => q.table === "nurture_enrollments" && q.payload && !Array.isArray(q.payload) && "current_step" in q.payload)).toBe(false);
  });
  it.each(["sent", "delivered", "opened", "clicked"])("advances only after an email has been sent (%s)", async status => {
    const db = setup(status);
    expect((await processNurtureBatch()).results[0].status).toBe("advanced");
    expect(db.queries.some(q => q.payload && !Array.isArray(q.payload) && q.payload.current_step === 2)).toBe(true);
  });
  it("preserves an enrollment when the database cannot load its sequence", async () => {
    const db = setup("queued", true);
    expect((await processNurtureBatch()).results[0].status).toBe("error");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(db.queries.some(q => q.payload && !Array.isArray(q.payload) && q.payload.status === "cancelled")).toBe(false);
  });
  it("requires a reviewer other than the sequence author", async () => {
    setup("queued", false, true);
    expect((await processNurtureBatch()).results[0].status).toBe("held");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
