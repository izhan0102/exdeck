"use client";
import { useRef, useState } from "react";
import {
  Plus, Trash2, X, Sparkles, ArrowRight, ArrowLeft,
  ChevronUp, ChevronDown, Wand2, Loader2,
  LayoutList, BarChart3, Table2, Quote, Flag, ListChecks, BookMarked, Presentation, Columns2,
} from "lucide-react";
import type { Deck, Slide, Reference, TableData } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { getIdToken } from "@/lib/auth";
import { renderChartSvg } from "@/lib/charts";

/**
 * The outline step is intentionally MONOCHROME — it uses the site's black/white
 * theme tokens, never a colored accent, so it looks identical for every
 * template (design/theme is chosen later). `accent` maps to the theme's strong
 * foreground; tinted surfaces use the neutral --ezd tokens.
 */
const OUTLINE_ACCENT = "var(--ezd-fg-strong)";

/** Icon + label for a slide's structural role. */
function roleMeta(layout: Slide["layout"]): { label: string; Icon: typeof LayoutList } {
  switch (layout) {
    case "title-hero": return { label: "Intro", Icon: Presentation };
    case "closing": return { label: "Closing", Icon: Flag };
    case "section": return { label: "Section", Icon: LayoutList };
    case "chart": return { label: "Chart", Icon: BarChart3 };
    case "table": return { label: "Table", Icon: Table2 };
    case "references": return { label: "References", Icon: BookMarked };
    case "two-column": return { label: "Comparison", Icon: Columns2 };
    case "quote": return { label: "Quote", Icon: Quote };
    default: return { label: "Content", Icon: ListChecks };
  }
}

/**
 * Outline review step.
 *
 * Shown after generation (and the build animation) and BEFORE the deck is
 * designed. It's deliberately text-only — no themes, images, or layouts — so
 * the user can shape the *content* first: edit titles and points inline, ask
 * AI to rewrite a slide, and add/remove/reorder slides. On Confirm, the parent
 * plays the "designing" animation and reveals the finished deck.
 */
