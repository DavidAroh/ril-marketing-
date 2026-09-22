import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isReviewerRole } from "@/lib/audience/guards";

export { REVIEWER_ROLES, isReviewerRole } from "@/lib/audience/guards";

export async function getUserRole(
  organizationId: string
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();
  return data?.role ?? null;
}

/** Throws unless the caller holds an approval-tier role. */
export async function requireReviewer(organizationId: string): Promise<string> {
  const role = await getUserRole(organizationId);
  if (!isReviewerRole(role)) {
    throw new Error(
      "Approval requires an owner, admin, marketing manager or leadership role."
    );
  }
  return role as string;
}
