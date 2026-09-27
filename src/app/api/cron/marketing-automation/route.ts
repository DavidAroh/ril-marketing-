import { NextResponse } from "next/server";
import { processMarketingAutomation } from "@/jobs/marketing-automation";

export const maxDuration = 300;

/** Protected, retryable marketing automation worker. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await processMarketingAutomation(2)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Automation worker failed." }, { status: 500 });
  }
}

// Vercel Cron uses GET and supplies CRON_SECRET in Authorization.
export async function GET(request: Request) { return POST(request); }
