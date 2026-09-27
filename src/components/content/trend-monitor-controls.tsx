"use client";

import { useActionState } from "react";
import { saveTrendMonitoringSettings, syncTrendsNow, type ActionResult } from "@/actions/content";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/format";

export function TrendMonitorControls({ enabled, lastSyncedAt }: { enabled: boolean; lastSyncedAt: string | null }) {
  const [settingsState, settingsAction, settingsPending] = useActionState<ActionResult | null, FormData>(async (_state, form) => saveTrendMonitoringSettings(form), null);
  const [syncState, syncAction, syncPending] = useActionState<ActionResult | null, FormData>(async () => syncTrendsNow(), null);
  return (
    <section className="slip flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0"><p className="dateline">Source monitoring · curated public RSS</p><p className="mt-1 text-sm text-muted-foreground">TechCabal and Disrupt Africa · daily sync · all imported stories wait for editorial review.</p><p className="mt-1 text-xs text-muted-foreground">{enabled ? "Daily monitoring is on." : "Monitoring is paused until an authorised manager enables it."} AI enrichment uses the connected workspace model.{lastSyncedAt ? ` Last sync: ${formatDay(lastSyncedAt)}.` : " Not synced yet."}</p></div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <form action={settingsAction}><input type="hidden" name="enabled" value={enabled ? "false" : "true"} /><Button type="submit" size="sm" variant="outline" disabled={settingsPending}>{settingsPending ? "Saving…" : enabled ? "Pause daily sync" : "Enable daily sync"}</Button></form>
        <form action={syncAction}><Button type="submit" size="sm" disabled={!enabled || syncPending}>{syncPending ? "Checking feeds…" : "Sync now"}</Button></form>
      </div>
      <div className="w-full sm:basis-full">
        {settingsState?.ok === false ? <p role="alert" className="text-xs text-destructive">{settingsState.error}</p> : settingsState?.ok ? <p role="status" className="text-xs text-muted-foreground">Monitoring setting saved.</p> : null}
        {syncState?.ok === false ? <p role="alert" className="text-xs text-destructive">{syncState.error}</p> : syncState?.ok ? <p role="status" className="text-xs text-muted-foreground">{syncState.message}</p> : null}
      </div>
    </section>
  );
}
