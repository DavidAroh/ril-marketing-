import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedLandingPage } from "@/lib/landing-pages";
import { LeadCaptureForm } from "@/components/landing-pages/lead-capture-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedLandingPage(slug).catch(() => null);
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    description: page.meta_description || page.headline,
    alternates: { canonical: `/p/${page.slug}` },
    robots: { index: true, follow: true },
    openGraph: { title: page.title, description: page.meta_description || page.headline, type: "website", url: `/p/${page.slug}` },
    twitter: { card: "summary", title: page.title, description: page.meta_description || page.headline },
  };
}

export default async function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedLandingPage(slug).catch(() => null);
  if (!page) notFound();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-border px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Renaissance Innovation Labs home"><img src="/logo/blackLogo.svg" alt="Renaissance Innovation Labs" width="220" height="48" className="h-9 w-auto dark:hidden" /><img src="/logo/whiteLogo.svg" alt="Renaissance Innovation Labs" width="220" height="48" className="hidden h-9 w-auto dark:block" /></Link>
        <span className="dateline">Renaissance Innovation Labs</span>
      </header>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <article className="max-w-3xl">
          <p className="dateline">{page.title}</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">{page.headline}</h1>
          {page.body ? <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-muted-foreground sm:text-lg">{page.body}</div> : null}
          {page.registration_url ? <a href={page.registration_url} target="_blank" rel="noreferrer" className="mt-8 inline-flex border-b border-primary pb-1 text-sm font-semibold text-primary">More about this opportunity ↗</a> : null}
        </article>
        <aside className="h-fit border border-border bg-card p-5 sm:p-7">
          <p className="dateline">Get in touch</p>
          <h2 className="mt-1 text-xl font-bold">{page.cta_label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Share your details and the RIL team can follow up.</p>
          <div className="mt-5"><LeadCaptureForm page={page} slug={page.slug} /></div>
        </aside>
      </div>
      <footer className="mx-auto max-w-6xl border-t border-border px-5 py-5 text-xs text-muted-foreground sm:px-8">Renaissance Innovation Labs</footer>
    </main>
  );
}
