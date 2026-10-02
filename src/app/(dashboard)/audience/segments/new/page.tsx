import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { listPrograms } from "@/lib/audience/segments";
import { SegmentForm } from "@/components/audience/segment-form";

export const metadata: Metadata = { title: "New segment" };

export default async function NewSegmentPage() {
	const orgId = await getCallerOrganizationId();
	if (!orgId) redirect("/onboarding");

	const programs = await listPrograms(orgId);

	return (
		<div className="workspace-page mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
			<header>
				<p className="dateline">New segment</p>
				<h1>
					Define an audience
				</h1>
				<p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">
					Needs, motivations, and preferred formats ground every AI
					recommendation for this audience.
				</p>
			</header>
			<SegmentForm programs={programs.map((p) => ({ id: p.id, name: p.name }))} />
		</div>
	);
}
