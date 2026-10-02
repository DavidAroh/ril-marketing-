import { NextResponse } from "next/server";
import { processNurtureBatch } from "@/jobs/lead-nurture";

export const maxDuration = 300;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await processNurtureBatch({ limit: 100 })) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Lead nurture worker failed." }, { status: 500 }); }
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
