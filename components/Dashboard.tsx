"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Clock, Copy, FileText, Home,
  LogIn, LogOut, MoreVertical, Pencil, Search, Share2, Sparkles, Trash2, Wand2, X, Zap, Contact, Settings,
} from "lucide-react";
import { type AppUser, getIdToken, isGuestUser } from "@/lib/auth";
import {
  deleteDeck, duplicateDeck, renameDeck, watchDeckList, type DeckListItem,
} from "@/lib/decks";
import { watchDocList, type DocListItem } from "@/lib/docStore";
import { watchResumeList, type ResumeListItem } from "@/lib/resumeStore";
import DeckThumbnail from "./DeckThumbnail";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import TrialDialog from "./TrialDialog";
import ReportDialog from "./ReportDialog";
import { watchCredits, formatResetIn, type CreditView } from "@/lib/creditsClient";
import { watchUserPlan, getUserPlan } from "@/lib/plan";
import { watchMembership, type MemberPlan } from "@/lib/seats";
import { type PlanId, getPlan, FREE_FOR_ALL } from "@/lib/plans";

/**
 * Dashboard shown on /app (desktop).
 *
 * Token-driven (var(--ezd-*)) so it adapts cleanly to light/dark, matching
 * the landing. Sidebar carries the brand, nav, ONE combined plan-and-usage
 * card, and the user/account block. The main area is a header, an optional
 * "continue working" card (deduped from the grid), and the decks grid with
 * working search, skeleton loading, and per-card actions (open, share,
 * rename, duplicate, delete).
 */

type Props = {
  user: AppUser;
  onStartFromScratch: () => void;
  onStartFromTemplate?: () => void;
  onSignOut: () => void | Promise<void>;
};

const RED = "rgba(239,68,68,1)";
const RED_SOFT = "rgba(239,68,68,0.12)";
const RED_BORDER = "rgba(239,68,68,0.40)";

