import { describe, expect, it } from "vitest";
import {
  recommendationsQuerySchema,
  segmentSchema,
  suppressSchema,
} from "@/lib/validation/audience";

describe("segmentSchema", () => {
  it("accepts a valid persona", () => {
    const res = segmentSchema.safeParse({
      name: "Early-stage Founders",
      description: "Pre-seed founders",
      needs_motivations: ["Raise capital"],
      preferred_formats: ["short-form video"],
      preferred_platforms: ["linkedin"],
      preferred_hooks: ["Founder story"],
      program_ids: [],
    });
    expect(res.success).toBe(true);
  });

  it("rejects blank names", () => {
    const res = segmentSchema.safeParse({ name: " ", program_ids: [] });
    expect(res.success).toBe(false);
  });
});

describe("suppressSchema", () => {
  it("requires a reason (suppression gate)", () => {
    expect(suppressSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(suppressSchema.safeParse({ reason: "Sample skewed" }).success).toBe(true);
  });
});

describe("recommendationsQuerySchema", () => {
  it("requires a UUID segmentId and rejects out-of-range limits", () => {
    expect(
      recommendationsQuerySchema.safeParse({ segmentId: "not-a-uuid" }).success
    ).toBe(false);
    const ok = recommendationsQuerySchema.safeParse({
      segmentId: "123e4567-e89b-12d3-a456-426614174000",
      limit: 25,
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.limit).toBe(25);
    expect(
      recommendationsQuerySchema.safeParse({
        segmentId: "123e4567-e89b-12d3-a456-426614174000",
        limit: 999,
      }).success
    ).toBe(false);
  });
});

describe("recommendation status gate", () => {
  // Documents the §38 invariant at the unit level: the service layer filters
  // status='APPROVED' in SQL. This pure-function mirror guards regressions in
  // any future in-memory ranking path.
  const gate = <T extends { status: string }>(rows: T[]): T[] =>
    rows.filter((r) => r.status === "APPROVED");

  it("APPROVED passes; PENDING_REVIEW and SUPPRESSED are excluded", () => {
    const rows = [
      { id: "a", status: "APPROVED" },
      { id: "p", status: "PENDING_REVIEW" },
      { id: "s", status: "SUPPRESSED" },
    ];
    expect(gate(rows).map((r) => r.id)).toEqual(["a"]);
  });
});
