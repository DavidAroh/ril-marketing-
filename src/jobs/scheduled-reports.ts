import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMarketingReport } from "@/lib/reports/generate";

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function completedPeriod(frequency: "weekly" | "monthly", today: Date) {
  if (frequency === "weekly") {
    const daysSinceMonday = (today.getUTCDay() + 6) % 7;
    if (daysSinceMonday !== 0) return null;
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    return { start: isoDay(start), end: isoDay(end) };
  }
  if (today.getUTCDate() !== 1) return null;
  const end = new Date(today);
  end.setUTCDate(0);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return { start: isoDay(start), end: isoDay(end) };
}

export async function generateScheduledReports(now = new Date()) {
  const admin = createAdminClient();
  const { data: schedules, error } = await admin
    .from("report_schedule_settings")
    .select("organization_id,frequency")
    .not("frequency", "is", null)
    .limit(500);
  if (error) throw new Error(`Could not load report schedules: ${error.message}`);

  const results: Array<{ organizationId: string; period: string; status: "created" | "failed"; error?: string }> = [];
  for (const schedule of schedules ?? []) {
    if (schedule.frequency !== "weekly" && schedule.frequency !== "monthly") continue;
    const period = completedPeriod(schedule.frequency, now);
    if (!period) continue;
    try {
      await createMarketingReport(schedule.organization_id, schedule.frequency, period.start, period.end, null, true);
      results.push({ organizationId: schedule.organization_id, period: `${period.start}..${period.end}`, status: "created" });
    } catch (cause) {
      results.push({
        organizationId: schedule.organization_id,
        period: `${period.start}..${period.end}`,
        status: "failed",
        error: cause instanceof Error ? cause.message : "Report generation failed.",
      });
    }
  }
  return { processed: results.length, created: results.filter((item) => item.status === "created").length, failed: results.filter((item) => item.status === "failed").length, results };
}
