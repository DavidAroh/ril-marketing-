import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeWithConfiguredProvider } from "@/lib/ai/provider";
import { getResendConfig } from "@/lib/integrations/resend";
import { loadGoogleAnalyticsMetrics } from "@/lib/integrations/google-analytics";

const inputSchema = z.object({
  period_type: z.enum(["weekly", "monthly", "custom"]),
  period_start: z.string().date(),
  period_end: z.string().date(),
}).refine((value) => value.period_end >= value.period_start, { message: "End date must be on or after the start date." });

function addDays(date: Date, count: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + count);
  return copy;
}

export async function createMarketingReport(organizationId: string, period_type: "weekly" | "monthly" | "custom", period_start: string, period_end: string, createdBy: string | null = null, scheduled = false): Promise<void> {
  const parsed = inputSchema.safeParse({ period_type, period_start, period_end });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Choose a valid reporting period.");
  const start = new Date(`${period_start}T00:00:00.000Z`);
  const endExclusive = addDays(new Date(`${period_end}T00:00:00.000Z`), 1).toISOString();
  const admin = createAdminClient();
  if (scheduled) {
    const { data: existing, error } = await admin.from("marketing_reports").select("id").eq("organization_id", organizationId).eq("period_type", period_type).eq("period_start", period_start).eq("period_end", period_end).eq("generated_by_schedule", true).maybeSingle();
    if (error) throw new Error(`Could not check scheduled report history: ${error.message}`);
    if (existing) return;
  }
  const [assetsResult, leadsResult, campaignsResult, emailResult, activityResult, websiteResult] = await Promise.all([
    admin.from("content_assets").select("id,title,status,platform,format,views,clicks,shares,comments,saves,registrations,created_at").eq("organization_id", organizationId).gte("created_at", start.toISOString()).lt("created_at", endExclusive).limit(5000),
    admin.from("leads").select("id,source_platform,is_qualified,is_converted,created_at").eq("organization_id", organizationId).gte("created_at", start.toISOString()).lt("created_at", endExclusive).limit(5000),
    admin.from("campaigns").select("id,name,status,starts_on,ends_on").eq("organization_id", organizationId).lte("starts_on", period_end).gte("ends_on", period_start).limit(500),
    admin.from("email_campaigns").select("id,status,created_at").eq("organization_id", organizationId).gte("created_at", start.toISOString()).lt("created_at", endExclusive).limit(1000),
    admin.from("activities").select("id,title,event_date").eq("organization_id", organizationId).gte("event_date", period_start).lte("event_date", period_end).limit(1000),
    admin.from("analytics_events").select("metadata", { count: "exact" }).eq("organization_id", organizationId).eq("event_type", "pageview").gte("created_at", start.toISOString()).lt("created_at", endExclusive).limit(20000),
  ]);
  for (const result of [assetsResult, leadsResult, campaignsResult, emailResult, activityResult, websiteResult]) {
    if (result.error) throw new Error(`Could not collect report data: ${result.error.message}`);
  }
  const assets = assetsResult.data ?? [];
  const leads = leadsResult.data ?? [];
  const emailDrafts = emailResult.data ?? [];
  const resendConfig = await getResendConfig(organizationId);
  const emailEventsResult = resendConfig?.webhookSecret ? await admin.from("email_provider_events").select("event_type", { count: "exact" }).eq("organization_id", organizationId).gte("occurred_at", start.toISOString()).lt("occurred_at", endExclusive).limit(20000) : { data: [], count: 0, error: null };
  if (emailEventsResult.error) throw new Error(`Could not collect verified email events: ${emailEventsResult.error.message}`);
  const emailEvents = emailEventsResult.data ?? [];
  const emailEventCounts = Object.fromEntries(["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "email.failed"].map((eventType) => [eventType, emailEvents.filter((event) => event.event_type === eventType).length]));
  const websiteEvents = websiteResult.data ?? [];
  const visitors = new Set(websiteEvents.map((event) => (event.metadata as Record<string, unknown> | null)?.visitor_id).filter((id): id is string => typeof id === "string"));
  const pagePaths = new Map<string, number>();
  for (const event of websiteEvents) {
    const path = (event.metadata as Record<string, unknown> | null)?.path;
    if (typeof path === "string" && path.startsWith("/")) pagePaths.set(path, (pagePaths.get(path) ?? 0) + 1);
  }
  const channels = new Map<string, { assets: number; views: number; interactions: number; registrations: number }>();
  for (const asset of assets) {
    const key = asset.platform?.trim() || "Unspecified";
    const bucket = channels.get(key) ?? { assets: 0, views: 0, interactions: 0, registrations: 0 };
    bucket.assets += 1;
    bucket.views += Number(asset.views ?? 0);
    bucket.interactions += Number(asset.clicks ?? 0) + Number(asset.shares ?? 0) + Number(asset.comments ?? 0) + Number(asset.saves ?? 0);
    bucket.registrations += Number(asset.registrations ?? 0);
    channels.set(key, bucket);
  }
  const leadsBySource = new Map<string, { leads: number; qualified: number; converted: number }>();
  for (const lead of leads) {
    const key = lead.source_platform?.trim() || "Unspecified";
    const bucket = leadsBySource.get(key) ?? { leads: 0, qualified: 0, converted: 0 };
    bucket.leads += 1;
    if (lead.is_qualified) bucket.qualified += 1;
    if (lead.is_converted) bucket.converted += 1;
    leadsBySource.set(key, bucket);
  }
  const googleAnalytics = await loadGoogleAnalyticsMetrics(organizationId, period_start, period_end).catch(() => null);
  const metrics = {
    period: { type: period_type, start: period_start, end: period_end },
    content: {
      created: assets.length,
      views: assets.reduce((sum, row) => sum + Number(row.views ?? 0), 0),
      interactions: assets.reduce((sum, row) => sum + Number(row.clicks ?? 0) + Number(row.shares ?? 0) + Number(row.comments ?? 0) + Number(row.saves ?? 0), 0),
      registrations: assets.reduce((sum, row) => sum + Number(row.registrations ?? 0), 0),
      byChannel: Object.fromEntries(channels),
      byStatus: Object.fromEntries([...new Set(assets.map((row) => row.status))].map((status) => [status, assets.filter((row) => row.status === status).length])),
    },
    leads: { captured: leads.length, qualified: leads.filter((row) => row.is_qualified).length, converted: leads.filter((row) => row.is_converted).length, bySource: Object.fromEntries(leadsBySource) },
    campaigns: (campaignsResult.data ?? []).map(({ name, status, starts_on, ends_on }) => ({ name, status, starts_on, ends_on })),
    email: {
      draftsCreated: emailDrafts.length,
      approved: emailDrafts.filter((row) => row.status === "approved").length,
      completedCampaigns: emailDrafts.filter((row) => row.status === "sent").length,
      deliveryMetrics: resendConfig?.webhookSecret ? emailEventCounts : "unavailable: signed Resend webhook is not configured",
      eventRowsInPeriod: resendConfig?.webhookSecret ? emailEventsResult.count ?? emailEvents.length : 0,
      note: resendConfig?.webhookSecret ? "Counts are verified provider events recorded in the selected period." : "Connect Resend and a signed webhook to capture delivery and engagement events.",
    },
    website: {
      pageviews: websiteResult.count ?? websiteEvents.length,
      uniqueVisitors: (websiteResult.count ?? 0) <= websiteEvents.length ? visitors.size : null,
      pageviewsSampled: (websiteResult.count ?? 0) > websiteEvents.length,
      topPages: [...pagePaths.entries()].sort((left, right) => right[1] - left[1]).slice(0, 10).map(([path, pageviews]) => ({ path, pageviews })),
      source: "First-party site pageview beacon; not an external analytics or search ranking report.",
    },
    googleAnalytics: googleAnalytics?.ga4 ?? null,
    searchConsole: googleAnalytics?.searchConsole ?? null,
    activities: (activityResult.data ?? []).map(({ title, event_date }) => ({ title, event_date })),
    dataLimitations: [
      "Only metrics captured in this workspace are included; first-party website visits come from the site beacon and may omit blocked or consent-restricted browsers.",
      ...(resendConfig?.webhookSecret ? ["Email totals include verified Resend webhook events only; events not received from the provider are not counted."] : ["Email delivery and engagement events are unavailable until Resend and its signed webhook are configured."]),
      "Paid-ad spend and PR monitoring are not connected; paid-media ROI and PR coverage cannot be calculated.",
      "Search Console reports clicks, impressions, queries and average position for its available data window; this is not a full rank-tracking, crawl-health or search-volume report.",
      ...(googleAnalytics ? [] : ["External Google Analytics and Search Console metrics are unavailable for this period. Connect both read-only properties and check API access to include them."]),
      ...(googleAnalytics && !googleAnalytics.searchConsole ? ["Search Console data is omitted because the selected period ends inside Google's recent-data delay window."] : []),
      ...(googleAnalytics?.searchConsole ? [`Search Console data in this report is available through ${googleAnalytics.searchConsole.dataThrough}; its reporting API does not provide the latest days immediately.`] : []),
      ...(websiteResult.count && websiteResult.count > websiteEvents.length ? ["Unique-visitor and top-page figures use the latest 20,000 website events; pageview totals use the full database count."] : []),
      "Associations describe observed data and do not establish causation.",
    ],
  };
  const system = "You write concise internal marketing performance reports for Renaissance Innovation Labs. Use only supplied metrics. Explain what is and is not observable, distinguish evidence from recommendations, never imply causation from correlation, never invent a benchmark or metric. Structure the report with sections: Summary, What performed, Gaps and limits, Recommended next actions. Label next actions as recommendations. If data is sparse, state that plainly.";
  const narrativeMetrics = {
    ...metrics,
    searchConsole: metrics.searchConsole ? { ...metrics.searchConsole, topQueries: "Omitted from AI narrative input; retained in the workspace report." } : null,
  };
  const completion = await completeWithConfiguredProvider(organizationId, system, `Write a ${period_type} report for ${period_start} through ${period_end}. Workspace data in JSON:\n${JSON.stringify(narrativeMetrics)}`).catch(() => null);
  const fallback = [
    `Summary\n${assets.length} content asset(s), ${metrics.content.views} recorded views, ${metrics.content.interactions} recorded interactions, ${metrics.content.registrations} registrations, and ${leads.length} captured lead(s) during this period.`,
    `What performed\n${[...channels.entries()].map(([name, data]) => `${name}: ${data.assets} asset(s), ${data.views} views, ${data.interactions} interactions, ${data.registrations} registrations.`).join("\n") || "No channel performance data was recorded."}`,
    `Gaps and limits\n${metrics.dataLimitations.join(" ")}`,
    "Recommended next actions\nRecommendation: connect and verify any remaining delivery, paid-media, and PR data sources before comparing performance across those channels.",
  ].join("\n\n");
  const { error } = await admin.from("marketing_reports").insert({
    organization_id: organizationId, period_type, period_start, period_end,
    metrics, narrative: completion?.text ?? fallback, model: completion?.model ?? "workspace-summary",
    created_by: createdBy, generated_by_schedule: scheduled,
  });
  if (scheduled && error?.code === "23505") return;
  if (error) throw new Error(`Could not save report: ${error.message}`);
  if (completion) await admin.from("ai_generations").insert({ organization_id: organizationId, kind: "marketing_report", model: completion.model });
}
