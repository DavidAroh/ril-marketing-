import "server-only";
import { createClient } from "@/lib/supabase/server";

export { reviewTaskTitle } from "@/lib/audience/guards";

export interface Task {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  status: "open" | "done";
  insight_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OpenTask extends Task {
  insight_category: string | null;
  insight_status: string | null;
}

/** Command-Centre "needs attention" queue (PRD §6.1, §7 Task). */
export async function listOpenTasks(
  organizationId: string,
  limit = 10
): Promise<OpenTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, insight:audience_insights(category, status)"
    )
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);
  return ((data ?? []) as Array<
    Task & { insight: { category: string; status: string } | null }
  >).map(({ insight, ...task }) => ({
    ...task,
    insight_category: insight?.category ?? null,
    insight_status: insight?.status ?? null,
  }));
}
