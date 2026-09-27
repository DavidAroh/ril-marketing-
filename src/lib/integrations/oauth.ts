/**
 * OAuth connector framework. Adding a provider = one registry entry plus
 * (optionally) an API client. No provider-specific code in routes/actions.
 *
 * CSRF protection: the `state` token is a random value stored on the
 * integration row (`config.pending`) before redirect and consumed
 * (single-use) on callback. No extra secrets or env vars required.
 *
 * PKCE: Buffer requires the Authorization Code flow with PKCE for *all* OAuth
 * clients, so the verifier is generated alongside the state, stored on the
 * same pending handshake, and replayed on the token exchange. Never send the
 * verifier to the browser — only its SHA-256 challenge travels in the URL.
 */

import { createHash, randomBytes } from "node:crypto";

export interface OAuthProviderDef {
  key: string;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderDef> = {
  buffer: {
    key: "buffer",
    displayName: "Buffer",
    authorizeUrl: "https://auth.buffer.com/auth",
    tokenUrl: "https://auth.buffer.com/token",
    // Least privilege: read the account so channels can be listed, and
    // create posts. `offline_access` is what returns a refresh token.
    scopes: ["posts:read", "posts:write", "account:read", "offline_access"],
  },
};

export function getOAuthProvider(key: string): OAuthProviderDef | null {
  return OAUTH_PROVIDERS[key] ?? null;
}

export function newStateToken(): string {
  return globalThis.crypto.randomUUID().replaceAll("-", "");
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/** A fresh PKCE code_verifier (43–128 chars of base64url, per RFC 7636). */
export function newCodeVerifier(): string {
  return base64Url(randomBytes(32));
}

/** The S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export function codeChallengeFor(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export interface PendingHandshake {
  state: string;
  createdAt: string;
  /** PKCE verifier, replayed on the token exchange. */
  codeVerifier?: string;
}

export function isFreshHandshake(
  pending: PendingHandshake | null | undefined,
  now = Date.now(),
  maxAgeMs = 10 * 60_000
): boolean {
  if (!pending?.state || !pending.createdAt) return false;
  const created = new Date(pending.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created >= 0 && now - created <= maxAgeMs;
}

export function buildAuthorizeUrl(
  def: OAuthProviderDef,
  args: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge?: string;
  }
): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    state: args.state,
  });
  if (def.scopes.length > 0) params.set("scope", def.scopes.join(" "));
  if (args.codeChallenge) {
    params.set("code_challenge", args.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${def.authorizeUrl}?${params.toString()}`;
}
