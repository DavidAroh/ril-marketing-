/** Pure aggregation helpers for the audience generation pipeline (no I/O). */

export interface ContentRow {
  id: string;
  organization_id: string;
  title: string;
  topic: string | null;
  format: string | null;
  platform: string | null;
  hook: string | null;
  cta: string | null;
  audience_segment_id: string | null;
  views: number;
  clicks: number;
  shares: number;
  comments: number;
  saves: number;
  registrations: number;
  avg_time_seconds: number | null;
  created_at: string;
}

export interface LeadRow {
  id: string;
  organization_id: string;
  email: string | null;
  audience_segment_id: string | null;
  source_platform: string | null;
  source_content_asset_id: string | null;
  is_qualified: boolean;
  is_converted: boolean;
  created_at: string;
}

export interface EventRow {
  id: string;
  event_type: string;
  content_asset_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Engagement rate per asset from actually-available counters (§14). */
export function engagementScore(row: ContentRow): {
  interactions: number;
  rate: number;
} {
  const interactions =
    num(row.clicks) + num(row.shares) + num(row.comments) + num(row.saves);
  const views = num(row.views);
  return { interactions, rate: views > 0 ? interactions / views : 0 };
}

export function registrationRate(row: ContentRow): number {
  const views = num(row.views);
  return views > 0 ? num(row.registrations) / views : 0;
}

export interface GroupStats {
  key: string;
  count: number;
  totalViews: number;
  totalInteractions: number;
  totalRegistrations: number;
  engagementRate: number;
  registrationRate: number;
  assetIds: string[];
  latestAt: string | null;
}

export function groupBy<T>(rows: T[], keyFn: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export function summarizeAssets(key: string, rows: ContentRow[]): GroupStats {
  let totalViews = 0;
  let totalInteractions = 0;
  let totalRegistrations = 0;
  let latestAt: string | null = null;
  for (const r of rows) {
    totalViews += num(r.views);
    totalInteractions +=
      num(r.clicks) + num(r.shares) + num(r.comments) + num(r.saves);
    totalRegistrations += num(r.registrations);
    if (!latestAt || r.created_at > latestAt) latestAt = r.created_at;
  }
  return {
    key,
    count: rows.length,
    totalViews,
    totalInteractions,
    totalRegistrations,
    engagementRate: totalViews > 0 ? totalInteractions / totalViews : 0,
    registrationRate: totalViews > 0 ? totalRegistrations / totalViews : 0,
    assetIds: rows.map((r) => r.id),
    latestAt,
  };
}

/** Split a window into recent half vs older half for baseline comparison. */
export function splitRecentBaseline(
  rows: ContentRow[],
  rangeStart: Date,
  rangeEnd: Date
): { recent: ContentRow[]; baseline: ContentRow[] } {
  const mid = new Date((rangeStart.getTime() + rangeEnd.getTime()) / 2);
  const recent: ContentRow[] = [];
  const baseline: ContentRow[] = [];
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (!Number.isFinite(t)) {
      baseline.push(r);
      continue;
    }
    (t >= mid.getTime() ? recent : baseline).push(r);
  }
  return { recent, baseline };
}

export function medianAgeDays(rows: ContentRow[], now = new Date()): number {
  if (rows.length === 0) return 90;
  const ages = rows
    .map((r) => (now.getTime() - new Date(r.created_at).getTime()) / 86_400_000)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (ages.length === 0) return 90;
  return ages[Math.floor(ages.length / 2)];
}

/** Lead-quality rates per platform (§16) — volume never counts as quality. */
export function platformLeadStats(
  leads: LeadRow[],
  keyFn: (l: LeadRow) => string
): Map<
  string,
  {
    key: string;
    leads: number;
    qualified: number;
    converted: number;
    qualifiedRate: number;
    conversionRate: number;
    leadIds: string[];
  }
> {
  const out = new Map<
    string,
    {
      key: string;
      leads: number;
      qualified: number;
      converted: number;
      qualifiedRate: number;
      conversionRate: number;
      leadIds: string[];
    }
  >();
  for (const lead of leads) {
    const key = keyFn(lead);
    if (!key) continue;
    const cur = out.get(key) ?? {
      key,
      leads: 0,
      qualified: 0,
      converted: 0,
      qualifiedRate: 0,
      conversionRate: 0,
      leadIds: [] as string[],
    };
    cur.leads += 1;
    if (lead.is_qualified) cur.qualified += 1;
    if (lead.is_converted) cur.converted += 1;
    cur.leadIds.push(lead.id);
    out.set(key, cur);
  }
  for (const cur of out.values()) {
    cur.qualifiedRate = cur.leads > 0 ? cur.qualified / cur.leads : 0;
    cur.conversionRate = cur.leads > 0 ? cur.converted / cur.leads : 0;
  }
  return out;
}

export interface DraftLike {
  source_content_asset_ids: string[];
  source_event_ids: string[];
  source_lead_ids: string[];
}

const MAX_EVENT_IDS_PER_INSIGHT = 200;

/**
 * Traceability (PRD data model): link each draft back to the Analytics Events
 * produced by its source assets. Pure function — easy to unit test.
 */
export function attachEventIds<T extends DraftLike>(
  drafts: T[],
  eventsByAssetId: Map<string, string[]>
): T[] {
  return drafts.map((draft) => {
    const seen = new Set<string>(draft.source_event_ids);
    for (const assetId of draft.source_content_asset_ids) {
      const ids = eventsByAssetId.get(assetId);
      if (!ids) continue;
      for (const id of ids) {
        if (seen.size >= MAX_EVENT_IDS_PER_INSIGHT) break;
        seen.add(id);
      }
      if (seen.size >= MAX_EVENT_IDS_PER_INSIGHT) break;
    }
    return { ...draft, source_event_ids: [...seen] };
  });
}

export function groupEventsByAsset(
  events: Array<{ id: string; content_asset_id: string | null }>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of events) {
    if (!e.content_asset_id) continue;
    const list = map.get(e.content_asset_id);
    if (list) list.push(e.id);
    else map.set(e.content_asset_id, [e.id]);
  }
  return map;
}

