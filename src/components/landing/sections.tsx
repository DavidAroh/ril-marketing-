import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  Link2,
  Mail,
  RefreshCw,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { Reveal } from "./reveal";

const flow = [
  { n: "01", title: "Log the activity", body: "Programs and partnerships log what's happening — once." },
  { n: "02", title: "AI understands it", body: "Topics, quotes, angles, and audiences, surfaced automatically." },
  { n: "03", title: "Repurpose everything", body: "Blogs, newsletters, clips, captions, and posts from one source." },
  { n: "04", title: "You approve", body: "Edit, approve, or suppress. Nothing moves without a stamp." },
  { n: "05", title: "Publish and capture", body: "Scheduled posts, emails, pages — every signup traced to its asset." },
  { n: "06", title: "Learn and repeat", body: "Performance becomes the next round of recommendations." },
] as const;

const modules = [
  {
    icon: LayoutDashboard,
    title: "Command Centre",
    body: "One live view of campaigns, approvals, leads, and tasks. The answer to “what's happening?”",
  },
  {
    icon: CalendarPlus,
    title: "Activity Hub",
    body: "Every program, event, and partnership logged once — the source everything else builds on.",
  },
  {
    icon: RefreshCw,
    title: "Repurposing Engine",
    body: "Video, audio, images, and docs become blogs, newsletters, shorts, and social drafts.",
  },
  {
    icon: Send,
    title: "Social & Publishing",
    body: "Platform-adapted posts, approved once, published everywhere through Buffer.",
  },
  {
    icon: CalendarDays,
    title: "Content Calendar",
    body: "Every draft, approval, and scheduled post in one view — plus an AI that proposes the plan.",
  },
  {
    icon: Mail,
    title: "Email Marketing",
    body: "Newsletters, campaigns, and nurture sequences built from approved content.",
  },
  {
    icon: Users,
    title: "Leads & CRM",
    body: "Capture, score, and follow up every lead in one record, stage by stage.",
  },
  {
    icon: Link2,
    title: "Registration Links",
    body: "A unique tracked link per asset — know exactly what drove each signup.",
  },
  {
    icon: TrendingUp,
    title: "Trends to Content",
    body: "Industry signals turned into timely drafts. Unverified claims never ship as fact.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    body: "Real counts plus AI-written narratives of what worked, what didn't, and what's next.",
  },
] as const;

const pipeline = [
  "Idea",
  "AI Generated",
  "Editing",
  "Review",
  "Approved",
  "Scheduled",
  "Published",
  "Analysing",
] as const;

const aiCan = [
  "Generate, summarise, and repurpose",
  "Recommend, analyse, and classify",
  "Suggest, draft, and detect",
  "Score leads and flag trends",
];
const humanMust = [
  "Major public announcements",
  "Partnership communications",
  "Sensitive or crisis responses",
  "Paid advertising budgets",
  "Important emails and strategy",
];

const learnings = [
  "Which topics move each audience segment",
  "Which formats drive registrations, not just impressions",
  "Which channels bring the highest-quality leads",
  "Which hooks and CTAs actually get action",
] as const;

export function FlowStrip() {
  return (
    <section aria-labelledby="flow-heading" className="border-y border-border bg-secondary/50">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <h2
            id="flow-heading"
            className="max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            Never describe the same activity twice.
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {flow.map((s, i) => (
            <Reveal key={s.n} delay={i * 70} as="li">
              <div className="flex gap-4">
                <span className="text-sm font-extrabold tabular-nums text-primary">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Modules() {
  return (
    <section
      aria-labelledby="platform-heading"
      id="platform"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16 sm:px-8 sm:py-24"
    >
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          The platform
        </p>
      </Reveal>
      <Reveal delay={70}>
        <h2
          id="platform-heading"
          className="mt-4 max-w-[22ch] text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl"
        >
          Ten modules. One shared source of truth.
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-4 max-w-[58ch] text-base leading-7 text-muted-foreground">
          Content, publishing, email, leads, and analytics stop living in
          disconnected tools. Every module reads from — and writes back to —
          the same activity record.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m, i) => (
          <Reveal key={m.title} delay={(i % 3) * 70}>
            <article className="slip flex h-full flex-col gap-3 p-6">
              <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary">
                <m.icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-base font-bold text-foreground">{m.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{m.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Approval() {
  return (
    <section
      aria-labelledby="workflow-heading"
      id="workflow"
      className="bg-primary text-primary-foreground"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
            The workflow
          </p>
        </Reveal>
        <Reveal delay={70}>
          <h2
            id="workflow-heading"
            className="mt-4 max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
          >
            AI drafts. Humans decide.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-4 max-w-[56ch] text-base leading-7 text-primary-foreground/80">
            Every asset moves through one pipeline, and publishing tools only
            act on assets marked Approved. The split is enforced in the
            product — not left to anyone&apos;s discretion.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <ol
            aria-label="Approval pipeline"
            className="mt-10 flex flex-wrap items-center gap-2"
          >
            {pipeline.map((stage, i) => (
              <li key={stage} className="flex items-center gap-2">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
                    stage === "Approved"
                      ? "bg-white text-[hsl(var(--ril-blue-deep))]"
                      : "border border-primary-foreground/30 text-primary-foreground"
                  }`}
                >
                  {stage}
                </span>
                {i < pipeline.length - 1 ? (
                  <span aria-hidden className="text-primary-foreground/50">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal delay={120}>
            <div className="rounded-xl border border-primary-foreground/20 p-6">
              <h3 className="text-base font-bold">AI handles the repetitive</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {aiCan.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-6 text-primary-foreground/85"
                  >
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-foreground/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="rounded-xl bg-white p-6 text-foreground">
              <h3 className="text-base font-bold">Humans approve the important</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {humanMust.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Learning() {
  return (
    <section
      aria-labelledby="learning-heading"
      id="learning"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16 sm:px-8 sm:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Audience intelligence
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h2
              id="learning-heading"
              className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl"
            >
              Every campaign teaches the next one.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Engagement, registration, and conversion data flow back into
              recommendations — so the system suggests what to say, to whom,
              where, and why, before the next campaign starts.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={140}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              The loop
            </p>
            <p className="mt-3 text-sm font-semibold leading-7 text-foreground">
              Audience data → Behaviour analysis → Insight → Recommendation →
              Distribution → Engagement → Conversion → New learning
            </p>
          </Reveal>
          <ul className="ledger mt-6 border-t border-border">
            {learnings.map((item, i) => (
              <Reveal key={item} delay={i * 60} as="li">
                <p className="flex items-start gap-3 py-4 text-[15px] font-medium leading-6 text-foreground">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
