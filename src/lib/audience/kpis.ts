import "server-only";
import { createClient } from "@/lib/supabase/server";
import { kpiFraction } from "@/lib/audience/guards";

export interface Kpi {
  id: string;
  organization_id: string;
  name: string;
  metric: string | null;
  target_value: number;
  unit: string;
  period: string;
}

export interface KpiProgress extends Kpi {
  /** Null while the supporting system is not yet connected. */
  current: number | null;
  /** 0..1 fraction of target, null when not computable. */
  fraction: number | null;
}

/**
 * KPI progress (PRD §7 KPI, §14 targets). Metrics backed by audience data are
 * computed live; external-system metrics (traffic, social, email) report
 * "collecting" until their integrations land.
 */
export async function getKpiProgress(
  organizationId: string
): Promise<KpiProgress[]> {
  const supabase = await createClient();
  const { data: kpis, error } = await supabase
    .from("kpis")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw new Error(`Failed to load KPIs: ${error.message}`);
  const rows = (kpis ?? []) as Kpi[];
  if (rows.length === 0) return [];

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const needsLeads = rows.some((k) =>
    ["qualified_leads", "registrations", "conversions", "conversion_rate"].includes(
      k.metric ?? ""
    )
  );
  let leads: Array<{ is_qualified: boolean; is_converted: boolean }> = [];
  if (needsLeads) {
    const { data } = await supabase
      .from("leads")
      .select("is_qualified, is_converted")
      .eq("organization_id", organizationId)
      .gte("created_at", yearStart)
      .limit(20000);
    leads = (data ?? []) as typeof leads;
  }

  return rows.map((k) => {
    let current: number | null = null;
    switch (k.metric) {
      case "qualified_leads":
        current = leads.filter((l) => l.is_qualified).length;
        break;
      case "registrations":
        current = leads.length;
        break;
      case "conversions":
        current = leads.filter((l) => l.is_converted).length;
        break;
      case "conversion_rate":
        current =
          leads.length > 0
            ? (leads.filter((l) => l.is_converted).length / leads.length) * 100
            : 0;
        break;
      default:
        current = null;
    }
    return {
      ...k,
      target_value: Number(k.target_value),
      current,
      fraction: kpiFraction(current, Number(k.target_value)),
    };
  });
}
