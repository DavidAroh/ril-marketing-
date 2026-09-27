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
  { n: "01", title: "Log the activity", body: "Programs and partnerships log what's happening once." },
  { n: "02", title: "AI understands it", body: "AI surfaces topics, quotes, angles, and audiences." },
  { n: "03", title: "Repurpose everything", body: "Blogs, newsletters, clips, captions, and posts from one source." },
  { n: "04", title: "You approve", body: "Edit, approve, or suppress. Nothing moves without a stamp." },
  { n: "05", title: "Publish and capture", body: "Scheduled posts, emails, and pages. Every signup traces to its asset." },
  { n: "06", title: "Learn and repeat", body: "Performance becomes the next round of recommendations." },
] as const;

export function FlowStrip() {
  return (
    <section
      aria-labelledby="flow-heading"
      id="workflow"
      className="scroll-mt-20 border-b border-border bg-muted/40"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
        <Reveal>
          <h2
            id="flow-heading"
            className="max-w-[20ch] text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            From one activity to a whole campaign.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-4 max-w-[60ch] text-base leading-7 text-muted-foreground">
            Six steps, run every week. A person approves every public step.
          </p>
        </Reveal>
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {flow.map((step, i) => (
            <Reveal
              as="li"
              key={step.n}
              delay={i * 60}
              className="border-t-2 border-foreground/10 pt-5"
            >
              <span className="dateline">{step.n}</span>
              <h3 className="mt-3 text-base font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {step.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}


const moduleGroups = [
  {
    title: "See what matters",
    className: "bg-muted/60",
    modules: [
      { icon: LayoutDashboard, title: "Command Centre", body: "Campaigns, approvals, leads, and tasks in one live view." },
      { icon: TrendingUp, title: "Trends to Content", body: "Turn industry signals into timely drafts, with claims checked before they ship." },
      { icon: BarChart3, title: "Analytics & Reports", body: "See what worked, what did not, and what to try next." },
    ],
  },
  {
    title: "Make and publish",
    className: "border-y border-border bg-background",
    modules: [
      { icon: CalendarPlus, title: "Activity Hub", body: "Log a program, event, or partnership once, then build from it." },
      { icon: RefreshCw, title: "Repurposing Engine", body: "Turn video, audio, images, and docs into ready-to-review drafts." },
      { icon: CalendarDays, title: "Content Calendar", body: "Plan drafts, approvals, and scheduled posts in one view." },
      { icon: Send, title: "Social & Publishing", body: "Approve platform-ready posts before publishing through Buffer." },
    ],
  },
  {
    title: "Reach and learn",
    className: "bg-primary text-primary-foreground",
    modules: [
      { icon: Mail, title: "Email Marketing", body: "Create consent-filtered email campaign drafts from approved content for reviewer approval." },
      { icon: Users, title: "Leads & CRM", body: "Capture, score, and follow up with every lead." },
      { icon: Link2, title: "Registration Links", body: "Track which content brings each signup." },
    ],
  },
] as const;

export function Modules() {
  return (
    <section
      aria-labelledby="modules-heading"
      id="platform"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16 sm:px-8 sm:py-24"
    >
      <Reveal>
        <h2
          id="modules-heading"
          className="max-w-[18ch] text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
        >
          One connected system, from first idea to follow-up.
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <p className="mt-4 max-w-[60ch] text-base leading-7 text-muted-foreground">
          Log an activity once. The same source keeps your plans, content, and
          audience results connected.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-4 lg:grid-cols-[0.85fr_1.1fr_0.85fr]">
        {moduleGroups.map((group, i) => (
          <Reveal key={group.title} delay={i * 70} className={`h-full ${group.className}`}>
            <article className="h-full p-6 sm:p-7 lg:p-8">
              <h3 className="text-xl font-bold tracking-tight">{group.title}</h3>
              <ul className="mt-6 divide-y divide-current/10">
                {group.modules.map((m) => (
                  <li key={m.title} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <m.icon className={`mt-0.5 size-[18px] shrink-0 ${i === 2 ? "text-primary-foreground/80" : "text-primary"}`} aria-hidden />
                      <div>
                        <h4 className="text-sm font-bold">{m.title}</h4>
                        <p className={`mt-1 text-sm leading-6 ${i === 2 ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{m.body}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

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

export function Approval() {
  return (
    <section
      aria-labelledby="approval-heading"
      className="bg-primary text-primary-foreground"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
        <Reveal>
          <h2
            id="approval-heading"
            className="max-w-[20ch] text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
          >
            AI drafts. Humans decide.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-4 max-w-[58ch] text-base leading-7 text-primary-foreground/85">
            The engine does the heavy lifting; the judgement stays with the
            team. Nothing public moves without a person&apos;s stamp on it.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal delay={120}>
            <div className="h-full rounded-xl border border-white/25 p-6 sm:p-7">
              <h3 className="text-base font-bold">AI handles the repetitive</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {aiCan.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-6 text-primary-foreground/85"
                  >
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-foreground/60"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="h-full rounded-xl bg-white p-6 text-foreground sm:p-7">
              <h3 className="text-base font-bold">Humans approve the important</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {humanMust.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-6"
                  >
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    <span className="font-medium">{item}</span>
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


const learnings = [
  "Which topics move each audience segment",
  "Which formats drive registrations, not just impressions",
  "Which channels bring the highest-quality leads",
  "Which hooks and CTAs actually get action",
] as const;

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
            <h2
              id="learning-heading"
              className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
            >
              Every campaign teaches the next one.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Engagement, registration, and conversion data flow back into
              recommendations. The system then suggests what to say, to whom,
              where, and why, before the next campaign starts.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={120}>
            <p className="text-sm font-semibold leading-7 text-foreground">
              Audience data → Behaviour analysis → Insight → Recommendation →
              Distribution → Engagement → Conversion → New learning
            </p>
          </Reveal>
          <ul className="ledger mt-6 border-t border-border">
            {learnings.map((item, i) => (
              <Reveal key={item} delay={i * 60} as="li">
                <p className="flex items-start gap-3 py-4 text-sm font-medium leading-6 text-foreground">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-primary" />
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
