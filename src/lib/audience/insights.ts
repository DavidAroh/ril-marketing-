import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AudienceInsightWithSegment,
  InsightCategory,
  InsightStatus,
  SignalStrength,
} from "@/types/audience";

export interface InsightFilters {
  q?: string;
  category?: string;
  segmentId?: string;
  status?: string;
  signal?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface InsightListResult {
  insights: AudienceInsightWithSegment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const VALID_CATEGORIES: InsightCategory[] = [
  "TOPIC_ENGAGEMENT",
  "FORMAT_REGISTRATION",
  "PLATFORM_LEAD_QUALITY",
  "HOOK_CTA_EFFECTIVENESS",
  "PROGRAM_AFFINITY",
  "FUNNEL_DROPOFF",
  "REPEAT_ENGAGEMENT",
  "THEME_TREND",
];
const VALID_STATUSES: InsightStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "SUPPRESSED",
];
const VALID_SIGNALS: SignalStrength[] = [
  "EMERGING",
  "STABLE",
  "RISING",
  "DECLINING",
];

export async function listInsights(
  organizationId: string,
  filters: InsightFilters = {}
): Promise<InsightListResult> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audience_insights")
    .select("*, segment:audience_segments(id, name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.category && filters.category !== "all") {
    if ((VALID_CATEGORIES as string[]).includes(filters.category)) {
      query = query.eq("category", filters.category);
    }
  }
  if (filters.segmentId && filters.segmentId !== "all") {
    query = query.eq("segment_id", filters.segmentId);
  }
  if (filters.status && filters.status !== "all") {
    if ((VALID_STATUSES as string[]).includes(filters.status)) {
      query = query.eq("status", filters.status);
    }
  }
  if (filters.signal && filters.signal !== "all") {
    if ((VALID_SIGNALS as string[]).includes(filters.signal)) {
      query = query.eq("signal_strength", filters.signal);
    }
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  // Date inputs are day-precision; include the whole "to" day.
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().replace(/[%_]/g, "");
    query = query.or(
      `summary.ilike.%${q}%,recommendation.ilike.%${q}%,topic.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load insights: ${error.message}`);
  const total = count ?? 0;
  return {
    insights: (data ?? []) as unknown as AudienceInsightWithSegment[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getInsight(
  organizationId: string,
  insightId: string
): Promise<AudienceInsightWithSegment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audience_insights")
    .select("*, segment:audience_segments(id, name)")
    .eq("organization_id", organizationId)
    .eq("id", insightId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load insight: ${error.message}`);
  return (data ?? null) as unknown as AudienceInsightWithSegment | null;
}

export async function listSegmentInsights(
  organizationId: string,
  segmentId: string,
  status?: InsightStatus
): Promise<AudienceInsightWithSegment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("audience_insights")
    .select("*, segment:audience_segments(id, name)")
    .eq("organization_id", organizationId)
    .eq("segment_id", segmentId)
    .order("confidence_score", { ascending: false })
    .limit(50);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load segment insights: ${error.message}`);
  return (data ?? []) as unknown as AudienceInsightWithSegment[];
}
