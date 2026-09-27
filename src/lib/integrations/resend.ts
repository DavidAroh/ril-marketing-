import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secret-box";

export type ResendConfig = { apiKey: string; fromEmail: string; fromName: string; replyTo: string; webhookSecret: string };
type IntegrationRow = { status: string; config: Record<string, string> };

export async function getResendConfig(organizationId: string): Promise<ResendConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select("status,config").eq("organization_id", organizationId).eq("key", "email_resend").maybeSingle<IntegrationRow>();
  if (data?.status !== "connected") return null;
  const apiKey = decryptSecret(data.config.apiKey ?? "");
  if (!apiKey) return null;
  return {
    apiKey,
    fromEmail: data.config.fromEmail ?? "",
    fromName: data.config.fromName ?? "Renaissance Innovation Labs",
    replyTo: data.config.replyTo ?? "",
    webhookSecret: decryptSecret(data.config.webhookSecret ?? ""),
  };
}

export async function verifyResendSender(apiKey: string, fromEmail: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (response.status === 401 || response.status === 403) return { ok: false, error: "Resend rejected the API key or it lacks domain access." };
  if (!response.ok) return { ok: false, error: `Could not verify the Resend account (HTTP ${response.status}).` };
  const payload = await response.json() as { data?: Array<{ name?: string; status?: string; capabilities?: { sending?: string } }> };
  const domain = fromEmail.split("@")[1]?.toLowerCase();
  if (!domain) return { ok: false, error: "Enter a valid sender email address." };
  const valid = payload.data?.some((item) => item.name?.toLowerCase() === domain && item.status === "verified" && item.capabilities?.sending !== "disabled");
  return valid ? { ok: true } : { ok: false, error: `Verify ${domain} as a sending domain in Resend before connecting it here.` };
}
