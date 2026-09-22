import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "";
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth
      .getUser()
      .catch(() => ({ data: { user: null } }));
    if (!data.user) redirect("/sign-in");
    email = data.user.email ?? "";
  } catch {
    redirect("/sign-in");
  }	return <AppShell userEmail={email}>{children}</AppShell>;
}
