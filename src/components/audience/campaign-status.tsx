"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCampaignStatus } from "@/actions/content";
import { Button } from "@/components/ui/button";

export function CampaignStatus({ campaignId, status }: { campaignId: string; status: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const next: Array<"active" | "paused" | "completed"> = status === "draft"
    ? ["active"]
    : status === "active"
      ? ["paused", "completed"]
      : status === "paused"
        ? ["active", "completed"]
        : [];
  if (!next.length) return null;
  const label = (value: string) => ({ active: "Activate", paused: "Pause", completed: "Complete" })[value] ?? value;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
      {next.map((value) => (
        <Button key={value} type="button" size="sm" variant={value === "completed" ? "ghost" : "outline"} disabled={busy} onClick={() => {
          setError("");
          startTransition(async () => {
            const result = await setCampaignStatus(campaignId, value);
            if (!result.ok) setError(result.error ?? "Could not update campaign.");
            else router.refresh();
          });
        }}>{busy ? "Saving…" : label(value)}</Button>
      ))}
    </div>
  );
}
