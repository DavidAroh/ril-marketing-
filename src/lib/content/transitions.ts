/** Approval-pipeline transitions (PRD §11). Pure — unit tested. */

export const ASSET_STATUSES = [
  "idea",
  "ai_generated",
  "editing",
  "review",
  "approved",
  "scheduled",
  "published",
  "analysing",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

const ALLOWED: Record<AssetStatus, AssetStatus[]> = {
  idea: ["ai_generated", "editing"],
  ai_generated: ["editing"],
  editing: ["review"],
  review: ["editing", "approved"],
  approved: ["scheduled", "editing"],
  scheduled: ["published", "approved"],
  published: ["analysing"],
  analysing: [],
};

/** High-sensitivity assets need a second, named tier (§11). */
export const HIGH_SENSITIVITY_APPROVER_ROLES = [
  "owner",
  "admin",
  "leadership",
] as const;

export function canTransitionAsset(
  from: string,
  to: string
): boolean {
  const next = (ALLOWED as Record<string, string[]>)[from];
  return Array.isArray(next) && next.includes(to);
}

export function isValidAssetStatus(value: string): value is AssetStatus {
  return (ASSET_STATUSES as readonly string[]).includes(value);
}

export function isHighSensitivityApprover(role: string | null | undefined): boolean {
  return (HIGH_SENSITIVITY_APPROVER_ROLES as readonly string[]).includes(role ?? "");
}
