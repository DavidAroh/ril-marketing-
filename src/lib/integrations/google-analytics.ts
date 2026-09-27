import "server-only";
import { sign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secret-box";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/webmasters.readonly"];
type ServiceAccount = { type: "service_account"; client_email: string; private_key: string; token_uri?: string };
type IntegrationRow = { status: string; config: Record<string, string> };
export type GoogleAnalyticsConfig = { credentialsJson: string; ga4PropertyId: string; searchConsoleSiteUrl: string };
type GoogleMetricRow = { dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> };

export type GoogleReportMetrics = {
  ga4: { activeUsers: number; sessions: number; pageViews: number; topPages: Array<{ path: string; views: number }> };
  searchConsole: { clicks: number; impressions: number; ctr: number; averagePosition: number; topPages: Array<{ path: string; clicks: number; impressions: number }>; topQueries: Array<{ query: string; clicks: number; impressions: number }>; dataThrough: string } | null;
};

function parseServiceAccount(credentialsJson: string): ServiceAccount {
  let value: unknown;
  try { value = JSON.parse(credentialsJson); } catch { throw new Error("Paste the complete Google service-account JSON key file."); }
  if (!value || typeof value !== "object") throw new Error("The Google credential file is not valid JSON.");
  const account = value as Partial<ServiceAccount>;
  if (account.type !== "service_account" || !account.client_email || !account.private_key?.includes("PRIVATE KEY")) throw new Error("The JSON must be a service-account key with client_email and private_key fields.");
  return account as ServiceAccount;
}

function base64url(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }

async function accessToken(credentialsJson: string) {
  const account = parseServiceAccount(credentialsJson);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: account.client_email, scope: GOOGLE_SCOPES.join(" "), aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claims}`;
  const assertion = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), account.private_key).toString("base64url")}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({})) as { access_token?: string };
  if (!response.ok || !result.access_token) throw new Error("Google rejected the service-account key. Check the key and enabled APIs.");
  return result.access_token;
}

async function googleJson<T>(url: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string } } & T;
  if (!response.ok) throw new Error(`Google analytics request failed: ${(payload.error?.message ?? `HTTP ${response.status}`).slice(0, 180)}`);
  return payload;
}

function metricValue(row: GoogleMetricRow | undefined, index: number) {
  return Number(row?.metricValues?.[index]?.value ?? 0) || 0;
}

async function loadReports(config: GoogleAnalyticsConfig, startDate: string, endDate: string): Promise<GoogleReportMetrics> {
  const token = await accessToken(config.credentialsJson);
  const property = encodeURIComponent(config.ga4PropertyId);
  const [gaTotals, gaPages, scTotals, scPages, scQueries] = await Promise.all([
    googleJson<{ rows?: GoogleMetricRow[] }>(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, token, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    }),
    googleJson<{ rows?: GoogleMetricRow[] }>(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, token, {
      dateRanges: [{ startDate, endDate }], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: "10",
    }),
    searchQuery(config.searchConsoleSiteUrl, token, { startDate, endDate }),
    searchQuery(config.searchConsoleSiteUrl, token, { startDate, endDate, dimensions: ["page"], rowLimit: 10 }),
    searchQuery(config.searchConsoleSiteUrl, token, { startDate, endDate, dimensions: ["query"], rowLimit: 10 }),
  ]);
  const ga = gaTotals.rows?.[0];
  const totals = scTotals.rows?.[0];
  const dataThrough = endDate;
  return {
    ga4: {
      activeUsers: metricValue(ga, 0), sessions: metricValue(ga, 1), pageViews: metricValue(ga, 2),
      topPages: (gaPages.rows ?? []).map((row) => ({ path: row.dimensionValues?.[0]?.value ?? "(not set)", views: metricValue(row, 0) })),
    },
    searchConsole: {
      clicks: Number(totals?.clicks ?? 0), impressions: Number(totals?.impressions ?? 0), ctr: Number(totals?.ctr ?? 0), averagePosition: Number(totals?.position ?? 0),
      topPages: (scPages.rows ?? []).map((row) => ({ path: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) })),
      topQueries: (scQueries.rows ?? []).map((row) => ({ query: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) })),
      dataThrough,
    },
  };
}

async function searchQuery(siteUrl: string, token: string, body: Record<string, unknown>) {
  return googleJson<{ rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> }>(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, token, body,
  );
}

export async function getGoogleAnalyticsConfig(organizationId: string): Promise<GoogleAnalyticsConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select("status,config").eq("organization_id", organizationId).eq("key", "google_analytics").maybeSingle<IntegrationRow>();
  if (data?.status !== "connected") return null;
  const credentialsJson = decryptSecret(data.config.credentials ?? "");
  if (!credentialsJson || !data.config.ga4PropertyId || !data.config.searchConsoleSiteUrl) return null;
  return { credentialsJson, ga4PropertyId: data.config.ga4PropertyId, searchConsoleSiteUrl: data.config.searchConsoleSiteUrl };
}

export async function verifyGoogleAnalyticsConnection(config: GoogleAnalyticsConfig) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 4);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  await loadReports(config, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  return true;
}

export async function loadGoogleAnalyticsMetrics(organizationId: string, startDate: string, endDate: string) {
  const config = await getGoogleAnalyticsConfig(organizationId);
  if (!config) return null;
  const latestSearchDate = new Date();
  latestSearchDate.setUTCDate(latestSearchDate.getUTCDate() - 3);
  const searchEnd = endDate < latestSearchDate.toISOString().slice(0, 10) ? endDate : latestSearchDate.toISOString().slice(0, 10);
  const token = await accessToken(config.credentialsJson);
  const property = encodeURIComponent(config.ga4PropertyId);
  const [totals, pages] = await Promise.all([
    googleJson<{ rows?: GoogleMetricRow[] }>(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, token, { dateRanges: [{ startDate, endDate }], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] }),
    googleJson<{ rows?: GoogleMetricRow[] }>(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, token, { dateRanges: [{ startDate, endDate }], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: "10" }),
  ]);
  const [scTotals, scPages, scQueries] = searchEnd >= startDate ? await Promise.all([
    searchQuery(config.searchConsoleSiteUrl, token, { startDate, endDate: searchEnd }),
    searchQuery(config.searchConsoleSiteUrl, token, { startDate, endDate: searchEnd, dimensions: ["page"], rowLimit: 10 }),
    searchQuery(config.searchConsoleSiteUrl, token, { startDate, endDate: searchEnd, dimensions: ["query"], rowLimit: 10 }),
  ]) : [null, null, null];
  const ga = totals.rows?.[0];
  const sc = scTotals?.rows?.[0];
  return {
    ga4: { activeUsers: metricValue(ga, 0), sessions: metricValue(ga, 1), pageViews: metricValue(ga, 2), topPages: (pages.rows ?? []).map((row) => ({ path: row.dimensionValues?.[0]?.value ?? "(not set)", views: metricValue(row, 0) })) },
    searchConsole: scTotals ? { clicks: Number(sc?.clicks ?? 0), impressions: Number(sc?.impressions ?? 0), ctr: Number(sc?.ctr ?? 0), averagePosition: Number(sc?.position ?? 0), topPages: (scPages?.rows ?? []).map((row) => ({ path: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) })), topQueries: (scQueries?.rows ?? []).map((row) => ({ query: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) })), dataThrough: searchEnd } : null,
  } satisfies GoogleReportMetrics;
}
