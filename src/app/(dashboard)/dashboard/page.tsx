import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusStamp } from "@/components/ui/status-stamp";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShareBarList,
  ShareBarListContent,
  ShareBarListFill,
  ShareBarListItem,
  ShareBarListLabel,
  ShareBarListValue,
} from "@/components/share-bar-list";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listInsights, type InsightListResult } from "@/lib/audience/insights";
import {
  listAssets,
  listScheduled,
  type ContentAssetRow,
} from "@/lib/content/assets";
import {
  listActivities,
  type ActivityWithSegment,
} from "@/lib/content/activities";
import {
  listLeads,
  listLeadsNeedingFollowUp,
  type LeadRow,
} from "@/lib/leads/leads";
import { listOpenTasks, type OpenTask } from "@/lib/audience/tasks";
import { getKpiProgress, type KpiProgress } from "@/lib/audience/kpis";
import { formatDay, todayDateline, wireLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Marketing Command Centre" };

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

const EMPTY_INSIGHTS: InsightListResult = {
  insights: [],
  total: 0,
  page: 1,
  pageSize: 3,
  totalPages: 1,
};

/* Week math runs in UTC. scheduled_for is stored as an ISO timestamp. */
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday 00:00 UTC of the week containing `now`. */
function startOfWeek(now: Date): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/** "21–27 Sep" within one month, "28 Sep – 4 Oct" across a boundary. */
function weekRangeLabel(days: Date[]): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const first = days[0];
  const last = days[6];
  if (first.getUTCMonth() === last.getUTCMonth()) {
    return `${first.getUTCDate()}–${fmt(last)}`;
  }
  return `${fmt(first)} – ${fmt(last)}`;
}

function channelPlatformLabel(a: ContentAssetRow): string {
  const labels = [a.channel, a.platform].filter(Boolean);
  if (
    labels.length === 2 &&
    labels[0]?.toLowerCase() === labels[1]?.toLowerCase()
  ) {
    labels.pop();
  }
  return labels.join(" · ");
}

