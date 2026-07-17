"use client";

import { LogIn, X } from "lucide-react";

export default function GuestSignInDialog({ open, onClose, onContinue }: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="guest-signin-title" className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: "var(--ezd-bg-page)", borderColor: "var(--ezd-divider)", color: "var(--ezd-fg-strong)" }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--ezd-fg-quiet)" }}>Your guest deck is ready</p><h2 id="guest-signin-title" className="mt-2 text-xl font-semibold">Sign in to keep going</h2></div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-white/10"><X size={17} /></button>
        </div>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--ezd-fg-muted)" }}>Create an account to export this deck or use more AI tools. Your guest deck will come with you.</p>
        <button onClick={onContinue} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}><LogIn size={16} /> Sign in or create account</button>
      </section>
    </div>
  );
}
