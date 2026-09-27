"use client";

import { useActionState } from "react";
import {
	setLeadStage,
	saveLeadNotes,
	setLeadQualified,
	type ActionResult,
} from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STAGES = [
	"awareness",
	"engagement",
	"captured",
	"nurturing",
	"converted",
	"retention",
] as const;

const fieldClass =
	"h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const label = (s: string) => s.replace(/\b\w/, (c) => c.toUpperCase());

const ok = (s: ActionResult | null) => s?.ok === true;
const err = (s: ActionResult | null) => (s?.ok === false ? s.error : null);

export function LeadActions({
	leadId,
	stage,
	isQualified,
	notes,
	hasOwner,
}: {
	leadId: string;
	stage: string;
	isQualified: boolean;
	notes: string | null;
	hasOwner: boolean;
}) {
	const [stageState, stageAction, stagePending] = useActionState<
		ActionResult | null,
		FormData
	>(async (_p, fd) => setLeadStage(leadId, String(fd.get("stage") ?? "")), null);

	const [qualState, qualAction, qualPending] = useActionState<
		ActionResult | null,
		FormData
	>(async () => setLeadQualified(leadId, !isQualified), null);

	const [notesState, notesAction, notesPending] = useActionState<
		ActionResult | null,
		FormData
	>(async (_p, fd) => saveLeadNotes(leadId, fd), null);

	return (
		<div className="flex flex-col gap-5">
			<form action={stageAction} className="flex flex-col gap-2">
				<label htmlFor="lead-stage" className="dateline">
					Funnel stage
				</label>
				<select
					id="lead-stage"
					name="stage"
					defaultValue={stage}
					className={fieldClass}
				>
					{STAGES.map((s) => (
						<option key={s} value={s}>
							{label(s)}
						</option>
					))}
				</select>
				<Button type="submit" size="sm" className="w-fit" disabled={stagePending}>
					{stagePending ? "Saving…" : "Update stage"}
				</Button>
				{err(stageState) ? (
					<p role="alert" className="text-sm text-destructive">
						{err(stageState)}
					</p>
				) : ok(stageState) ? (
					<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
						Stage updated · score recalculated.
					</p>
				) : null}
			</form>

			<form action={qualAction} className="flex flex-col gap-2 border-t border-border pt-4">
				<span className="dateline">Qualification</span>
				<Button
					type="submit"
					size="sm"
					variant={isQualified ? "outline" : "default"}
					className="w-fit"
					disabled={qualPending}
				>
					{qualPending
						? "Saving…"
						: isQualified
							? "Mark not qualified"
							: "Mark qualified"}
				</Button>
				{err(qualState) ? (
					<p role="alert" className="text-sm text-destructive">
						{err(qualState)}
					</p>
				) : null}
			</form>

			<form action={notesAction} className="flex flex-col gap-2 border-t border-border pt-4">
				<label htmlFor="lead-notes" className="dateline">
					Follow-up notes
				</label>
				<Textarea
					id="lead-notes"
					name="notes"
					rows={4}
					maxLength={5000}
					defaultValue={notes ?? ""}
					placeholder="Who reached out, what was said, next step…"
				/>
				{hasOwner ? (
					<label className="flex items-center gap-2 text-sm text-muted-foreground">
						<input
							type="checkbox"
							name="owner_cleared"
							className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
						Release ownership on save
					</label>
				) : null}
				<Button type="submit" size="sm" variant="outline" className="w-fit" disabled={notesPending}>
					{notesPending ? "Saving…" : "Save notes"}
				</Button>
				{err(notesState) ? (
					<p role="alert" className="text-sm text-destructive">
						{err(notesState)}
					</p>
				) : ok(notesState) ? (
					<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
						Notes saved.
					</p>
				) : null}
			</form>
		</div>
	);
}
