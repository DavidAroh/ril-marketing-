import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (user) redirect("/dashboard");
  return <AuthForm mode="sign-in" />;
}
