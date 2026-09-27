import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getActivity } from "@/lib/content/activities";
import { listSegments } from "@/lib/audience/segments";
import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/content/activity-form";

export const metadata: Metadata = { title: "Edit activity" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await getCallerOrganizationId();
  if (!organizationId) notFound();
  const activity = await getActivity(organizationId, id);
  if (!activity) notFound();
  const [segments, supabase] = await Promise.all([listSegments(organizationId).catch(() => []), createClient()]);
  const { data: campaigns } = await supabase.from("campaigns").select("id,name").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
      <header><Link href={`/activities/${activity.id}`} className="dateline hover:text-foreground">← Activity</Link><p className="dateline mt-3">Source record</p><h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Edit activity</h1><p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">Keep the original activity current so future content and calendar recommendations use the right facts.</p></header>
      <ActivityForm activity={activity} segments={segments.map((segment) => ({ id: segment.id, name: segment.name }))} campaigns={campaigns ?? []} />
    </div>
  );
}
