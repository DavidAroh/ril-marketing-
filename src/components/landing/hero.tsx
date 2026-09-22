import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

const queueRows = [
  {
    title: "Bootcamp finale draws first-time founders",
    detail: "Spotted across 2 segments · Waiting for your call",
    stamp: "Pending review",
    tone: "pending" as const,
  },
  {
    title: "Alumni stories convert on registration links",
    detail: "Approved and cleared for repurposing",
    stamp: "Approved",
    tone: "approved" as const,
  },
  {
    title: "Hype spike with no retention behind it",
    detail: "Suppressed · Never recommended",
    stamp: "Suppressed",
    tone: "suppressed" as const,
  },
];

function Stamp({ tone, label }: { tone: "pending" | "approved" | "suppressed"; label: string }) {
  if (tone === "approved") {
    return (
      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
        <span className="size-2 bg-primary" aria-hidden />
        {label}
      </span>
    );
  }
  if (tone === "pending") {
    return (
      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground">
        <span className="size-2 border border-foreground" aria-hidden />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
      <span className="size-2 bg-muted-foreground/40" aria-hidden />
      {label}
    </span>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="landing-title" className="relative overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--primary) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 75% 0%, black 15%, transparent 60%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 75% 0%, black 15%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:px-8 sm:pt-24">
        <div className="max-w-3xl">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              RIL · AI Marketing Operating System
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              id="landing-title"
              className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              One event in.
              <span className="block text-primary">A whole campaign out.</span>
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-6 max-w-[52ch] text-lg leading-8 text-muted-foreground">
              RIL&apos;s marketing operating system turns what&apos;s happening
              across our programs into on-brand content, scheduled posts,
              emails, and leads — with a human approving everything that
              matters.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="group inline-flex h-12 items-center gap-2 rounded-md bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors duration-200 hover:bg-[hsl(var(--ril-blue-deep))]"
              >
                Start your workspace
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center rounded-md border border-input px-7 text-base font-semibold text-foreground transition-colors duration-200 hover:bg-secondary"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <li>Approval gate on everything</li>
              <li>Your data stays isolated</li>
              <li>Works with or without an AI key</li>
            </ul>
          </Reveal>
        </div>

        <Reveal delay={200} className="mt-14">
          <div className="grid gap-6 lg:grid-cols-12">
            <article
              aria-label="Synthetic approval queue preview"
              className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_48px_-24px_hsl(211_82%_49%_/_0.25)] lg:col-span-8"
            >
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Review queue
                </p>
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-primary"
                    aria-hidden
                  />
                  Synthetic demo
                </span>
              </div>
              <ul>
                {queueRows.map((row) => (
                  <li
                    key={row.title}
                    className="border-b border-border px-5 py-5 last:border-0 sm:px-6"
                  >
                    <p className="text-sm font-semibold leading-5 text-foreground">
                      {row.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {row.detail}
                    </p>
                    <div className="mt-3">
                      <Stamp tone={row.tone} label={row.stamp} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
            <aside className="flex flex-col justify-between gap-6 rounded-xl bg-primary p-6 text-primary-foreground sm:p-7 lg:col-span-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground/70">
                  The whole loop
                </p>
                <p className="mt-4 text-2xl font-bold leading-snug tracking-tight">
                  Log it once.
                  <br />
                  Use it everywhere.
                </p>
                <p className="mt-3 text-sm leading-6 text-primary-foreground/80">
                  One activity becomes blogs, newsletters, clips, posts,
                  emails, landing pages — and the leads they bring back.
                </p>
              </div>
              <Link
                href="#platform"
                className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[hsl(var(--ril-blue-deep))] transition-colors duration-200 hover:bg-white/90"
              >
                See the platform
              </Link>
            </aside>
          </div>
          <p className="mt-4 max-w-[60ch] text-xs leading-5 text-muted-foreground">
            Synthetic demo trays. Your activities, queue, and counts appear
            here live after sign in.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
