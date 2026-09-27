import { NextResponse } from "next/server";
import { generateScheduledReports } from "@/jobs/scheduled-reports";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await generateScheduledReports()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scheduled reports failed." }, { status: 500 });
  }
}

export async function POST(request: Request) { return GET(request); }
