"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, Loader2, Image as ImageIcon, Type, Layers, Trash2, Eye, EyeOff, Plus, Sparkles, BarChart3, Workflow } from "lucide-react";
import { extractPptx, type ExtractedDeck, type ExtractedElement, type BgDecor } from "@/lib/pptxExtract";
import { chartDataUri, type ChartSpec } from "@/lib/charts";

const CHART_THEME = { id: "lab", name: "Lab", bg: "#ffffff", fg: "#111111", accent: "#2563eb", muted: "#64748b", font: "sans" } as any;

/** Google fonts offered in the text toolbar (loaded on demand, shown in-font). */
const GOOGLE_FONTS = [
  "Arial", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Playfair Display", "Merriweather", "Georgia", "Oswald", "Raleway",
  "Nunito", "Source Sans 3", "PT Serif", "Bebas Neue",
];

/**
 * /template-lab — EXPERIMENTAL, unlinked test page.
 *
 * Upload a .pptx → we strip the background into an image and pull every logo,
 * image, and text box out as separate, draggable assets. The canvas shows the
 * extracted background (like SlideCanvas would show a theme); the right panel
 * holds everything we stripped so you can drag pieces back onto the slide
 * wherever you want. Fully client-side.
 */

type Placed = ExtractedElement & { placed: boolean };
type LabSlide = { bgImage?: string; bgColor?: string; bgDecor?: BgDecor[]; elements: Placed[] };

