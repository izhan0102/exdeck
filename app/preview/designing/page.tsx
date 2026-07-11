"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import MagicOverlay from "@/components/MagicOverlay";

/**
 * Standalone preview of the "EXdeck is doing the magic" (designing) overlay —
 * the screen shown after the outline is confirmed. No auth or API calls; it
 * just mounts the overlay so the animation can be reviewed in isolation.
 *
 * Open at /preview/designing. Toggle your site theme (light/dark) to confirm
 * the monochrome overlay adapts.
 */
export default function DesigningPreview() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 8000);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <main className="relative min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--ezd-fg-muted)" }}>
          Animation preview
        </div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>
          Designing overlay
        </h1>
        <p className="text-sm" style={{ color: "var(--ezd-fg-muted)" }}>
          The screen shown after the outline while EXdeck designs your deck. It now uses the site&rsquo;s
          black/white theme — toggle light/dark to check both.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[12.5px] font-semibold transition hover:opacity-90"
            style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
          >
            ▶ Play again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2 text-[12.5px] transition hover:opacity-90"
            style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg)" }}
          >
            Back home
          </Link>
        </div>
      </div>

      <MagicOverlay open={open} />
    </main>
  );
}
