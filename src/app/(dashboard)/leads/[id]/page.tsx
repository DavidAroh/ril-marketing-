import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getLead } from "@/lib/leads/leads";
import { LeadActions } from "@/components/leads/lead-actions";
import { StatusStamp } from "@/components/ui/status-stamp";
import { formatDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { LeadFollowUps } from "@/components/leads/lead-follow-ups";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const orgId = await getCallerOrganizationId();
	if (!orgId) notFound();

	const lead = await getLead(orgId, id);
	if (!lead) notFound();
	const supabase = await createClient();
	const { data: followUps } = await supabase.from("lead_follow_ups").select("id,title,due_at,outcome,completed_at,created_at").eq("organization_id", orgId).eq("lead_id", id).order("completed_at", { ascending: true, nullsFirst: true }).order("due_at", { ascending: true, nullsFirst: false }).limit(30);

	const facts: Array<{ label: string; value: string }> = [
		{ label: "Email", value: lead.email ?? "—" },
		{ label: "Phone", value: lead.phone ?? "—" },
		{ label: "Organisation", value: lead.organisation ?? "—" },
		{ label: "Interest", value: lead.interest ?? "—" },
		{ label: "Segment", value: lead.segment?.name ?? "Untagged" },
		{ label: "Source", value: lead.source_platform ?? "—" },
		{ label: "Marketing updates", value: lead.marketing_consent ? "Opted in" : "Not opted in" },
		{ label: "Campaign", value: lead.campaign_id ? "Linked to campaign" : "—" },
		{ label: "Captured", value: formatDay(lead.created_at) },
	];

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			<header>
				<Link
					href="/leads"
					className="dateline transition-colors hover:text-foreground"
				>
					← Leads
				</Link>
				<div className="mt-1.5 flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						{lead.name || lead.email || "Lead"}
					</h1>
					{lead.score ? <StatusStamp status={lead.score} /> : null}
					{lead.is_qualified ? <StatusStamp status="qualified" /> : null}
					{lead.is_converted ? <StatusStamp status="approved">Converted</StatusStamp> : null}
				</div>
			</header>

			<div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
				<section className="slip flex flex-col lg:col-span-2">
					<div className="ledger flex flex-col">
						{facts.map((f) => (
							<div
								key={f.label}
								className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6"
							>
								<span className="dateline">{f.label}</span>
								<span className="max-w-[60%] truncate text-sm font-medium text-foreground">
									{f.value}
								</span>
							</div>
						))}
					</div>
					{lead.score_reason ? (
						<div className="border-t border-border px-5 py-4 sm:px-6">
							<p className="dateline">Why this score</p>
							<p className="mt-1.5 text-sm leading-6 text-foreground">
								{lead.score_reason}
							</p>
						</div>
					) : null}
				</section>

				<section className="slip flex h-fit flex-col gap-4 p-5 sm:p-6">
					<div>
						<p className="dateline">Follow-up</p>
						<h2 className="mt-1 text-base font-bold">Work this lead</h2>
					</div>
					<LeadActions
						leadId={lead.id}
						stage={lead.funnel_stage}
						isQualified={lead.is_qualified}
						notes={lead.notes}
						hasOwner={Boolean(lead.owner_id)}
					/>
				</section>
			</div>
			<LeadFollowUps leadId={lead.id} items={followUps ?? []} />
		</div>
	);
}