export default function TemplateLabPage() {
  const [deck, setDeck] = useState<ExtractedDeck | null>(null);
  const [slides, setSlides] = useState<LabSlide[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBg, setShowBg] = useState(true);
  const [canvasH, setCanvasH] = useState(600);
  const [aiText, setAiText] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [editingContext, setEditingContext] = useState(false);
  const [density, setDensity] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const resize = useRef<{ id: string; ox: number; oy: number; ow: number; oh: number; of: number } | null>(null);

  // Measure canvas height so font sizes (stored as % of slide height) render
  // at the correct pixel size for the current canvas.
  const measure = useCallback(() => {
    const h = canvasRef.current?.getBoundingClientRect().height;
    if (h) setCanvasH(h);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, deck, active]);

  // Persist the project context + density so "Generate" works on any slide
  // without re-typing.
  useEffect(() => {
    try {
      const p = localStorage.getItem("exdeck_lab_project"); if (p) setProjectContext(p);
      const d = localStorage.getItem("exdeck_lab_density"); if (d === "concise" || d === "balanced" || d === "detailed") setDensity(d);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("exdeck_lab_project", projectContext); } catch { /* ignore */ } }, [projectContext]);
  useEffect(() => { try { localStorage.setItem("exdeck_lab_density", density); } catch { /* ignore */ } }, [density]);

  const onFile = useCallback(async (file: File) => {
    setError(null); setLoading(true); setDeck(null); setSlides([]);
    try {
      if (!file.name.toLowerCase().endsWith(".pptx")) {
        throw new Error("Please upload a .pptx file (PowerPoint). Other formats aren't supported in this test.");
      }
      const d = await extractPptx(file);
      if (!d.slides.length) throw new Error("No slides found in that file.");
      setDeck(d);
      setSlides(d.slides.map((s) => ({
        bgImage: s.bgImage, bgColor: s.bgColor, bgDecor: s.bgDecor,
        elements: s.elements.map((e) => ({ ...e, placed: true })),
      })));
      setActive(0);
    } catch (e: any) {
      setError(e?.message || "Could not read that file.");
    } finally {
      setLoading(false);
    }
  }, []);

  const slide = slides[active];
  const aspect = deck ? deck.aspect : 16 / 9;

  // ---- all element mutations target the element by unique id across ALL
  // slides, so a stale `active` index can never wipe or misplace an edit. ----
  const updateEl = useCallback((id: string, patch: (el: Placed) => Placed) =>
    setSlides((prev) => prev.map((s) => ({ ...s, elements: s.elements.map((el) => el.id === id ? patch(el) : el) }))), []);

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    setSelectedId(id);
    const el = slides[active].elements.find((x) => x.id === id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!el || !rect) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, dx: e.clientX - (rect.left + (el.xPct / 100) * rect.width), dy: e.clientY - (rect.top + (el.yPct / 100) * rect.height) };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (resize.current) {
      const dwPct = ((e.clientX - resize.current.ox) / rect.width) * 100;
      const dhPct = ((e.clientY - resize.current.oy) / rect.height) * 100;
      const newW = Math.max(10, Math.min(95, resize.current.ow + dwPct));
      const newH = Math.max(5, Math.min(92, resize.current.oh + dhPct));
      const fontRatio = newH / Math.max(1, resize.current.oh);
      const newFont = Math.max(0.8, resize.current.of * fontRatio);
      updateEl(resize.current.id, (el) => el.kind !== "text" ? { ...el, wPct: newW, hPct: newH } : {
        ...el, wPct: newW, hPct: newH,
        paragraphs: el.paragraphs.map((p) => ({ ...p, runs: p.runs.map((r) => ({ ...r, sizePct: newFont })) })),
      });
      return;
    }
    if (!drag.current) return;
    const xPct = ((e.clientX - drag.current.dx - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - drag.current.dy - rect.top) / rect.height) * 100;
    updateEl(drag.current.id, (el) => ({ ...el, xPct: Math.max(-5, Math.min(100, xPct)), yPct: Math.max(-5, Math.min(100, yPct)) }));
  };
  const onPointerUp = () => { drag.current = null; resize.current = null; };
  const onResizeDown = (e: React.PointerEvent, el: Placed) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const of = el.kind === "text" ? (el.paragraphs[0]?.runs[0]?.sizePct || bodySizePct) : bodySizePct;
    resize.current = { id: el.id, ox: e.clientX, oy: e.clientY, ow: el.wPct, oh: el.hPct || 20, of };
  };

  const setPlaced = (id: string, placed: boolean) => updateEl(id, (el) => ({ ...el, placed }));

  // Font / size(pt) / line-spacing for a text element (applies to all its runs).
  const ptToPct = (pt: number) => deck ? (pt * 12700) / deck.heightEmu * 100 : pt * 0.196;
  const pctToPt = (pct: number) => deck ? Math.round((pct / 100) * deck.heightEmu / 12700) : Math.round(pct / 0.196);
  const setTextStyle = (id: string, patch: { font?: string; pt?: number; lineHeightEm?: number; color?: string }) => {
    if (patch.font) loadGoogleFont(patch.font);
    updateEl(id, (el) => {
      if (el.kind !== "text") return el;
      const paragraphs = el.paragraphs.map((p) => ({
        ...p,
        runs: p.runs.map((r) => ({
          ...r,
          font: patch.font !== undefined ? patch.font : r.font,
          color: patch.color !== undefined ? patch.color : r.color,
          sizePct: patch.pt !== undefined ? ptToPct(patch.pt) : r.sizePct,
        })),
      }));
      return { ...el, paragraphs, lineHeightEm: patch.lineHeightEm !== undefined ? patch.lineHeightEm : el.lineHeightEm };
    });
  };
  const removeEl = (id: string) =>
    setSlides((prev) => prev.map((s) => ({ ...s, elements: s.elements.filter((el) => el.id !== id) })));

  // Commit an inline text edit: split on newlines into paragraphs, keeping the
  // styling (color/size/bold) of the element's first run.
  const commitEdit = (id: string, text: string) =>
    updateEl(id, (el) => {
      if (el.kind !== "text") return el;
      const base = el.paragraphs[0]?.runs[0] || {};
      const align = el.paragraphs[0]?.align;
      const paragraphs = text.split("\n").map((line) => ({ align, runs: [{ ...base, text: line }] }));
      return { ...el, paragraphs, preview: text.replace(/\n+/g, " ").trim() };
    });

  // Add a fresh, empty text box to the current slide.
  const addTextBox = () => setSlides((prev) => prev.map((s, i) => i !== active ? s : {
    ...s,
    elements: [...s.elements, {
      id: `new_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      kind: "text", placed: true, xPct: 30, yPct: 40, wPct: 40, hPct: 12,
      paragraphs: [{ align: "left", runs: [{ text: "New text", color: "#111111", bold: false, sizePct: deck ? (16 * 12700) / deck.heightEmu * 100 : 3.0 }] }],
      preview: "New text",
    } as Placed],
  }));

  // Update a table's cells by id, preserving fills + column widths.
  const setTableRows = (id: string, rows: string[][]) =>
    setSlides((prev) => prev.map((s) => ({
      ...s,
      elements: s.elements.map((el) => {
        if (el.id !== id || el.kind !== "table") return el;
        const newRows = rows.map((row, ri) => row.map((c, ci) => {
          const orig = el.rows[ri]?.[ci];
          const base = orig?.paragraphs?.[0]?.runs?.[0] || {};
          const align = orig?.paragraphs?.[0]?.align;
          return { fill: orig?.fill, paragraphs: [{ align, runs: [{ ...base, text: String(c) }] }] };
        }));
        return { ...el, rows: newRows };
      }),
    })));

  // Uniform body font size = 16pt as a % of slide height (kept for manual boxes).
  const bodySizePct = deck ? (16 * 12700) / deck.heightEmu * 100 : 3.0;
  const cellText = (rows: any[][]) => rows.map((row) => row.map((c) => c.paragraphs.map((p: any) => p.runs.map((r: any) => r.text).join("")).join(" ")));

  // Generate content for the CURRENT slide from the saved project context
  // (+ optional extra note). Bullets go in a centered body box below the
  // heading; a returned table is added centered under it.
  const runAi = async () => {
    const ctx = projectContext.trim();
    const extra = aiText.trim();
    // If no context saved yet, treat the typed text as the project context.
    const effectiveCtx = ctx || extra;
    if (!effectiveCtx || aiBusy || !slide) return;
    if (!ctx && extra) setProjectContext(extra);
    const intent = ctx ? (extra ? `${ctx}. Additional note for this slide: ${extra}` : ctx) : extra;

    setAiBusy(true);
    setAiProgress("Writing…");
    try {
      const snap = slides;
      const deckTitles = snap.map((s) => (s.elements.find((e) => e.kind === "text") as any)?.preview || "");
      const texts = slide.elements.filter((e) => e.kind === "text") as Extract<Placed, { kind: "text" }>[];
      const heading = texts.slice().sort((a, b) => a.yPct - b.yPct)[0];
      const slideTitle = heading?.preview || `Slide ${active + 1}`;
      // If the slide already has a table, FILL it instead of writing text.
      const existingTables = slide.elements.filter((e) => e.kind === "table").map((e) => ({ id: e.id, rows: cellText((e as any).rows) }));
      const res = await fetch("/api/template-ai", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent, slideTitle, deckTitles, density, existingTables }),
      });
      if (res.ok) {
        const data = await res.json();
        // Fill existing tables (table slides) — no body text.
        if (data.tables && typeof data.tables === "object" && Object.keys(data.tables).length) {
          Object.entries(data.tables).forEach(([id, rows]) => Array.isArray(rows) && setTableRows(id, rows as string[][]));
        } else {
          const bullets: string[] = Array.isArray(data.bullets) ? data.bullets.filter(Boolean) : [];
          const yBelow = heading ? Math.min(60, heading.yPct + (heading.hPct || 8) + 4) : 28;
          if (bullets.length) upsertBody(active, bullets, yBelow);
          if (data.table && Array.isArray(data.table.headers) && Array.isArray(data.table.rows)) {
            upsertTable(active, data.table.headers, data.table.rows, yBelow);
          }
          if (data.chart && data.chart.type && Array.isArray(data.chart.data) && data.chart.data.length) {
            upsertChart(active, data.chart as ChartSpec, yBelow);
          }
        }
        if (extra) setAiText("");
      }
      setAiProgress("Done ✓");
      setTimeout(() => setAiProgress(""), 1400);
    } catch {
      setAiProgress("Failed");
      setTimeout(() => setAiProgress(""), 1400);
    } finally {
      setAiBusy(false);
    }
  };

  // Body box: centered, bulleted. Stable id per slide → replaced on re-run.
  const upsertBody = (slideIndex: number, bullets: string[], yPct: number) => setSlides((prev) => prev.map((s, i) => {
    if (i !== slideIndex) return s;
    const id = `aibody_${slideIndex}`;
    const lines = bullets.map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return s;
    // Auto-fit: shrink font as the number of lines grows so content never
    // spills under the canvas. Base ~14pt, scaling down toward ~9pt.
    const avail = Math.max(20, 90 - yPct);
    const base = bodySizePct * (12 <= lines.length ? 0.72 : lines.length >= 8 ? 0.82 : lines.length >= 6 ? 0.92 : 1.05);
    const sizePct = Math.max(bodySizePct * 0.6, base);
    const paragraphs = lines.map((line) => ({ align: "left", runs: [{ text: `•  ${line.replace(/^[•\-*]\s*/, "")}`, color: "#111111", bold: false, sizePct, font: "Arial" }] }));
    const preview = lines.join(" ");
    if (s.elements.some((e) => e.id === id)) {
      return { ...s, elements: s.elements.map((e) => e.id === id ? { ...e, paragraphs, preview, hPct: avail, rev: (((e as any).rev) || 0) + 1 } as Placed : e) };
    }
    const box = { id, kind: "text", placed: true, xPct: 18, yPct, wPct: 64, hPct: avail, paragraphs, preview, lineHeightEm: 1.45, vAlign: "t" } as Placed;
    return { ...s, elements: [...s.elements, box] };
  }));

  // AI-generated table: centered below the body. Stable id per slide.
  const upsertTable = (slideIndex: number, headers: string[], rows: string[][], yPct: number) => setSlides((prev) => prev.map((s, i) => {
    if (i !== slideIndex) return s;
    const id = `aitable_${slideIndex}`;
    const cols = headers.length || (rows[0]?.length ?? 1);
    const colPct = Array.from({ length: cols }, () => 100 / cols);
    const mkCell = (text: string, bold = false, fill?: string) => ({ fill, paragraphs: [{ align: "left", runs: [{ text, bold, color: "#111111", sizePct: bodySizePct * 0.9, font: "Arial" }] }] });
    const bodyRows = [headers.map((h) => mkCell(h, true, "#e5e7eb")), ...rows.map((r) => r.map((c) => mkCell(c)))];
    const box = { id, kind: "table", placed: true, xPct: 12, yPct: Math.min(58, yPct + 6), wPct: 76, hPct: 34, rows: bodyRows, colPct } as Placed;
    if (s.elements.some((e) => e.id === id)) return { ...s, elements: s.elements.map((e) => e.id === id ? box : e) };
    return { ...s, elements: [...s.elements, box] };
  }));

  // Chart: rendered with the SAME engine as the main deck maker (chartDataUri),
  // dropped in as an image element. Centered. Stable id per slide.
  const upsertChart = (slideIndex: number, spec: ChartSpec, yPct: number) => {
    let src = "";
    try { src = chartDataUri(spec, CHART_THEME); } catch { return; }
    if (!src) return;
    setSlides((prev) => prev.map((s, i) => {
      if (i !== slideIndex) return s;
      const id = `aichart_${slideIndex}`;
      const box = { id, kind: "image", placed: true, xPct: 30, yPct: Math.min(50, yPct + 4), wPct: 40, hPct: 34, src } as Placed;
      if (s.elements.some((e) => e.id === id)) return { ...s, elements: s.elements.map((e) => e.id === id ? box : e) };
      return { ...s, elements: [...s.elements, box] };
    }));
  };

  // Manual chart: open the editor popup (type + data), like the deck maker.
  const insertChart = () => { if (slide) setChartOpen(true); };
  // Diagram: open the mermaid editor; insert the rendered SVG as an image.
  const insertDiagram = () => { if (slide) setDiagramOpen(true); };
  const applyDiagram = (svg: string) => {
    const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setSlides((prev) => prev.map((s, i) => i !== active ? s : {
      ...s,
      elements: [...s.elements, { id: `diag_${Date.now().toString(36)}`, kind: "image", placed: true, xPct: 22, yPct: 26, wPct: 56, hPct: 48, src } as Placed],
    }));
    setDiagramOpen(false);
  };
  const applyChart = (spec: ChartSpec) => {
    let src = "";
    try { src = chartDataUri(spec, CHART_THEME); } catch { return; }
    if (!src) return;
    setSlides((prev) => prev.map((s, i) => i !== active ? s : {
      ...s,
      elements: [...s.elements, { id: `chart_${Date.now().toString(36)}`, kind: "image", placed: true, xPct: 30, yPct: 32, wPct: 40, hPct: 36, src } as Placed],
    }));
    setChartOpen(false);
  };

  const assets = useMemo(() => slide?.elements || [], [slide]);
  const textAssets = useMemo(() => assets.filter((a) => a.kind === "text"), [assets]);
  const imageAssets = useMemo(() => assets.filter((a) => a.kind === "image"), [assets]);
  const tableAssets = useMemo(() => assets.filter((a) => a.kind === "table"), [assets]);

  return (
    <div className="min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      {/* Header */}
      <header className="border-b px-6 py-4" style={{ borderColor: "var(--ezd-hairline)" }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--ezd-fg-strong)" }}>Template Lab <span className="ml-2 rounded px-2 py-0.5 text-[10px] font-semibold align-middle" style={{ background: "#f59e0b22", color: "#f59e0b" }}>UNDER DEVELOPMENT</span></h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--ezd-fg-quiet)" }}>Work in progress — not final. Upload a .pptx → strip background, logo, images &amp; text into draggable assets. Client-side only.</p>
          </div>
          {deck && (
            <label className="cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-muted)" }}>
              <input type="file" accept=".pptx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              Upload another
            </label>
          )}
        </div>
      </header>

      {!deck ? (
        <Dropzone loading={loading} error={error} onFile={onFile} />
      ) : (
        <>
        <div className="mx-auto flex max-w-[1400px] gap-5 px-6 py-6 pb-28">
          {/* Slide rail */}
          <div className="w-[150px] shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ezd-fg-quiet)" }}>{slides.length} slides</div>
            <div className="flex flex-col gap-2 max-h-[78vh] overflow-y-auto pr-1">
              {slides.map((s, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className="relative w-full overflow-hidden rounded-lg border text-left"
                  style={{ borderColor: i === active ? "var(--ezd-fg-strong)" : "var(--ezd-hairline)", aspectRatio: String(aspect), background: s.bgColor || "#fff" }}>
                  <MiniSlide slide={s} aspect={aspect} />
                  <span className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 [&>*]:shrink-0">
              <button onClick={() => setShowBg((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px]" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>
                {showBg ? <Eye size={13} /> : <EyeOff size={13} />} Background
              </button>
              <button onClick={addTextBox} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
                <Plus size={13} /> Add text box
              </button>
              <button onClick={insertChart} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}>
                <BarChart3 size={13} /> Add chart
              </button>
              <button onClick={insertDiagram} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}>
                <Workflow size={13} /> Add diagram
              </button>
              <span className="text-[12px]" style={{ color: "var(--ezd-fg-quiet)" }}>Slide {active + 1} · click text to edit · Enter for new lines</span>
              {(() => {
                const sel = slide?.elements.find((e) => e.id === selectedId && e.kind === "text") as Extract<ExtractedElement, { kind: "text" }> | undefined;
                if (!sel) return null;
                const curPt = pctToPt(sel.paragraphs[0]?.runs[0]?.sizePct || bodySizePct);
                const curFont = sel.paragraphs[0]?.runs[0]?.font || "Arial";
                const curLh = sel.lineHeightEm || 1.2;
                const curColor = sel.paragraphs[0]?.runs[0]?.color || "#111111";
                return (
                  <div className="ml-auto flex items-center gap-1.5 rounded-lg border px-2 py-1" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)" }}>
                    <FontPicker value={curFont} onChange={(f) => setTextStyle(sel.id, { font: f })} />
                    <span style={{ color: "var(--ezd-fg-quiet)" }}>·</span>
                    <input type="number" min={6} max={96} value={curPt} onChange={(e) => setTextStyle(sel.id, { pt: Number(e.target.value) })} title="Font size (pt)" className="w-12 bg-transparent text-[12px] outline-none" style={{ color: "var(--ezd-fg-strong)" }} />
                    <span className="text-[10px]" style={{ color: "var(--ezd-fg-quiet)" }}>pt</span>
                    <span style={{ color: "var(--ezd-fg-quiet)" }}>·</span>
                    <input type="number" min={1} max={3} step={0.1} value={curLh} onChange={(e) => setTextStyle(sel.id, { lineHeightEm: Number(e.target.value) })} title="Line spacing" className="w-12 bg-transparent text-[12px] outline-none" style={{ color: "var(--ezd-fg-strong)" }} />
                    <span className="text-[10px]" style={{ color: "var(--ezd-fg-quiet)" }}>line</span>
                    <span style={{ color: "var(--ezd-fg-quiet)" }}>·</span>
                    <label className="relative inline-flex h-5 w-5 cursor-pointer items-center overflow-hidden rounded" title="Text color" style={{ background: curColor, border: "1px solid var(--ezd-hairline)" }}>
                      <input type="color" value={/^#[0-9a-f]{6}$/i.test(curColor) ? curColor : "#111111"} onChange={(e) => setTextStyle(sel.id, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                    </label>
                  </div>
                );
              })()}
            </div>
            <div
              className="rounded-2xl border p-6"
              style={{ background: "var(--ezd-bg-elev)", borderColor: "var(--ezd-hairline)" }}
            >
            <div
              ref={canvasRef}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerDown={(e) => { if (e.target === canvasRef.current) setSelectedId(null); }}
              className="relative mx-auto w-full max-w-[900px] overflow-hidden rounded-lg border shadow-2xl"
              style={{ aspectRatio: String(aspect), background: slide?.bgColor || "#ffffff", borderColor: "var(--ezd-hairline)" }}
            >
              {showBg && slide?.bgImage && (
                <img src={slide.bgImage} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
              )}
              {showBg && slide?.bgDecor?.map((d, i) => d.kind === "image" ? (
                <img key={i} src={d.src} alt="" className="pointer-events-none absolute object-fill"
                  style={{ left: `${d.xPct}%`, top: `${d.yPct}%`, width: `${d.wPct}%`, height: `${d.hPct}%` }} />
              ) : (
                <div key={i} className="pointer-events-none absolute"
                  style={{ left: `${d.xPct}%`, top: `${d.yPct}%`, width: `${d.wPct}%`, height: `${d.hPct}%`, background: d.fill }} />
              ))}
              {slide?.elements.filter((e) => e.placed).map((el) => (
                <div
                  key={el.id}
                  className="group absolute"
                  style={{ left: `${el.xPct}%`, top: `${el.yPct}%`, width: `${el.wPct}%`, height: el.kind !== "text" ? `${el.hPct}%` : undefined, touchAction: "none", outline: selectedId === el.id ? "2px solid #2563eb" : undefined, outlineOffset: 2 }}
                >
                  {/* resize handle (bottom-right) — visible while selected */}
                  <span
                    onPointerDown={(e) => { setSelectedId(el.id); onResizeDown(e, el); }}
                    title="Resize (auto-scales font)"
                    className={`absolute bottom-0 right-0 z-30 h-4 w-4 cursor-nwse-resize rounded-sm ${selectedId === el.id ? "block" : "hidden group-hover:block"}`}
                    style={{ background: "#2563eb", border: "2px solid #fff", touchAction: "none" }}
                  />
                  {el.kind === "image" ? (
                    <img src={el.src} alt="" onPointerDown={(e) => onPointerDown(e, el.id)} className="h-full w-full object-contain cursor-move" draggable={false} />
                  ) : el.kind === "table" ? (
                    <table onPointerDown={(e) => onPointerDown(e, el.id)} className="h-full w-full border-collapse cursor-move" style={{ tableLayout: "fixed" }}>
                      <colgroup>{el.colPct.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                      <tbody>
                        {el.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ background: cell.fill || "transparent", border: "1px solid rgba(0,0,0,0.35)", padding: "2px 5px", verticalAlign: "middle" }}>
                                {cell.paragraphs.map((p, pi) => (
                                  <div key={pi} style={{ textAlign: (p.align as any) || "left" }}>
                                    {p.runs.map((r, rk) => (
                                      <span key={rk} style={{ color: r.color || "#111", fontWeight: r.bold ? 700 : 400, fontStyle: r.italic ? "italic" : undefined, fontSize: r.sizePct ? `${(r.sizePct / 100) * canvasH}px` : "12px" }}>{r.text}</span>
                                    ))}
                                  </div>
                                ))}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <>
                      {/* drag handle (hover) — lets you move without disturbing edit */}
                      <span
                        onPointerDown={(e) => onPointerDown(e, el.id)}
                        title="Drag to move"
                        className="absolute -left-2 -top-2 z-10 hidden h-4 w-4 cursor-move place-items-center rounded-full group-hover:grid"
                        style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)", fontSize: 9 }}
                      >✥</span>
                      <EditableText el={el} canvasH={canvasH} onCommit={commitEdit} onSelect={setSelectedId} />
                    </>
                  )}
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Extracted assets panel */}
          <div className="w-[300px] shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={15} style={{ color: "var(--ezd-fg-strong)" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Extracted assets</span>
            </div>
            <p className="text-[11px] mb-4" style={{ color: "var(--ezd-fg-quiet)" }}>
              Everything stripped from this slide. Toggle onto the canvas and drag to place.
            </p>

            <AssetGroup icon={<ImageIcon size={13} />} title={`Images & logos (${imageAssets.length})`}>
              {imageAssets.map((a) => (
                <AssetRow key={a.id} placed={a.placed} onToggle={() => setPlaced(a.id, !a.placed)} onRemove={() => removeEl(a.id)}
                  label={a.kind === "image" && a.isLogo ? "Logo" : "Image"}>
                  {a.kind === "image" && <img src={a.src} alt="" className="h-9 w-9 rounded object-contain" style={{ background: "var(--ezd-bg-hover)" }} />}
                </AssetRow>
              ))}
              {imageAssets.length === 0 && <Empty>No images found</Empty>}
            </AssetGroup>

            <AssetGroup icon={<Type size={13} />} title={`Text (${textAssets.length})`}>
              {textAssets.map((a) => (
                <AssetRow key={a.id} placed={a.placed} onToggle={() => setPlaced(a.id, !a.placed)} onRemove={() => removeEl(a.id)}
                  label={a.kind === "text" ? (a.preview.length > 30 ? a.preview.slice(0, 30) + "…" : a.preview || "(text)") : ""} />
              ))}
              {textAssets.length === 0 && <Empty>No text found</Empty>}
            </AssetGroup>

            {tableAssets.length > 0 && (
              <AssetGroup icon={<Layers size={13} />} title={`Tables (${tableAssets.length})`}>
                {tableAssets.map((a) => (
                  <AssetRow key={a.id} placed={a.placed} onToggle={() => setPlaced(a.id, !a.placed)} onRemove={() => removeEl(a.id)}
                    label={a.kind === "table" ? `Table · ${a.rows.length}×${a.rows[0]?.length || 0}` : ""} />
                ))}
              </AssetGroup>
            )}
          </div>
        </div>

        {/* Floating AI content bar */}
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5">
          <div className="w-full max-w-3xl rounded-2xl border p-2 shadow-2xl" style={{ background: "var(--ezd-bg-elev)", borderColor: "var(--ezd-hairline)" }}>
            <div className="flex items-center gap-2 px-1 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ezd-fg-quiet)" }}>Project</span>
              {editingContext || !projectContext ? (
                <input
                  autoFocus={editingContext}
                  value={projectContext}
                  onChange={(e) => setProjectContext(e.target.value)}
                  onBlur={() => setEditingContext(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingContext(false)}
                  placeholder="What is the presentation about? e.g. digital platform for monitoring NGO activities"
                  className="flex-1 rounded-md border bg-transparent px-2 py-1 text-[12px] outline-none"
                  style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }}
                />
              ) : (
                <button onClick={() => setEditingContext(true)} className="flex-1 truncate rounded-md px-2 py-1 text-left text-[12px]" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }} title="Click to edit">
                  {projectContext} <span style={{ color: "var(--ezd-fg-quiet)" }}>· edit</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}>Slide {active + 1}</span>
              <select value={density} onChange={(e) => setDensity(e.target.value as any)} className="rounded-lg border bg-transparent px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} title="Content density">
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
              <input
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAi()}
                placeholder="Optional: extra note for this slide…"
                className="flex-1 bg-transparent px-2 text-sm outline-none"
                style={{ color: "var(--ezd-fg-strong)" }}
              />
              {aiProgress && <span className="whitespace-nowrap text-[11px] tabular-nums" style={{ color: "var(--ezd-fg-quiet)" }}>{aiProgress}</span>}
              <button onClick={runAi} disabled={aiBusy || (!projectContext.trim() && !aiText.trim())}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40"
                style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
                {aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {aiBusy ? "Writing" : (slide?.elements.some((e) => e.id.startsWith("aibody_") || e.id.startsWith("aitable_") || e.id.startsWith("aichart_")) ? "Regenerate" : "Generate")}
              </button>
            </div>
          </div>
        </div>
        {chartOpen && <ChartModal onClose={() => setChartOpen(false)} onInsert={applyChart} />}
        {diagramOpen && <DiagramModal onClose={() => setDiagramOpen(false)} onInsert={applyDiagram} />}
        </>
      )}
    </div>
  );
}

function Dropzone({ loading, error, onFile }: { loading: boolean; error: string | null; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-8 py-20 text-center transition"
        style={{ borderColor: over ? "var(--ezd-fg-strong)" : "var(--ezd-hairline)", background: over ? "var(--ezd-bg-hover)" : "var(--ezd-bg-card)" }}
      >
        <input type="file" accept=".pptx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {loading ? (
          <><Loader2 size={30} className="animate-spin" style={{ color: "var(--ezd-fg-strong)" }} />
            <div className="mt-4 text-sm font-medium" style={{ color: "var(--ezd-fg-strong)" }}>Extracting background, images & text…</div></>
        ) : (
          <><div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--ezd-bg-hover)" }}><Upload size={24} style={{ color: "var(--ezd-fg-strong)" }} /></div>
            <div className="mt-5 text-lg font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Drop a .pptx here</div>
            <div className="mt-1 text-sm" style={{ color: "var(--ezd-fg-muted)" }}>We'll strip the background, logo, images and text into draggable pieces.</div>
            <div className="mt-4 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>Choose file</div></>
        )}
      </label>
      {error && <div className="mt-4 rounded-xl border p-3 text-center text-sm" style={{ borderColor: "#ef444455", background: "#ef444415", color: "#ef4444" }}>{error}</div>}
      <p className="mt-6 text-center text-[12px]" style={{ color: "var(--ezd-fg-quiet)" }}>
        Experimental · PowerPoint (.pptx) only · nothing leaves your browser
      </p>
    </div>
  );
}

function AssetGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ezd-fg-quiet)" }}>{icon}{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function AssetRow({ label, placed, onToggle, onRemove, children }: { label: string; placed: boolean; onToggle: () => void; onRemove: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)" }}>
      {children}
      <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "var(--ezd-fg-muted)" }}>{label}</span>
      <button onClick={onToggle} title={placed ? "Hide from slide" : "Place on slide"}
        className="grid h-6 w-6 place-items-center rounded" style={{ background: "var(--ezd-bg-hover)", color: placed ? "var(--ezd-fg-strong)" : "var(--ezd-fg-quiet)" }}>
        {placed ? <Eye size={13} /> : <Plus size={13} />}
      </button>
      <button onClick={onRemove} title="Remove" className="grid h-6 w-6 place-items-center rounded" style={{ background: "var(--ezd-bg-hover)", color: "#ef4444" }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Scaled, read-only slide preview for the rail — mirrors the main canvas. */
function MiniSlide({ slide, aspect }: { slide: LabSlide; aspect: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [h, setH] = useState(80);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    setH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {slide.bgImage && <img src={slide.bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {slide.bgDecor?.map((d, i) => d.kind === "image" ? (
        <img key={i} src={d.src} alt="" className="absolute object-fill" style={{ left: `${d.xPct}%`, top: `${d.yPct}%`, width: `${d.wPct}%`, height: `${d.hPct}%` }} />
      ) : (
        <div key={i} className="absolute" style={{ left: `${d.xPct}%`, top: `${d.yPct}%`, width: `${d.wPct}%`, height: `${d.hPct}%`, background: d.fill }} />
      ))}
      {slide.elements.filter((e) => e.placed).map((el) => (
        <div key={el.id} className="absolute overflow-hidden" style={{ left: `${el.xPct}%`, top: `${el.yPct}%`, width: `${el.wPct}%`, height: el.kind !== "text" ? `${el.hPct}%` : undefined }}>
          {el.kind === "image" ? (
            <img src={el.src} alt="" className="h-full w-full object-contain" />
          ) : el.kind === "table" ? (
            <table className="h-full w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <tbody>{el.rows.map((row, ri) => (
                <tr key={ri}>{row.map((c, ci) => (
                  <td key={ci} style={{ background: c.fill || "transparent", border: "0.5px solid rgba(0,0,0,0.3)", fontSize: Math.max(2, (1.8 / 100) * h) }}>
                    {c.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join(" ")}
                  </td>
                ))}</tr>
              ))}</tbody>
            </table>
          ) : (
            el.paragraphs.map((p, pi) => (
              <div key={pi} style={{ textAlign: (p.align as any) || "left", lineHeight: 1.1 }}>
                {p.runs.map((r, rk) => (
                  <span key={rk} style={{ color: r.color || "#111", fontWeight: r.bold ? 700 : 400, fontSize: Math.max(2, ((r.sizePct || 2.2) / 100) * h) }}>{r.text}</span>
                ))}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-3 text-center text-[11px]" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-quiet)" }}>{children}</div>;
}

/** Mermaid diagram editor — code + live SVG preview, inserts the SVG. */
const DIAGRAM_PRESETS: Record<string, string> = {
  Flowchart: "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Do that]\n  C --> E[End]\n  D --> E",
  Sequence: "sequenceDiagram\n  User->>App: Request\n  App->>Server: Query\n  Server-->>App: Data\n  App-->>User: Response",
  Timeline: "flowchart LR\n  P1[Phase 1] --> P2[Phase 2] --> P3[Phase 3] --> P4[Phase 4]",
  Architecture: "flowchart TB\n  UI[Frontend] --> API[API Layer]\n  API --> DB[(Database)]\n  API --> AUTH[Auth]",
};

function DiagramModal({ onClose, onInsert }: { onClose: () => void; onInsert: (svg: string) => void }) {
  const [code, setCode] = useState(DIAGRAM_PRESETS.Flowchart);
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [aiDesc, setAiDesc] = useState("");
  const [aiGen, setAiGen] = useState(false);

  const render = useCallback(async (src: string) => {
    setRendering(true); setErr(null);
    const clean = src.replace(/```(mermaid)?/gi, "").replace(/\|\s*>/g, "|").trim();
    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
      const { svg } = await mermaid.render("lab-diagram-" + Math.random().toString(36).slice(2), clean);
      setSvg(svg);
    } catch (e: any) {
      setErr(e?.message || "Invalid diagram syntax");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => { render(code); /* eslint-disable-next-line */ }, []);

  const genAi = async () => {
    if (!aiDesc.trim() || aiGen) return;
    setAiGen(true); setErr(null);
    try {
      const res = await fetch("/api/template-ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ diagramPrompt: aiDesc.trim() }) });
      const data = await res.json();
      if (data.mermaid) { setCode(data.mermaid); await render(data.mermaid); }
      else setErr("Couldn't generate a diagram — try rephrasing.");
    } catch { setErr("Generation failed."); }
    finally { setAiGen(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border p-5" style={{ background: "var(--ezd-bg-elev)", borderColor: "var(--ezd-hairline)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>Insert diagram <span className="text-[11px] font-normal" style={{ color: "var(--ezd-fg-quiet)" }}>· Mermaid</span></h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}><Trash2 size={13} /></button>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.keys(DIAGRAM_PRESETS).map((k) => (
            <button key={k} onClick={() => { setCode(DIAGRAM_PRESETS[k]); render(DIAGRAM_PRESETS[k]); }} className="rounded-md px-2.5 py-1 text-[12px]" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>{k}</button>
          ))}
        </div>
        <div className="mb-3 flex items-center gap-2">
          <input value={aiDesc} onChange={(e) => setAiDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && genAi()}
            placeholder="Describe a diagram — e.g. user auth flow, system architecture…"
            className="flex-1 rounded-lg border bg-transparent px-2.5 py-1.5 text-[12px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} />
          <button onClick={genAi} disabled={aiGen || !aiDesc.trim()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
            {aiGen ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate with AI
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <textarea value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => render(code)} rows={12}
              className="w-full rounded-lg border bg-transparent px-2.5 py-2 font-mono text-[12px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} spellCheck={false} />
            <button onClick={() => render(code)} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}>
              {rendering ? <Loader2 size={12} className="animate-spin" /> : <Workflow size={12} />} Preview
            </button>
          </div>
          <div className="flex items-center justify-center rounded-lg border p-2" style={{ borderColor: "var(--ezd-hairline)", background: "#fff", minHeight: 220 }}>
            {err ? <span className="px-3 text-center text-[12px] text-red-500">{err}</span>
              : svg ? <div className="max-h-full max-w-full overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
              : <span className="text-[12px] text-black/40">Preview</span>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ color: "var(--ezd-fg-muted)" }}>Cancel</button>
          <button onClick={() => svg && onInsert(svg)} disabled={!svg || !!err} className="rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>Insert diagram</button>
        </div>
      </div>
    </div>
  );
}

/** Chart editor popup — type + data rows + live preview (like the deck maker). */
function ChartModal({ onClose, onInsert }: { onClose: () => void; onInsert: (spec: ChartSpec) => void }) {
  const [type, setType] = useState<ChartSpec["type"]>("bar");
  const [title, setTitle] = useState("Chart title");
  const [unit, setUnit] = useState("");
  const [rows, setRows] = useState<{ label: string; value: string }[]>([
    { label: "Q1", value: "40" }, { label: "Q2", value: "65" }, { label: "Q3", value: "52" }, { label: "Q4", value: "80" },
  ]);
  const spec: ChartSpec = {
    type, title: title.trim() || undefined, unit: unit.trim() || undefined,
    data: rows.map((r) => ({ label: r.label, value: Number(r.value) || 0 })).filter((d) => d.label),
  };
  let preview = "";
  try { preview = spec.data.length ? chartDataUri(spec, CHART_THEME) : ""; } catch { preview = ""; }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border p-5" style={{ background: "var(--ezd-bg-elev)", borderColor: "var(--ezd-hairline)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>Insert chart</h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}><Trash2 size={13} /></button>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {/* Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(["bar", "line", "area", "pie", "donut"] as const).map((t) => (
                <button key={t} onClick={() => setType(t)} className="rounded-md px-2.5 py-1 text-[12px] font-medium capitalize"
                  style={{ background: type === t ? "var(--ezd-button-strong)" : "var(--ezd-bg-hover)", color: type === t ? "var(--ezd-button-strong-fg)" : "var(--ezd-fg-muted)" }}>{t}</button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-md border bg-transparent px-2 py-1.5 text-[13px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (optional) e.g. %  M  k" className="rounded-md border bg-transparent px-2 py-1.5 text-[13px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} />
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input value={r.label} onChange={(e) => setRows((p) => p.map((x, k) => k === i ? { ...x, label: e.target.value } : x))} placeholder="Label" className="w-1/2 rounded-md border bg-transparent px-2 py-1 text-[12px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} />
                  <input value={r.value} onChange={(e) => setRows((p) => p.map((x, k) => k === i ? { ...x, value: e.target.value } : x))} placeholder="Value" type="number" className="w-1/3 rounded-md border bg-transparent px-2 py-1 text-[12px] outline-none" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }} />
                  <button onClick={() => setRows((p) => p.filter((_, k) => k !== i))} className="grid h-6 w-6 place-items-center rounded" style={{ background: "var(--ezd-bg-hover)", color: "#ef4444" }}><Trash2 size={11} /></button>
                </div>
              ))}
              <button onClick={() => setRows((p) => [...p, { label: "", value: "0" }])} className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px]" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}><Plus size={12} /> Add row</button>
            </div>
          </div>
          {/* Preview */}
          <div className="flex flex-col">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ezd-fg-quiet)" }}>Preview</div>
            <div className="flex flex-1 items-center justify-center rounded-lg border p-2" style={{ borderColor: "var(--ezd-hairline)", background: "#fff", minHeight: 200 }}>
              {preview ? <img src={preview} alt="chart" className="max-h-full max-w-full" /> : <span className="text-[12px] text-black/40">Add data to preview</span>}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ color: "var(--ezd-fg-muted)" }}>Cancel</button>
          <button onClick={() => onInsert(spec)} disabled={!spec.data.length} className="rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>Insert chart</button>
        </div>
      </div>
    </div>
  );
}

