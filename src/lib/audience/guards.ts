/**
 * Pure, environment-free helpers for the audience platform layer.
 * Kept free of `server-only` (and node-only imports) so unit tests —
 * and, where appropriate, client components — can use them.
 * Web Crypto (`randomUUID`) works in Node 19+, browsers and edge runtimes.
 */

/** Roles allowed to approve/suppress insights (PRD §11 tiers, §16). */
export const REVIEWER_ROLES = [
  "owner",
  "admin",
  "marketing_manager",
  "leadership",
] as const;

export function isReviewerRole(role: string | null | undefined): boolean {
  return (REVIEWER_ROLES as readonly string[]).includes(role ?? "");
}

/** Clamped 0..1 progress, null when not computable. Pure — unit tested. */
export function kpiFraction(
  current: number | null,
  target: number
): number | null {
  if (current === null || target <= 0) return null;
  return Math.min(1, Math.max(0, current / target));
}

export function reviewTaskTitle(parts: {
  category: string;
  topic?: string | null;
  format?: string | null;
  platform?: string | null;
}): string {
  const dims = [parts.topic, parts.format, parts.platform].filter(Boolean);
  return `Review ${parts.category}${dims.length > 0 ? ` · ${dims.join(" · ")}` : ""}`;
}

export function newRegistrationToken(): string {
  return `ril_${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function isRegistrationToken(value: string | null | undefined): boolean {
  return typeof value === "string" && /^ril_[A-Za-z0-9_-]{10,32}$/.test(value);
}
