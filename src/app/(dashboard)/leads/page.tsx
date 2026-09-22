import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listLeads } from "@/lib/leads/leads";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStamp } from "@/components/ui/status-stamp";
import { formatDay, todayDateline, wireLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Leads" };

const STAGES = [
  "all",
  "awareness",
  "engagement",
  "captured",
  "nurturing",
  "converted",
  "retention",
] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const stage = (STAGES as readonly string[]).includes(sp.stage ?? "")
    ? (sp.stage as string)
    : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const orgId = await getCallerOrganizationId().catch(() => null);
  const result = orgId
    ? await listLeads(orgId, { stage, page }).catch(() => ({ leads: [], total: 0 }))
    : { leads: [], total: 0 };

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  const stageHref = (s: string) =>
    s === "all" ? "/leads" : `/leads?stage=${encodeURIComponent(s)}`;

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (stage !== "all") params.set("stage", stage);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="dateline">
          {todayDateline()} · {result.total} leads
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Leads
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          Every lead RIL&apos;s marketing generates, its funnel stage, and an
          explainable score — Awareness → Engagement → Lead Capture → Nurturing
          → Conversion → Retention.
        </p>
      </div>

      <nav aria-label="Filter by stage" className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Link
            key={s}
            href={stageHref(s)}
            aria-current={stage === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] transition-colors",
              stage === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "all" ? "All" : s}
          </Link>
        ))}
      </nav>

      {result.leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description={
            stage === "all"
              ? "Leads land here from landing pages, registration links, email campaigns, and manual entry."
              : "No leads in this stage right now."
          }
        />
      ) : (
        <ul className="ledger slip divide-y divide-border overflow-hidden">
          {result.leads.map((l, i) => (
            <li
              key={l.id}
              className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="dateline">{wireLabel(i)}</span>
                  <StatusStamp variant="scheduled">{l.funnel_stage}</StatusStamp>
                  {l.is_qualified ? <StatusStamp status="qualified" /> : null}
                  {l.is_converted ? <StatusStamp status="converted" /> : null}
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                  {l.name || l.email || "Unnamed lead"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[l.organisation, l.email, l.interest].filter(Boolean).join(" · ") ||
                    "No details recorded"}
                </p>
                {l.score_reason ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Why: {l.score_reason}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <span className="dateline block tabular-nums">
                  {formatDay(l.created_at)}
                </span>
                {l.score ? (
                  <span className="mt-1 block text-sm font-bold tabular-nums text-foreground">
                    {l.score}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-medium text-primary">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="dateline tabular-nums">
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="font-medium text-primary">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
