import { NextResponse } from "next/server";
import { syncIndustryTrends } from "@/jobs/trend-monitoring";

export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await syncIndustryTrends()) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Trend monitoring failed." }, { status: 500 }); }
}

// Vercel Cron uses GET and supplies CRON_SECRET in Authorization.
export async function GET(request: Request) { return POST(request); }
