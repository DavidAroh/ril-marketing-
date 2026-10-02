import { describe, expect, it } from "vitest";
import { parsePublicLandingPageKey, publicLandingPagePath } from "./landing-page-url";

const id = "0ae379a3-9723-4780-869a-51dbee4dc256";

describe("public landing page URLs", () => {
  it("keeps pages with the same slug distinct", () => {
    const first = publicLandingPagePath({ slug: "founder-programme", id });
    const second = publicLandingPagePath({ slug: "founder-programme", id: "f7c75156-1bb4-49b7-823f-109746355364" });
    expect(first).not.toBe(second);
    expect(parsePublicLandingPageKey(first.slice(3))).toEqual({ slug: "founder-programme", id });
  });

  it("does not treat a plain slug as a page ID route", () => {
    expect(parsePublicLandingPageKey("founder-programme")).toBeNull();
  });
});
