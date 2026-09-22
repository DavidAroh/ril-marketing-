import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { createRegistrationLink } from "@/lib/audience/attribution";

const mintSchema = z.object({
  assetId: z.string().uuid("assetId must be a UUID"),
  channel: z.string().trim().min(1).max(60),
});

/** POST /api/registration-links { assetId, channel } — mint a tracked token. */
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
    const parsed = mintSchema.safeParse(body);
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
    const link = await createRegistrationLink(
      organizationId,
      parsed.data.assetId,
      parsed.data.channel
    );
    return NextResponse.json({ ok: true, token: link.token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
