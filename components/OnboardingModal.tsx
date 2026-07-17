"use client";
import { useEffect, useState } from "react";
import { X, Check, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { isGuestUser } from "@/lib/auth";
import {
  OCCUPATIONS, SOURCES, getProfile, isOnboarded, saveOnboarding, skipOnboarding,
  type OccupationKey, type SourceKey,
} from "@/lib/profile";

/**
 * One-time onboarding questionnaire. Self-managing: on mount it checks the
 * user's /profiles/{uid} record and only appears if they haven't answered or
 * dismissed. Guests never see it. Fully dismissible via the X.
 */
export default function OnboardingModal({ user }: { user: AppUser | null }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(0);
  const [occupation, setOccupation] = useState<OccupationKey | null>(null);
  const [source, setSource] = useState<SourceKey | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || isGuestUser(user)) return;
    getProfile(user.uid).then((p) => {
      if (!cancelled && !isOnboarded(p)) setOpen(true);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (!open || !user) return null;

  const dismiss = async () => {
    setOpen(false);
    await skipOnboarding(user.uid).catch(() => {});
  };

  const submit = async (finalSource: SourceKey) => {
    if (!occupation) return;
    setSaving(true);
    try {
      await saveOnboarding(user.uid, occupation, finalSource);
      setOpen(false);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}>
      <div
        className="relative w-full max-w-md rounded-3xl border p-6 sm:p-7"
        style={{ background: "var(--ezd-bg-elev)", borderColor: "var(--ezd-hairline)" }}
      >
        <button
          onClick={dismiss}
          aria-label="Skip for now"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full transition hover:opacity-80"
          style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}
        >
          <X size={16} />
        </button>

        <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ezd-fg-quiet)" }}>
          <Sparkles size={12} /> Personalize your decks · {step + 1} of 2
        </div>

        {step === 0 ? (
          <>
            <h2 className="text-xl font-bold" style={{ color: "var(--ezd-fg-strong)" }}>
              What best describes you?
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--ezd-fg-muted)" }}>
              We tailor the presentations EXdeck writes to your context.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {OCCUPATIONS.map((o) => (
                <Option key={o.key} label={o.label} selected={occupation === o.key} onClick={() => setOccupation(o.key)} />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button onClick={dismiss} className="text-[13px] font-medium transition hover:opacity-80" style={{ color: "var(--ezd-fg-quiet)" }}>
                Skip
              </button>
              <button
                onClick={() => setStep(1)}
                disabled={!occupation}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-40"
                style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
              >
                Next <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold" style={{ color: "var(--ezd-fg-strong)" }}>
              Where did you hear about EXdeck?
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--ezd-fg-muted)" }}>
              Last one — this helps us reach more people like you.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {SOURCES.map((s) => (
                <Option key={s.key} label={s.label} selected={source === s.key} onClick={() => { setSource(s.key); }} />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button onClick={() => setStep(0)} className="inline-flex items-center gap-1.5 text-[13px] font-medium transition hover:opacity-80" style={{ color: "var(--ezd-fg-quiet)" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={() => source && submit(source)}
                disabled={!source || saving}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-40"
                style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
              >
                {saving ? "Saving…" : "Finish"}
                {!saving && <Check size={15} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Option({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition"
      style={{
        borderColor: selected ? "var(--ezd-fg-strong)" : "var(--ezd-hairline)",
        background: selected ? "var(--ezd-bg-hover)" : "transparent",
        color: selected ? "var(--ezd-fg-strong)" : "var(--ezd-fg-muted)",
        fontWeight: selected ? 600 : 400,
      }}
    >
      {label}
      {selected && <Check size={14} style={{ color: "var(--ezd-fg-strong)" }} />}
    </button>
  );
}
