import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { BrandLockup } from "@/components/auth/brand-lockup";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = { title: "Set up your team" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) redirect("/sign-in");
  const orgId = await getCallerOrganizationId().catch(() => null);
  if (orgId) redirect("/dashboard");

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <h1 className="sr-only">Set up your team</h1>
      <div className="stagger w-full max-w-sm">
        <BrandLockup />
        <OnboardingForm email={user.email ?? "unknown"} />
      </div>
    </main>
  );
}
