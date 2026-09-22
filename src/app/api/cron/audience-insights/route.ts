import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAudienceInsights } from "@/jobs/audience-insights/generate";

/**
 * Protected cron trigger (§12): POST /api/cron/audience-insights
 * Auth: `Authorization: Bearer <CRON_SECRET>`. Never expose unauthenticated.
 * On Vercel, schedule via vercel.json crons.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: orgs } = await admin.from("organizations").select("id").limit(100);
    const orgIds = ((orgs ?? []) as Array<{ id: string }>).map((o) => o.id);

    const results = [];
    for (const organizationId of orgIds) {
      results.push(await generateAudienceInsights({ organizationId }));
    }
    return NextResponse.json({ ok: true, runs: results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with a Bearer CRON_SECRET." },
    { status: 405 }
  );
}
