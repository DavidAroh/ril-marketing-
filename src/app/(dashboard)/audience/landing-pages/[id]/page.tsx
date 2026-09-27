import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getLandingPage, getLandingPageOptions } from "@/lib/landing-pages";
import { getUserRole } from "@/lib/audience/access";
import { LandingPageForm } from "@/components/landing-pages/landing-page-form";
import { LandingPageStatus } from "@/components/landing-pages/landing-page-status";
import { StatusStamp } from "@/components/ui/status-stamp";

export const metadata: Metadata = { title: "Landing page review" };

export default async function LandingPageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await getCallerOrganizationId();
  if (!organizationId) notFound();
  const page = await getLandingPage(organizationId, id);
  if (!page) notFound();
  const [options, role] = await Promise.all([
    getLandingPageOptions(organizationId).catch(() => ({ campaigns: [], activities: [], segments: [] })),
    getUserRole(organizationId),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 md:gap-6">
      <header><Link href="/audience/landing-pages" className="dateline hover:text-foreground">← Landing Pages</Link><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{page.title}</h1><StatusStamp status={page.status} /></div><p className="mt-1 text-sm text-muted-foreground">Public route: /p/{page.slug}</p></header>
      {page.status === "published" || page.status === "paused" ? <p className="text-sm">{page.status === "published" ? <Link href={`/p/${page.slug}`} target="_blank" className="text-primary hover:underline">View published page ↗</Link> : "This page is not public while paused."}</p> : null}
      <section className="slip flex flex-col gap-3 p-5 sm:p-6"><div><p className="dateline">Human approval</p><h2 className="mt-1 text-base font-bold">Page status</h2></div><LandingPageStatus pageId={page.id} status={page.status} />{page.status === "review" && role ? <p className="text-xs text-muted-foreground">The author cannot approve their own page.</p> : null}</section>
      {page.status === "draft" ? <LandingPageForm page={page} {...options} /> : <section className="slip flex flex-col gap-3 p-5 sm:p-6"><div><p className="dateline">Public copy</p><h2 className="mt-1 text-base font-bold">{page.headline}</h2></div><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{page.body || "No page copy supplied."}</p><p className="dateline">Button · {page.cta_label}</p></section>}
    </div>
  );
}
