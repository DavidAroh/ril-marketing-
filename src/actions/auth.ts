"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orgSchema } from "@/lib/validation/audience";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export interface OrgResult {
  ok: boolean;
  error?: string;
}

/** First-run bootstrap: signed-in user with no org creates one and becomes owner. */
export async function createOrganization(
  formData: FormData
): Promise<OrgResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  // Atomic bootstrap via RPC: Postgres checks SELECT policies on
  // INSERT...RETURNING rows, so three separate RLS-gated statements can never
  // return the new org to a not-yet-member. The function can only add the
  // caller as owner of a brand-new org.
  const { data: orgId, error: rpcError } = await supabase.rpc(
    "create_organization_with_owner",
    { org_name: parsed.data.name }
  );
  if (rpcError || !orgId) {
    return { ok: false, error: rpcError?.message ?? "Could not create organization." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
