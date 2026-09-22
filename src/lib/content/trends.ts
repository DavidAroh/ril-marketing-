import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Trend {
  id: string;
  organization_id: string;
  title: string;
  source: string | null;
  source_url: string | null;
  relevance: string | null;
  angle: string | null;
  audience: string | null;
  risk: string | null;
  status: "new" | "approved" | "dismissed";
  created_at: string;
}

export async function listTrends(
  organizationId: string,
  status = "all"
): Promise<Trend[]> {
  const supabase = await createClient();
  let query = supabase
    .from("trends")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load trends: ${error.message}`);
  return (data ?? []) as Trend[];
}