export default function OutlineReview({
  deck, setDeck, theme, onConfirm, onBack,
}: {
  deck: Deck;
  setDeck: (d: Deck) => void;
  theme: Theme;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const accent = OUTLINE_ACCENT;

  // Only content slides are editable in the outline; the hero/closing keep
  // their role but we still show their title so the structure reads clearly.
  const slides = deck.slides;

  // Quick structural stats for the header.
  const chartCount = slides.filter((s) => s.layout === "chart").length;
  const tableCount = slides.filter((s) => s.layout === "table").length;
  const contentCount = slides.filter(
    (s) => s.layout === "bullets" || s.layout === "two-column" || s.layout === "section",
  ).length;

  const setSlide = (i: number, patch: Partial<Slide>) => {
    const next = slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setDeck({ ...deck, slides: next });
  };

  const setBullet = (i: number, bi: number, value: string) => {
    const bullets = [...(slides[i].bullets || [])];
    bullets[bi] = value;
    setSlide(i, { bullets });
  };

  const addBullet = (i: number) => {
    const bullets = [...(slides[i].bullets || []), ""];
    setSlide(i, { bullets });
  };

  const removeBullet = (i: number, bi: number) => {
    const bullets = (slides[i].bullets || []).filter((_, idx) => idx !== bi);
    setSlide(i, { bullets });
  };

  const addSlideAfter = (i: number) => {
    const blank: Slide = { layout: "bullets", title: "New slide", bullets: ["New point"], annotations: [] };
    const next = [...slides.slice(0, i + 1), blank, ...slides.slice(i + 1)];
    setDeck({ ...deck, slides: next });
  };

  const removeSlide = (i: number) => {
    if (slides.length <= 2) return; // keep at least a hero + closing
    setDeck({ ...deck, slides: slides.filter((_, idx) => idx !== i) });
  };

  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setDeck({ ...deck, slides: next });
  };

  const references = deck.references || [];
  const setReferences = (refs: Reference[]) => setDeck({ ...deck, references: refs });

  return (
    <main className="min-h-screen pb-36" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b" style={{ borderColor: "var(--ezd-divider)" }}>
        {/* layered glow + grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(70% 130% at 50% -10%, var(--ezd-bg-hover), transparent 60%)` }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(var(--ezd-divider) 1px, transparent 1px), linear-gradient(90deg, var(--ezd-divider) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(70% 80% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(70% 80% at 50% 0%, black, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-14 text-center">
          {/* step indicator */}
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
              style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)", background: "var(--ezd-bg-card)" }}>
              <span className="grid h-4 w-4 place-items-center rounded-full text-[10px]" style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}>1</span>
              Outline
            </span>
            <ArrowRight size={13} style={{ color: "var(--ezd-fg-quiet)" }} />
            <span className="rounded-full border px-3 py-1" style={{ borderColor: "var(--ezd-divider)", color: "var(--ezd-fg-quiet)" }}>
              2 · Design
            </span>
          </div>

          <h1 className="mt-6 text-[34px] font-extrabold leading-[1.03] tracking-tight sm:text-[46px]" style={{ color: "var(--ezd-fg-strong)" }}>
            Shape your story,
            <br />
            <span style={{ color: accent }}>then we design it.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
            This is the content outline — words only, no design yet. Edit any slide inline, ask AI to
            rewrite one, reorder, or add and remove. When it reads right, hit <b style={{ color: "var(--ezd-fg)" }}>Design my deck</b>.
          </p>

          {/* stat pills */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <StatPill icon={<Presentation size={13} />} value={slides.length} label={slides.length === 1 ? "slide" : "slides"} accent={accent} strong />
            {contentCount > 0 && <StatPill icon={<ListChecks size={13} />} value={contentCount} label="content" accent={accent} />}
            {chartCount > 0 && <StatPill icon={<BarChart3 size={13} />} value={chartCount} label={chartCount === 1 ? "chart" : "charts"} accent={accent} />}
            {tableCount > 0 && <StatPill icon={<Table2 size={13} />} value={tableCount} label={tableCount === 1 ? "table" : "tables"} accent={accent} />}
          </div>
        </div>
      </header>

      {/* Slide cards */}
      <div className="mx-auto max-w-3xl px-4 pt-2 sm:px-6">
        {slides.map((s, i) => (
          <div key={i}>
            <SlideOutlineCard
              index={i}
              total={slides.length}
              slide={s}
              accent={accent}
              deck={deck}
              theme={theme}
              references={references}
              onSetReferences={setReferences}
              onChart={(chart) => setSlide(i, { chart })}
              onTitle={(v) => setSlide(i, { title: v })}
              onBullet={(bi, v) => setBullet(i, bi, v)}
              onAddBullet={() => addBullet(i)}
              onRemoveBullet={(bi) => removeBullet(i, bi)}
              onRemoveSlide={() => removeSlide(i)}
              onMoveUp={() => moveSlide(i, -1)}
              onMoveDown={() => moveSlide(i, 1)}
              onApplyAi={(updated) => setSlide(i, updated)}
            />
            {/* Insert-between control */}
            <div className="relative my-2 flex justify-center">
              <button
                onClick={() => addSlideAfter(i)}
                className="group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium opacity-60 transition hover:opacity-100"
                style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-muted)" }}
              >
                <Plus size={12} /> Add slide
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky confirm bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl"
        style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-nav-bg)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3.5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-medium transition hover:opacity-90"
            style={{ borderColor: "var(--ezd-divider)", color: "var(--ezd-fg-muted)" }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className="hidden text-[12.5px] sm:block" style={{ color: "var(--ezd-fg-quiet)" }}>
            {slides.length} slides ready · edit anything before you design
          </span>
          <button
            onClick={onConfirm}
            className="group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold shadow-lg transition hover:scale-[1.02] hover:opacity-90"
            style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
          >
            <Wand2 size={15} /> Design my deck
            <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </main>
  );
}

/** Small stat pill for the outline hero. */
function StatPill({
  icon, value, label, accent, strong,
}: { icon: React.ReactNode; value: number; label: string; accent: string; strong?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium"
      style={
        strong
          ? { borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }
          : { borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-muted)" }
      }
    >
      {icon}
      <span className="tabular-nums font-semibold" style={{ color: strong ? accent : "var(--ezd-fg)" }}>{value}</span>
      {label}
    </span>
  );
}

/* ------------------------------ slide card ------------------------------ */

function SlideOutlineCard({
  index, total, slide, accent, deck, theme, references, onSetReferences, onChart,
  onTitle, onBullet, onAddBullet, onRemoveBullet, onRemoveSlide, onMoveUp, onMoveDown, onApplyAi,
}: {
  index: number;
  total: number;
  slide: Slide;
  accent: string;
  deck: Deck;
  theme: Theme;
  references: Reference[];
  onSetReferences: (refs: Reference[]) => void;
  onChart: (chart: Slide["chart"]) => void;
  onTitle: (v: string) => void;
  onBullet: (bi: number, v: string) => void;
  onAddBullet: () => void;
  onRemoveBullet: (bi: number) => void;
  onRemoveSlide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onApplyAi: (patch: Partial<Slide>) => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHero = slide.layout === "title-hero";
  const isClosing = slide.layout === "closing";
  const { label: roleLabel, Icon: RoleIcon } = roleMeta(slide.layout);

  const runAi = async () => {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const token = await getIdToken().catch(() => null);
      const res = await fetch("/api/edit-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          deck,
          theme: { bg: theme.bg, fg: theme.fg, accent: theme.accent },
          slideIndex: index,
          instruction: text,
          history: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.slide) {
        setNote(data?.error || "Couldn't apply that. Try rephrasing.");
      } else {
        // Outline is text-only: take the rewritten title/subtitle/bullets/body.
        const u = data.slide as Slide;
        onApplyAi({ title: u.title, subtitle: u.subtitle, bullets: u.bullets, body: u.body });
        setInstruction("");
        setNote(data.explanation || "Updated.");
      }
    } catch {
      setNote("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="group relative mt-4 overflow-hidden rounded-2xl border transition"
      style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}
    >
      {/* Accent spine */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold tabular-nums"
              style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}
            >
              {index + 1}
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-muted)", background: "var(--ezd-bg-hover)" }}
            >
              <RoleIcon size={12} /> {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
            <IconBtn label="Move up" disabled={index === 0} onClick={onMoveUp}><ChevronUp size={15} /></IconBtn>
            <IconBtn label="Move down" disabled={index === total - 1} onClick={onMoveDown}><ChevronDown size={15} /></IconBtn>
            <IconBtn label="Delete slide" disabled={total <= 2} onClick={onRemoveSlide} danger><Trash2 size={14} /></IconBtn>
          </div>
        </div>

        {/* Title */}
        <input
          value={slide.title || ""}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Slide title"
          className="mt-3 w-full bg-transparent text-[17px] font-bold leading-snug tracking-tight outline-none placeholder:opacity-40"
          style={{ color: "var(--ezd-fg-strong)" }}
        />

        {/* Bullets (text content slides) */}
        {(slide.layout === "bullets" || slide.layout === "two-column" || slide.layout === "section") && (
          <div className="mt-2 space-y-1.5">
            {(slide.bullets || []).map((b, bi) => (
              <div key={bi} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                <textarea
                  value={b}
                  onChange={(e) => onBullet(bi, e.target.value)}
                  rows={1}
                  placeholder="Point…"
                  className="min-h-[28px] w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:opacity-40"
                  style={{ color: "var(--ezd-fg)" }}
                />
                <button
                  onClick={() => onRemoveBullet(bi)}
                  className="mt-1 rounded p-1 opacity-0 transition hover:bg-black/5 group-hover:opacity-60 hover:!opacity-100"
                  aria-label="Remove point"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={onAddBullet}
              className="ml-3.5 inline-flex items-center gap-1 text-[12.5px] font-medium transition hover:opacity-80"
              style={{ color: accent }}
            >
              <Plus size={12} /> Add point
            </button>
          </div>
        )}

        {/* Chart slide — show the real graph + editable data */}
        {slide.layout === "chart" && slide.chart && (
          <ChartOutline chart={slide.chart} theme={theme} accent={accent} onChart={onChart} />
        )}

        {/* Table slide — show the data table */}
        {slide.layout === "table" && slide.table && (
          <TableOutline table={slide.table} accent={accent} />
        )}

        {/* References slide — show + edit the source list */}
        {slide.layout === "references" && (
          <ReferencesOutline references={references} accent={accent} onSet={onSetReferences} />
        )}

        {/* Subtitle for hero/closing */}
        {(isHero || isClosing) && (
          <input
            value={slide.subtitle || ""}
            onChange={(e) => onApplyAi({ subtitle: e.target.value })}
            placeholder={isHero ? "One-line description" : "Closing line"}
            className="mt-2 w-full bg-transparent text-[14px] leading-relaxed outline-none placeholder:opacity-40"
            style={{ color: "var(--ezd-fg-muted)" }}
          />
        )}

        {/* AI chat */}
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ezd-divider)" }}>
          {!chatOpen ? (
            <button
              onClick={() => { setChatOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition hover:opacity-90"
              style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)", background: "var(--ezd-bg-hover)" }}
            >
              <Sparkles size={12} /> Ask AI to edit this slide
            </button>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2"
                   style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-hover)" }}>
                <Sparkles size={14} style={{ color: accent }} />
                <input
                  ref={inputRef}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runAi(); if (e.key === "Escape") setChatOpen(false); }}
                  disabled={busy}
                  placeholder="e.g. make these punchier, add a point about cost, rewrite for students"
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-45"
                  style={{ color: "var(--ezd-fg)" }}
                />
                <button
                  onClick={runAi}
                  disabled={busy || !instruction.trim()}
                  className="grid h-7 w-7 place-items-center rounded-lg transition disabled:opacity-40"
                  style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}
                  aria-label="Send"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                </button>
              </div>
              {note && (
                <div className="mt-1.5 px-1 text-[11.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>{note}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children, onClick, label, disabled, danger,
}: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-lg p-1.5 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
      style={{ color: danger ? "#e5484d" : "var(--ezd-fg-muted)" }}
    >
      {children}
    </button>
  );
}

/* ----------------------------- chart preview ----------------------------- */

function ChartOutline({
  chart, theme, accent, onChart,
}: { chart: NonNullable<Slide["chart"]>; theme: Theme; accent: string; onChart: (c: Slide["chart"]) => void }) {
  // Render the real chart so the outline reflects what the slide will show.
  const svg = renderChartSvg(chart, theme);
  const data = chart.data || [];

  const setDatum = (i: number, patch: Partial<{ label: string; value: number }>) => {
    const next = data.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    onChart({ ...chart, data: next });
  };

  return (
    <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-hover)" }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {chart.type} chart
        </span>
        <input
          value={chart.title || ""}
          onChange={(e) => onChart({ ...chart, title: e.target.value })}
          placeholder="Chart caption"
          className="w-1/2 bg-transparent text-right text-[12px] outline-none placeholder:opacity-40"
          style={{ color: "var(--ezd-fg-muted)" }}
        />
      </div>
      {/* Live graph preview */}
      <div
        className="mx-auto max-w-[420px] overflow-hidden rounded-lg bg-white p-2"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {/* Editable data points */}
      <div className="mt-2.5 space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color || accent }} />
            <input
              value={d.label}
              onChange={(e) => setDatum(i, { label: e.target.value })}
              className="flex-1 bg-transparent text-[12.5px] outline-none"
              style={{ color: "var(--ezd-fg)" }}
            />
            <input
              type="number"
              value={Number.isFinite(d.value) ? d.value : 0}
              onChange={(e) => setDatum(i, { value: Number(e.target.value) })}
              className="w-20 rounded border bg-transparent px-2 py-0.5 text-right text-[12.5px] tabular-nums outline-none"
              style={{ borderColor: "var(--ezd-divider)", color: "var(--ezd-fg)" }}
            />
            {chart.unit ? <span className="w-5 text-[11px]" style={{ color: "var(--ezd-fg-quiet)" }}>{chart.unit}</span> : null}
          </div>
        ))}
      </div>
      {chart.note ? (
        <div className="mt-2 text-[11px] italic" style={{ color: "var(--ezd-fg-quiet)" }}>{chart.note}</div>
      ) : null}
    </div>
  );
}

