import { describe, expect, it } from "vitest";
import { analyseTopicEngagement } from "@/jobs/audience-insights/topic-engagement";
import { analyseFormatRegistration } from "@/jobs/audience-insights/format-registration";
import { analysePlatformLeadQuality } from "@/jobs/audience-insights/platform-lead-quality";
import { analyseHookCtaEffectiveness } from "@/jobs/audience-insights/hook-cta-effectiveness";
import type { ContentRow, LeadRow } from "@/lib/audience/analytics";

function asset(over: Partial<ContentRow> & { id: string }): ContentRow {
  return {
    organization_id: "org",
    title: over.id,
    topic: null,
    format: null,
    platform: null,
    hook: null,
    cta: null,
    audience_segment_id: "seg",
    views: 100,
    clicks: 5,
    shares: 1,
    comments: 1,
    saves: 1,
    registrations: 0,
    avg_time_seconds: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}

const start = new Date(Date.now() - 30 * 86_400_000);
const end = new Date();

describe("analyseTopicEngagement", () => {
  it("emits an insight for a well-evidenced topic and skips thin topics", () => {
    const assets = [
      ...Array.from({ length: 6 }, (_, i) =>
        asset({ id: `f${i}`, topic: "fundraising", clicks: 20, views: 100 })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        asset({ id: `g${i}`, topic: "general", clicks: 2, views: 100 })
      ),
      asset({ id: "thin", topic: "rare-topic", clicks: 50, views: 100 }),
    ];
    const drafts = analyseTopicEngagement({ assets, rangeStart: start, rangeEnd: end });
    expect(drafts.some((d) => d.topic === "fundraising")).toBe(true);
    expect(drafts.some((d) => d.topic === "rare-topic")).toBe(false);
    expect(drafts[0].category).toBe("TOPIC_ENGAGEMENT");
    expect(drafts[0].sample_size).toBeGreaterThanOrEqual(5);
  });
});

describe("analyseFormatRegistration", () => {
  it("optimises for registration rate, not impressions", () => {
    const assets = [
      ...Array.from({ length: 8 }, (_, i) =>
        asset({ id: `v${i}`, format: "short-form video", views: 100, registrations: 8 })
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        asset({ id: `s${i}`, format: "static post", views: 10_000, registrations: 1 })
      ),
    ];
    const drafts = analyseFormatRegistration({ assets, rangeStart: start, rangeEnd: end });
    expect(drafts.some((d) => d.format === "short-form video")).toBe(true);
    expect(drafts.some((d) => d.format === "static post")).toBe(false);
  });
});

describe("analysePlatformLeadQuality", () => {
  it("ranks quality (qualified rate), not volume", () => {
    const leads: LeadRow[] = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `hq${i}`,
        organization_id: "org",
        email: `hq${i}@x.com`,
        audience_segment_id: "seg",
        source_platform: "linkedin",
        source_content_asset_id: null,
        is_qualified: true,
        is_converted: i < 2,
        created_at: new Date().toISOString(),
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `lv${i}`,
        organization_id: "org",
        email: `lv${i}@x.com`,
        audience_segment_id: "seg",
        source_platform: "low-quality-network",
        source_content_asset_id: null,
        is_qualified: false,
        is_converted: false,
        created_at: new Date().toISOString(),
      })),
    ];
    const drafts = analysePlatformLeadQuality({ leads, assets: [] });
    // High-volume junk platform must not be recommended…
    expect(drafts.some((d) => d.platform === "low-quality-network")).toBe(false);
    // …but the small, high-quality one is (n=8 meets the minimum).
    expect(drafts.some((d) => d.platform === "linkedin")).toBe(true);
  });
});

describe("analyseHookCtaEffectiveness", () => {
  it("returns nothing when no hook/CTA metadata exists (never fabricates)", () => {
    const assets = Array.from({ length: 10 }, (_, i) => asset({ id: `a${i}` }));
    expect(analyseHookCtaEffectiveness({ assets })).toEqual([]);
  });

  it("surfaces strong hook/CTA combos when metadata exists", () => {
    const assets = [
      ...Array.from({ length: 6 }, (_, i) =>
        asset({
          id: `h${i}`,
          hook: "Founder story",
          cta: "Apply now",
          views: 100,
          clicks: 25,
          registrations: 5,
        })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        asset({
          id: `c${i}`,
          hook: "Generic update",
          cta: "Learn more",
          views: 100,
          clicks: 1,
        })
      ),
    ];
    const drafts = analyseHookCtaEffectiveness({ assets });
    expect(drafts.some((d) => d.hook === "Founder story")).toBe(true);
  });
});
