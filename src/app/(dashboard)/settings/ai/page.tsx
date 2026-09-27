import type { Metadata } from "next";
import Link from "next/link";
import { MailIcon } from "lucide-react";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { createClient } from "@/lib/supabase/server";
import { getAiIntegration } from "@/lib/ai/provider";
import { defaultModel, isProviderKey } from "@/lib/ai/providers";
import { getBufferStatus } from "@/lib/integrations/buffer";
import { getResendConfig } from "@/lib/integrations/resend";
import { getUserRole } from "@/lib/audience/access";
import { StatusStamp } from "@/components/ui/status-stamp";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { BufferConnector } from "@/components/settings/buffer-connector";
import { ConnectorCard } from "@/components/settings/connector-card";
import { WordPressSettingsForm } from "@/components/settings/wordpress-settings-form";
import { GoogleAnalyticsSettingsForm } from "@/components/settings/google-analytics-settings-form";
import { todayDateline } from "@/lib/format";

export const metadata: Metadata = { title: "AI & Integrations" };

interface IntegrationRow {
  key: string;
  display_name: string | null;
  status: string;
  updated_at: string;
}

/** Keys rendered as their own connector card, so the raw ledger doesn't repeat them. */
const CONNECTOR_KEYS = new Set([
  "ai",
  "buffer",
  "cms_wordpress",
  "google_analytics",
  "email_resend",
]);

const MANAGER_ROLES = ["owner", "admin", "marketing_manager"];

