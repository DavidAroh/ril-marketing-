import type { Metadata } from "next";
import Link from "next/link";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listActivities } from "@/lib/content/activities";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatDay, todayDateline, wireLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage() {
  const orgId = await getCallerOrganizationId().catch(() => null);
  const activities = orgId
    ? await listActivities(orgId).catch(() => [] as Awaited<ReturnType<typeof listActivities>>)
    : [];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dateline">
            {todayDateline()} · {activities.length} logged
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
            Activities
          </h1>
          <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
            Everything happening at RIL — the source record every asset, campaign,
            and lead traces back to.
          </p>
        </div>
        <Button asChild>
          <Link href="/activities/new">Log activity</Link>
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title="No activities yet"
          description="Log your first program, event, workshop, or partnership so AI can start turning it into marketing content."
        />
      ) : (
        <ul className="ledger slip divide-y divide-border overflow-hidden">
          {activities.map((a, i) => (
            <li key={a.id}>
              <Link
                href={`/activities/${a.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 sm:px-6"
              >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="dateline">{wireLabel(i)}</span>
                  {a.segment ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                      {a.segment.name}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                  {a.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {a.description || "No description yet."}
                </p>
                {(a.speakers?.length > 0 || a.partners?.length > 0) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[a.speakers?.length ? `${a.speakers.length} speakers` : "", a.partners?.length ? `${a.partners.length} partners` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <span className="dateline shrink-0 tabular-nums">
                {formatDay(a.event_date ?? a.created_at)}
              </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
