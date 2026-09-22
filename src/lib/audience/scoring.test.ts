import { describe, expect, it } from "vitest";
import {
  calculateConfidence,
  insightIdentityKey,
  rankScore,
  signalStrengthFromLift,
} from "@/lib/audience/scoring";

describe("calculateConfidence", () => {
  it("rewards large, complete, consistent, recent, strong evidence", () => {
    const high = calculateConfidence({
      sampleSize: 200,
      completeness: 1,
      consistency: 0.9,
      recency: 0.9,
      effectStrength: 0.8,
    });
    const low = calculateConfidence({
      sampleSize: 3,
      completeness: 0.4,
      consistency: 0.3,
      recency: 0.2,
      effectStrength: 0.1,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("is never a hardcoded 0.95 — it varies with inputs", () => {
    const a = calculateConfidence({
      sampleSize: 10,
      completeness: 0.5,
      consistency: 0.5,
      recency: 0.5,
      effectStrength: 0.5,
    });
    const b = calculateConfidence({
      sampleSize: 100,
      completeness: 1,
      consistency: 1,
      recency: 1,
      effectStrength: 1,
    });
    expect(a).not.toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("is reproducible for identical inputs", () => {
    const inputs = {
      sampleSize: 42,
      completeness: 0.8,
      consistency: 0.7,
      recency: 0.6,
      effectStrength: 0.5,
    };
    expect(calculateConfidence(inputs)).toBe(calculateConfidence(inputs));
  });
});

describe("signalStrengthFromLift", () => {
  it("defaults to STABLE when evidence is thin", () => {
    expect(signalStrengthFromLift(0.9, 0.1, 3)).toBe("STABLE");
    expect(signalStrengthFromLift(Number.NaN, 0.1, 100)).toBe("STABLE");
  });

  it("detects RISING / DECLINING on strong lifts with enough sample", () => {
    expect(signalStrengthFromLift(0.2, 0.1, 60)).toBe("RISING");
    expect(signalStrengthFromLift(0.05, 0.1, 60)).toBe("DECLINING");
  });
});

describe("insightIdentityKey", () => {
  it("normalises nulls and casing for idempotent dedup", () => {
    const a = insightIdentityKey({
      organization_id: "org",
      segment_id: "seg",
      category: "TOPIC_ENGAGEMENT",
      topic: "Fundraising",
    });
    const b = insightIdentityKey({
      organization_id: "org",
      segment_id: "seg",
      category: "TOPIC_ENGAGEMENT",
      topic: " fundraising ",
      format: null,
    });
    expect(a).toBe(b);
  });

  it("distinguishes different dimensions", () => {
    const a = insightIdentityKey({
      organization_id: "org",
      segment_id: "seg",
      category: "FORMAT_REGISTRATION",
      format: "video",
    });
    const b = insightIdentityKey({
      organization_id: "org",
      segment_id: "seg",
      category: "FORMAT_REGISTRATION",
      format: "carousel",
    });
    expect(a).not.toBe(b);
  });
});

describe("rankScore", () => {
  it("prefers high-confidence rising insights over stale weak ones", () => {
    const strong = rankScore({
      confidenceScore: 0.9,
      signalStrength: "RISING",
      sampleSize: 200,
      generatedAt: new Date().toISOString(),
    });
    const weak = rankScore({
      confidenceScore: 0.3,
      signalStrength: "DECLINING",
      sampleSize: 5,
      generatedAt: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    });
    expect(strong).toBeGreaterThan(weak);
  });
});
