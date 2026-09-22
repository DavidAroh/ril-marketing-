import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusStamp } from "@/components/ui/status-stamp";
import {
  ShareBarList,
  ShareBarListContent,
  ShareBarListFill,
  ShareBarListItem,
  ShareBarListLabel,
  ShareBarListValue,
} from "@/components/share-bar-list";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listInsights } from "@/lib/audience/insights";
import {
  listAssets,
  listScheduled,
  type ContentAssetRow,
} from "@/lib/content/assets";
import {
  listLeads,
  listLeadsNeedingFollowUp,
  type LeadRow,
} from "@/lib/leads/leads";
import { listOpenTasks, type OpenTask } from "@/lib/audience/tasks";
import { getKpiProgress, type KpiProgress } from "@/lib/audience/kpis";
import { OnlineNow } from "@/components/online-now";
import { EMPTY_LIVE_VISITOR_STATS } from "@/lib/analytics/visitor-stats";
import { getLiveVisitorStats } from "@/lib/analytics/visitors";

export const metadata: Metadata = { title: "Marketing Command Centre" };

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Wire numbers carry every decision queue (DESIGN: "Wire 01"). */
function wire(index: number): string {
  return `Wire ${String(index + 1).padStart(2, "0")}`;
}

/** Hairline dividers for the summary ledger — one slip, never four cards. */
const cellDividers = [
  "",
  "border-t sm:border-t-0 sm:border-l",
  "border-t lg:border-t-0 lg:border-l",
  "border-t sm:border-l lg:border-t-0",
] as const;

