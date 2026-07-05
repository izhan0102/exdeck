"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check, ChevronLeft, ChevronRight, Copy, FilePlus, Link as LinkIcon, Play,
  StickyNote, Sparkles,
} from "lucide-react";
import SlideCanvas from "@/components/SlideCanvas";
import Presenter from "@/components/Presenter";
import DeckPreview from "@/components/DeckPreview";
import Logo from "@/components/Logo";
import type { Deck } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { watchSharedDeck, copySharedDeck, type SharedDeckData, type ShareMode } from "@/lib/decks";
import { getIdToken, onAuthStateChange, type AppUser } from "@/lib/auth";
import { trackShareOpen, trackSlideTime } from "@/lib/analytics";
import { stripHtml } from "@/lib/richText";

/**
 * Shared deck viewer.
 *
 * Reading experience:
 *   - Slide rail on the left so you can jump anywhere in the deck
 *     (same vibe as the editor, but read-only).
 *   - Big slide canvas in the middle that resizes to the available
 *     space.
 *   - Top bar with the deck title, share-link copy, speaker-notes
 *     toggle, fullscreen, and a Present button that launches the same
 *     Presenter component used in the editor.
 *   - Keyboard nav (← / → / Space) and number jumps when not in
 *     present mode.
 *   - Footer cap with a "Make your own" CTA so the link doubles as a
 *     soft funnel.
 */