/* ----------------------------- table preview ----------------------------- */

function TableOutline({ table, accent }: { table: TableData; accent: string }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ezd-divider)" }}>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr style={{ background: "var(--ezd-bg-hover)" }}>
            {table.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold" style={{ color: accent }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-t" style={{ borderColor: "var(--ezd-divider)" }}>
              {row.map((c, ci) => (
                <td key={ci} className="px-3 py-1.5" style={{ color: "var(--ezd-fg)" }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.source ? (
        <div className="px-3 py-1.5 text-[11px] italic" style={{ color: "var(--ezd-fg-quiet)" }}>Source: {table.source}</div>
      ) : null}
    </div>
  );
}

/* --------------------------- references editor --------------------------- */

function ReferencesOutline({
  references, accent, onSet,
}: { references: Reference[]; accent: string; onSet: (r: Reference[]) => void }) {
  const setRef = (i: number, patch: Partial<Reference>) =>
    onSet(references.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => onSet([...references, { text: "", url: "" }]);
  const remove = (i: number) => onSet(references.filter((_, idx) => idx !== i));

  return (
    <div className="mt-3 space-y-2">
      {references.length === 0 && (
        <p className="text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          No references yet — add the sources you want cited.
        </p>
      )}
      {references.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 text-[11px] font-semibold tabular-nums" style={{ color: accent }}>{i + 1}.</span>
          <div className="flex-1 space-y-1">
            <input
              value={r.text}
              onChange={(e) => setRef(i, { text: e.target.value })}
              placeholder="Author (Year). Title. Publisher."
              className="w-full bg-transparent text-[13px] outline-none placeholder:opacity-40"
              style={{ color: "var(--ezd-fg)" }}
            />
            <input
              value={r.url || ""}
              onChange={(e) => setRef(i, { url: e.target.value })}
              placeholder="https://… (optional)"
              className="w-full bg-transparent text-[11.5px] outline-none placeholder:opacity-35"
              style={{ color: "var(--ezd-fg-quiet)" }}
            />
          </div>
          <button onClick={() => remove(i)} className="mt-0.5 rounded p-1 transition hover:bg-black/5" aria-label="Remove reference">
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium transition hover:opacity-80"
        style={{ color: accent }}
      >
        <Plus size={12} /> Add reference
      </button>
    </div>
  );
}
