import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AudienceSegment,
  AudienceSegmentWithPrograms,
  Program,
} from "@/types/audience";

export async function listSegments(
  organizationId: string
): Promise<AudienceSegmentWithPrograms[]> {
  const supabase = await createClient();
  const { data: segments, error } = await supabase
    .from("audience_segments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load segments: ${error.message}`);

  const rows = (segments ?? []) as AudienceSegment[];
  if (rows.length === 0) return [];

  const ids = rows.map((s) => s.id);
  const { data: links } = await supabase
    .from("audience_segment_programs")
    .select("audience_segment_id, programs(id, name, slug, description, organization_id, created_at)")
    .in("audience_segment_id", ids);

  const programsBySegment = new Map<string, Program[]>();
  for (const link of (links ?? []) as Array<{
    audience_segment_id: string;
    programs: Program | Program[] | null;
  }>) {
    const p = Array.isArray(link.programs) ? link.programs[0] : link.programs;
    if (!p) continue;
    const list = programsBySegment.get(link.audience_segment_id) ?? [];
    list.push(p);
    programsBySegment.set(link.audience_segment_id, list);
  }

  const { data: counts } = await supabase
    .from("audience_insights")
    .select("segment_id, status")
    .eq("organization_id", organizationId)
    .in("segment_id", ids);

  const totalBy = new Map<string, number>();
  const pendingBy = new Map<string, number>();
  for (const c of (counts ?? []) as Array<{ segment_id: string; status: string }>) {
    totalBy.set(c.segment_id, (totalBy.get(c.segment_id) ?? 0) + 1);
    if (c.status === "PENDING_REVIEW") {
      pendingBy.set(c.segment_id, (pendingBy.get(c.segment_id) ?? 0) + 1);
    }
  }

  return rows.map((s) => ({
    ...s,
    programs: programsBySegment.get(s.id) ?? [],
    insights_count: totalBy.get(s.id) ?? 0,
    pending_insights_count: pendingBy.get(s.id) ?? 0,
  }));
}

export async function getSegment(
  organizationId: string,
  segmentId: string
): Promise<(AudienceSegment & { programs: Program[] }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audience_segments")
    .select(
      "*, audience_segment_programs(programs(id, name, slug, description, organization_id, created_at))"
    )
    .eq("organization_id", organizationId)
    .eq("id", segmentId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load segment: ${error.message}`);
  if (!data) return null;
  const raw = data as AudienceSegment & {
    audience_segment_programs: Array<{ programs: Program | Program[] | null }>;
  };
  const programs = (raw.audience_segment_programs ?? [])
    .map((l) => (Array.isArray(l.programs) ? l.programs[0] : l.programs))
    .filter((p): p is Program => Boolean(p));
  const { audience_segment_programs: _omit, ...segment } = raw;
  void _omit;
  return { ...segment, programs };
}

export async function listPrograms(organizationId: string): Promise<Program[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw new Error(`Failed to load programs: ${error.message}`);
  return (data ?? []) as Program[];
}