/** Ensure a Google Font is loaded (once) by injecting a stylesheet link. */
function loadGoogleFont(family: string) {
  if (typeof document === "undefined") return;
  if (["Arial", "Georgia"].includes(family)) return; // system fonts
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

/** Font dropdown that previews each font in its own typeface. */
function FontPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { GOOGLE_FONTS.forEach(loadGoogleFont); }, []);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px]" style={{ color: "var(--ezd-fg-strong)", fontFamily: `'${value}', sans-serif` }} title="Font">
        {value} <span style={{ color: "var(--ezd-fg-quiet)" }}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border py-1 shadow-2xl" style={{ background: "var(--ezd-bg-elev)", borderColor: "var(--ezd-hairline)" }}>
            {GOOGLE_FONTS.map((f) => (
              <button key={f} onClick={() => { onChange(f); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-black/5"
                style={{ background: f === value ? "var(--ezd-bg-hover)" : "transparent" }}>
                <span style={{ fontFamily: `'${f}', sans-serif`, fontSize: 15, color: "var(--ezd-fg-strong)" }}>{f}</span>
                <span style={{ fontFamily: `'${f}', sans-serif`, fontSize: 15, color: "var(--ezd-fg-quiet)" }}>Ag</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Uncontrolled rich-text editor. It writes the extracted paragraphs into the
 * DOM ONCE (per element / canvas size), then never re-renders its children —
 * so React can't wipe what you type. Enter adds a new line; edits persist to
 * state on blur.
 */
function EditableText({ el, canvasH, onCommit, onSelect }: { el: Extract<ExtractedElement, { kind: "text" }>; canvasH: number; onCommit: (id: string, text: string) => void; onSelect?: (id: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const first = el.paragraphs[0]?.runs[0] || {} as any;
  const fontSizePx = ((first.sizePct || 2.2) / 100) * canvasH;
  const fontFamily = first.font ? `'${first.font}', Arial, sans-serif` : "Arial, sans-serif";
  const color = first.color || "#111111";
  const rev = (el as any).rev || 0;
  if (first.font) loadGoogleFont(first.font);

  // Render only the TEXT (with bold/italic) into the DOM. Font/size/color/
  // line-height are applied on the CONTAINER below so toolbar + resize changes
  // update instantly. Re-render text only on id / canvas / rev change (never
  // on keystrokes) so the caret is never disturbed.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = el.paragraphs.map((p) => {
      const inner = p.runs.map((r) => `<span style="font-weight:${r.bold ? 700 : 400};font-style:${r.italic ? "italic" : "normal"}">${escapeHtml(r.text) || "&nbsp;"}</span>`).join("");
      return `<div style="text-align:${p.align || "left"}">${inner}</div>`;
    }).join("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id, canvasH, rev]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => onSelect?.(el.id)}
      onInput={(e) => onCommit(el.id, (e.currentTarget as HTMLElement).innerText)}
      onBlur={(e) => onCommit(el.id, (e.currentTarget as HTMLElement).innerText)}
      className="outline-none"
      style={{
        minHeight: 8, whiteSpace: "pre-wrap", cursor: "text",
        fontFamily, fontSize: `${fontSizePx}px`, color, lineHeight: el.lineHeightEm || 1.3,
        display: "flex", flexDirection: "column",
        justifyContent: el.vAlign === "ctr" ? "center" : el.vAlign === "b" ? "flex-end" : "flex-start",
      }}
    />
  );
}