export default async function AiSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; connect_error?: string }>;
}) {
  const search = await searchParams;
  const orgId = await getCallerOrganizationId().catch(() => null);

  const ai = orgId ? await getAiIntegration(orgId).catch(() => null) : null;

  let integrations: IntegrationRow[] = [];
  let wordpress: { connected: boolean; siteUrl: string; username: string } = {
    connected: false,
    siteUrl: "",
    username: "",
  };
  let googleAnalytics: {
    connected: boolean;
    propertyId: string;
    searchConsoleSiteUrl: string;
  } = { connected: false, propertyId: "", searchConsoleSiteUrl: "" };
  let buffer: Awaited<ReturnType<typeof getBufferStatus>> = {
    connected: false,
    channels: [],
    envConfigured: false,
    organizationName: null,
  };
  let resend: Awaited<ReturnType<typeof getResendConfig>> = null;
  let canManageConnectors = false;

  if (orgId) {
    try {
      const supabase = await createClient();
      const [list, wordpressResult, analyticsResult] = await Promise.all([
        supabase
          .from("integrations")
          .select("key, display_name, status, updated_at")
          .eq("organization_id", orgId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("integrations")
          .select("status,config")
          .eq("organization_id", orgId)
          .eq("key", "cms_wordpress")
          .maybeSingle<{
            status: string;
            config: { siteUrl?: string; username?: string };
          }>(),
        supabase
          .from("integrations")
          .select("status,config")
          .eq("organization_id", orgId)
          .eq("key", "google_analytics")
          .maybeSingle<{
            status: string;
            config: { ga4PropertyId?: string; searchConsoleSiteUrl?: string };
          }>(),
      ]);
      integrations = (list.data ?? []) as IntegrationRow[];
      if (wordpressResult.data) {
        wordpress = {
          connected: wordpressResult.data.status === "connected",
          siteUrl: wordpressResult.data.config.siteUrl ?? "",
          username: wordpressResult.data.config.username ?? "",
        };
      }
      if (analyticsResult.data) {
        googleAnalytics = {
          connected: analyticsResult.data.status === "connected",
          propertyId: analyticsResult.data.config.ga4PropertyId ?? "",
          searchConsoleSiteUrl:
            analyticsResult.data.config.searchConsoleSiteUrl ?? "",
        };
      }
    } catch {
      /* Keep every connector unconfigured if workspace data cannot be read. */
    }

    [buffer, resend, canManageConnectors] = await Promise.all([
      getBufferStatus(orgId).catch(() => ({
        connected: false,
        channels: [],
        envConfigured: false,
        organizationName: null,
      })),
      getResendConfig(orgId).catch(() => null),
      getUserRole(orgId)
        .then((role) => Boolean(role && MANAGER_ROLES.includes(role)))
        .catch(() => false),
    ]);
  }

  const serverKey = Boolean(process.env.AI_API_KEY);
  const aiConnected = serverKey || Boolean(ai?.hasKey);
  const startProvider = isProviderKey(ai?.provider) ? ai.provider : "openai";
  const resendConnected = Boolean(resend);
  const connectedCount = [buffer.connected, wordpress.connected, googleAnalytics.connected, resendConnected]
    .filter(Boolean).length;
  const otherIntegrations = integrations.filter(
    (row) => !CONNECTOR_KEYS.has(row.key)
  );

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <header>
        <p className="dateline">{todayDateline()} · Setup</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          AI &amp; integrations
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          Bring your own AI key and connect the accounts you publish from.
          Nothing here posts, sends or publishes on its own.
        </p>
      </header>

      {search.connect_error ? (
        <p
          role="alert"
          className="slip border-destructive/40 px-5 py-3 text-sm text-destructive sm:px-6"
        >
          {search.connect_error}
        </p>
      ) : null}
      {search.connected ? (
        <p
          role="status"
          className="slip px-5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 sm:px-6"
        >
          Connected. Your channels are ready to use.
        </p>
      ) : null}

      {/* ── AI provider ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="ai-provider-heading"
        className="slip px-5 py-4 sm:px-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id="ai-provider-heading" className="text-base font-bold">
              Your AI provider
            </h2>
            <p className="mt-0.5 max-w-[62ch] text-xs leading-5 text-muted-foreground">
              Choose a provider, pick the model you want, paste your key and
              connect. Your assistant and every new draft start using it
              straight away. The key stays in this workspace.
            </p>
          </div>
          <StatusStamp variant={aiConnected ? "approved" : "cold"}>
            {aiConnected ? "CONNECTED" : "NOT CONNECTED"}
          </StatusStamp>
        </div>

        <div className="mt-4">
          {serverKey ? (
            <p className="text-sm text-muted-foreground">
              This workspace is already set up with a key configured on the
              server, so there is nothing to connect here.
            </p>
          ) : (
            <>
              {!ai?.hasKey ? (
                <p className="mb-4 max-w-[68ch] text-sm text-muted-foreground">
                  Until you connect a provider, drafts are written from your
                  activity facts using built-in templates. Connecting one adds
                  richer, brand-voice writing.
                </p>
              ) : null}
              <AiSettingsForm
                initial={{
                  provider: startProvider,
                  model: ai?.model ?? defaultModel(startProvider),
                  hasKey: Boolean(ai?.hasKey),
                  last4: ai?.last4 ?? null,
                }}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Connectors ────────────────────────────────────────────────── */}
      <section aria-labelledby="connectors-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="connectors-heading" className="text-base font-bold">
              Connectors
            </h2>
            <p className="mt-0.5 max-w-[62ch] text-xs leading-5 text-muted-foreground">
              Link the accounts your marketing runs through. Each one is checked
              with the provider before it is saved, so connected means it works.
            </p>
          </div>
          <p className="dateline">
            {connectedCount} of 4 connected
          </p>
        </div>

        <div className="mt-3 grid gap-3">
          <BufferConnector
            connected={buffer.connected}
            envConfigured={buffer.envConfigured}
            channels={buffer.channels}
            organizationName={buffer.organizationName}
          />

          <WordPressSettingsForm initial={wordpress} />

          <GoogleAnalyticsSettingsForm initial={googleAnalytics} />

          <ConnectorCard
            icon={<MailIcon />}
            title="Resend"
            blurb="Send approved campaigns to contacts who have opted in."
            connected={resendConnected}
            badge={
              resendConnected
                ? `Sending from ${resend?.fromEmail ?? "a verified sender"}`
                : undefined
            }
          >
            {canManageConnectors ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Resend is set up on the{" "}
                <Link
                  href="/email"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Email page
                </Link>
                , where you also pick the verified sender and webhook.
              </p>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                {resendConnected
                  ? "Connected and ready. Only opted-in, unsuppressed contacts are included."
                  : "An owner, admin or marketing manager needs to connect the email provider on the Email page."}
              </p>
            )}
          </ConnectorCard>
        </div>
      </section>

      {otherIntegrations.length > 0 ? (
        <section
          aria-labelledby="other-connections-heading"
          className="slip px-5 py-4 sm:px-6"
        >
          <h2 id="other-connections-heading" className="text-base font-bold">
            Other connections
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Workspace services that don&apos;t need setup here.
          </p>
          <ul className="ledger mt-3 border-t border-border">
            {otherIntegrations.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.display_name || row.key}
                  </p>
                  <p className="dateline mt-0.5">
                    Updated {new Date(row.updated_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <StatusStamp
                  variant={row.status === "connected" ? "approved" : "cold"}
                >
                  {row.status === "connected" ? "CONNECTED" : "NOT CONNECTED"}
                </StatusStamp>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
