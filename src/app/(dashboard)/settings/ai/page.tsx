import type { Metadata } from "next";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { createClient } from "@/lib/supabase/server";
import { getAiIntegration } from "@/lib/ai/provider";
import { PROVIDERS } from "@/lib/ai/providers";
import { StatusStamp } from "@/components/ui/status-stamp";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { todayDateline } from "@/lib/format";

export const metadata: Metadata = { title: "AI Settings" };

interface IntegrationRow {
  key: string;
  display_name: string | null;
  status: string;
  updated_at: string;
}

export default async function AiSettingsPage() {
  const orgId = await getCallerOrganizationId().catch(() => null);

  const ai = orgId
    ? await getAiIntegration(orgId).catch(() => null)
    : null;

  let integrations: IntegrationRow[] = [];
  if (orgId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("integrations")
        .select("key, display_name, status, updated_at")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false });
      integrations = (data ?? []) as IntegrationRow[];
    } catch {
      integrations = [];
    }
  }

  const envKey = Boolean(process.env.AI_API_KEY);
  const mode = envKey
    ? "Environment key"
    : ai?.hasKey
      ? "Workspace key"
      : "Template mode (no key)";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="dateline">{todayDateline()} · Setup</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          AI settings
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          Bring your own OpenAI, Claude, or Gemini key — or run in template
          mode without one. Keys are stored per workspace and never exposed to
          models beyond the current request.
        </p>
      </div>

      <section aria-labelledby="ai-provider-heading" className="slip px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id="ai-provider-heading" className="text-base font-bold">
              Generation provider
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mode: {mode}
              {ai?.updatedAt
                ? ` · Updated ${new Date(ai.updatedAt).toLocaleDateString("en-GB")}`
                : ""}
            </p>
          </div>
          <StatusStamp variant={envKey || ai?.hasKey ? "approved" : "cold"}>
            {envKey || ai?.hasKey ? "CONNECTED" : "NO KEY"}
          </StatusStamp>
        </div>
        {ai ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Stored: {PROVIDERS[ai.provider].label} · {ai.model}
            {ai.hasKey ? ` · key ••••${ai.last4 ?? ""}` : " · no key saved"}
          </p>
        ) : null}
        <div className="mt-4">
          <AiSettingsForm
            initial={{
              provider: ai?.provider ?? "openai",
              model: ai?.model ?? "gpt-4o-mini",
              hasKey: Boolean(ai?.hasKey) || envKey,
              last4: ai?.last4 ?? null,
            }}
          />
        </div>
      </section>

      <section aria-labelledby="integrations-heading" className="slip px-5 py-4 sm:px-6">
        <h2 id="integrations-heading" className="text-base font-bold">
          Integration status
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Connected external services for this workspace.
        </p>
        {integrations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No integrations connected yet. Buffer, email, and ad-platform
            connectors appear here once linked.
          </p>
        ) : (
          <ul className="ledger mt-3 border-t border-border">
            {integrations.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.display_name || row.key.toUpperCase()}
                  </p>
                  <p className="dateline mt-0.5">
                    Updated {new Date(row.updated_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <StatusStamp variant={row.status === "connected" ? "approved" : "cold"}>
                  {row.status === "connected" ? "CONNECTED" : "NOT CONNECTED"}
                </StatusStamp>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