function scheduledTimeLabel(a: ContentAssetRow): string {
  return new Date(a.scheduled_for ?? "").toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Tue 23 Sep, 09:00 · LinkedIn" labels the next piece leaving the bench. */
function nextUpLabel(a: ContentAssetRow): string {
  const when = scheduledTimeLabel(a);
  const where = channelPlatformLabel(a);
  return where ? `${when} · ${where}` : when;
}

/**
 * One entry on the wire. A row links to its workspace or carries a decisive
 * action; the lead entry gets a tinted surface and room for the full summary.
 */
function WireRow({
  wire,
  stamp,
  title,
  subtitle,
  href,
  action,
  lead = false,
}: {
  wire: string;
  stamp: ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  action?: { href: string; label: string; primary?: boolean };
  lead?: boolean;
}) {
  const meta = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="dateline">{wire}</span>
      {stamp}
    </div>
  );

  if (action) {
    return (
      <li
        className={cn(
          lead
            ? "rounded-md bg-secondary/45 px-4 py-4 sm:px-5"
            : "py-3 first:pt-0 last:pb-0"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {meta}
            <p
              className={cn(
                "font-medium",
                lead
                  ? "mt-2 line-clamp-2 text-base leading-snug"
                  : "mt-1 line-clamp-2 text-sm sm:truncate"
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs text-muted-foreground",
                lead ? "line-clamp-2" : "line-clamp-2 sm:truncate"
              )}
            >
              {subtitle}
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant={action.primary ? "default" : "outline"}
            className="shrink-0"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      </li>
    );
  }

  if (href) {
    return (
      <li className="py-3 first:pt-0 last:pb-0">
        <Link href={href} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {meta}
              <p className="mt-1 line-clamp-2 text-sm font-medium group-hover:text-primary group-hover:underline group-hover:underline-offset-2 sm:truncate">
                {title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:truncate">
                {subtitle}
              </p>
            </div>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      {meta}
      <p className="mt-1 truncate text-sm font-medium">{title}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
    </li>
  );
}

/** A labelled block on the wire: dateline head, ledger rows, optional "view all". */
function WireSection({
  label,
  count,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  label: string;
  count: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="dateline">{label}</h3>
        <span className="dateline">{count}</span>
      </div>
      <ul className="ledger mt-3">{children}</ul>
      {viewAllHref && viewAllLabel ? (
        <div className="mt-3 border-t border-border pt-3">
          <Link
            href={viewAllHref}
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline hover:underline-offset-2"
          >
            {viewAllLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

/** A slim module in the assignment rail: ruled header, then body. */
function RailModule({
  title,
  meta,
  flush = false,
  children,
}: {
  title: string;
  meta?: string;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="slip overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        {meta ? <span className="dateline">{meta}</span> : null}
      </div>
      <div className={flush ? "py-2" : "px-5 py-4"}>{children}</div>
    </section>
  );
}

export default async function CommandCentrePage() {
  const orgId = await safe(() => getCallerOrganizationId(), null);

  const now = new Date();
  const todayStr = isoDay(now);
  const in30Str = isoDay(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = startOfWeek(now);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  const [
    pending,
    inReview,
    assets,
    leads,
    scheduled,
    weekItems,
    tasks,
    followups,
    kpis,
    activities,
  ] = await Promise.all([
    safe(
      () =>
        orgId
          ? listInsights(orgId, { status: "PENDING_REVIEW", pageSize: 3 })
          : Promise.resolve(EMPTY_INSIGHTS),
      EMPTY_INSIGHTS
    ),
    safe(
      () =>
        orgId
          ? listAssets(orgId, { status: "review" })
          : Promise.resolve({ assets: [] as ContentAssetRow[], total: 0 }),
      { assets: [] as ContentAssetRow[], total: 0 }
    ),
    safe(
      () =>
        orgId
          ? listAssets(orgId, {})
          : Promise.resolve({ assets: [] as ContentAssetRow[], total: 0 }),
      { assets: [] as ContentAssetRow[], total: 0 }
    ),
    safe(
      () =>
        orgId
          ? listLeads(orgId, { page: 1 })
          : Promise.resolve({ leads: [] as LeadRow[], total: 0 }),
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
      () =>
        orgId
          ? listScheduled(orgId, isoDay(weekDays[0]), isoDay(weekDays[6]))
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
    safe(
      () => (orgId ? listActivities(orgId) : Promise.resolve([])),
      [] as ActivityWithSegment[]
    ),
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

  const weekCells = weekDays.map((d, i) => {
    const key = isoDay(d);
    const count = weekItems.filter(
      (a) => a.scheduled_for?.slice(0, 10) === key
    ).length;
    return { key, label: WEEKDAY_LABELS[i], count, isToday: key === todayStr };
  });
  const todayCount = weekCells.find((c) => c.isToday)?.count ?? 0;
  const nowIso = now.toISOString();
  // listScheduled ordering is not contractual, so sort the future-dated
  // candidates ISO-ascending before taking the soonest.
  const nextUp = scheduled
    .filter((a) => a.scheduled_for && a.scheduled_for >= nowIso)
    .sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""))[0];
  const upcomingContent = scheduled
    .filter(
      (asset) =>
        asset.status === "scheduled" &&
        asset.scheduled_for &&
        asset.scheduled_for >= nowIso
    )
    .sort((a, b) =>
      (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? "")
    )
    .slice(0, 5);
  const recentActivity = activities.slice(0, 4);

  const attentionTotal =
    pending.total + inReview.total + followups.length + tasks.length;
  // followups/tasks are limit-capped queues (5 / 8); flag the wire count as a
  // lower bound when either cap is saturated so the masthead never overstates.
  const attentionCapped = followups.length >= 5 || tasks.length >= 8;

  const tally = [
    { label: "Awaiting decision", value: pending.total + inReview.total },
    { label: "Scheduled · 30d", value: scheduled.length },
    { label: "Leads captured", value: leads.total },
    { label: "Content assets", value: assets.total },
  ];
  const tallyLinks = [
    "/audience/insights?status=PENDING_REVIEW",
    "/library?status=scheduled",
    "/leads",
    "/library",
  ];

  return (
    <div className="command-centre flex flex-1 flex-col gap-6 md:gap-8">
      {/* Masthead */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
          <span className="dateline">
            {todayDateline()} · Week of {weekRangeLabel(weekDays)}
          </span>
          <span className="dateline">AI recommends · Humans decide</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Marketing Command Centre
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Review pending insights, content, and follow-ups. Set the week with
            activity and results in view.
          </p>
        </div>
        {/* Tally strip: gap-px hairlines so the grid rules land exactly between
            cells at every breakpoint (divide-* marks the wrong edges here). */}
        <ul className="grid grid-cols-2 gap-px border-y border-border bg-border sm:grid-cols-4">
          {tally.map((s, i) => (
            <li key={s.label} className="bg-background">
              <Link
                href={tallyLinks[i]}
                className="group flex h-full flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 sm:py-4"
              >
                <span className="dateline flex items-center gap-1.5 group-hover:text-foreground">
                  {i === 0 && s.value > 0 ? (
                    <span className="tab-mark" aria-hidden="true" />
                  ) : null}
                  {s.label}
                </span>
                <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {s.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </header>

      {/* Needs-decision wire desk with assignment rail. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)] xl:gap-6">
        <section className="slip overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              {attentionTotal > 0 ? (
                <span className="tab-mark" aria-hidden="true" />
              ) : null}
              Needs your decision
            </h2>
            <span className="dateline">
              {attentionTotal === 0
                ? "Wire clear"
                : `${attentionTotal}${attentionCapped ? "+" : ""} on the wire`}
            </span>
          </div>
          {attentionTotal === 0 ? (
            <div className="px-5 py-14 text-center sm:px-6">
              <p className="text-sm font-medium">The wire is clear.</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                No approvals, reviews, follow-ups, or open tasks are waiting.
                New signals post here as they arrive.
              </p>
            </div>
          ) : (
            <div className="stagger divide-y divide-border">

              {pending.total > 0 ? (
                <WireSection
                  label="Approvals"
                  count={`${pending.total} awaiting`}
                  viewAllHref={
                    pending.total > pending.insights.length
                      ? "/audience/insights?status=PENDING_REVIEW"
                      : undefined
                  }
                  viewAllLabel="All pending insights"
                >
                  {pending.insights.map((insight, i) => (
                    <WireRow
                      key={insight.id}
                      lead={i === 0}
                      wire={wireLabel(i)}
                      stamp={
                        <>
                          <StatusStamp status={insight.status} />
                          {insight.category ? (
                            <span className="dateline">
                              {insight.category.replace(/_/g, " ")}
                            </span>
                          ) : null}
                        </>
                      }
                      title={insight.summary}
                      subtitle={
                        insight.segment?.name
                          ? `${insight.segment.name} · signal ${insight.signal_strength}`
                          : `Signal strength ${insight.signal_strength}`
                      }
                      action={{
                        href: "/audience/insights?status=PENDING_REVIEW",
                        label: "Review",
                        primary: i === 0,
                      }}
                    />
                  ))}
                </WireSection>
              ) : null}

              {inReview.total > 0 ? (
                <WireSection
                  label="Content in review"
                  count={`${inReview.total} to check`}
                  viewAllHref={
                    inReview.total > Math.min(inReview.assets.length, 5)
                      ? "/library?status=review"
                      : undefined
                  }
                  viewAllLabel="All content in review"
                >
                  {inReview.assets.slice(0, 5).map((asset, i) => (
                    <WireRow
                      key={asset.id}
                      lead={pending.total === 0 && i === 0}
                      wire={wireLabel(i)}
                      stamp={
                        <>
                          <StatusStamp status={asset.status} />
                          {asset.channel ? (
                            <span className="dateline">{asset.channel}</span>
                          ) : null}
                        </>
                      }
                      title={asset.title}
                      subtitle={
                        channelPlatformLabel(asset) || "Draft awaiting review"
                      }
                      action={{
                        href: "/library?status=review",
                        label: "Open",
                        primary: pending.total === 0 && i === 0,
                      }}
                    />
                  ))}
                </WireSection>
              ) : null}

              {followups.length > 0 ? (
                <WireSection
                  label="Follow-up queue"
                  count={`${followups.length}${
                    followups.length >= 5 ? "+" : ""
                  } leads`}
                  viewAllHref="/leads"
                  viewAllLabel="All leads"
                >
                  {followups.map((lead, i) => (
                    <WireRow
                      key={lead.id}
                      wire={wireLabel(i)}
                      href="/leads"
                      stamp={
                        <>
                          <StatusStamp status={lead.funnel_stage} />
                          <span className="dateline">
                            Score {lead.score ?? "Not scored"}
                          </span>
                        </>
                      }
                      title={lead.name || lead.email || "Unnamed lead"}
                      subtitle={
                        [lead.interest, lead.source_platform]
                          .filter(Boolean)
                          .join(" · ") || "Awaiting first contact"
                      }
                    />
                  ))}
                </WireSection>
              ) : null}

              {tasks.length > 0 ? (
                <WireSection
                  label="Open tasks"
                  count={`${tasks.length}${tasks.length >= 8 ? "+" : ""} queued`}
                >
                  {tasks.map((task, i) => (
                    <WireRow
                      key={task.id}
                      wire={wireLabel(i)}
                      href={
                        task.insight_id
                          ? "/audience/insights?status=PENDING_REVIEW"
                          : "/audience/insights"
                      }
                      stamp={
                        <>
                          {task.insight_status ? (
                            <StatusStamp status={task.insight_status} />
                          ) : null}
                          <span className="dateline">{task.type}</span>
                        </>
                      }
                      title={task.title}
                      subtitle={`Opened ${formatDay(task.created_at)}`}
                    />
                  ))}
                </WireSection>
              ) : null}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <RailModule title="This week" meta={weekRangeLabel(weekDays)}>
            <div className="grid grid-cols-7 gap-1.5">
              {weekCells.map((cell) => (
                <div
                  key={cell.key}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center",
                    cell.isToday
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                  aria-current={cell.isToday ? "date" : undefined}
                >
                  <span className={cn("dateline", cell.isToday && "text-primary")}>
                    {cell.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      cell.count === 0 && "text-muted-foreground/50"
                    )}
                  >
                    {cell.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="ledger mt-4 text-sm">
              <div className="flex items-center justify-between py-2 first:pt-0">
                <span className="text-muted-foreground">Leaving today</span>
                <span className="font-semibold tabular-nums">{todayCount}</span>
              </div>
              <div className="flex items-start justify-between gap-3 py-2 last:pb-0">
                <span className="text-muted-foreground">Next up</span>
                <span className="max-w-[62%] text-right font-medium">
                  {nextUp ? nextUpLabel(nextUp) : "Nothing scheduled"}
                </span>
              </div>
            </div>
          </RailModule>

          <RailModule title="Content mix" meta={`${assets.total} assets`} flush>
            {channelMix.length > 0 ? (
              <ShareBarList>
                {channelMix.map((c) => (
                  <ShareBarListItem key={c.channel} value={c.share}>
                    <ShareBarListFill />
                    <ShareBarListContent>
                      <ShareBarListLabel>{c.channel}</ShareBarListLabel>
                      <ShareBarListValue>
                        {c.count} · {c.share}%
                      </ShareBarListValue>
                    </ShareBarListContent>
                  </ShareBarListItem>
                ))}
              </ShareBarList>
            ) : (
              <p className="px-5 py-6 text-center text-xs text-muted-foreground">
                No content assets yet. Drafts you create chart their channel
                mix here.
              </p>
            )}
          </RailModule>
        </aside>
      </div>

      {/* Scheduled content table adapts the registry's dense records panel to
          the live publishing queue instead of its sample invoices. */}
      <section className="slip overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-bold tracking-tight">
              Scheduled content
            </h2>
            <span className="dateline">Next 30 days</span>
          </div>
          <Link
            href="/library?status=scheduled"
            className="text-xs font-semibold text-primary hover:underline hover:underline-offset-2"
          >
            Open content library
          </Link>
        </div>
        {upcomingContent.length > 0 ? (
          <>
            <ul className="ledger px-5 lg:hidden">
              {upcomingContent.map((asset) => (
                <li key={asset.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/library/${asset.id}`}
                    className="group block"
                  >
                    <span className="line-clamp-2 text-sm font-medium group-hover:text-primary group-hover:underline group-hover:underline-offset-2">
                      {asset.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{channelPlatformLabel(asset) || "Unassigned"}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {asset.scheduled_for
                          ? scheduledTimeLabel(asset)
                          : "Time not set"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-5 sm:ps-6">Content</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="pe-5 text-right sm:pe-6">
                      Scheduled for
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingContent.map((asset) => (
                    <TableRow key={asset.id} className="h-12">
                      <TableCell className="max-w-0 ps-5 font-medium sm:ps-6">
                        <Link
                          href={`/library/${asset.id}`}
                          className="block truncate hover:text-primary hover:underline hover:underline-offset-2"
                        >
                          {asset.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {channelPlatformLabel(asset) || "Unassigned"}
                      </TableCell>
                      <TableCell className="pe-5 text-right tabular-nums text-muted-foreground sm:pe-6">
                        {asset.scheduled_for
                          ? scheduledTimeLabel(asset)
                          : "Time not set"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="px-5 py-7 text-center text-xs text-muted-foreground">
            No content is scheduled in the next 30 days.
          </p>
        )}
      </section>

      {/* Learning loop connects activity inputs with outcome measures. */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-4">
          <h2 className="text-lg font-bold tracking-tight">The learning loop</h2>
          <span className="dateline">
            Activities become insights · your decisions set the targets
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
          <section className="slip overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-bold tracking-tight">
                Recent activity
              </h3>
              <span className="dateline">Inputs</span>
            </div>
            <div className="px-5 py-4">
              {recentActivity.length > 0 ? (
                <ul className="ledger">

                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href="/activities" className="group block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="dateline">
                              {activity.source_type}
                            </span>
                            <p className="mt-1 line-clamp-2 text-sm font-medium group-hover:text-primary group-hover:underline group-hover:underline-offset-2 sm:truncate">
                              {activity.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:truncate">
                              {activity.segment?.name
                                ? `${activity.segment.name} · ${formatDay(activity.event_date ?? activity.created_at)}`
                                : formatDay(activity.event_date ?? activity.created_at)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Log your first activity to start the loop. Events feed the
                  segments that generate insights.
                </p>
              )}
            </div>
          </section>
          <section className="slip overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-bold tracking-tight">KPI progress</h3>
              <span className="dateline">Outcomes</span>
            </div>
            <div className="py-2">
              {kpis.length > 0 ? (
                <ShareBarList>
                  {kpis.map((kpi) => {
                    const pct = Math.round((kpi.fraction ?? 0) * 100);
                    const state =
                      kpi.current === null || kpi.current <= 0
                        ? { label: "collecting", variant: "idea" as const }
                        : pct >= 80
                          ? { label: "on track", variant: "approved" as const }
                          : { label: "at risk", variant: "warm" as const };
                    return (
                      <ShareBarListItem
                        key={kpi.id}
                        value={pct}
                        className="h-auto min-h-12 items-start py-2 sm:items-center"
                      >
                        <ShareBarListFill />
                        <ShareBarListContent className="flex-col items-stretch gap-1 md:flex-row md:items-center">
                          <ShareBarListLabel className="min-w-0">
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              {kpi.name}
                              <StatusStamp variant={state.variant}>
                                {state.label}
                              </StatusStamp>
                            </span>
                          </ShareBarListLabel>
                          <ShareBarListValue className="w-full whitespace-normal break-words md:w-auto md:text-right">
                            {kpi.current === null
                              ? `Not measured · target ${kpi.target_value} ${kpi.unit}`
                              : `${kpi.current}/${kpi.target_value} ${kpi.unit}`}
                          </ShareBarListValue>
                        </ShareBarListContent>
                      </ShareBarListItem>
                    );
                  })}
                </ShareBarList>
              ) : (
                <p className="px-5 py-6 text-center text-xs text-muted-foreground">
                  No KPIs defined yet. Set targets and approved insights track
                  against them here.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
