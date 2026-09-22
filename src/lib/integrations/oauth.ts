/**
 * OAuth connector framework. Adding a provider = one registry entry plus
 * (optionally) an API client. No provider-specific code in routes/actions.
 *
 * CSRF protection: the `state` token is a random value stored on the
 * integration row (`config.pending`) before redirect and consumed
 * (single-use) on callback. No extra secrets or env vars required.
 */

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
    authorizeUrl: "https://login.buffer.com/oauth2/authorize",
    tokenUrl: "https://api.buffer.com/1/oauth2/token.json",
    scopes: [],
  },
};

export function getOAuthProvider(key: string): OAuthProviderDef | null {
  return OAUTH_PROVIDERS[key] ?? null;
}

export function newStateToken(): string {
  return globalThis.crypto.randomUUID().replaceAll("-", "");
}

export interface PendingHandshake {
  state: string;
  createdAt: string;
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
  }
): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    state: args.state,
  });
  if (def.scopes.length > 0) params.set("scope", def.scopes.join(" "));
  return `${def.authorizeUrl}?${params.toString()}`;
}
