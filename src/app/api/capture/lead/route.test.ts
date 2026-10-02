import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseMock } from "@/test/database-mock";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), page: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/landing-pages", () => ({ getPublishedLandingPage: mocks.page }));
import { POST } from "./route";

afterEach(() => vi.clearAllMocks());
function setup(lookupError = false, consentError = false) {
  mocks.page.mockResolvedValue({ id: "page", organization_id: "org" });
  const db = databaseMock(q => q.operation === "update"
    ? { error: consentError ? { message: "Write failed" } : null }
    : { data: lookupError ? null : { id: "lead" }, error: lookupError ? { message: "Lookup failed" } : null });
  mocks.admin.mockReturnValue(db);
  return db;
}
const request = (email: string, marketingConsent = false) => new Request("http://localhost/api/capture/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: "test", email, marketingConsent }) });

describe("public lead capture", () => {
  it("matches underscores in email addresses literally, case-insensitively", async () => {
    const db = setup();
    expect((await POST(request("first_last@example.com"))).status).toBe(200);
    expect(db.queries[0].filters).toContainEqual({ method: "ilike", column: "email", value: "first\\_last@example.com" });
  });
  it("returns a retryable error when duplicate lookup fails", async () => {
    const db = setup(true);
    expect((await POST(request("test@example.com"))).status).toBe(500);
    expect(db.queries.some(q => q.operation === "insert")).toBe(false);
  });
  it("does not report consent saved when the write fails", async () => {
    setup(false, true);
    expect((await POST(request("test@example.com", true))).status).toBe(500);
  });
  it("rejects malformed JSON before accessing the database", async () => {
    expect((await POST(new Request("http://localhost/api/capture/lead", { method: "POST", body: "{" }))).status).toBe(400);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
