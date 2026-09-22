import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (user) redirect("/dashboard");
  return <AuthForm mode="sign-up" />;
}
