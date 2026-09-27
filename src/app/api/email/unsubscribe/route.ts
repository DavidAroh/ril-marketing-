import { NextResponse } from "next/server";
import { unsubscribeFromMarketing } from "@/lib/email/unsubscribe";

const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
function tokenFrom(request: Request) { return new URL(request.url).searchParams.get("token") ?? ""; }

export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return new NextResponse("<h1>Link not found</h1>", { status: 404, headers });
  return new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Email preferences</title><body style="font:16px system-ui;max-width:38rem;margin:12vh auto;padding:1.5rem;color:#212120"><h1>Unsubscribe from marketing emails?</h1><p>Confirm to stop Renaissance Innovation Labs marketing updates for this address. This will not change your account access.</p><form method="post" action="/api/email/unsubscribe?token=${encodeURIComponent(token)}"><button style="padding:.7rem 1rem;border:1px solid #777;background:white;font:inherit;cursor:pointer" type="submit">Unsubscribe</button></form></body></html>`, { headers });
}

export async function POST(request: Request) {
  const token = tokenFrom(request);
  const done = await unsubscribeFromMarketing(token);
  if (!done) return new NextResponse("<h1>Link not found</h1><p>This link may have expired or already been removed.</p>", { status: 404, headers });
  return new NextResponse("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Unsubscribed</title><body style=\"font:16px system-ui;max-width:38rem;margin:12vh auto;padding:1.5rem;color:#212120\"><h1>You are unsubscribed</h1><p>Renaissance Innovation Labs marketing updates will no longer be sent to this address.</p></body></html>", { headers });
}
