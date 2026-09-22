import { describe, expect, it } from "vitest";
import {
  classifyDevice,
  computeLiveVisitorStats,
  EMPTY_LIVE_VISITOR_STATS,
  LIVE_WINDOW_MINUTES,
  type VisitorEvent,
} from "./visitor-stats";

const NOW = Date.parse("2026-09-22T12:00:00Z");

function event(
  visitorId: string | null,
  minutesAgo: number,
  device = "Desktop"
): VisitorEvent {
  return { createdAt: NOW - minutesAgo * 60_000, visitorId, device };
}

describe("classifyDevice", () => {
  it("labels phones, tablets and desktops", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
      )
    ).toBe("Mobile");
    expect(
      classifyDevice(
        "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
      )
    ).toBe("Tablet");
    expect(
      classifyDevice(
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile/15E148"
      )
    ).toBe("Mobile");
    expect(
      classifyDevice(
        "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Safari/537.36"
      )
    ).toBe("Tablet");
    expect(
      classifyDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0")
    ).toBe("Desktop");
  });

  it("labels automation as bot and never counts it", () => {
    expect(classifyDevice("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(
      "bot"
    );
    expect(classifyDevice("curl/8.5.0")).toBe("bot");
    expect(
      classifyDevice("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/128.0.0.0")
    ).toBe("bot");
    expect(classifyDevice("")).toBe("Other");
  });
});

describe("computeLiveVisitorStats", () => {
  it("returns the empty shape when nobody is online", () => {
    expect(computeLiveVisitorStats([], NOW)).toEqual(EMPTY_LIVE_VISITOR_STATS);
    expect(EMPTY_LIVE_VISITOR_STATS.windowMinutes).toBe(LIVE_WINDOW_MINUTES);
  });

  it("counts distinct visitors in the live window and ignores older rows", () => {
    const stats = computeLiveVisitorStats(
      [event("a", 1), event("a", 2), event("b", 4), event("c", 30)],
      NOW
    );
    expect(stats.count).toBe(2);
    expect(stats.deltaPct).toBeNull();
  });

  it("drops bot rows and rows without a visitor id", () => {
    const stats = computeLiveVisitorStats(
      [event("crawler", 1, "bot"), event(null, 1, "Mobile")],
      NOW
    );
    expect(stats).toEqual(EMPTY_LIVE_VISITOR_STATS);
  });

  it("splits devices per visitor using the newest sighting, order-independent", () => {
    const reordered = (events: VisitorEvent[]) =>
      computeLiveVisitorStats([...events].reverse(), NOW);

    const events = [
      event("a", 2, "Mobile"),
      event("b", 3, "Mobile"),
      event("c", 1, "Desktop"),
      // a revisited on desktop a minute ago — newest device wins
      event("a", 1, "Desktop"),
    ];
    const expected = [
      { label: "Desktop", share: 67, count: 2 },
      { label: "Mobile", share: 33, count: 1 },
    ];
    expect(computeLiveVisitorStats(events, NOW).devices).toEqual(expected);
    expect(reordered(events).devices).toEqual(expected);
  });

  it("computes a signed delta against the previous window", () => {
    // 2 now vs 4 in the previous window = -50%
    expect(
      computeLiveVisitorStats(
        [event("a", 1), event("b", 2), event("c", 6), event("d", 7), event("e", 8), event("f", 9)],
        NOW
      ).deltaPct
    ).toBe(-50);
    // 3 now vs 2 previously = +50%
    expect(
      computeLiveVisitorStats(
        [event("a", 1), event("b", 2), event("c", 3), event("d", 7), event("e", 8)],
        NOW
      ).deltaPct
    ).toBe(50);
  });
});
