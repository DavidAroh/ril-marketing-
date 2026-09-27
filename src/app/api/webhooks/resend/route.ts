import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secret-box";

const eventTypes = new Set(["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "email.failed"]);

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 256_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  const payload = await request.text();
  if (payload.length > 256_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  const headers = {
    id: request.headers.get("svix-id") ?? "",
    timestamp: request.headers.get("svix-timestamp") ?? "",
    signature: request.headers.get("svix-signature") ?? "",
  };
  if (!headers.id || !headers.timestamp || !headers.signature) return NextResponse.json({ error: "Missing webhook signature headers." }, { status: 400 });
  const admin = createAdminClient();
  const { data: integrations, error } = await admin.from("integrations").select("organization_id,config").eq("key", "email_resend").eq("status", "connected").limit(200);
  if (error) return NextResponse.json({ error: "Could not load the provider integration." }, { status: 503 });
  for (const row of integrations ?? []) {
    const config = row.config as Record<string,string>;
    const apiKey = decryptSecret(config.apiKey ?? "");
    const secret = decryptSecret(config.webhookSecret ?? "");
    if (!apiKey || !secret) continue;
    let event: { type?: string; created_at?: string; data?: { email_id?: string } };
    try { event = new Resend(apiKey).webhooks.verify({ payload, headers, webhookSecret: secret }) as typeof event; }
    catch { continue; }
    if (!eventTypes.has(event.type ?? "") || !event.data?.email_id) return NextResponse.json({ ok: true, ignored: true });
    const occurredAt = event.created_at && Number.isFinite(new Date(event.created_at).getTime()) ? new Date(event.created_at).toISOString() : new Date().toISOString();
    const { error: recordError } = await admin.rpc("record_resend_email_event", {
      p_organization_id: row.organization_id,
      p_provider_event_id: headers.id,
      p_provider_message_id: event.data.email_id,
      p_event_type: event.type,
      p_occurred_at: occurredAt,
    });
    if (recordError) return NextResponse.json({ error: "Could not record the provider event." }, { status: 503 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
}

export async function GET() { return NextResponse.json({ error: "Webhook endpoint accepts signed POST requests." }, { status: 405 }); }
