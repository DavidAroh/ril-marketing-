import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOAuthProvider } from "@/lib/integrations/oauth";

export interface BufferTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

interface StoredConfig {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  pending?: { state: string; createdAt: string };
  profiles?: Array<{ id: string; service: string; formattedUsername: string }>;
}

async function readConfig(
  organizationId: string
): Promise<{ rowId: string | null; config: StoredConfig }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integrations")
    .select("id, config")
    .eq("organization_id", organizationId)
    .eq("key", "buffer")
    .maybeSingle<{ id: string; config: StoredConfig }>();
  return { rowId: data?.id ?? null, config: data?.config ?? {} };
}

async function writeConfig(
  organizationId: string,
  rowId: string | null,
  config: StoredConfig,
  status: "connected" | "not_connected" | "error"
): Promise<void> {
  const admin = createAdminClient();
  if (rowId) {
    await admin
      .from("integrations")
      .update({ config, status })
      .eq("id", rowId);
  } else {
    await admin.from("integrations").insert({
      organization_id: organizationId,
      key: "buffer",
      display_name: "Buffer",
      status,
      config,
    });
  }
}

export function bufferEnv(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.BUFFER_CLIENT_ID ?? "";
  const clientSecret = process.env.BUFFER_CLIENT_SECRET ?? "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Step 1 of connect: stage a single-use handshake, return its state. */
export async function stageBufferHandshake(organizationId: string): Promise<string> {
  const { randomUUID } = await import("node:crypto");
  const state = randomUUID().replaceAll("-", "");
  const { rowId, config } = await readConfig(organizationId);
  await writeConfig(
    organizationId,
    rowId,
    { ...config, pending: { state, createdAt: new Date().toISOString() } },
    "not_connected"
  );
  return state;
}

/** Step 2 (callback): verify state once, exchange code, store tokens. */
export async function finishBufferHandshake(
  organizationId: string,
  state: string,
  code: string,
  redirectUri: string
): Promise<void> {
  const env = bufferEnv();
  if (!env) throw new Error("Social publishing isn't switched on yet. Ask whoever set up your workspace to connect Buffer.");
  const { rowId, config } = await readConfig(organizationId);
  const pending = config.pending;
  const fresh =
    pending?.state === state &&
    Number.isFinite(new Date(pending.createdAt).getTime()) &&
    Date.now() - new Date(pending.createdAt).getTime() <= 10 * 60_000;
  if (!fresh) throw new Error("Connect session expired. Start over from Settings.");

  const res = await fetch(getOAuthProvider("buffer")!.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) throw new Error(`Buffer refused the code (HTTP ${res.status}).`);
  const tokens = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokens.access_token) throw new Error("Buffer returned no access token.");

  const { pending: _drop, ...rest } = config;
  void _drop;
  await writeConfig(
    organizationId,
    rowId,
    {
      ...rest,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    },
    "connected"
  );
}

async function refreshIfNeeded(
  organizationId: string,
  rowId: string | null,
  config: StoredConfig
): Promise<string> {
  const valid =
    config.accessToken &&
    (!config.expiresAt || new Date(config.expiresAt).getTime() - Date.now() > 60_000);
  if (valid) return config.accessToken as string;

  const env = bufferEnv();
  if (!env || !config.refreshToken) {
    throw new Error("Buffer connection expired. Reconnect in Settings.");
  }
  const res = await fetch(getOAuthProvider("buffer")!.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) throw new Error("Buffer refresh failed. Reconnect in Settings.");
  const tokens = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!tokens.access_token) throw new Error("Buffer refresh returned no token.");
  await writeConfig(
    organizationId,
    rowId,
    {
      ...config,
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : config.expiresAt ?? null,
    },
    "connected"
  );
  return tokens.access_token;
}

async function bufferApi<T>(
  organizationId: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const { rowId, config } = await readConfig(organizationId);
  const token = await refreshIfNeeded(organizationId, rowId, config);
  const res = await fetch(`https://api.buffer.com/1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) throw new Error("Buffer didn't accept the connection. Reconnect in Settings.");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Buffer error HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface BufferProfile {
  id: string;
  service: string;
  formattedUsername: string;
}

/** Connected channels, cached on the row so Settings loads instantly. */
export async function getBufferProfiles(
  organizationId: string
): Promise<BufferProfile[]> {
  const { rowId, config } = await readConfig(organizationId);
  if (!config.accessToken) throw new Error("Buffer is not connected.");
  const json = await bufferApi<{ profiles?: BufferProfile[] }>(
    organizationId,
    "/profiles.json"
  );
  const profiles = (json.profiles ?? []).map((p) => ({
    id: p.id,
    service: p.service,
    formattedUsername: p.formattedUsername ?? p.service,
  }));
  await writeConfig(organizationId, rowId, { ...config, profiles }, "connected");
  return profiles;
}

export function cachedBufferProfiles(config: StoredConfig): BufferProfile[] {
  return config.profiles ?? [];
}

/** Publish text now to one channel. Returns Buffer's update id. */
export async function publishToBuffer(
  organizationId: string,
  profileId: string,
  text: string
): Promise<string> {
  const json = await bufferApi<{ updates?: Array<{ id?: string }> }>(
    organizationId,
    "/updates/create.json",
    {
      method: "POST",
      body: JSON.stringify({ profile_ids: [profileId], text, now: true }),
    }
  );
  const id = json.updates?.[0]?.id;
  if (!id) throw new Error("Buffer accepted the post but returned no id.");
  return id;
}

export async function disconnectBuffer(organizationId: string): Promise<void> {
  const { rowId, config } = await readConfig(organizationId);
  const { accessToken: _a, refreshToken: _r, expiresAt: _e, profiles: _p, ...rest } = config;
  void _a;
  void _r;
  void _e;
  void _p;
  await writeConfig(organizationId, rowId, rest, "not_connected");
}

export async function getBufferStatus(organizationId: string): Promise<{
  connected: boolean;
  profiles: BufferProfile[];
  envConfigured: boolean;
}> {
  const { config } = await readConfig(organizationId);
  return {
    connected: Boolean(config.accessToken),
    profiles: cachedBufferProfiles(config),
    envConfigured: bufferEnv() !== null,
  };
}
