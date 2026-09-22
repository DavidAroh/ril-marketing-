/**
 * Live-visitor computation for the Command Centre's OnlineNow widget (§6.26).
 *
 * Pure functions only — no server imports — so the logic is unit-testable
 * (same split as lib/audience/platform.ts).
 */

/** Rolling window the widget measures: "visitors online in the last 5 minutes". */
export const LIVE_WINDOW_MINUTES = 5;

export type DeviceClass = "Mobile" | "Tablet" | "Desktop" | "Other" | "bot";

export interface VisitorEvent {
  /** When the pageview happened. */
  createdAt: string | number | Date;
  /** Anonymous, cookie-issued visitor id; rows without one are ignored. */
  visitorId: string | null;
  /** Device class decided at ingest — see classifyDevice. */
  device: string;
}

export interface DeviceShare {
  label: string;
  /** Percent of the visitors online right now on this device. */
  share: number;
  count: number;
}

export interface LiveVisitorStats {
  /** Distinct visitors inside the live window. */
  count: number;
  /** Percent change vs the previous window; null when there's no baseline. */
  deltaPct: number | null;
  /** Device split of the current window, largest first. Empty when quiet. */
  devices: DeviceShare[];
  windowMinutes: number;
}

export const EMPTY_LIVE_VISITOR_STATS: LiveVisitorStats = {
  count: 0,
  deltaPct: null,
  devices: [],
  windowMinutes: LIVE_WINDOW_MINUTES,
};

const WINDOW_MS = LIVE_WINDOW_MINUTES * 60_000;

/**
 * Classify a User-Agent into the widget's device buckets. Known automation
 * (crawlers, curl, script UAs) is labelled `bot` and never counted — the
 * metric stays honest: live counts, never dummy data.
 */
export function classifyDevice(userAgent: string): DeviceClass {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "Other";
  if (
    /bot\b|crawler|spider|slurp|curl\/|wget\/|python-requests|okhttp|libwww|headless/.test(
      ua
    )
  ) {
    return "bot";
  }
  if (/ipad|tablet|playbook|silk/.test(ua)) return "Tablet";
  if (/android/.test(ua) && !/mobile/.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|windows phone/.test(ua)) return "Mobile";
  return "Desktop";
}

function toTime(value: string | number | Date): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return Date.parse(value);
}

/**
 * Distinct visitors in the live window, the signed percent change against the
 * previous window (null when there is no baseline — never fabricate one), and
 * the device split of whoever is online. Event order does not matter: each
 * visitor resolves to their newest device.
 */
export function computeLiveVisitorStats(
  events: VisitorEvent[],
  now: number = Date.now()
): LiveVisitorStats {
  const windowStart = now - WINDOW_MS;
  const previousStart = now - 2 * WINDOW_MS;

  /** visitorId -> newest sighting inside the live window. */
  const current = new Map<string, { at: number; device: string }>();
  const previous = new Set<string>();

  for (const event of events) {
    if (!event.visitorId || event.device === "bot") continue;
    const at = toTime(event.createdAt);
    if (Number.isNaN(at)) continue;
    if (at >= windowStart) {
      const seen = current.get(event.visitorId);
      if (!seen || at > seen.at) {
        current.set(event.visitorId, { at, device: event.device });
      }
    } else if (at >= previousStart) {
      previous.add(event.visitorId);
    }
  }

  const deviceCounts = new Map<string, number>();
  for (const { device } of current.values()) {
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
  }

  const count = current.size;
  const devices: DeviceShare[] = [...deviceCounts.entries()]
    .map(([label, deviceCount]) => ({
      label,
      count: deviceCount,
      share: count > 0 ? Math.round((deviceCount / count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  let deltaPct: number | null = null;
  if (count > 0 && previous.size > 0) {
    deltaPct = Math.round(((count - previous.size) / previous.size) * 1000) / 10;
  }

  return { count, deltaPct, devices, windowMinutes: LIVE_WINDOW_MINUTES };
}
