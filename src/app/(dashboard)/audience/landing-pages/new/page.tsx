import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getLandingPageOptions } from "@/lib/landing-pages";
import { LandingPageForm } from "@/components/landing-pages/landing-page-form";

export const metadata: Metadata = { title: "Create landing page" };

export default async function NewLandingPage() {
  const organizationId = await getCallerOrganizationId();
  if (!organizationId) redirect("/onboarding");
  const options = await getLandingPageOptions(organizationId).catch(() => ({ campaigns: [], activities: [], segments: [] }));
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 md:gap-6">
      <header><Link href="/audience/landing-pages" className="dateline hover:text-foreground">← Landing Pages</Link><p className="dateline mt-3">Campaign builder</p><h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Create a landing page</h1><p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">Draft a focused public page. A reviewer approves it, then a different owner, admin or leader publishes it.</p></header>
      <LandingPageForm {...options} />
    </div>
  );
}
