import { createHmac } from "crypto";

/**
 * Signed unsubscribe tokens. A recipient's email is paired with an HMAC so
 * the public /api/unsubscribe endpoint can verify the request is genuine
 * (not someone unsubscribing others). Secret falls back to the service
 * account key, which is always present server-side.
 */
function secret(): string {
  return process.env.UNSUB_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "exdeck-unsub-fallback";
}

export function unsubToken(email: string): string {
  return createHmac("sha256", secret()).update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
}

export function verifyUnsub(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = unsubToken(email);
  // constant-time-ish compare
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://exdeck.xyz").replace(/\/$/, "");
}

export function unsubUrl(email: string): string {
  const e = encodeURIComponent(email.toLowerCase().trim());
  return `${appBaseUrl()}/api/unsubscribe?e=${e}&t=${unsubToken(email)}`;
}

/** DB key for a suppressed email (RTDB keys can't contain . # $ [ ] /). */
export function suppressionKey(email: string): string {
  return Buffer.from(email.toLowerCase().trim()).toString("base64url");
}
