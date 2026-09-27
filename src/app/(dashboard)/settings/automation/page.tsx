import type { Metadata } from "next";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { createClient } from "@/lib/supabase/server";
import { saveAutomationSettings, retryAutomationEvent } from "@/actions/automation";
import { Button } from "@/components/ui/button";
import { StatusStamp } from "@/components/ui/status-stamp";
import { todayDateline } from "@/lib/format";

export const metadata: Metadata = { title: "Marketing Automation" };
type QueueEvent = { id:string; event_type:string; record_id:string; status:string; attempts:number; result:Record<string, unknown>; error:string|null; created_at:string; processed_at:string|null };

export default async function AutomationPage() {
  const organizationId = await getCallerOrganizationId().catch(() => null);
  const supabase = await createClient();
  const [{ data: setting }, { data: events }] = organizationId ? await Promise.all([
    supabase.from("automation_settings").select("activity_to_drafts_enabled,updated_at").eq("organization_id", organizationId).maybeSingle<{activity_to_drafts_enabled:boolean;updated_at:string}>(),
    supabase.from("automation_events").select("id,event_type,record_id,status,attempts,result,error,created_at,processed_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50),
  ]) : [{ data: null }, { data: [] }];
  const enabled = setting?.activity_to_drafts_enabled ?? false;
  const items = (events ?? []) as QueueEvent[];
  return <div className="flex flex-col gap-5 md:gap-7">
    <header><p className="dateline">{todayDateline()} · human-gated orchestration</p><h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Automation</h1><p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">Choose which event chain can run and review each job’s result. Generated public content stays in Draft or AI Generated status for human approval.</p></header>
    <section className="slip p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="dateline">Activity created → campaign drafts</p><h2 className="mt-1 text-lg font-bold">Activity-to-drafts automation</h2><p className="mt-1 max-w-[68ch] text-sm leading-6 text-muted-foreground">For new activities, create a draft campaign, audience-grounded social and newsletter assets, an email draft and a landing-page draft. Nothing is sent, published, or approved automatically.</p></div><StatusStamp status={enabled ? "active" : "paused"}>{enabled ? "ENABLED" : "DISABLED"}</StatusStamp></div>
      <form action={saveAutomationSettings} className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4"><input type="hidden" name="activity_to_drafts_enabled" value={enabled ? "false" : "true"} /><Button type="submit" variant={enabled ? "outline" : "default"}>{enabled ? "Disable for future activities" : "Enable for future activities"}</Button><span className="text-xs leading-5 text-muted-foreground">Only owner, admin and marketing manager roles can change this setting. Existing activities are not retroactively processed.</span></form>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">The protected worker handles up to two queued events per run. With the included daily schedule, newly queued work may wait until the next run. Lead events are recorded and deferred until a verified email provider and consent-safe nurture workflow are available.</p>
    </section>
    <section className="flex flex-col gap-3"><div><p className="dateline">Queue history · {items.length} recent jobs</p><h2 className="mt-1 text-lg font-bold">Automation events</h2></div>
      {items.length === 0 ? <div className="slip p-5 text-sm text-muted-foreground">No events queued. Enable activity automation, then add a new activity to start the chain.</div> : <ul className="ledger border-y border-border">{items.map((item)=><li key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusStamp status={item.status} /><span className="text-sm font-semibold">{item.event_type.replaceAll("_", " ")}</span><span className="dateline">{new Date(item.created_at).toLocaleString("en-GB")}</span></div>{item.error ? <p className="mt-1 text-sm text-destructive">{item.error}</p> : null}{item.status === "completed" || item.status === "deferred" ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{JSON.stringify(item.result)}</p> : null}</div>{item.status === "failed" ? <form action={retryAutomationEvent}><input type="hidden" name="id" value={item.id} /><Button size="sm" variant="outline" type="submit">Retry</Button></form> : null}</li>)}</ul>}
    </section>
  </div>;
}
