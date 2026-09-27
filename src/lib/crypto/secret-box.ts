import "server-only";
import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";

/**
 * Envelope encryption for secrets at rest (AI provider API keys).
 *
 * Opt-in and backward-compatible: encryption is active only when
 * `AI_CONFIG_SECRET` is set. Without it, values pass through as plaintext so
 * nothing breaks — existing deployments keep working, and setting the secret
 * turns encryption on. Legacy plaintext values are read transparently and get
 * encrypted the next time they are saved.
 *
 * Format: `enc:v1:<iv b64>:<tag b64>:<ciphertext b64>` (AES-256-GCM).
 */
const PREFIX = "enc:v1:";
const SALT = "ril-ai-config-v1";

function deriveKey(): Buffer | null {
	const secret = process.env.AI_CONFIG_SECRET;
	if (!secret || secret.length < 8) return null;
	return scryptSync(secret, SALT, 32);
}

/** True when a usable `AI_CONFIG_SECRET` is configured. */
export function isEncryptionEnabled(): boolean {
	return deriveKey() !== null;
}

/** Encrypt a secret for storage. Idempotent (already-encrypted input passes
 *  through) and a no-op when encryption is disabled. */
export function encryptSecret(value: string): string {
	if (!value) return "";
	if (value.startsWith(PREFIX)) return value;
	const key = deriveKey();
	if (!key) return value;
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/** Decrypt a stored secret. Legacy plaintext (no prefix) is returned as-is.
 *  If the value is encrypted but no/invalid secret is available, returns ""
 *  (treated as "no key" — the app degrades to template mode rather than crash). */
export function decryptSecret(value: string): string {
	if (!value) return "";
	if (!value.startsWith(PREFIX)) return value;
	const key = deriveKey();
	if (!key) return "";
	try {
		const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":");
		if (!ivB64 || !tagB64 || !ctB64) return "";
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key,
			Buffer.from(ivB64, "base64")
		);
		decipher.setAuthTag(Buffer.from(tagB64, "base64"));
		return (
			decipher.update(Buffer.from(ctB64, "base64")).toString("utf8") +
			decipher.final("utf8")
		);
	} catch {
		return "";
	}
}
