import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  codeChallengeFor,
  getOAuthProvider,
  isFreshHandshake,
  newCodeVerifier,
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
    expect(url.origin + url.pathname).toBe("https://auth.buffer.com/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("s3cr3t");
    // Least privilege: no write scope beyond posts, plus refresh capability.
    expect(url.searchParams.get("scope")).toBe(
      "posts:read posts:write account:read offline_access"
    );
  });

  it("carries the PKCE challenge when one is supplied", () => {
    const def = getOAuthProvider("buffer")!;
    const url = new URL(
      buildAuthorizeUrl(def, {
        clientId: "cid",
        redirectUri: "https://app.example/callback",
        state: "s3cr3t",
        codeChallenge: "challenge-value",
      })
    );
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("PKCE", () => {
  it("mints a url-safe verifier and a stable S256 challenge", () => {
    const verifier = newCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    // RFC 7636 requires 43-128 characters.
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(newCodeVerifier()).not.toBe(verifier);

    const challenge = codeChallengeFor(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toBe(codeChallengeFor(verifier));
    expect(challenge).not.toBe(verifier);
  });

  it("matches the RFC 7636 S256 test vector", () => {
    // From RFC 7636 Appendix B.
    expect(
      codeChallengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
