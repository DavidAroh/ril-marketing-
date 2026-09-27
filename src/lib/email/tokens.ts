import "server-only";
import { createHash, createHmac } from "node:crypto";

function secret() {
  const value = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!value || value.length < 32) throw new Error("Set EMAIL_UNSUBSCRIBE_SECRET to a random value of at least 32 characters.");
  return value;
}

/** Deterministic per-delivery bearer token; only its SHA-256 digest is stored. */
export function createUnsubscribeToken(organizationId: string, deliveryId: string, leadId: string) {
  return createHmac("sha256", secret()).update(`ril-unsubscribe-v1:${organizationId}:${deliveryId}:${leadId}`).digest("base64url");
}

export function hashUnsubscribeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