type ContinueItem = {
  kind: "deck" | "doc" | "resume";
  id: string;
  title: string;
  sub: string;
  updatedAt: number;
  href: string;
  accent?: string;
};

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Dashboard({
  user, onStartFromScratch, onStartFromTemplate, onSignOut,
}: Props) {
  const [decks, setDecks] = useState<DeckListItem[]>([]);
  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [query, setQuery] = useState("");
  const [credits, setCredits] = useState<CreditView | null>(null);
  const [plan, setPlan] = useState<PlanId>("free");
  const [membership, setMembership] = useState<MemberPlan | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);
  const [reportOpen, setReportOpen] = useState(false);

  // Free users: gently surface the trial after 2 minutes on the dashboard
  // (no popup on open). Premium clicks also open it (see openUpgrade).
  useEffect(() => {
    if (FREE_FOR_ALL) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      getUserPlan(user.uid).then((p) => { if (!cancelled && p === "free") { setUpgradeReason(undefined); setUpgradeOpen(true); } });
    }, 120_000);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [user.uid]);

  useEffect(() => {
    const unsub = watchUserPlan(user.uid, setPlan);
    return () => unsub();
  }, [user.uid]);

  // On load, materialize any Team/Org seat the user's email holds into their plan.
  useEffect(() => {
    if (isGuestUser(user)) return;
    getIdToken().then((t) => fetch("/api/seats/sync", { method: "POST", headers: { Authorization: `Bearer ${t}` } })).catch(() => {});
  }, [user]);

  useEffect(() => {
    const unsub = watchMembership(user.uid, setMembership);
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const unsub = watchDeckList(user.uid, (items) => {
      setDecks(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const unsubD = watchDocList(user.uid, setDocs);
    const unsubR = watchResumeList(user.uid, setResumes);
    return () => { unsubD(); unsubR(); };
  }, [user.uid]);

  useEffect(() => {
    const unsub = watchCredits(user.uid, setCredits);
    return () => unsub();
  }, [user.uid]);

  /* ----------------------------- derived ----------------------------- */

  const limitReached = !!credits?.exhausted;

  const openUpgrade = (reason?: string) => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  };

  const onNewDeck = () => {
    if (limitReached) {
      openUpgrade("You've hit your monthly limit");
      return;
    }
    onStartFromScratch();
  };

  // Documents are free for everyone (count against the monthly generation limit).
  const onNewDoc = () => { window.location.assign("/docs"); };

  // Resume maker is free for everyone.
  const onNewResume = () => { window.location.assign("/resume"); };

  const visibleDecks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) =>
      `${d.title} ${d.subtitle ?? ""}`.toLowerCase().includes(q),
    );
  }, [decks, query]);

  const hasQuery = query.trim().length > 0;

  // Most-recently-edited item across decks, docs, and resumes — drives the
  // "Continue working" card for returning users.
  const continueItem = useMemo<ContinueItem | null>(() => {
    const newest = <T,>(arr: T[], at: (t: T) => number): T | null =>
      arr.length ? arr.reduce((m, x) => (at(x) > at(m) ? x : m), arr[0]) : null;
    const d = newest(decks, (x) => (typeof x.updatedAt === "number" ? x.updatedAt : 0));
    const doc = newest(docs, (x) => x.updatedAt || 0);
    const r = newest(resumes, (x) => x.updatedAt || 0);
    const cands: ContinueItem[] = [];
    if (d) cands.push({ kind: "deck", id: d.id, title: d.title || "Untitled deck", sub: "Presentation", updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : 0, href: `/app?id=${d.id}` });
    if (doc) cands.push({ kind: "doc", id: doc.id, title: doc.title || "Untitled document", sub: "Document", updatedAt: doc.updatedAt || 0, href: `/docs?id=${doc.id}`, accent: doc.theme?.accent });
    if (r) cands.push({ kind: "resume", id: r.id, title: r.name || "Untitled resume", sub: r.headline || "Resume", updatedAt: r.updatedAt || 0, href: `/resume?id=${r.id}`, accent: r.accent });
    if (!cands.length) return null;
    cands.sort((a, b) => b.updatedAt - a.updatedAt);
    return cands[0];
  }, [decks, docs, resumes]);

  // Decks shown on the dashboard: when searching, every match; otherwise a
  // recent preview of up to 8. The deck shown in "Continue working" is deduped
  // out ONLY when other decks remain, so a single deck never blanks the grid.
  const deckGrid = useMemo(() => {
    if (hasQuery) return visibleDecks;
    const list =
      continueItem?.kind === "deck" && decks.length > 1
        ? decks.filter((d) => d.id !== continueItem.id)
        : decks;
    return list.slice(0, 8);
  }, [decks, visibleDecks, hasQuery, continueItem]);

  const guestAccount = isGuestUser(user);
  const handleAccountAction = () => {
    if (guestAccount) {
      window.location.assign("/auth?redirect=/app");
      return;
    }
    void onSignOut();
  };

  return (
    <div className="min-h-screen lg:pl-[264px]">
      {/* ============== Sidebar ============== */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col overflow-hidden border-r p-5 backdrop-blur lg:flex"
        style={{ background: "var(--ezd-nav-bg)", borderColor: "var(--ezd-divider)" }}
      >
        <div className="flex shrink-0 items-center justify-between">
          <Logo size="md" />
          <ThemeToggle variant="compact" />
        </div>

        <div className="mt-8 flex-1 min-h-0 overflow-y-auto pr-1">
        <nav className="space-y-1 text-sm">
          <NavItem icon={<Home size={15} />} label="Dashboard" active />
          <NavItem icon={<FileText size={15} />} label="My decks" href="/app/decks" count={decks.length || undefined} />
          <NavItem icon={<FileText size={15} />} label="My docs" href="/app/docs" />
          <NavItem icon={<Contact size={15} />} label="My resumes" href="/app/resumes" />
          <NavItem icon={<Settings size={15} />} label="Settings" href="/app/settings" />
        </nav>

        {/* Combined plan + usage (#2) */}
        <div className="mt-6">
          <PlanUsageCard credits={credits} plan={plan} onUpgrade={() => openUpgrade()} membership={membership} />
        </div>
        </div>

        {/* Bottom-anchored account block — always visible */}
        <div className="mt-4 shrink-0 space-y-2.5">
          <div
            className="rounded-2xl border p-3"
            style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
                style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}
              >
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: "var(--ezd-fg-strong)" }}>
                  {user.name || user.email?.split("@")[0]}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--ezd-fg-quiet)" }}>{guestAccount ? "Guest workspace" : user.email}</div>
              </div>
            </div>
            <button
              onClick={handleAccountAction}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] transition hover:opacity-80"
              style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
            >
              {guestAccount ? <LogIn size={12} /> : <LogOut size={12} />} {guestAccount ? "Sign in" : "Sign out"}
            </button>
          </div>

          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition hover:brightness-110"
            style={{ borderColor: RED_BORDER, background: RED_SOFT, color: RED }}
          >
            <AlertTriangle size={13} /> Report an issue
          </button>
        </div>
      </aside>

      {/* ============== Main ============== */}
      <main className="px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {upgradeOpen && (
          <TrialDialog
            reason={upgradeReason}
            onClose={() => setUpgradeOpen(false)}
            email={user.email}
          />
        )}

        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          username={user.name || user.email?.split("@")[0] || "Anonymous"}
        />

        {/* Mobile header */}
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle variant="compact" />
            <button
              onClick={handleAccountAction}
              className="rounded-full border px-3 py-1 text-xs transition hover:opacity-80"
              style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-strong)" }}
            >
              {guestAccount ? <LogIn size={11} className="mr-1 inline" /> : <LogOut size={11} className="mr-1 inline" />} {guestAccount ? "Sign in" : "Sign out"}
            </button>
          </div>
        </div>

        {/* ---------- Dashboard content ---------- */}
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-8">
            <h1
              className="text-[26px] font-semibold tracking-tight md:text-[32px]"
              style={{
                fontFamily: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
                letterSpacing: "-0.022em",
                color: "var(--ezd-fg-strong)",
              }}
            >
              Welcome back, {firstName(user)}
            </h1>
            <p className="mt-2 text-[13.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
              Start with a presentation — or explore the rest of the workspace below.
            </p>
          </header>

          {continueItem && (
            <div className="mb-9">
              <ContinueWorking item={continueItem} />
            </div>
          )}

          {/* ---------- Presentations (primary) ---------- */}
          <SectionHead title="Presentations" />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div
                className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-6 sm:p-7"
                style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
              >
                <div>
                  <h2
                    className="text-[21px] font-semibold sm:text-[23px]"
                    style={{
                      fontFamily: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
                      letterSpacing: "-0.02em",
                      color: "var(--ezd-fg-strong)",
                    }}
                  >
                    Create a presentation
                  </h2>
                  <p className="mt-2 max-w-md text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
                    Turn a one-line brief into a fully designed, editable deck — real charts, themed
                    layouts, speaker notes, and one-click export to PPTX &amp; PDF.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={onNewDeck}
                    disabled={limitReached}
                    className="group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
                  >
                    {limitReached ? "Out of credits" : "New presentation"}
                    {!limitReached && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
                  </button>
                  {onStartFromTemplate && (
                    <button
                      onClick={onStartFromTemplate}
                      className="inline-flex items-center rounded-xl border px-5 py-3 text-[14px] font-semibold transition hover:opacity-80"
                      style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
                    >
                      Start from a template
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <PptSideTile
                title="Your decks"
                sub={decks.length ? `${decks.length} presentation${decks.length === 1 ? "" : "s"} saved` : "Nothing saved yet"}
                cta="View all decks"
                href="/app/decks"
              />
              <PptSideTile
                title="Present a PDF"
                sub="Show any PDF full-screen, like a real deck"
                cta="Open presenter"
                onClick={() => window.location.assign("/pdf-to-ppt")}
              />
            </div>
          </div>

          {/* ---------- Your presentations (only when decks exist) ---------- */}
          {(loading || decks.length > 0) && (
            <section className="mt-12">
              <div className="flex items-center justify-between gap-3">
                <SectionHead
                  title="Your presentations"
                  count={!loading && decks.length ? decks.length : undefined}
                />
                {!loading && decks.length > 0 && (
                  <div className="flex items-center gap-3">
                    <SearchInput value={query} onChange={setQuery} />
                    {decks.length > 8 && !hasQuery && (
                      <Link
                        href="/app/decks"
                        className="hidden shrink-0 items-center gap-1 text-[12.5px] font-semibold transition hover:opacity-80 sm:inline-flex"
                        style={{ color: "var(--ezd-fg-strong)" }}
                      >
                        View all <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : deckGrid.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {deckGrid.map((deck) => (
                      <DeckCard
                        key={deck.id}
                        deck={deck}
                        onRename={() => setRenameTarget({ id: deck.id, title: deck.title })}
                        onDuplicate={async () => { try { await duplicateDeck(user.uid, deck.id); } catch { /* ignore */ } }}
                        onAskDelete={() => setConfirmId(deck.id)}
                      />
                    ))}
                  </div>
                ) : hasQuery ? (
                  <NoMatchState onClear={() => setQuery("")} />
                ) : null}
              </div>
            </section>
          )}

          {/* ---------- Explore more features (no icons) ---------- */}
          <section className="mt-14">
            <SectionHead
              title="Explore more features"
              sub="The same AI workspace does more than slides — all included."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <FeatureTile
                title="Document maker"
                desc="Write a structured, Word-style document — headings, tables, charts, and clean multi-page PDF export."
                cta="New document"
                onClick={onNewDoc}
              />
              <FeatureTile
                title="Spreadsheet maker"
                desc="Build and edit sheets from plain English with live formulas. Export to Excel or PDF."
                cta="Open spreadsheet"
                onClick={() => window.location.assign("/spreadsheet")}
              />
              <FeatureTile
                title="Diagram studio"
                desc="Generate editable flowcharts, mind maps, timelines and more. Export SVG, PNG, or Mermaid."
                cta="Open diagrams"
                onClick={() => window.location.assign("/diagram")}
              />
              <FeatureTile
                title="Flashcards & quiz"
                desc="Turn any topic or notes into flippable flashcards and an auto-graded quiz. Export to PDF or Anki."
                cta="Open flashcards"
                onClick={() => window.location.assign("/flashcards")}
              />
              <FeatureTile
                title="Mock interview"
                desc="Practice a realistic AI interview for any role — scored feedback and a final performance report."
                cta="Start interview"
                onClick={() => window.location.assign("/interview")}
              />
              <FeatureTile
                title="Document analyser"
                desc="Upload files and get a clear analysis per document plus a cross-document synthesis, with follow-ups."
                cta="Open analyser"
                onClick={() => window.location.assign("/analyse")}
              />
              <FeatureTile
                title="File converters"
                desc="Images, image-to-PDF, PDF-to-image, merge, split, and OCR — private, in your browser."
                cta="Open converters"
                onClick={() => window.location.assign("/converter")}
              />
              <FeatureTile
                title="Resume builder"
                desc="Build a polished, ATS-friendly resume from templates and export a clean, one-page PDF."
                cta="New resume"
                onClick={onNewResume}
              />
            </div>
          </section>
        </div>

      </main>

      {/* Delete confirm (#7: Esc + backdrop close) */}
      {confirmId && (
        <Modal onClose={() => setConfirmId(null)}>
          <h3 className="text-base font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Delete this deck?</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--ezd-fg-muted)" }}>
            This can&rsquo;t be undone. Any public share link will also stop working.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setConfirmId(null)}
              className="rounded-xl border px-4 py-2 text-sm transition hover:opacity-80"
              style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const id = confirmId;
                setConfirmId(null);
                if (id) { try { await deleteDeck(user.uid, id); } catch { /* ignore */ } }
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: RED }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Rename (#9) */}
      {renameTarget && (
        <RenameModal
          initial={renameTarget.title}
          onClose={() => setRenameTarget(null)}
          onSave={async (name) => {
            const target = renameTarget;
            setRenameTarget(null);
            if (target) { try { await renameDeck(user.uid, target.id, name); } catch { /* ignore */ } }
          }}
        />
      )}
    </div>
  );
}

/* =====================================================================
 *                            Subcomponents
 * ===================================================================== */

function SectionHead({ title, sub, count }: { title: string; sub?: string; count?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>{title}</h2>
        {typeof count === "number" && (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] tabular-nums"
            style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-muted)" }}
          >
            {count}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>{sub}</p>}
    </div>
  );
}

function PptSideTile({
  title, sub, cta, href, onClick,
}: { title: string; sub: string; cta: string; href?: string; onClick?: () => void }) {
  const cls = "group flex h-full flex-col justify-between rounded-2xl border p-5 text-left transition hover:-translate-y-0.5";
  const style: React.CSSProperties = { borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" };
  const inner = (
    <>
      <div>
        <div className="text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{title}</div>
        <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{sub}</div>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>
        {cta} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </>
  );
  if (href) return <Link href={href} className={cls} style={style}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls} style={style}>{inner}</button>;
}

function FeatureTile({
  title, desc, cta, onClick,
}: { title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col items-start rounded-2xl border p-5 text-left transition hover:-translate-y-0.5"
      style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
    >
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{title}</h3>
      <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{desc}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>
        {cta} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function NavItem({
  icon, label, href, onClick, active, count,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  count?: number;
}) {
  const className = "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition";
  const style: React.CSSProperties = active
    ? { background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }
    : { color: "var(--ezd-fg-muted)" };
  const inner = (
    <>
      <span className="flex items-center gap-2.5">{icon}{label}</span>
      {typeof count === "number" && (
        <span
          className="rounded-full border px-1.5 text-[10px] tabular-nums"
          style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-muted)" }}
        >
          {count}
        </span>
      )}
    </>
  );
  if (href) return <Link href={href} className={`${className} hover:opacity-80`} style={style}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${className} hover:opacity-80`} style={style}>{inner}</button>;
  return <div className={className} style={style}>{inner}</div>;
}

function ContinueWorking({ item }: { item: ContinueItem }) {
  const Icon = item.kind === "deck" ? Wand2 : item.kind === "resume" ? Contact : FileText;
  return (
    <Link
      href={item.href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition hover:shadow-lg sm:p-5"
      style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--ezd-fg-quiet)" }}>
          <Clock size={11} /> Continue working
        </div>
        <div className="mt-0.5 truncate text-[16px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{item.title}</div>
        <div className="mt-0.5 truncate text-[12.5px]" style={{ color: "var(--ezd-fg-muted)" }}>
          {item.sub}{item.updatedAt ? ` · edited ${relTime(item.updatedAt)}` : ""}
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition group-hover:opacity-90 sm:inline-flex" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
        Continue <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
      <ArrowRight size={20} className="shrink-0 transition-transform group-hover:translate-x-0.5 sm:hidden" style={{ color: "var(--ezd-fg-strong)" }} />
    </Link>
  );
}

/* ----------------------- Combined plan + usage card ----------------------- */

function PlanUsageCard({ credits, plan, onUpgrade, membership }: { credits: CreditView | null; plan: PlanId; onUpgrade: () => void; membership?: MemberPlan | null }) {
  const allowance = credits?.allowance ?? (plan === "pro" ? 150 : 30);
  const balance = credits?.balance ?? allowance;
  const used = Math.max(0, allowance - balance);
  const limit = allowance;
  const unlimited = false;
  const remaining = balance;
  const exhausted = balance <= 0;
  const pct = Math.min(100, (used / Math.max(1, allowance)) * 100);
  const periodWord = plan === "pro" ? "today" : "this month";

  const resetAt = credits?.resetAt ?? Date.now();
  const [resetIn, setResetIn] = useState(formatResetIn(resetAt));
  useEffect(() => {
    const id = window.setInterval(() => setResetIn(formatResetIn(resetAt)), 30_000);
    return () => window.clearInterval(id);
  }, [resetAt]);

  const planName = getPlan(plan).name;
  const ctaLabel = plan === "free" ? "Upgrade" : "Manage plan";

  return (
    <div
      className="rounded-2xl border p-3.5"
      style={{ borderColor: exhausted ? RED_BORDER : "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--ezd-fg-quiet)" }}>
          <Zap size={11} style={{ color: exhausted ? RED : "var(--ezd-fg-muted)" }} />
          {planName} plan
        </span>
        <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: exhausted ? RED : "var(--ezd-fg-strong)" }}>
          {remaining} / {limit}
        </span>
      </div>

      {membership && (
        <div className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--ezd-fg-muted)" }}>
          Granted by <strong style={{ color: "var(--ezd-fg-strong)" }}>{membership.ownerName || "your team"}</strong>{membership.kind ? ` · ${membership.kind === "org" ? "Organisation" : "Team"}` : ""}
        </div>
      )}

      <div className="mt-2 text-[11px] leading-snug" style={{ color: "var(--ezd-fg-muted)" }}>
        {exhausted
          ? "You're out of AI credits."
          : `${remaining} credit${remaining === 1 ? "" : "s"} left ${periodWord}.`}
      </div>

      {!unlimited ? (
        <>
          <div className="mt-2.5 h-[4px] w-full overflow-hidden rounded-full" style={{ background: "var(--ezd-bg-hover)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: exhausted ? RED : "var(--ezd-fg-strong)" }}
            />
          </div>
          <div className="mt-1 text-[10px]" style={{ color: "var(--ezd-fg-quiet)" }}>Resets in {resetIn}</div>
        </>
      ) : (
        <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          <Sparkles size={11} /> No monthly limit
        </div>
      )}

      {/* Daily AI cap — Pro subscribers only (free users are monthly-limited) */}
      {plan === "pro" && (
      <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ezd-divider)" }}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--ezd-fg-quiet)" }}>
            <Zap size={11} style={{ color: exhausted ? RED : "var(--ezd-fg-muted)" }} /> Daily credits
          </span>
          <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: exhausted ? RED : "var(--ezd-fg-strong)" }}>{remaining}/{limit}</span>
        </div>
        <div className="mt-1 text-[10px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          Pro gives you {limit} credits a day · resets in {resetIn}
        </div>
      </div>
      )}

      {plan === "free" ? (
        <button
          onClick={onUpgrade}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition hover:opacity-90"
          style={
            exhausted
              ? { background: RED, color: "#fff" }
              : { background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }
          }
          hidden={FREE_FOR_ALL}
        >
          <Sparkles size={12} /> {exhausted ? "Upgrade for more" : ctaLabel}
        </button>
      ) : (
        <Link
          href="/app/billing"
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition hover:opacity-90"
          style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
        >
          <Sparkles size={12} /> Manage plan
        </Link>
      )}
    </div>
  );
}

/* ----------------------------- Search ----------------------------- */

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative">
      <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ezd-fg-quiet)" }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search decks…"
        className="w-44 rounded-full border py-1.5 pl-8 pr-7 text-[12px] outline-none transition focus:border-white/30 sm:w-60"
        style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-strong)" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full transition hover:opacity-70"
          style={{ color: "var(--ezd-fg-quiet)" }}
          aria-label="Clear search"
        >
          <X size={10} />
        </button>
      )}
    </label>
  );
}

/* ----------------------------- Deck card ----------------------------- */

function DeckCard({
  deck, onRename, onDuplicate, onAskDelete,
}: {
  deck: DeckListItem;
  onRename: () => void;
  onDuplicate: () => void;
  onAskDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <article
      className="group relative flex h-full flex-col rounded-2xl border p-4 transition hover:-translate-y-0.5"
      style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
    >
      <div className="mb-3">
        <DeckThumbnail item={deck} />
      </div>

      <div className="min-h-[58px]">
        <h3 className="line-clamp-2 text-sm font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{deck.title}</h3>
        {deck.subtitle && (
          <p className="mt-1 line-clamp-1 text-[11px]" style={{ color: "var(--ezd-fg-quiet)" }}>{deck.subtitle}</p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: "var(--ezd-fg-quiet)" }}>
        <span>{deck.slides} slide{deck.slides === 1 ? "" : "s"}</span>
        <span>{formatRelative(deck.updatedAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/app?id=${deck.id}`}
          className="flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition hover:opacity-90"
          style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
        >
          Open
        </Link>
        <button
          onClick={() => setMenu((m) => !m)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition hover:opacity-80"
          style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}
          aria-label="Deck actions"
          aria-haspopup="menu"
          aria-expanded={menu}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Action menu */}
      {menu && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setMenu(false)} aria-hidden />
          <div
            role="menu"
            className="absolute bottom-14 right-3 z-[50] w-44 overflow-hidden rounded-xl border py-1 shadow-2xl"
            style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-elev)" }}
          >
            {deck.shareId && (
              <a
                href={`/share/${deck.shareId}`}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                onClick={() => setMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] transition hover:opacity-80"
                style={{ color: "var(--ezd-fg-strong)" }}
              >
                <Share2 size={13} /> Open share link
              </a>
            )}
            <button
              role="menuitem"
              onClick={() => { setMenu(false); onRename(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition hover:opacity-80"
              style={{ color: "var(--ezd-fg-strong)" }}
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              role="menuitem"
              onClick={() => { setMenu(false); onDuplicate(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition hover:opacity-80"
              style={{ color: "var(--ezd-fg-strong)" }}
            >
              <Copy size={13} /> Duplicate
            </button>
            <div className="my-1 h-px" style={{ background: "var(--ezd-divider)" }} />
            <button
              role="menuitem"
              onClick={() => { setMenu(false); onAskDelete(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition hover:brightness-110"
              style={{ color: RED }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}

/* ----------------------------- Skeleton card ----------------------------- */

function SkeletonCard() {
  return (
    <div
      className="flex h-full flex-col rounded-2xl border p-4"
      style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
    >
      <div className="ezd-shimmer mb-3 w-full rounded-xl" style={{ aspectRatio: "16 / 9", background: "var(--ezd-bg-hover)" }} />
      <div className="ezd-shimmer h-3.5 w-3/4 rounded" style={{ background: "var(--ezd-bg-hover)" }} />
      <div className="ezd-shimmer mt-2 h-3 w-1/2 rounded" style={{ background: "var(--ezd-bg-hover)" }} />
      <div className="mt-auto flex gap-2 pt-4">
        <div className="ezd-shimmer h-7 flex-1 rounded-lg" style={{ background: "var(--ezd-bg-hover)" }} />
        <div className="ezd-shimmer h-7 w-8 rounded-lg" style={{ background: "var(--ezd-bg-hover)" }} />
      </div>
      <style jsx>{`
        .ezd-shimmer { position: relative; overflow: hidden; }
        .ezd-shimmer::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(128,128,128,0.18) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: ezd-shimmer 1.4s infinite linear;
        }
        @keyframes ezd-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

/* ----------------------------- No-match ----------------------------- */

function NoMatchState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
      <Search size={20} className="mx-auto mb-3" style={{ color: "var(--ezd-fg-quiet)" }} />
      <h3 className="text-sm font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>No matches</h3>
      <p className="mt-1 text-xs" style={{ color: "var(--ezd-fg-muted)" }}>Nothing in your library matches that search.</p>
      <button
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] transition hover:opacity-80"
        style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
      >
        Clear search
      </button>
    </div>
  );
}

/* ----------------------------- Modals ----------------------------- */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="m-4 w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-elev)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function RenameModal({
  initial, onClose, onSave,
}: { initial: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const save = () => { if (name.trim()) onSave(name.trim()); };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Rename deck</h3>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); }}
        maxLength={200}
        className="mt-4 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-white/30"
        style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-strong)" }}
        placeholder="Deck title"
      />
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border px-4 py-2 text-sm transition hover:opacity-80"
          style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!name.trim()}
          className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

/* ----------------------------- helpers ----------------------------- */

function Sep() {
  return <span aria-hidden style={{ color: "var(--ezd-fg-quiet)", opacity: 0.6 }}>·</span>;
}

function firstName(u: AppUser): string {
  if (u.name) return u.name.split(/\s+/)[0];
  if (u.email) return u.email.split("@")[0];
  return "there";
}

function formatRelative(ts: number): string {
  if (!ts) return "just now";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
