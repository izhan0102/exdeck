"use client";
import { useEffect, useRef, useState } from "react";
import type { Deck, Slide, SlideLayout } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import SlideCanvas from "./SlideCanvas";
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, Lock, Sparkles, Loader2, ChevronRight } from "lucide-react";
import { stripHtml } from "@/lib/richText";
import { type ModelId, MODELS, MODEL_ORDER } from "@/lib/models";

type Props = {
  deck: Deck;
  theme: Theme;
  active: number;
  setActive: (i: number) => void;
  onChange: (slides: Slide[]) => void;
  /** When false, drag-reorder and move up/down are locked (plan-gated). */
  canReorder?: boolean;
  /** Called when a locked reorder action is attempted. */
  onLockedReorder?: () => void;
  /** Regenerate slide `index` from scratch with the chosen model. */
  onRegenerate?: (index: number, model: ModelId) => void;
  /** Index currently regenerating (shows a spinner), or null. */
  regeneratingIndex?: number | null;
};

function emptySlide(layout: SlideLayout = "bullets"): Slide {
  return {
    layout,
    title: "New slide",
    bullets: layout === "bullets" || layout === "two-column" ? ["Bullet one", "Bullet two", "Bullet three"] : [],
    body: layout === "quote" || layout === "section" ? "" : undefined,
    annotations: [],
  };
}

