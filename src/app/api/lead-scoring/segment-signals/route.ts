import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getSegmentScoreSignals } from "@/lib/audience/lead-signals";
import { segmentSignalsQuerySchema } from "@/lib/validation/audience";

/**
 * GET /api/lead-scoring/segment-signals?segmentId=...
 * PRD §6.15: segment-level historical conversion patterns for AI Lead Scoring.
 * Quality rates only — never raw volume.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = segmentSignalsQuerySchema.safeParse({
      segmentId: url.searchParams.get("segmentId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid query." },
        { status: 400 }
      );
    }

    const organizationId = await getCallerOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No organization membership." }, { status: 403 });
    }

    const signals = await getSegmentScoreSignals(organizationId, parsed.data.segmentId);
    return NextResponse.json(signals);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
