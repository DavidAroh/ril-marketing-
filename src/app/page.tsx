import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Tagline } from "@/components/landing/tagline";
import { FlowStrip, Modules, Approval, Learning } from "@/components/landing/sections";
import { Faq, CloseCta, SiteFooter } from "@/components/landing/finale";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.renaissancelabs.org"),
  title: "RIL AI Marketing Operating System | One event in. A whole campaign out.",
  description:
    "Turn RIL programs, events, and partnerships into on-brand content, scheduled posts, emails, and leads, with a human approving everything that matters.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "RIL AI Marketing Operating System",
    description:
      "One event in. A whole campaign out. AI drafts. Humans decide.",
    type: "website",
    url: "https://www.renaissancelabs.org",
  },
  twitter: {
    card: "summary",
    title: "RIL AI Marketing Operating System",
    description: "One event in. A whole campaign out. AI drafts. Humans decide.",
  },
};

export default async function Home() {
  let user: unknown = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth
      .getUser()
      .catch(() => ({ data: { user: null } }));
    user = data.user;
  } catch {
    user = null;
  }
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <SiteHeader />
      <main id="main">
        <Hero />
        <Tagline />
        <FlowStrip />
        <Modules />
        <Approval />
        <Learning />
        <Faq />
        <CloseCta />
      </main>
      <SiteFooter />
    </div>
  );
}
