import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listAssets } from "@/lib/content/assets";
import { ASSET_STATUSES } from "@/lib/content/transitions";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStamp } from "@/components/ui/status-stamp";
import { formatDay, todayDateline, wireLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Content Library" };

const VALID_STATUSES = new Set<string>(["all", ...ASSET_STATUSES]);

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && VALID_STATUSES.has(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const orgId = await getCallerOrganizationId().catch(() => null);
  const result = orgId
    ? await listAssets(orgId, { status, page }).catch(() => ({ assets: [], total: 0 }))
    : { assets: [], total: 0 };

  const totalPages = Math.max(1, Math.ceil(result.total / 20));
  const filters = ["all", ...ASSET_STATUSES] as const;

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/library${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="dateline">
          {todayDateline()} · {result.total} assets
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Content Library
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          Every draft, approval, and published piece — each stamped with its
          stage in the pipeline: Idea → AI Generated → Editing → Review →
          Approved → Scheduled → Published → Analysing.
        </p>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/library" : `/library?status=${f}`}
            aria-current={status === f ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] transition-colors",
              status === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f.replace(/_/g, " ")}
          </Link>
        ))}
      </nav>

      {result.assets.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={
            status === "all"
              ? "Assets appear once you generate content from an activity or create one manually."
              : "No assets match this filter. Try another stage."
          }
        />
      ) : (
        <ul className="ledger slip divide-y divide-border overflow-hidden">
          {result.assets.map((a, i) => (
            <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="dateline">{wireLabel(i)}</span>
                  <StatusStamp status={a.status} />
                  {a.sensitivity === "high" ? (
                    <span className="rounded-md border border-destructive bg-destructive/5 px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-destructive">
                      High sensitivity
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                  {a.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[a.channel, a.platform, a.format].filter(Boolean).join(" · ") ||
                    "No channel set"}
                </p>
              </div>
              <span className="dateline shrink-0 tabular-nums">
                {formatDay(a.scheduled_for ?? a.published_at ?? a.created_at)}
              </span>
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