export interface CampaignRollupInput {
  assets: Array<{
    id: string;
    campaign_id: string | null;
    views: number;
    registrations: number;
  }>;
  leads: Array<{
    id: string;
    source_content_asset_id: string | null;
    is_qualified: boolean;
    is_converted: boolean;
  }>;
}

export interface CampaignRollupStats {
  assets: number;
  views: number;
  registrations: number;
  leads: number;
  qualified_leads: number;
  qualified_rate: number;
  conversion_rate: number;
}

export interface FormatSignal {
  label: string;
  engagementRate: number;
  registrationRate: number;
}

export interface AssetCounters {
  format: string | null;
  views: number;
  clicks: number;
  shares: number;
  comments: number;
  saves: number;
  registrations: number;
}

/** Aggregate engagement vs registration rate by format. Pure — unit tested. */
export function summarizeFormats(rows: AssetCounters[]): FormatSignal[] {
  const byFormat = new Map<string, { v: number; e: number; r: number }>();
  for (const row of rows) {
    const key = row.format?.trim() || "Unknown";
    const cur = byFormat.get(key) ?? { v: 0, e: 0, r: 0 };
    cur.v += Number(row.views ?? 0);
    cur.e +=
      Number(row.clicks ?? 0) +
      Number(row.shares ?? 0) +
      Number(row.comments ?? 0) +
      Number(row.saves ?? 0);
    cur.r += Number(row.registrations ?? 0);
    byFormat.set(key, cur);
  }
  return [...byFormat.entries()].slice(0, 8).map(([label, s]) => ({
    label: label.length > 12 ? `${label.slice(0, 12)}…` : label,
    engagementRate: s.v > 0 ? s.e / s.v : 0,
    registrationRate: s.v > 0 ? s.r / s.v : 0,
  }));
}

/** Segment-reach rollup per campaign (PRD §6.18). Pure — unit tested. */
export function rollupCampaign(
  campaignId: string,
  input: CampaignRollupInput
): CampaignRollupStats {
  const assets = input.assets.filter((a) => a.campaign_id === campaignId);
  const assetIds = new Set(assets.map((a) => a.id));
  const leads = input.leads.filter(
    (l) => l.source_content_asset_id && assetIds.has(l.source_content_asset_id)
  );
  const qualified = leads.filter((l) => l.is_qualified).length;
  const converted = leads.filter((l) => l.is_converted).length;
  return {
    assets: assets.length,
    views: assets.reduce((s, a) => s + (Number(a.views) || 0), 0),
    registrations: assets.reduce((s, a) => s + (Number(a.registrations) || 0), 0),
    leads: leads.length,
    qualified_leads: qualified,
    qualified_rate: leads.length > 0 ? qualified / leads.length : 0,
    conversion_rate: leads.length > 0 ? converted / leads.length : 0,
  };
}
