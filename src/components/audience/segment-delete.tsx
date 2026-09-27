"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSegment, type ActionResult } from "@/actions/audience/segments";
import { Button } from "@/components/ui/button";

/** Delete a segment, with a two-step confirm. Redirects to the list on success. */
export function SegmentDelete({ segmentId }: { segmentId: string }) {
	const router = useRouter();
	const [confirming, setConfirming] = useState(false);
	const [state, action, pending] = useActionState<ActionResult | null, FormData>(
		async () => deleteSegment(segmentId),
		null
	);

	useEffect(() => {
		if (state?.ok) router.push("/audience/segments");
	}, [state, router]);

	if (!confirming) {
		return (
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="text-destructive hover:text-destructive"
				onClick={() => setConfirming(true)}
			>
				Delete segment
			</Button>
		);
	}

	return (
		<form action={action} className="flex flex-col gap-2">
			<p className="text-sm text-muted-foreground">
				Delete this segment? Insights and activities keep their history.
			</p>
			<div className="flex items-center gap-2">
				<Button type="submit" size="sm" variant="destructive" disabled={pending}>
					{pending ? "Deleting…" : "Confirm delete"}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setConfirming(false)}
					disabled={pending}
				>
					Keep
				</Button>
			</div>
			{state?.ok === false ? (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			) : null}
		</form>
	);
}