export default function SlideRail({ deck, theme, active, setActive, onChange, canReorder = true, onLockedReorder, onRegenerate, regeneratingIndex }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ idx: number; x: number; y: number } | null>(null);
  // When true, the context menu shows the model list for "Regenerate with…".
  const [showModels, setShowModels] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click / Esc
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) { setMenu(null); setShowModels(false); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(null); setShowModels(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const slides = deck.slides;
  const move = (from: number, to: number) => {
    if (!canReorder) { onLockedReorder?.(); return; }
    if (from === to || from < 0 || from >= slides.length) return;
    const target = Math.max(0, Math.min(slides.length - 1, to));
    const next = [...slides];
    const [it] = next.splice(from, 1);
    next.splice(target, 0, it);
    onChange(next);
    setActive(target);
  };

  const insertAt = (i: number) => {
    const next = [...slides];
    next.splice(i, 0, emptySlide("bullets"));
    onChange(next);
    setActive(i);
  };

  const duplicate = (i: number) => {
    const next = [...slides];
    const clone: Slide = JSON.parse(JSON.stringify(slides[i]));
    next.splice(i + 1, 0, clone);
    onChange(next);
    setActive(i + 1);
  };

  const remove = (i: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, k) => k !== i);
    onChange(next);
    setActive(Math.max(0, Math.min(next.length - 1, i)));
  };

  return (
    <div className="max-h-[78vh] overflow-y-auto pr-1">
      {slides.map((s, i) => (
        <div key={i} className="relative">
          {/* Insert-before bar. The one between slides 1 and 2 (i === 1)
              carries the tour anchor for "add a slide anywhere". */}
          <InsertBar
            onClick={() => insertAt(i)}
            tourAnchor={i === 1}
          />

          {/* Drop indicator */}
          {dropIdx === i && dragIdx !== null && dragIdx !== i && (
            <div className="my-1 h-0.5 w-full rounded bg-cyan-400" />
          )}

          <button
            draggable={canReorder}
            onDragStart={(e) => {
              if (!canReorder) { e.preventDefault(); onLockedReorder?.(); return; }
              setDragIdx(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIdx !== null && dragIdx !== i) setDropIdx(i);
            }}
            onDragLeave={() => setDropIdx((d) => (d === i ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragIdx ?? Number(e.dataTransfer.getData("text/plain"));
              if (!isNaN(from)) move(from, i);
              setDragIdx(null);
              setDropIdx(null);
            }}
            onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
            onClick={() => setActive(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowModels(false);
              // Clamp so the menu (and its right-side model flyout) stay on
              // screen even for slides low in the rail.
              const MENU_W = 190, FLYOUT_W = 210, EST_H = 360;
              const x = Math.max(8, Math.min(e.clientX, window.innerWidth - MENU_W - FLYOUT_W - 8));
              const y = Math.max(8, Math.min(e.clientY, window.innerHeight - EST_H - 8));
              setMenu({ idx: i, x, y });
            }}
            className={`group block w-full overflow-hidden rounded-lg border text-left transition ${
              active === i ? "border-white/60 ring-2 ring-white/20" : "border-white/10 hover:border-white/30"
            } ${dragIdx === i ? "opacity-50" : ""}`}
          >
            <div className="pointer-events-none relative">
              <SlideCanvas slide={s} theme={theme} idx={i} total={slides.length} deckTitle={deck.title} graphicId={deck.graphic}
              graphicAccent={deck.graphicAccent}
              fontId={deck.fontId} />
              {regeneratingIndex === i && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/70 text-white">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-[10px] font-medium">Regenerating…</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between bg-black/40 px-2 py-1 text-[10px] text-white/60">
              <span className="truncate">
                {i + 1}. {stripHtml(s.title) || (s.layout === "references" ? "References" : "Untitled")}
              </span>
            </div>
          </button>
        </div>
      ))}

      {/* Final insert-after bar */}
      <InsertBar onClick={() => insertAt(slides.length)} label="Add slide" />

      {/* Context menu */}
      {menu && (
        <div
          ref={menuRef}
          style={{ position: "fixed", left: menu.x, top: menu.y, zIndex: 70, background: "var(--ezd-bg-elev)", color: "var(--ezd-fg)", borderColor: "var(--ezd-hairline)" }}
          className="min-w-[180px] rounded-lg border p-1 text-xs shadow-2xl backdrop-blur"
        >
          <MenuItem icon={canReorder ? <ArrowUp size={12} /> : <Lock size={12} />} label="Move up"
            onClick={() => { move(menu.idx, menu.idx - 1); setMenu(null); }}
            disabled={canReorder && menu.idx === 0}
          />
          <MenuItem icon={canReorder ? <ArrowDown size={12} /> : <Lock size={12} />} label="Move down"
            onClick={() => { move(menu.idx, menu.idx + 1); setMenu(null); }}
            disabled={canReorder && menu.idx === slides.length - 1}
          />
          <MenuItem icon={<Copy size={12} />} label="Duplicate"
            onClick={() => { duplicate(menu.idx); setMenu(null); }}
          />
          <MenuItem icon={<Plus size={12} />} label="Insert below"
            onClick={() => { insertAt(menu.idx + 1); setMenu(null); }}
          />
          <div className="my-1 h-px" style={{ background: "var(--ezd-hairline)" }} />
          <MenuItem icon={<Trash2 size={12} />} label="Delete"
            onClick={() => { remove(menu.idx); setMenu(null); }}
            disabled={slides.length <= 1}
            danger
          />

          {onRegenerate && (
            <>
              <div className="my-1 h-px" style={{ background: "var(--ezd-hairline)" }} />
              <button
                onMouseEnter={() => setShowModels(true)}
                onClick={() => setShowModels((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition hover:bg-white/10"
              >
                <span className="flex items-center gap-2"><Sparkles size={12} /> Regenerate with model</span>
                <ChevronRight size={12} className="opacity-60" />
              </button>

              {/* Model flyout — anchored to the menu's top-right so it never
                  spills below the viewport; its own list scrolls. */}
              {showModels && (
                <div
                  style={{ background: "var(--ezd-bg-elev)", color: "var(--ezd-fg)", borderColor: "var(--ezd-hairline)" }}
                  className="absolute left-full top-0 ml-1 flex max-h-[min(360px,80vh)] min-w-[200px] flex-col rounded-lg border p-1 shadow-2xl backdrop-blur"
                >
                  <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                    Regenerate with
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {MODEL_ORDER.map((id) => {
                      const m = MODELS[id];
                      return (
                        <button
                          key={id}
                          onClick={() => { onRegenerate(menu.idx, id); setMenu(null); setShowModels(false); }}
                          className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition hover:bg-white/10"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[11.5px]">{m.label}</span>
                            <span className="block truncate text-[9.5px] opacity-55">{m.provider}</span>
                          </span>
                          <span className="shrink-0 rounded px-1 py-0.5 text-[9.5px] font-semibold opacity-70" style={{ background: "var(--ezd-hairline)" }}>
                            {m.multiplier}×
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InsertBar({ onClick, label, tourAnchor }: { onClick: () => void; label?: string; tourAnchor?: boolean }) {
  return (
    <button
      onClick={onClick}
      {...(tourAnchor ? { "data-tour": "tour-add-slide" } : {})}
      className="group my-1 flex h-5 w-full items-center justify-center text-white/0 transition hover:text-white/80"
      title={label || "Insert slide here"}
    >
      <span className="flex h-px flex-1 bg-transparent transition group-hover:bg-white/20" />
      <span className="mx-2 grid h-4 w-4 place-items-center rounded-full border border-white/20 bg-zinc-950 text-[10px] text-white/0 transition group-hover:text-white/85">
        +
      </span>
      <span className="flex h-px flex-1 bg-transparent transition group-hover:bg-white/20" />
    </button>
  );
}

function MenuItem({
  icon, label, onClick, disabled, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition ${
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/10"
      } ${danger ? "text-red-300" : ""}`}
    >
      {icon} {label}
    </button>
  );
}