export default function ShareViewer({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<{ deck: Deck; theme: Theme; title: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const [active, setActive] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  // Auth (viewers may be anonymous). Used for "Save a copy" + edit ownership.
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [copying, setCopying] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [rememberPin, setRememberPin] = useState(false);
  // Share mode + collaborative editing state.
  const [mode, setMode] = useState<ShareMode>("view");
  const [ownerUid, setOwnerUid] = useState<string | undefined>(undefined);
  const [canEditShare, setCanEditShare] = useState(false);
  const [editDeck, setEditDeck] = useState<Deck | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);
  const editSeededRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  // Analytics: timestamp the viewer entered the current slide, so we can
  // log dwell time when they move off it. Held in a ref so it doesn't
  // trigger re-renders.
  const slideEnterRef = useRef<number>(Date.now());
  const currentSlideRef = useRef<number>(active);
  const trackedOpenRef = useRef(false);

  /* ----------------------------- auth ----------------------------- */

  useEffect(() => {
    const unsub = onAuthStateChange((u) => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  /* ----------------------------- data ----------------------------- */

  const applySharedData = useCallback((result: SharedDeckData, unlocked = pinUnlocked) => {
    setMissing(false);
    setMode(result.mode);
    setOwnerUid(result.ownerUid);
    const role = user ? result.collaborators?.[user.uid]?.role : undefined;
    setCanEditShare(unlocked || (!!user && (user.uid === result.ownerUid || role === "OWNER" || role === "EDITOR")));
    if (result.mode === "edit") {
      if (!editSeededRef.current) {
        editSeededRef.current = true;
        setEditDeck(result.deck);
        setEditTheme(result.theme);
      }
      setData({ deck: result.deck, theme: result.theme, title: result.title });
    } else {
      editSeededRef.current = false;
      setData(result);
    }
  }, [pinUnlocked, user]);

  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      setAccessLoading(true);
      setPinError(null);
      const remembered = (() => {
        try { return localStorage.getItem(`exdeck:share-pin:${params.id}`) || ""; } catch { return ""; }
      })();
      const token = user ? await getIdToken() : null;
      const res = await fetch("/api/share-access", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: "open", shareId: params.id, pin: remembered }),
      }).catch(() => null);
      if (cancelled) return;
      setAccessLoading(false);
      if (!res) { setMissing(true); return; }
      const json = await res.json().catch(() => ({}));
      if (res.status === 403 && json?.pinRequired) {
        setPinRequired(true);
        setPinUnlocked(false);
        setData(null);
        return;
      }
      if (!res.ok || !json?.data) { setMissing(true); return; }
      setPinRequired(false);
      if (remembered) setPinUnlocked(true);
      applySharedData(json.data, !!remembered);
    };
    open();
    return () => { cancelled = true; };
  }, [params.id, user, applySharedData]);

  useEffect(() => {
    if (pinRequired || pinUnlocked) return;
    // Live subscription. Read-only decks update the viewer in place; edit
    // decks seed the embedded editor once, after which DeckPreview's own
    // collab subscription drives realtime sync (avoids double-applying).
    const unsub = watchSharedDeck(params.id, (result) => {
      if (!result) { setMissing(true); return; }
      applySharedData(result);
    });
    return () => unsub();
  }, [params.id, pinRequired, pinUnlocked, applySharedData]);

  const unlockWithPin = async () => {
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError("Enter the 4-digit PIN.");
      return;
    }
    setAccessLoading(true);
    setPinError(null);
    const token = user ? await getIdToken() : null;
    const res = await fetch("/api/share-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: "open", shareId: params.id, pin: pinInput }),
    }).catch(() => null);
    setAccessLoading(false);
    if (!res) { setPinError("Could not check PIN."); return; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.data) {
      setPinError(json?.error || "Incorrect PIN.");
      return;
    }
    setPinRequired(false);
    setPinUnlocked(true);
    if (rememberPin) {
      try { localStorage.setItem(`exdeck:share-pin:${params.id}`, pinInput); } catch { /* ignore */ }
    }
    applySharedData(json.data, true);
  };

  /* --------------------- save a copy (Feature A) -------------------- */

  const doCopy = async (uid: string) => {
    setCopying(true);
    try {
      const newId = await copySharedDeck(uid, params.id);
      if (newId) { router.push(`/app?id=${newId}`); return; }
    } catch { /* fall through */ }
    setCopying(false);
  };

  // If the viewer just logged in to copy (came back with ?copy=1 or a stashed
  // pending flag), perform the copy automatically — once — then route to it.
  useEffect(() => {
    if (!authReady || !user) return;
    let wants = false;
    try {
      const sp = new URLSearchParams(window.location.search);
      wants = sp.get("copy") === "1" || localStorage.getItem("exdeck:pendingCopy") === params.id;
    } catch { /* ignore */ }
    if (!wants) return;
    try { localStorage.removeItem("exdeck:pendingCopy"); } catch { /* ignore */ }
    doCopy(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user, params.id]);

  const onSaveCopy = async () => {
    if (user) { await doCopy(user.uid); return; }
    // Not logged in: stash intent and send through auth, then auto-copy back.
    try { localStorage.setItem("exdeck:pendingCopy", params.id); } catch { /* ignore */ }
    router.push(`/auth?redirect=${encodeURIComponent(`/share/${params.id}?copy=1`)}`);
  };

  /* ----------------------- view analytics ----------------------- */

  const flushSlideTime = useCallback(() => {
    const now = Date.now();
    const spent = now - slideEnterRef.current;

    if (spent <= 0) return;

    trackSlideTime(
      params.id,
      currentSlideRef.current,
      spent
    );

    slideEnterRef.current = now;
  }, [params.id]);

  // Log one deck open, once, after the deck loads.
  useEffect(() => {
    if (!data || trackedOpenRef.current) return;
    trackedOpenRef.current = true;
    slideEnterRef.current = Date.now();
    trackShareOpen(params.id);
  }, [data, params.id]);

  // Keep the current slide ref up to date and flush the previous slide's time when active changes.
  useEffect(() => {
    if (!data) return;

    if (currentSlideRef.current !== active) {
      flushSlideTime();
      currentSlideRef.current = active;
    }
  }, [active, data, flushSlideTime]);

  // Also flush when the tab is hidden, the page unloads, or the component unmounts,
  // so a viewer who closes the tab or navigates away still gets that time counted.
  useEffect(() => {
    if (!data) return;

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        flushSlideTime();
      } else if (document.visibilityState === "visible") {
        slideEnterRef.current = Date.now();
      }
    };

    const onPageHide = () => {
      flushSlideTime();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      flushSlideTime();
    };
  }, [data, flushSlideTime]);

  /* ------------------------- keyboard nav ------------------------- */

  useEffect(() => {
    if (!data || presenting) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setActive((a) => Math.min(data.deck.slides.length - 1, a + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Home") {
        setActive(0);
      } else if (e.key === "End") {
        setActive(data.deck.slides.length - 1);
      } else if (e.key.toLowerCase() === "p") {
        // Quick "press P to present" shortcut — same as the editor.
        setPresenting(true);
      } else if (e.key.toLowerCase() === "n") {
        const hasNotes = data.deck.slides.some((s) => !!s.notes);
        if (hasNotes) setShowNotes((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, presenting]);

  /* ------------------------- early returns ------------------------- */

  if (pinRequired) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center text-white" style={{ background: "var(--ezd-bg-page)" }}>
        <div className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Enter collaboration PIN</h1>
          <p className="mt-2 text-sm text-white/55">This EXdeck share link is locked by the deck owner.</p>
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => { if (e.key === "Enter") unlockWithPin(); }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            placeholder="0000"
            className="mt-5 w-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white outline-none placeholder:text-white/25 focus:border-white/35"
          />
          <label className="mx-auto mt-4 flex w-fit cursor-pointer items-center gap-2 text-[12.5px] text-white/55">
            <input
              type="checkbox"
              checked={rememberPin}
              onChange={(e) => setRememberPin(e.target.checked)}
              className="h-4 w-4 accent-white"
            />
            Don&apos;t ask again for this deck
          </label>
          {pinError && <p className="mt-3 text-[12.5px] text-red-300">{pinError}</p>}
          <button
            onClick={unlockWithPin}
            disabled={accessLoading || pinInput.length !== 4}
            className="mt-5 w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#03070F] hover:bg-white/90 disabled:opacity-50"
          >
            {accessLoading ? "Checking..." : "Unlock deck"}
          </button>
        </div>
      </main>
    );
  }

  if (missing) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center text-white"
            style={{ background: "var(--ezd-bg-page)" }}>
        <div className="max-w-md">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5">
            <LinkIcon size={18} className="text-white/55" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Deck not found</h1>
          <p className="mt-2 text-sm text-white/55">
            This link may have been taken down by the owner, or it never existed.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#03070F] hover:bg-white/90">
            Go to EXdeck
          </Link>
        </div>
      </main>
    );
  }

  if (accessLoading && !data) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-white/60" style={{ background: "var(--ezd-bg-page)" }}>
        Loading...
      </main>
    );
  }

  // Collaborative edit mode: open the FULL editor bound to the shared node.
  // Anyone with the link can edit; changes sync live for everyone (incl. owner).
  if (mode === "edit") {
    if (!authReady || !user) {
      return (
        <main className="grid min-h-screen place-items-center px-6 text-center text-white" style={{ background: "var(--ezd-bg-page)" }}>
          <div className="max-w-md">
            <Logo />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in to collaborate</h1>
            <p className="mt-2 text-sm text-white/55">Collaboration Mode tracks every change by Exdeck account, so editing requires a signed-in collaborator.</p>
            <button onClick={() => router.push(`/auth?redirect=${encodeURIComponent(`/share/${params.id}`)}`)} className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#03070F] hover:bg-white/90">
              Sign in
            </button>
          </div>
        </main>
      );
    }
    if (!canEditShare) {
      return (
        <main className="grid min-h-screen place-items-center px-6 text-center text-white" style={{ background: "var(--ezd-bg-page)" }}>
          <div className="max-w-md">
            <Logo />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">No edit access</h1>
            <p className="mt-2 text-sm text-white/55">Ask the deck owner to add your Exdeck account as an editor.</p>
          </div>
        </main>
      );
    }
    if (!editDeck || !editTheme) {
      return (
        <main className="grid min-h-screen place-items-center text-sm text-white/60"
              style={{ background: "var(--ezd-bg-page)" }}>
          Loading editor…
        </main>
      );
    }
    return (
      <DeckPreview
        deck={editDeck}
        setDeck={(d) => setEditDeck(d)}
        theme={editTheme}
        setTheme={(t) => setEditTheme(t)}
        onRestart={() => router.push("/")}
        deckId={null}
        user={user}
        collab={{ shareId: params.id, isOwner: !!user && user.uid === ownerUid }}
      />
    );
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-white/60"
            style={{ background: "var(--ezd-bg-page)" }}>
        Loading…
      </main>
    );
  }

  const { deck, theme, title } = data;
  const total = deck.slides.length;
  const slide = deck.slides[active];
  const enriched = slide.layout === "references"
    ? { ...slide, references: deck.references || [] }
    : slide;

  const hasNotes = deck.slides.some((s) => !!s.notes);

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard might be blocked */ }
  };

  return (
    <main
      className="min-h-screen text-white"
      style={{ background: "var(--ezd-bg-page)" }}
    >
      {/* Full-screen presenter overlay */}
      {presenting && (
        <Presenter
          deck={deck}
          theme={theme}
          startIndex={active}
          onClose={() => setPresenting(false)}
        />
      )}

      {/* ===================== Top bar ===================== */}
      <header
        className="sticky top-0 z-30 border-b border-white/10 backdrop-blur"
        style={{ background: "var(--ezd-nav-bg)" }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="sm" />
            <span className="hidden text-white/15 sm:inline">|</span>
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-[13px] font-semibold leading-tight text-white">
                {title}
              </div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-white/40">
                Shared · read-only · {total} slide{total === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasNotes && (
              <ToolbarButton
                icon={showNotes ? <Check size={12} /> : <StickyNote size={12} />}
                label={showNotes ? "Notes on" : "Notes"}
                active={showNotes}
                onClick={() => setShowNotes((s) => !s)}
                hint="Press N"
              />
            )}
            <ToolbarButton
              icon={copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
              label={copied ? "Copied" : "Copy link"}
              onClick={onCopyLink}
            />
            <ToolbarButton
              icon={<FilePlus size={12} />}
              label={copying ? "Saving…" : "Save a copy"}
              onClick={onSaveCopy}
              hint="Add an editable copy to your decks"
            />
            <button
              onClick={() => setPresenting(true)}
              title="Press P"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
            >
              <Play size={12} /> Present
            </button>
          </div>
        </div>
      </header>

      {/* ===================== Body ===================== */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        {/* Slide rail (read-only) */}
        <SlideRailReadOnly
          deck={deck}
          theme={theme}
          active={active}
          setActive={setActive}
        />

        {/* Stage */}
        <div className="min-w-0">
          <div className="mx-auto w-full max-w-[860px]">
          <div
            ref={stageRef}
            className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
          >
            <SlideCanvas
              slide={enriched}
              theme={theme}
              idx={active}
              total={total}
              deckTitle={deck.title}
              graphicId={deck.graphic}
              graphicAccent={deck.graphicAccent}
              fontId={deck.fontId}
            />
          </div>

          {/* Slide nav */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={13} /> Prev
            </button>

            {/* Compact progress + slide indicator */}
            <div className="flex flex-1 items-center gap-3 text-[11px] text-white/55">
              <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-cyan-300/80 transition-[width] duration-300"
                  style={{ width: `${((active + 1) / total) * 100}%` }}
                />
              </div>
              <span className="tabular-nums text-white/65">
                {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            <button
              onClick={() => setActive((a) => Math.min(total - 1, a + 1))}
              disabled={active === total - 1}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>

          {/* Speaker notes (toggleable) */}
          {showNotes && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Speaker notes
                </span>
                <span className="text-[10px] text-white/35">Press N to toggle</span>
              </div>
              {slide.notes ? (
                <p className="text-[13px] leading-relaxed text-white/75 whitespace-pre-line">
                  {slide.notes}
                </p>
              ) : (
                <p className="text-[12px] italic text-white/40">
                  No speaker notes for this slide.
                </p>
              )}
            </div>
          )}

          {/* Keyboard hints */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px] text-white/35">
            <KeyHint label="Prev" keys={["←"]} />
            <KeyHint label="Next" keys={["→"]} />
            <KeyHint label="Present" keys={["P"]} />
            {hasNotes && <KeyHint label="Notes" keys={["N"]} />}
            <KeyHint label="First / Last" keys={["Home", "End"]} />
          </div>
          </div>
        </div>
      </div>

      {/* ===================== CTA cap ===================== */}
      <section className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <Sparkles size={14} className="text-cyan-300" />
            <span className="text-[12.5px] text-white/65">
              This deck was made with{" "}
              <Link href="/" className="font-semibold text-white underline-offset-4 hover:underline">
                EXdeck
              </Link>
              {" "}— AI deck builder. Free to try.
            </span>
          </div>
          <Link
            href="/auth?redirect=/app"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-[12.5px] font-semibold text-[#03070F] transition hover:bg-white/90"
          >
            Make your own deck
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ----------------------- subcomponents ----------------------- */

function ToolbarButton({
  icon, label, onClick, active, className = "", hint,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition",
        active
          ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10",
        className,
      ].join(" ")}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function KeyHint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/65"
        >
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}

/**
 * Read-only slide rail. Renders a SlideCanvas thumb for each slide
 * with a cyan accent on the active one. Click to jump.
 */
function SlideRailReadOnly({
  deck, theme, active, setActive,
}: {
  deck: Deck;
  theme: Theme;
  active: number;
  setActive: (i: number) => void;
}) {
  // Pre-enriched references slides so the rail thumbs render fully.
  const slides = useMemo(() => {
    return deck.slides.map((s) =>
      s.layout === "references" ? { ...s, references: deck.references || [] } : s,
    );
  }, [deck]);

  return (
    <aside className="lg:max-h-[calc(100vh-130px)] lg:overflow-y-auto lg:pr-1">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40 lg:mb-3">
        <span>Slides</span>
        <span className="tabular-nums">{slides.length}</span>
      </div>
      <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-x-visible lg:pb-0">
        {slides.map((s, i) => {
          const isActive = i === active;
          return (
            <li key={i} className="shrink-0 lg:shrink">
              <button
                onClick={() => setActive(i)}
                className={`group block w-[160px] overflow-hidden rounded-lg border text-left transition lg:w-full ${
                  isActive
                    ? "border-cyan-300/60 ring-2 ring-cyan-300/20"
                    : "border-white/10 hover:border-white/35"
                }`}
              >
                <div className="pointer-events-none">
                  <SlideCanvas
                    slide={s}
                    theme={theme}
                    idx={i}
                    total={slides.length}
                    deckTitle={deck.title}
                    graphicId={deck.graphic}
                    graphicAccent={deck.graphicAccent}
                    fontId={deck.fontId}
                  />
                </div>
                <div className="flex items-center justify-between bg-black/40 px-2 py-1 text-[10px] text-white/60">
                  <span className="truncate">
                    {String(i + 1).padStart(2, "0")} · {stripHtml(s.title) || (s.layout === "references" ? "References" : "Untitled")}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
