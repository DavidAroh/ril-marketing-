import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listInsights } from "@/lib/audience/insights";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStamp } from "@/components/ui/status-stamp";
import { InsightActions } from "@/components/audience/insight-actions";
import { todayDateline, wireLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Audience Insights" };

const STATUSES = ["all", "PENDING_REVIEW", "APPROVED", "SUPPRESSED"] as const;
const LABELS: Record<string, string> = {
  all: "All",
  PENDING_REVIEW: "Pending",
  APPROVED: "Approved",
  SUPPRESSED: "Suppressed",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as string)
    : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const orgId = await getCallerOrganizationId().catch(() => null);
  const result = orgId
    ? await listInsights(orgId, { status, page }).catch(() => ({
        insights: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }))
    : { insights: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };

  const tabHref = (s: string) =>
    s === "all" ? "/audience/insights" : `/audience/insights?status=${s}`;

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/audience/insights${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="dateline">
          {todayDateline()} · {result.total} findings
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Audience Insights
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          AI recommends, humans decide. Only approved insights reach
          recommendations, drafts, and reports — suppressed ones never return.
        </p>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] transition-colors",
              status === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {LABELS[s]}
          </Link>
        ))}
      </nav>

      {result.insights.length === 0 ? (
        <EmptyState
          title="No insights yet"
          description={
            status === "all"
              ? "Insights appear after the audience-analysis pass runs over your engagement, registration, and conversion data."
              : "Nothing with this status right now."
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {result.insights.map((ins, i) => (
            <li key={ins.id} className="slip flex flex-col gap-3 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="dateline">{wireLabel(i)}</span>
                <StatusStamp status={ins.status} />
                <span className="dateline">
                  {ins.category.replace(/_/g, " ")}
                </span>
                <span className="dateline ml-auto tabular-nums">
                  Confidence {Math.round(ins.confidence_score * 100)}% · n=
                  {ins.sample_size}
                </span>
              </div>
              <div>
                <Link
                  href={`/audience/insights/${ins.id}`}
                  className="text-sm font-medium leading-6 text-foreground transition-colors hover:text-primary"
                >
                  {ins.summary}
                </Link>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {ins.recommendation}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Segment: {ins.segment?.name ?? "—"} · Signal:{" "}
                  {ins.signal_strength.toLowerCase()}
                  {ins.status === "SUPPRESSED" && ins.suppression_reason
                    ? ` · Reason: ${ins.suppression_reason}`
                    : ""}
                </span>
                {ins.status === "PENDING_REVIEW" ? (
                  <InsightActions insightId={ins.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className="inline-block py-1 font-medium text-primary">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="dateline tabular-nums">
            Page {result.page} / {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link href={pageHref(result.page + 1)} className="inline-block py-1 font-medium text-primary">
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
