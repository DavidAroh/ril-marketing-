import type { Metadata } from "next";
import Link from "next/link";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getAiIntegration } from "@/lib/ai/provider";
import { MarketingAssistant } from "@/components/assistant/marketing-assistant";

export const metadata: Metadata = { title: "Marketing Assistant" };

export default async function AssistantPage() {
  const organizationId = await getCallerOrganizationId();
  const integration = organizationId ? await getAiIntegration(organizationId) : null;
  const aiConnected = integration?.status === "connected" && integration.hasKey;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 md:gap-7">
      <header>
        <p className="dateline">Audience intelligence · operations</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Marketing Assistant</h1>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">Turn live audience and campaign signals into a clear next step for RIL.</p>
      </header>
      {!aiConnected ? <p className="text-sm text-muted-foreground">No AI provider is connected. You can still view a live workspace summary; connect one in <Link href="/settings/ai" className="text-primary hover:underline">AI &amp; Integrations</Link> for grounded natural-language recommendations.</p> : null}
      <MarketingAssistant aiConnected={Boolean(aiConnected)} />
    </div>
  );
}
