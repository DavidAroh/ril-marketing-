import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the caller's organization.
 * Convention: profiles table maps auth user -> organization_id.
 * Falls back to the `organization_id` claim / first membership row.
 */
export async function getCallerOrganizationId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<{ organization_id: string | null }>();

  if (profile?.organization_id) return profile.organization_id;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<{ organization_id: string }>();

  return membership?.organization_id ?? null;
}

export async function requireOrganizationId(): Promise<string> {
  const orgId = await getCallerOrganizationId();
  if (!orgId) {
    throw new Error("Not authenticated or no organization membership found.");
  }
  return orgId;
}
