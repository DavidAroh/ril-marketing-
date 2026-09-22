import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

const faqs = [
  {
    q: "Does the AI publish anything on its own?",
    a: "Never. Drafts wait in review, and only assets a human marks Approved can move to scheduling and publishing.",
  },
  {
    q: "Which channels can we publish to?",
    a: "LinkedIn, Instagram, X, and YouTube through Buffer; email through a dedicated provider; paid performance through the Meta, Google, and LinkedIn Ads integrations.",
  },
  {
    q: "Do we need our own AI key?",
    a: "No. Template mode works without one. Bring your own OpenAI, Anthropic, or Gemini key to unlock full generation.",
  },
  {
    q: "Is our data used to train AI models?",
    a: "No. Your leads, partner details, and internal data are only ever used for the current request — never for third-party model training.",
  },
  {
    q: "Who sees our workspace data?",
    a: "Only your team. Every organisation is isolated at the database level, with roles for marketing, leadership, and admins.",
  },
  {
    q: "What happens to content we reject?",
    a: "Suppressed insights stay on the bench and never reach recommendations, drafts, calendar entries, or reports.",
  },
] as const;

export function Faq() {
  return (
    <section
      aria-labelledby="faq-heading"
      id="faq"
      className="border-t border-border"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:px-8 sm:py-24 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <h2
            id="faq-heading"
            className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:sticky lg:top-24"
          >
            Asked before you ask.
          </h2>
        </Reveal>
        <div className="lg:col-span-8">
          <div className="border-t border-border">
            {faqs.map((item, i) => (
              <Reveal key={item.q} delay={i * 40}>
                <details className="group border-b border-border py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base font-bold leading-snug text-foreground [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-2xl font-medium leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[64ch] text-[15px] leading-7 text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </section>
  );
}

export function CloseCta() {
  return (
    <section aria-labelledby="close-heading" className="bg-primary text-primary-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center sm:px-8 sm:py-24">
        <Reveal>
          <h2
            id="close-heading"
            className="mx-auto max-w-[18ch] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Your next event is a campaign waiting to happen.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-8 text-primary-foreground/80">
            Start a workspace, invite your approvers, and let only stamped
            intelligence reach your audience.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="group inline-flex h-12 items-center gap-2 rounded-md bg-white px-8 text-base font-semibold text-[hsl(var(--ril-blue-deep))] transition-colors duration-200 hover:bg-white/90"
            >
              Start your workspace
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center rounded-md border border-white/40 px-8 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </Reveal>
        <Reveal delay={210}>
          <p className="mt-5 text-sm text-primary-foreground/70">
            No credit card required. One email and a minute is enough.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const pageLinks = [
  { href: "#platform", label: "Platform" },
  { href: "#workflow", label: "Workflow" },
  { href: "#learning", label: "Learning" },
  { href: "#faq", label: "FAQ" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border" aria-label="Footer">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-10 sm:flex-row sm:items-start">
          <div className="max-w-[42ch]">
            <Link href="/" aria-label="Renaissance Innovation Labs home" className="inline-flex">
              <Image
                src="/logo/blackLogo.svg"
                alt="Renaissance Innovation Labs"
                width={120}
                height={28}
                className="h-auto w-[120px] max-w-none"
                style={{ height: "28px", width: "auto" }}
              />
            </Link>
            <p className="mt-5 text-lg font-bold tracking-tight text-foreground">
              One event in. A whole campaign out.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Built in Port Harcourt, Nigeria, in the open lab spirit:
              collaboration, community, and trust.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-14 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>
              {pageLinks.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Elsewhere
              </p>
              <Link
                href="/sign-in"
                className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Get started
              </Link>
              <Link
                href="https://www.renaissancelabs.org"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                renaissancelabs.org
              </Link>
              <Link
                href="https://www.twitter.com/RxlabsHQ"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                X (Twitter)
              </Link>
              <Link
                href="https://www.instagram.com/RxlabsHQ"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Instagram
              </Link>
            </div>
          </nav>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            © {new Date().getFullYear()} Renaissance Innovation Labs
          </p>
          <Link href="#main" className="text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground">
            Back to top ↑
          </Link>
        </div>
      </div>
    </footer>
  );
}
