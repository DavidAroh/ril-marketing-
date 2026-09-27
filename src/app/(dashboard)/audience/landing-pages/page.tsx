import type { Metadata } from "next";
import Link from "next/link";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listLandingPages } from "@/lib/landing-pages";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStamp } from "@/components/ui/status-stamp";
import { todayDateline } from "@/lib/format";
import { z } from "zod";

export const metadata: Metadata = { title: "Landing Pages" };

export default async function LandingPagesPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const search = await searchParams;
  const campaignId = z.string().uuid().safeParse(search.campaign).success ? search.campaign : undefined;
  const organizationId = await getCallerOrganizationId().catch(() => null);
  const pages = organizationId ? await listLandingPages(organizationId, campaignId).catch(() => []) : [];
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="dateline">{todayDateline()} · {pages.length} pages</p><h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Landing Pages</h1><p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">Create campaign pages, review them with a second approver, then capture attributable leads.{campaignId ? " Showing this campaign’s pages." : ""}</p></div>
        <Button asChild><Link href="/audience/landing-pages/new">Create landing page</Link></Button>
      </header>
      {pages.length ? (
        <ul className="ledger slip divide-y divide-border overflow-hidden">{pages.map((page) => <li key={page.id}><Link href={`/audience/landing-pages/${page.id}`} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/40 sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusStamp status={page.status} /><span className="dateline">/p/{page.slug}</span></div><h2 className="mt-1.5 truncate text-sm font-semibold">{page.title}</h2><p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{page.headline}</p></div><span className="dateline shrink-0">Open</span></Link></li>)}</ul>
      ) : <EmptyState title="No landing pages yet" description="Build a focused page for an activity or campaign. The public form will capture interest and record campaign attribution." action={{ label: "Create landing page", href: "/audience/landing-pages/new" }} />}
    </div>
  );
}
