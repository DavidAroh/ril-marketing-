import { describe, expect, it } from "vitest";
import {
  attachEventIds,
  groupEventsByAsset,
  rollupCampaign,
  summarizeFormats,
} from "@/lib/audience/analytics";
import {
  authSchema,
  briefRequestSchema,
  orgSchema,
} from "@/lib/validation/audience";

describe("groupEventsByAsset", () => {
  it("groups event ids by asset and skips null assets", () => {
    const map = groupEventsByAsset([
      { id: "e1", content_asset_id: "a1" },
      { id: "e2", content_asset_id: "a1" },
      { id: "e3", content_asset_id: null },
    ]);
    expect(map.get("a1")).toEqual(["e1", "e2"]);
    expect(map.has("null")).toBe(false);
  });
});

describe("attachEventIds", () => {
  it("links drafts back to their source events (traceability)", () => {
    const drafts = attachEventIds(
      [
        {
          source_content_asset_ids: ["a1"],
          source_event_ids: [],
          source_lead_ids: [],
        },
      ],
      new Map([["a1", ["e1", "e2"]]])
    );
    expect(drafts[0].source_event_ids).toEqual(["e1", "e2"]);
  });

  it("caps event ids and never fabricates them", () => {
    const drafts = attachEventIds(
      [
        {
          source_content_asset_ids: ["unknown-asset"],
          source_event_ids: [],
          source_lead_ids: [],
        },
      ],
      new Map()
    );
    expect(drafts[0].source_event_ids).toEqual([]);
  });
});

describe("rollupCampaign", () => {
  it("attributes reach and lead quality through asset links only", () => {
    const stats = rollupCampaign("c1", {
      assets: [
        { id: "a1", campaign_id: "c1", views: 1000, registrations: 50 },
        { id: "a2", campaign_id: "other", views: 9999, registrations: 999 },
      ],
      leads: [
        { id: "l1", source_content_asset_id: "a1", is_qualified: true, is_converted: true },
        { id: "l2", source_content_asset_id: "a1", is_qualified: false, is_converted: false },
        { id: "l3", source_content_asset_id: "a2", is_qualified: true, is_converted: true },
      ],
    });
    expect(stats.assets).toBe(1);
    expect(stats.views).toBe(1000);
    expect(stats.leads).toBe(2);
    expect(stats.qualified_rate).toBe(0.5);
    expect(stats.conversion_rate).toBe(0.5);
  });
});

describe("summarizeFormats", () => {
  it("aggregates engagement and registration rates per format", () => {
    const signals = summarizeFormats([
      { format: "video", views: 100, clicks: 10, shares: 2, comments: 1, saves: 1, registrations: 5 },
      { format: "video", views: 100, clicks: 10, shares: 0, comments: 0, saves: 0, registrations: 5 },
      { format: null, views: 0, clicks: 0, shares: 0, comments: 0, saves: 0, registrations: 0 },
    ]);
    const video = signals.find((s) => s.label === "video");
    expect(video?.engagementRate).toBeCloseTo(24 / 200);
    expect(video?.registrationRate).toBeCloseTo(10 / 200);
    expect(signals.some((s) => s.label === "Unknown")).toBe(true);
  });
});

describe("orgSchema", () => {  it("rejects blank organization names", () => {
    expect(orgSchema.safeParse({ name: " " }).success).toBe(false);
    expect(orgSchema.safeParse({ name: "RIL" }).success).toBe(true);
  });
});

describe("authSchema", () => {
  it("requires an email and a real password", () => {
    expect(authSchema.safeParse({ email: "not-an-email", password: "longenough1" }).success).toBe(false);
    expect(authSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
    expect(authSchema.safeParse({ email: "a@b.com", password: "longenough1" }).success).toBe(true);
  });
});

describe("briefRequestSchema", () => {
  it("requires a UUID activity id", () => {
    expect(briefRequestSchema.safeParse({ activityId: "nope" }).success).toBe(false);
    expect(
      briefRequestSchema.safeParse({
        activityId: "123e4567-e89b-12d3-a456-426614174000",
      }).success
    ).toBe(true);
  });
});
