"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { queueEmailCampaign, sendEmailCampaignBatch } from "@/actions/email";
import { Button } from "@/components/ui/button";

export function EmailDeliveryActions({ campaignId, status, hasRecipients }: { campaignId: string; status: string; hasRecipients: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  function run(action: "queue" | "send") {
    if (action === "send" && !window.confirm("Send the next batch of up to 20 campaign emails to opted-in recipients now?")) return;
    setMessage(""); setError(false);
    startTransition(async () => {
      const result = action === "queue" ? await queueEmailCampaign(campaignId) : await sendEmailCampaignBatch(campaignId);
      if (!result.ok) { setError(true); setMessage(result.error ?? "Email delivery action failed."); return; }
      setMessage(result.message ?? "Email delivery updated.");
      router.refresh();
    });
  }
  return <div className="flex flex-wrap items-center gap-2">
    {status === "approved" ? <Button type="button" size="sm" variant="outline" disabled={busy || !hasRecipients} onClick={() => run("queue")}>{busy ? "Preparing…" : "Queue approved campaign"}</Button> : null}
    {status === "scheduled" ? <Button type="button" size="sm" disabled={busy} onClick={() => run("send")}>{busy ? "Sending…" : "Send next batch now · up to 20"}</Button> : null}
    {message ? <p role={error ? "alert" : "status"} className={error ? "basis-full text-xs text-destructive" : "basis-full text-xs text-muted-foreground"}>{message}</p> : null}
  </div>;
}
