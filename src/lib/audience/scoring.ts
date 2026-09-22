import type { SignalStrength } from "@/types/audience";

export const ALGORITHM_VERSION = "v1.0.0";

/** Minimum sample sizes before an analyser may emit an insight. */
export const MIN_SAMPLES = {
  TOPIC_ENGAGEMENT: 5,
  FORMAT_REGISTRATION: 8,
  PLATFORM_LEAD_QUALITY: 8,
  HOOK_CTA_EFFECTIVENESS: 6,
} as const;

export interface ConfidenceInputs {
  /** Total observations behind the finding. */
  sampleSize: number;
  /** 0..1 — fraction of required fields present. */
  completeness: number;
  /** 0..1 — how consistent the effect is across slices / time. */
  consistency: number;
  /** 0..1 — how recent the supporting data is. */
  recency: number;
  /** 0..1 — normalized strength of the observed lift/correlation. */
  effectStrength: number;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Transparent, reproducible confidence score (§18).
 * Weights: sample 30%, completeness 20%, consistency 20%, recency 10%, effect 20%.
 * Sample contribution saturates logistically so huge samples can't force 1.0.
 */
export function calculateConfidence(inputs: ConfidenceInputs): number {
  const { sampleSize, completeness, consistency, recency, effectStrength } =
    inputs;
  const sampleComponent = clamp01(
    Math.log10(Math.max(0, sampleSize) + 1) / Math.log10(201)
  );
  const score =
    sampleComponent * 0.3 +
    clamp01(completeness) * 0.2 +
    clamp01(consistency) * 0.2 +
    clamp01(recency) * 0.1 +
    clamp01(effectStrength) * 0.2;
  return Math.round(clamp01(score) * 100) / 100;
}

export function confidenceExplanation(inputs: ConfidenceInputs): string {
  return (
    `Sample n=${inputs.sampleSize}, completeness=${Math.round(inputs.completeness * 100)}%, ` +
    `consistency=${Math.round(inputs.consistency * 100)}%, recency=${Math.round(inputs.recency * 100)}%, ` +
    `effect=${Math.round(inputs.effectStrength * 100)}%. Weighted 30/20/20/10/20; sample saturates log-scale.`
  );
}

/**
 * Signal strength (§19): compare recent rate vs baseline lift.
 * Insufficient data or small deltas -> STABLE (never invent a direction).
 */
export function signalStrengthFromLift(
  recentRate: number,
  baselineRate: number,
  recentSample: number
): SignalStrength {
  if (!Number.isFinite(recentRate) || !Number.isFinite(baselineRate)) {
    return "STABLE";
  }
  if (recentSample < 10 || baselineRate <= 0) return "STABLE";
  const lift = (recentRate - baselineRate) / baselineRate;
  if (recentSample < 20 && Math.abs(lift) < 0.35) return "EMERGING";
  if (lift >= 0.25) return "RISING";
  if (lift <= -0.25) return "DECLINING";
  if (recentSample < 20) return "EMERGING";
  return "STABLE";
}

/** Recency 0..1 from median age of evidence (30-day window => ~1, 90+ days => ~0). */
export function recencyFromMedianAgeDays(medianAgeDays: number): number {
  if (!Number.isFinite(medianAgeDays) || medianAgeDays < 0) return 0;
  return clamp01(1 - medianAgeDays / 90);
}

/**
 * Deterministic identity key for idempotent generation (§20).
 * Nulls normalise to "" so (org, segment, category, dims) is stable.
 */
export function insightIdentityKey(parts: {
  organization_id: string;
  segment_id: string;
  category: string;
  topic?: string | null;
  format?: string | null;
  platform?: string | null;
  hook?: string | null;
  cta?: string | null;
}): string {
  const norm = (v: string | null | undefined) =>
    (v ?? "").trim().toLowerCase();
  return [
    parts.organization_id,
    parts.segment_id,
    parts.category,
    norm(parts.topic),
    norm(parts.format),
    norm(parts.platform),
    norm(parts.hook),
    norm(parts.cta),
  ].join("|");
}

export interface RankInputs {
  confidenceScore: number;
  signalStrength: SignalStrength;
  sampleSize: number;
  generatedAt: string | Date;
}

/** Transparent downstream ranking (§28): confidence + signal + recency + sample. */
export function rankScore(inputs: RankInputs, now = new Date()): number {
  const signalWeight: Record<SignalStrength, number> = {
    RISING: 1,
    EMERGING: 0.7,
    STABLE: 0.5,
    DECLINING: 0.3,
  };
  const generated =
    inputs.generatedAt instanceof Date
      ? inputs.generatedAt
      : new Date(inputs.generatedAt);
  const ageDays = Number.isFinite(generated.getTime())
    ? Math.max(0, (now.getTime() - generated.getTime()) / 86_400_000)
    : 365;
  const recency = clamp01(1 - ageDays / 120);
  const sample = clamp01(Math.log10(Math.max(0, inputs.sampleSize) + 1) / 3);
  const score =
    clamp01(inputs.confidenceScore) * 0.45 +
    (signalWeight[inputs.signalStrength] ?? 0.5) * 0.25 +
    recency * 0.15 +
    sample * 0.15;
  return Math.round(clamp01(score) * 1000) / 1000;
}
