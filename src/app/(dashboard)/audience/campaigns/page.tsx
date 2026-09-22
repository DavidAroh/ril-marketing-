import type { Metadata } from "next";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listCampaignRollups } from "@/lib/audience/campaigns";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStamp } from "@/components/ui/status-stamp";
import { formatDay, todayDateline, wireLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Campaigns" };

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default async function CampaignsPage() {
  const orgId = await getCallerOrganizationId().catch(() => null);
  const campaigns = orgId
    ? await listCampaignRollups(orgId).catch(
        () => [] as Awaited<ReturnType<typeof listCampaignRollups>>
      )
    : [];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="dateline">
          {todayDateline()} · {campaigns.length} campaigns
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Campaigns
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          One workspace per initiative — segment reach, registrations, and lead
          quality rolled up against the campaign objective.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Campaigns group content, leads, and performance around one objective. They appear here once created."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((c, i) => (
            <li key={c.id} className="slip flex flex-col gap-3 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="dateline">{wireLabel(i)}</span>
                <StatusStamp status={c.status} />
                {c.segment_name ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                    {c.segment_name}
                  </span>
                ) : null}
                <span className="dateline ml-auto tabular-nums">
                  {formatDay(c.starts_on)} → {formatDay(c.ends_on)}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground">{c.name}</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Assets", value: String(c.assets) },
                  { label: "Views", value: c.views.toLocaleString() },
                  { label: "Registrations", value: c.registrations.toLocaleString() },
                  { label: "Leads", value: String(c.leads) },
                  { label: "Qualified", value: `${c.qualified_leads} (${pct(c.qualified_rate)})` },
                  { label: "Conversion", value: pct(c.conversion_rate) },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="dateline">{stat.label}</dt>
                    <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
