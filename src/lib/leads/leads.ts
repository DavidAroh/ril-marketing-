import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface LeadRow {
  id: string;
  organization_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  organisation: string | null;
  interest: string | null;
  funnel_stage: string;
  owner_id: string | null;
  notes: string | null;
  score: string | null;
  score_reason: string | null;
  audience_segment_id: string | null;
  source_platform: string | null;
  source_content_asset_id: string | null;
  registration_token: string | null;
  campaign_id: string | null;
  landing_page_id: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  is_qualified: boolean;
  is_converted: boolean;
  created_at: string;
  segment?: { id: string; name: string } | null;
}

export async function listLeads(
  organizationId: string,
  opts: { stage?: string; q?: string; page?: number } = {}
): Promise<{ leads: LeadRow[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 20;
  let query = supabase
    .from("leads")
    .select("*, segment:audience_segments(id, name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (opts.stage && opts.stage !== "all") query = query.eq("funnel_stage", opts.stage);
  if (opts.q?.trim()) {
    const q = opts.q.trim().replace(/[%_]/g, "");
    query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%,organisation.ilike.%${q}%`);
  }
  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return { leads: (data ?? []) as LeadRow[], total: count ?? 0 };
}

export async function getLead(
  organizationId: string,
  leadId: string
): Promise<LeadRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*, segment:audience_segments(id, name)")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load lead: ${error.message}`);
  return (data ?? null) as LeadRow | null;
}

/** Leads with no owner or stuck early-stage — follow-up queue (§6.14). */
export async function listLeadsNeedingFollowUp(
  organizationId: string,
  limit = 5
): Promise<LeadRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_converted", false)
    .in("funnel_stage", ["captured", "engagement", "nurturing"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as LeadRow[];
}
