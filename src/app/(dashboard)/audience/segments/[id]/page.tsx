import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getSegment, listPrograms } from "@/lib/audience/segments";
import { listSegmentInsights } from "@/lib/audience/insights";
import { SegmentForm } from "@/components/audience/segment-form";
import { SegmentDelete } from "@/components/audience/segment-delete";
import { StatusStamp } from "@/components/ui/status-stamp";

export const metadata: Metadata = { title: "Audience segment" };

export default async function SegmentDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const orgId = await getCallerOrganizationId();
	if (!orgId) notFound();

	const segment = await getSegment(orgId, id);
	if (!segment) notFound();

	const [programs, insights] = await Promise.all([
		listPrograms(orgId).catch(() => []),
		listSegmentInsights(orgId, id).catch(() => []),
	]);

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<Link
						href="/audience/segments"
						className="dateline transition-colors hover:text-foreground"
					>
						← Segments
					</Link>
					<h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
						{segment.name}
					</h1>
				</div>
				<SegmentDelete segmentId={segment.id} />
			</header>

			<div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
				<div className="lg:col-span-2">
					<SegmentForm
						programs={programs.map((p) => ({ id: p.id, name: p.name }))}
						segment={{
							id: segment.id,
							name: segment.name,
							description: segment.description,
							needs_motivations: segment.needs_motivations,
							preferred_formats: segment.preferred_formats,
							preferred_platforms: segment.preferred_platforms,
							preferred_hooks: segment.preferred_hooks,
							programIds: segment.programs.map((p) => p.id),
						}}
					/>
				</div>

				<section className="slip flex h-fit flex-col p-5 sm:p-6">
					<p className="dateline">Insights for this segment</p>
					{insights.length ? (
						<ul className="ledger mt-2 flex flex-col">
							{insights.map((ins) => (
								<li key={ins.id} className="py-2.5">
									<Link
										href={`/audience/insights/${ins.id}`}
										className="group flex flex-col gap-1"
									>
										<span className="text-sm font-medium leading-snug text-foreground group-hover:text-primary">
											{ins.summary}
										</span>
										<StatusStamp status={ins.status} />
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-2 text-sm text-muted-foreground">
							No insights yet. They arrive after the next analysis pass.
						</p>
					)}
				</section>
			</div>
		</div>
	);
}
