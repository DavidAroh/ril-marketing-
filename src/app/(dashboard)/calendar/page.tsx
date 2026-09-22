import type { Metadata } from "next";
import Link from "next/link";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listScheduled } from "@/lib/content/assets";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStamp } from "@/components/ui/status-stamp";

export const metadata: Metadata = { title: "Content Calendar" };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.m && MONTH_RE.test(sp.m) ? sp.m : monthKey(new Date());

  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1).toISOString();
  const to = new Date(y, m, 0, 23, 59, 59, 999).toISOString();

  const orgId = await getCallerOrganizationId().catch(() => null);
  const rows = orgId
    ? await listScheduled(orgId, from, to).catch(() => [] as Awaited<ReturnType<typeof listScheduled>>)
    : [];

  // Group by calendar day, day-first.
  const byDay = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.scheduled_for) continue;
    const day = row.scheduled_for.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  const dayLabel = (isoDay: string) => {
    const d = new Date(`${isoDay}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dateline">Scheduled & published</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
            Content Calendar
          </h1>
          <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
            Every approved asset with a date, in the order it goes out.
          </p>
        </div>
        <nav aria-label="Month" className="flex items-center gap-1">
          <Link
            href={`/calendar?m=${prev}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            aria-label="Previous month"
          >
            ←
          </Link>
          <span className="min-w-[10ch] px-2 text-center text-sm font-semibold">
            {monthLabel(month)}
          </span>
          <Link
            href={`/calendar?m=${next}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            aria-label="Next month"
          >
            →
          </Link>
        </nav>
      </div>

      {days.length === 0 ? (
        <EmptyState
          title="Nothing scheduled this month"
          description="Approved assets with a publish date land here. Move an asset to Scheduled from the library to see it on the calendar."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(([day, items]) => (
            <section key={day} aria-label={dayLabel(day)}>
              <p className="dateline mb-2">{dayLabel(day)}</p>
              <ul className="ledger slip divide-y divide-border overflow-hidden">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusStamp status={a.status} />
                        <span className="dateline">
                          {[a.channel, a.platform].filter(Boolean).join(" · ") ||
                            "No channel"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {a.title}
                      </p>
                    </div>
                    <span className="dateline shrink-0 tabular-nums">
                      {a.scheduled_for ? formatTime(a.scheduled_for) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