export default async function CommandCentrePage() {
  const orgId = await safe(() => getCallerOrganizationId(), null);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);
  const in30Str = in30.toISOString().slice(0, 10);

  const [pending, assets, leads, scheduled, tasks, followups, kpis, live] =
    await Promise.all([
      safe(
        () =>
          orgId
            ? listInsights(orgId, { status: "PENDING_REVIEW", pageSize: 1 })
            : Promise.resolve({ total: 0 }),
        { total: 0 }
      ),
      safe(
        () =>
          orgId
            ? listAssets(orgId, {})
            : Promise.resolve({ assets: [], total: 0 }),
        { assets: [] as ContentAssetRow[], total: 0 }
      ),
      safe(
        () =>
          orgId
            ? listLeads(orgId, { page: 1 })
            : Promise.resolve({ leads: [], total: 0 }),
        { leads: [] as LeadRow[], total: 0 }
      ),
      safe(
        () =>
          orgId
            ? listScheduled(orgId, todayStr, in30Str)
            : Promise.resolve([] as ContentAssetRow[]),
        [] as ContentAssetRow[]
      ),
      safe(
        () => (orgId ? listOpenTasks(orgId, 8) : Promise.resolve([])),
        [] as OpenTask[]
      ),
      safe(
        () => (orgId ? listLeadsNeedingFollowUp(orgId, 5) : Promise.resolve([])),
        [] as LeadRow[]
      ),
      safe(
        () => (orgId ? getKpiProgress(orgId) : Promise.resolve([])),
        [] as KpiProgress[]
      ),
      // Site-wide audience signal — safe() guards the empty/DB-down case.
      safe(() => getLiveVisitorStats(), EMPTY_LIVE_VISITOR_STATS),
    ]);

  const channelCounts = new Map<string, number>();
  for (const a of assets.assets) {
    const key = a.channel?.trim() || "Unassigned";
    channelCounts.set(key, (channelCounts.get(key) ?? 0) + 1);
  }
  const channelMix = [...channelCounts.entries()]
    .map(([channel, count]) => ({
      channel,
      count,
      share:
        assets.assets.length > 0
          ? Math.round((count / assets.assets.length) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const today = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: "Awaiting approval",
      value: pending.total,
      hint: "Insights waiting for your stamp",
    },
    {
      label: "Scheduled · next 30 days",
      value: scheduled.length,
      hint: "Approved assets with a publish date",
    },
    {
      label: "Leads captured",
      value: leads.total,
      hint: "Across every source and campaign",
    },
    {
      label: "Content assets",
      value: assets.total,
      hint: "Drafts through published",
    },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="dateline">{today} · Today&apos;s overview</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
            Marketing Command Centre
          </h1>
          <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
            What is happening in RIL&apos;s marketing right now — live counts,
            never dummy data.
          </p>
        </div>
        <OnlineNow stats={live} className="w-full shrink-0 md:w-80" />
      </div>

      {/* Summary ledger: four counts in one slip, split by hairlines. */}
      <section aria-label="Key counts" className="slip">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "border-border px-5 py-4 sm:px-6",
                cellDividers[i]
              )}
            >
              <p className="dateline">{s.label}</p>
              <p className="mt-2 text-3xl font-bold leading-none tabular-nums">
                {s.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card id="tasks" className="scroll-mt-16">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Open tasks — approvals, reviews, and follow-throughs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All clear. Nothing needs your stamp right now.
              </p>
            ) : (
              <ul className="ledger">
                {tasks.map((t, i) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="dateline">{wire(i)}</span>
                        {t.insight_status ? (
                          <StatusStamp status={t.insight_status} />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.type.replace(/_/g, " ")} · {fmtDate(t.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card id="followup" className="scroll-mt-16">
          <CardHeader>
            <CardTitle>Follow-up queue</CardTitle>
            <CardDescription>
              Leads waiting on a human — oldest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {followups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leads waiting. Every captured lead has an owner or has
                converted.
              </p>
            ) : (
              <ul className="ledger">
                {followups.map((l, i) => (
                  <li
                    key={l.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="dateline">{wire(i)}</span>
                        <StatusStamp variant="scheduled">
                          {l.funnel_stage}
                        </StatusStamp>
                        {l.score ? (
                          <span className="dateline">Score {l.score}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {l.name || l.email || "Unnamed lead"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[l.interest, l.source_platform]
                          .filter(Boolean)
                          .join(" · ") || "No source recorded"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card id="scheduled" className="scroll-mt-16">
          <CardHeader>
            <CardTitle>Scheduled</CardTitle>
            <CardDescription>
              Approved assets with a publish date in the next 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled. Approved content with a date lands here.
              </p>
            ) : (
              <ul className="ledger">
                {scheduled.slice(0, 8).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[a.channel, a.platform].filter(Boolean).join(" · ") ||
                          "No channel set"}
                      </p>
                    </div>
                    <span className="dateline shrink-0 tabular-nums">
                      {fmtDate(a.scheduled_for)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card id="assets" className="scroll-mt-16">
          <CardHeader>
            <CardTitle>Content mix</CardTitle>
            <CardDescription>
              Latest {assets.assets.length} assets by channel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {channelMix.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No content yet. Log an activity and generate your first brief.
              </p>
            ) : (
              <ShareBarList>
                {channelMix.map((row) => (
                  <ShareBarListItem key={row.channel} value={row.share}>
                    <ShareBarListFill />
                    <ShareBarListContent>
                      <ShareBarListLabel>{row.channel}</ShareBarListLabel>
                      <ShareBarListValue>{row.count}</ShareBarListValue>
                    </ShareBarListContent>
                  </ShareBarListItem>
                ))}
              </ShareBarList>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KPI progress</CardTitle>
          <CardDescription>
            Live targets from your workspace — lead-backed metrics compute
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No KPIs defined yet. Define targets like qualified leads or
              registrations to track them here.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {kpis.map((k) => (
                <li key={k.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {k.current ?? "—"} / {k.target_value} {k.unit}
                    </p>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-valuenow={
                      k.fraction == null
                        ? undefined
                        : Math.round(k.fraction * 100)
                    }
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${k.name} progress`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((k.fraction ?? 0) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
