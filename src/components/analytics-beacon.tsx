"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Survives StrictMode double-fires: one beacon per real route change. */
let lastTrackedPath: string | null = null;

/**
 * Anonymous pageview beacon (§6.26). Mounted once in the root layout, so the
 * landing page, auth screens and the app all report. Best-effort: analytics
 * must never break a page, so failures are swallowed.
 */
export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === lastTrackedPath) return;
    lastTrackedPath = pathname;
    void fetch("/api/track/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
