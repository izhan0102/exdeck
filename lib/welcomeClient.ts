import { getCurrentUser, getIdToken, isGuestUser } from "./auth";

/**
 * Ask the server to send this user their one-time welcome email. Safe to call
 * on every app load: a localStorage guard avoids repeat network calls, and the
 * server is idempotent (one email per account) and only sends for verified,
 * non-guest accounts.
 */
export async function maybeSendWelcome(): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const user = getCurrentUser();
    if (!user || isGuestUser(user) || !user.emailVerified) return;

    const key = `deckflow_welcomed_${user.uid}`;
    if (window.localStorage.getItem(key)) return;

    const token = await getIdToken().catch(() => null);
    if (!token) return;

    const res = await fetch("/api/welcome", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    // Mark handled on any definitive response (sent, already, or config/no-op)
    // so we don't re-hit the endpoint each load. Network errors leave it unset
    // to allow a retry next time.
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d?.ok || d?.already || d?.configured === false) {
        window.localStorage.setItem(key, "1");
      }
    }
  } catch {
    /* welcome email is best-effort; never disrupt the app */
  }
}
