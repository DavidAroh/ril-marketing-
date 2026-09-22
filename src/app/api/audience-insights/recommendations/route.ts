import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getAudienceRecommendations } from "@/lib/audience/recommendations";
import { recommendationsQuerySchema } from "@/lib/validation/audience";

/**
 * GET /api/audience-insights/recommendations?segmentId=...&limit=10
 * §27: authenticates, checks ownership, returns APPROVED insights only.
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
    const parsed = recommendationsQuerySchema.safeParse({
      segmentId: url.searchParams.get("segmentId"),
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid query." },
        { status: 400 }
      );
    }

    const organizationId = await getCallerOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization membership." },
        { status: 403 }
      );
    }

    const result = await getAudienceRecommendations(
      organizationId,
      parsed.data.segmentId,
      parsed.data.limit
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
