import "server-only";
import { lookup } from "node:dns/promises";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secret-box";

type IntegrationRow = { status: string; config: Record<string, string> };
export type WordPressConfig = { siteUrl: string; username: string; applicationPassword: string };

function normalizeSiteUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter the full URL of your WordPress site."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || host === "localhost" || !host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || /^\d+(\.\d+){3}$/.test(host) || host.includes(":")) {
    throw new Error("Use your public WordPress site URL over HTTPS, without query parameters or credentials.");
  }
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

function restRoot(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
}

function authHeader(username: string, applicationPassword: string) {
  return `Basic ${Buffer.from(`${username}:${applicationPassword.replace(/\s/g, "")}`).toString("base64")}`;
}

async function requestWordPress<T>(config: WordPressConfig, path: string, init: RequestInit = {}): Promise<T> {
  const addresses = await lookup(new URL(config.siteUrl).hostname, { all: true });
  const hasPrivateAddress = addresses.some(({ address }) => {
    const normalized = address.toLowerCase();
    const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
    const parts = ipv4.split(".").map(Number);
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("ff") || (parts.length === 4 && (
      parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224 ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && (parts[1] === 0 || parts[1] === 168)) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19 || (parts[1] === 51 && parts[2] === 100))) ||
      (parts[0] === 203 && parts[1] === 0 && parts[2] === 113)
    ));
  });
  if (!addresses.length || hasPrivateAddress) throw new Error("WordPress URL must resolve only to public network addresses.");
  const response = await fetch(`${restRoot(config.siteUrl)}${path}`, {
    ...init,
    headers: { Authorization: authHeader(config.username, config.applicationPassword), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) {
    const detail = typeof payload.message === "string" ? payload.message.slice(0, 180) : `HTTP ${response.status}`;
    throw new Error(response.status === 401 || response.status === 403 ? "WordPress rejected the application password or the account lacks publishing permission." : `WordPress request failed: ${detail}`);
  }
  return payload;
}

export async function verifyWordPressConnection(config: WordPressConfig) {
  const profile = await requestWordPress<{ id: number; name: string; capabilities?: Record<string, boolean> }>(config, "/users/me?context=edit");
  if (!profile.capabilities?.edit_posts || !profile.capabilities.publish_posts) {
    throw new Error("The connected WordPress account needs permission to edit and publish posts.");
  }
  return { user: profile.name, userId: profile.id };
}

export async function getWordPressConfig(organizationId: string): Promise<WordPressConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select("status,config").eq("organization_id", organizationId).eq("key", "cms_wordpress").maybeSingle<IntegrationRow>();
  if (data?.status !== "connected") return null;
  const applicationPassword = decryptSecret(data.config.applicationPassword ?? "");
  if (!applicationPassword) return null;
  try {
    return { siteUrl: normalizeSiteUrl(data.config.siteUrl ?? ""), username: data.config.username ?? "", applicationPassword };
  } catch { return null; }
}

export async function publishWordPressPost(config: WordPressConfig, input: { title: string; body: string; excerpt: string; slug: string }) {
  const query = `?slug=${encodeURIComponent(input.slug)}&context=edit`;
  const existing = await requestWordPress<Array<{ id: number; link: string }>>(config, `/posts${query}`);
  if (existing[0]?.id) return { id: existing[0].id, url: existing[0].link, alreadyCreated: true };

  const content = input.body.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`).join("\n");
  const post = await requestWordPress<{ id: number; link: string }>(config, "/posts", {
    method: "POST",
    body: JSON.stringify({ title: input.title, content, excerpt: input.excerpt, slug: input.slug, status: "publish" }),
  });
  if (!post.id || !post.link) throw new Error("WordPress did not return the published post URL.");
  return { id: post.id, url: post.link, alreadyCreated: false };
}

export function validateWordPressSiteUrl(value: string) { return normalizeSiteUrl(value); }
