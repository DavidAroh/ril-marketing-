import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { buildContentBrief } from "@/lib/audience/brief";
import { briefRequestSchema } from "@/lib/validation/audience";

/**
 * POST /api/content-repurposing/brief  { activityId, limit? }
 * PRD §6.3 + acceptance criterion 3: the repurposing engine's recommendation
 * step resolves Activity → Segment → APPROVED insights. Advisory only — the
 * engine still generates drafts; this endpoint only supplies proven guidance.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
    }
    const parsed = briefRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const organizationId = await getCallerOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No organization membership." }, { status: 403 });
    }

    const brief = await buildContentBrief(
      organizationId,
      parsed.data.activityId,
      parsed.data.limit
    );
    return NextResponse.json(brief);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    const status = message.includes("not found") || message.includes("not tagged")
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
