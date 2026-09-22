import { describe, expect, it } from "vitest";
import {
  isRegistrationToken,
  isReviewerRole,
  kpiFraction,
  newRegistrationToken,
  reviewTaskTitle,
} from "@/lib/audience/guards";

describe("isReviewerRole", () => {
  it("admits approval tiers and rejects plain members", () => {
    for (const role of ["owner", "admin", "marketing_manager", "leadership"]) {
      expect(isReviewerRole(role)).toBe(true);
    }
    expect(isReviewerRole("member")).toBe(false);
    expect(isReviewerRole(null)).toBe(false);
    expect(isReviewerRole(undefined)).toBe(false);
  });
});

describe("kpiFraction", () => {
  it("clamps progress and handles missing data", () => {
    expect(kpiFraction(600, 1200)).toBe(0.5);
    expect(kpiFraction(5000, 1200)).toBe(1);
    expect(kpiFraction(null, 1200)).toBe(null);
    expect(kpiFraction(10, 0)).toBe(null);
  });
});

describe("reviewTaskTitle", () => {
  it("names the review with its distinguishing dimensions", () => {
    expect(
      reviewTaskTitle({ category: "FORMAT_REGISTRATION", format: "short-form video" })
    ).toBe("Review FORMAT_REGISTRATION · short-form video");
    expect(reviewTaskTitle({ category: "TOPIC_ENGAGEMENT" })).toBe(
      "Review TOPIC_ENGAGEMENT"
    );
  });
});

describe("registration tokens", () => {
  it("mints tokens that pass validation, and rejects impostors", () => {
    const token = newRegistrationToken();
    expect(isRegistrationToken(token)).toBe(true);
    expect(isRegistrationToken("not-a-token")).toBe(false);
    expect(isRegistrationToken(null)).toBe(false);
    expect(isRegistrationToken("ril_")).toBe(false);
  });
});
