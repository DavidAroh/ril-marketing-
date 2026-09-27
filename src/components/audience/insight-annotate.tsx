"use client";

import { useActionState } from "react";
import { annotateInsight, type ReviewResult } from "@/actions/audience/insights";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Attach a review note to an insight without changing its gate state. */
export function InsightAnnotate({
	insightId,
	note,
}: {
	insightId: string;
	note?: string | null;
}) {
	const [state, action, pending] = useActionState<ReviewResult | null, FormData>(
		async (_prev, fd) => annotateInsight(insightId, String(fd.get("note") ?? "")),
		null
	);

	return (
		<form action={action} className="flex flex-col gap-2">
			<label htmlFor="insight-note" className="dateline">
				Review note
			</label>
			<Textarea
				id="insight-note"
				name="note"
				rows={3}
				maxLength={2000}
				defaultValue={note ?? ""}
				placeholder="Context for the next reviewer…"
			/>
			{state?.ok === false ? (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			) : null}
			{state?.ok ? (
				<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
					Note saved.
				</p>
			) : null}
			<Button type="submit" size="sm" variant="outline" className="w-fit" disabled={pending}>
				{pending ? "Saving…" : "Save note"}
			</Button>
		</form>
	);
}
