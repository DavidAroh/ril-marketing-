import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	decryptSecret,
	encryptSecret,
	isEncryptionEnabled,
} from "@/lib/crypto/secret-box";

const SECRET = "test-secret-value-long-enough";

describe("secret-box (encryption enabled)", () => {
	beforeEach(() => {
		process.env.AI_CONFIG_SECRET = SECRET;
	});
	afterEach(() => {
		delete process.env.AI_CONFIG_SECRET;
	});

	it("reports encryption enabled", () => {
		expect(isEncryptionEnabled()).toBe(true);
	});

	it("round-trips a secret", () => {
		const key = "sk-proj-abcdef123456";
		const enc = encryptSecret(key);
		expect(enc).toMatch(/^enc:v1:/);
		expect(enc).not.toContain(key);
		expect(decryptSecret(enc)).toBe(key);
	});

	it("is idempotent — never double-encrypts", () => {
		const key = "sk-proj-abcdef123456";
		const once = encryptSecret(key);
		const twice = encryptSecret(once);
		expect(twice).toBe(once);
		expect(decryptSecret(twice)).toBe(key);
	});

	it("passes legacy plaintext through decrypt unchanged", () => {
		expect(decryptSecret("sk-legacy-plaintext")).toBe("sk-legacy-plaintext");
	});

	it("returns '' for tampered ciphertext (GCM auth fails)", () => {
		const enc = encryptSecret("sk-proj-abcdef123456");
		const [iv, tag, ct] = enc.slice("enc:v1:".length).split(":");
		// Flip the first character of the auth tag so verification fails.
		const flipped = (tag[0] === "A" ? "B" : "A") + tag.slice(1);
		const tampered = `enc:v1:${iv}:${flipped}:${ct}`;
		expect(decryptSecret(tampered)).toBe("");
	});

	it("handles empty input", () => {
		expect(encryptSecret("")).toBe("");
		expect(decryptSecret("")).toBe("");
	});

	it("produces a different ciphertext each time (random IV)", () => {
		const a = encryptSecret("same-key");
		const b = encryptSecret("same-key");
		expect(a).not.toBe(b);
		expect(decryptSecret(a)).toBe("same-key");
		expect(decryptSecret(b)).toBe("same-key");
	});
});

describe("secret-box (encryption disabled)", () => {
	beforeEach(() => {
		delete process.env.AI_CONFIG_SECRET;
	});

	it("reports encryption disabled", () => {
		expect(isEncryptionEnabled()).toBe(false);
	});

	it("passes plaintext through unchanged", () => {
		expect(encryptSecret("sk-plain")).toBe("sk-plain");
		expect(decryptSecret("sk-plain")).toBe("sk-plain");
	});

	it("cannot read a value encrypted under a secret (returns '')", () => {
		process.env.AI_CONFIG_SECRET = SECRET;
		const enc = encryptSecret("sk-secret");
		delete process.env.AI_CONFIG_SECRET;
		expect(decryptSecret(enc)).toBe("");
	});
});
