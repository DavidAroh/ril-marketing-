import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  getOAuthProvider,
  isFreshHandshake,
  newStateToken,
} from "@/lib/integrations/oauth";

describe("getOAuthProvider", () => {
  it("registers buffer and rejects unknown keys", () => {
    expect(getOAuthProvider("buffer")?.displayName).toBe("Buffer");
    expect(getOAuthProvider("mailchimp")).toBe(null);
  });
});

describe("handshake state", () => {
  it("mints unique single-use tokens with a 10-minute life", () => {
    const a = newStateToken();
    const b = newStateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
    const fresh = { state: a, createdAt: new Date().toISOString() };
    expect(isFreshHandshake(fresh)).toBe(true);
    expect(
      isFreshHandshake({
        state: a,
        createdAt: new Date(Date.now() - 11 * 60_000).toISOString(),
      })
    ).toBe(false);
    expect(isFreshHandshake(null)).toBe(false);
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds a correct Buffer authorize URL", () => {
    const def = getOAuthProvider("buffer")!;
    const url = new URL(
      buildAuthorizeUrl(def, {
        clientId: "cid",
        redirectUri: "https://app.example/callback",
        state: "s3cr3t",
      })
    );
    expect(url.origin + url.pathname).toBe("https://login.buffer.com/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("s3cr3t");
  });
});
