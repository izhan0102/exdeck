"use client";

/**
 * Global credits guard. Mounted once in the root layout, it watches the
 * signed-in user's live credit balance and — the instant it hits 0 — shows a
 * blocking "out of credits" popup with the live reset countdown (and an
 * upgrade CTA for free users).
 *
 * The popup can be dismissed with the X. Once dismissed it stays hidden for
 * the rest of the session UNLESS the page is refreshed, or the user clicks
 * something that uses credits (which dispatches the "ezd:credits-blocked"
 * event — see signalCreditsBlocked in lib/creditsClient).
 *
 * The server already refuses their AI API calls when exhausted; this is the
 * user-facing half of that block.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChange } from "@/lib/auth";
import { watchCredits, formatResetIn, CREDITS_BLOCKED_EVENT, type CreditView } from "@/lib/creditsClient";
import { Sparkles, Clock, X } from "lucide-react";

export default function CreditsGate() {
  const pathname = usePathname() || "";
  const [uid, setUid] = useState<string | null>(null);
  const [view, setView] = useState<CreditView | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => onAuthStateChange((u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    if (!uid) { setView(null); return; }
    return watchCredits(uid, setView);
  }, [uid]);

  // If the balance recovers, clear the dismissal so a fresh exhaustion shows.
  useEffect(() => { if (!view?.exhausted) setDismissed(false); }, [view?.exhausted]);

  // Re-show when the user clicks something that uses credits while blocked.
  useEffect(() => {
    const onBlocked = () => setDismissed(false);
    window.addEventListener(CREDITS_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(CREDITS_BLOCKED_EVENT, onBlocked);
  }, []);

  // Re-render every 30s so the countdown stays fresh while the overlay shows.
  useEffect(() => {
    if (!view?.exhausted) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, [view?.exhausted]);

  if (!view || !view.exhausted || dismissed) return null;

  // Only surface inside the credit-consuming app tools — never on the landing
  // page, marketing/legal pages, checkout, billing, or settings.
  const APP_SURFACES = ["/app", "/docs", "/spreadsheet", "/analyse", "/diagram", "/flashcards", "/interview", "/resume"];
  const onAppSurface =
    APP_SURFACES.some((p) => pathname.startsWith(p)) &&
    !pathname.startsWith("/app/billing") &&
    !pathname.startsWith("/app/settings");
  if (!onAppSurface) return null;

  const isFree = view.plan === "free";
  const resetIn = formatResetIn(view.resetAt);

  return (
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--ezd-bg-page) 78%, transparent)", backdropFilter: "blur(6px)" }}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl"
        style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-elevated, var(--ezd-nav-bg))", color: "var(--ezd-fg-strong)" }}
      >
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 transition hover:opacity-70"
          style={{ color: "var(--ezd-fg-quiet)" }}
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full" style={{ background: "var(--ezd-bg-hover)" }}>
          <Sparkles size={22} />
        </div>
        <h2 className="text-lg font-bold">You're out of AI credits</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--ezd-fg-quiet)" }}>
          {isFree
            ? "You've used all 30 free credits this month. Upgrade to Pro for 150 credits a day, or wait for your free reset."
            : "You've used today's 150 Pro credits. They'll top back up at the daily reset."}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "var(--ezd-bg-hover)" }}>
          <Clock size={15} />
          <span>Resets in <strong>{resetIn}</strong></span>
        </div>

        {isFree && (
          <a
            href="/checkout"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
          >
            <Sparkles size={16} /> Upgrade to Pro
          </a>
        )}
      </div>
    </div>
  );
}
