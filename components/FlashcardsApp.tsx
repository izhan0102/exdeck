"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, RotateCcw, Shuffle, ArrowLeft, ArrowRight, Check, X,
  BookOpen, ListChecks, Download, FileText, RefreshCw, Plus, Upload, Trophy, Maximize2, Minimize2, FilePlus2,
} from "lucide-react";
import { getIdToken, isLoggedIn } from "@/lib/auth";
import { extractPdfText } from "@/lib/pdfText";
import TutorChat from "./TutorChat";

type Card = { q: string; a: string; distractors: string[] };
type Deck = { title: string; cards: Card[] };
type QuizItem = { card: Card; options: string[]; answer: string };

const EXAMPLES = [
  "Photosynthesis", "World War II key events", "JavaScript fundamentals",
  "The human circulatory system", "Quantum physics basics",
];
const COUNTS = [8, 12, 20, 30];

type Theme = { id: string; label: string; swatch: string; face: string; fg: string; accent: string; muted: string; ring: string };
const THEMES: Theme[] = [
  { id: "default", label: "Default", swatch: "var(--ezd-bg-hover)", face: "var(--ezd-bg-card)", fg: "var(--ezd-fg-strong)", accent: "var(--ezd-fg-muted)", muted: "var(--ezd-fg-quiet)", ring: "var(--ezd-fg-strong)" },
  { id: "ocean", label: "Ocean", swatch: "linear-gradient(135deg,#38bdf8,#0369a1)", face: "linear-gradient(135deg,#0ea5e9,#0369a1)", fg: "#ffffff", accent: "rgba(255,255,255,.92)", muted: "rgba(255,255,255,.72)", ring: "#0ea5e9" },
  { id: "violet", label: "Violet", swatch: "linear-gradient(135deg,#a78bfa,#6d28d9)", face: "linear-gradient(135deg,#8b5cf6,#6d28d9)", fg: "#ffffff", accent: "rgba(255,255,255,.92)", muted: "rgba(255,255,255,.72)", ring: "#8b5cf6" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg,#fdba74,#ea580c)", face: "linear-gradient(135deg,#fb923c,#ea580c)", fg: "#ffffff", accent: "rgba(255,255,255,.92)", muted: "rgba(255,255,255,.75)", ring: "#ea580c" },
  { id: "forest", label: "Forest", swatch: "linear-gradient(135deg,#6ee7b7,#059669)", face: "linear-gradient(135deg,#34d399,#059669)", fg: "#ffffff", accent: "rgba(255,255,255,.92)", muted: "rgba(255,255,255,.75)", ring: "#059669" },
  { id: "rose", label: "Rose", swatch: "linear-gradient(135deg,#fda4af,#e11d48)", face: "linear-gradient(135deg,#fb7185,#e11d48)", fg: "#ffffff", accent: "rgba(255,255,255,.92)", muted: "rgba(255,255,255,.75)", ring: "#e11d48" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildQuiz(cards: Card[]): QuizItem[] {
  return shuffle(cards).map((card) => ({
    card, answer: card.a, options: shuffle([card.a, ...card.distractors.slice(0, 3)]),
  }));
}

export default function FlashcardsApp() {
  const router = useRouter();

  // generation
  const [input, setInput] = useState("");
  const [count, setCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceInput, setSourceInput] = useState("");

  // pdf upload
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // deck + mode + theme
  const [deck, setDeck] = useState<Deck | null>(null);
  const [mode, setMode] = useState<"study" | "quiz">("study");
  const [themeId, setThemeId] = useState("default");

  // study
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [studyDone, setStudyDone] = useState(false);

  // quiz
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [qPos, setQPos] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [moreBusy, setMoreBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [density, setDensity] = useState("balanced");
  const [busyAll, setBusyAll] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addQ, setAddQ] = useState("");
  const [addA, setAddA] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  const startDeck = (d: Deck) => {
    setDeck(d);
    setMode("study");
    setOrder(d.cards.map((_, i) => i));
    setPos(0); setFlipped(false); setKnown(new Set()); setStudyDone(false);
    setQuiz(buildQuiz(d.cards)); setQPos(0); setPicked(null);
    setAnswers(new Array(d.cards.length).fill(null));
  };

  const generate = useCallback(async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    if (!isLoggedIn()) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }
    setLoading(true); setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ input: text, count }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
      const cards: Card[] = Array.isArray(data?.cards) ? data.cards : [];
      if (cards.length === 0) throw new Error("No cards came back — try a clearer topic.");
      setSourceInput(text);
      startDeck({ title: data?.title || "Flashcards", cards });
    } catch (e: any) {
      setError(e?.message || "Couldn't generate flashcards.");
    } finally {
      setLoading(false);
    }
  }, [input, count, loading, router]);

  const onPdf = async (file?: File | null) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { setError("Please choose a PDF file."); return; }
    setPdfBusy(true); setError(""); setPdfMsg("Reading PDF…");
    try {
      const text = await extractPdfText(file, (p) => {
        if (p.phase === "reading") setPdfMsg(`Reading page ${p.page || 0} of ${p.total || 0}…`);
        else if (p.phase === "ocr") setPdfMsg(`Scanning page ${p.page || 0} of ${p.total || 0} (OCR)…`);
      });
      const clean = (text || "").trim();
      if (clean.length < 20) { setError("Couldn't read enough text from that PDF — it may be scanned images."); setPdfMsg(""); }
      else { setInput(clean); setPdfMsg(`Loaded ${file.name} · ${clean.length.toLocaleString()} characters`); }
    } catch {
      setError("Couldn't read that PDF."); setPdfMsg("");
    } finally {
      setPdfBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ----------------------------- study actions ----------------------------- */
  const total = deck?.cards.length || 0;
  const curIdx = order[pos];
  const curCard = deck?.cards[curIdx];

  const go = useCallback((delta: number) => {
    if (!deck) return;
    setFlipped(false);
    setPos((p) => {
      const t = p + delta;
      if (t > order.length - 1) { setStudyDone(true); return p; }
      return Math.max(0, t);
    });
  }, [deck, order.length]);

  const reshuffle = useCallback(() => {
    if (!deck) return;
    setOrder(shuffle(deck.cards.map((_, i) => i)));
    setPos(0); setFlipped(false); setStudyDone(false);
  }, [deck]);

  const markKnown = useCallback((isKnown: boolean) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (isKnown) next.add(curIdx); else next.delete(curIdx);
      return next;
    });
    go(1);
  }, [curIdx, go]);

  const studyAgain = (indices?: number[]) => {
    if (!deck) return;
    setOrder(indices && indices.length ? indices : deck.cards.map((_, i) => i));
    setPos(0); setFlipped(false); setStudyDone(false);
  };
  const unknownIdx = useMemo(
    () => (deck ? deck.cards.map((_, i) => i).filter((i) => !known.has(i)) : []),
    [deck, known],
  );

  useEffect(() => {
    if (!deck || mode !== "study" || studyDone) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck, mode, studyDone, go]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  /* ----------------------------- quiz actions ----------------------------- */
  const quizItem = quiz[qPos];
  const quizDone = deck ? qPos >= quiz.length : false;
  const score = useMemo(
    () => answers.reduce((s, a, i) => s + (a && quiz[i] && a === quiz[i].answer ? 1 : 0), 0),
    [answers, quiz],
  );
  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    setAnswers((prev) => { const n = [...prev]; n[qPos] = opt; return n; });
  };
  const nextQuestion = () => { setPicked(null); setQPos((p) => p + 1); };
  const restartQuiz = () => {
    if (!deck) return;
    setQuiz(buildQuiz(deck.cards)); setQPos(0); setPicked(null);
    setAnswers(new Array(deck.cards.length).fill(null));
  };
  const switchMode = (m: "study" | "quiz") => {
    setMode(m);
    if (m === "quiz" && deck && quiz.length === 0) restartQuiz();
  };
  const generateMore = async () => {
    if (!deck || !sourceInput || moreBusy) return;
    setMoreBusy(true); setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ input: sourceInput, count }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
      const incoming: Card[] = Array.isArray(data?.cards) ? data.cards : [];
      const seen = new Set(deck.cards.map((c) => c.q.toLowerCase().trim()));
      const fresh = incoming.filter((c) => c.q && c.a && !seen.has(c.q.toLowerCase().trim()));
      if (fresh.length === 0) throw new Error("No new questions this time — try again.");
      const merged = { ...deck, cards: [...deck.cards, ...fresh] };
      setDeck(merged);
      setAnswers(new Array(merged.cards.length).fill(null));
      setQuiz(buildQuiz(merged.cards)); setQPos(0); setPicked(null);
    } catch (e: any) {
      setError(e?.message || "Couldn't add more questions.");
    } finally {
      setMoreBusy(false);
    }
  };

  const changeDensity = async (next: string) => {
    if (!deck || busyAll || next === density) return;
    setDensity(next);
    setBusyAll(true); setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ mode: "redensify", density: next, topic: deck.title, cards: deck.cards.map((c) => ({ q: c.q, a: c.a })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
      const updated: Card[] = Array.isArray(data?.cards) ? data.cards : [];
      if (updated.length === 0) throw new Error("Couldn't change the density.");
      const merged = { ...deck, cards: updated };
      setDeck(merged);
      setOrder(merged.cards.map((_, i) => i)); setPos(0); setFlipped(false); setStudyDone(false);
      setQuiz(buildQuiz(merged.cards)); setQPos(0); setPicked(null);
      setAnswers(new Array(merged.cards.length).fill(null));
    } catch (e: any) {
      setError(e?.message || "Couldn't change the density.");
    } finally {
      setBusyAll(false);
    }
  };

  const addCard = async () => {
    const q = addQ.trim();
    if (!q || addBusy || !deck) return;
    setAddBusy(true); setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question: q, answer: addA.trim(), density, topic: deck.title }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }
      if (!res.ok || !data?.card) throw new Error(data?.error || "Couldn't add the card.");
      const card: Card = { q: data.card.q, a: data.card.a, distractors: Array.isArray(data.card.distractors) ? data.card.distractors : [] };
      const merged = { ...deck, cards: [...deck.cards, card] };
      setDeck(merged);
      setOrder((o) => [...o, merged.cards.length - 1]);
      setAnswers((a) => [...a, null]);
      setQuiz((qz) => [...qz, { card, answer: card.a, options: shuffle([card.a, ...card.distractors.slice(0, 3)]) }]);
      setAddQ(""); setAddA(""); setShowAdd(false);
    } catch (e: any) {
      setError(e?.message || "Couldn't add the card.");
    } finally {
      setAddBusy(false);
    }
  };

  const reset = () => { setDeck(null); setError(""); setInput(""); setSourceInput(""); setPdfMsg(""); };

  /* ----------------------------- export ----------------------------- */
  const exportCSV = () => {
    if (!deck) return;
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["Front,Back", ...deck.cards.map((c) => `${esc(c.q)},${esc(c.a)}`)].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${deck.title || "flashcards"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportPDF = async () => {
    if (!deck) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const M = 48; let y = M;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(deck.title || "Flashcards", M, y); y += 26;
    doc.setFontSize(11);
    deck.cards.forEach((c, i) => {
      const q = doc.splitTextToSize(`${i + 1}. ${c.q}`, W - M * 2);
      const a = doc.splitTextToSize(`Answer: ${c.a}`, W - M * 2);
      const block = (q.length + a.length) * 15 + 12;
      if (y + block > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.text(q, M, y); y += q.length * 15;
      doc.setFont("helvetica", "normal"); doc.setTextColor(90); doc.text(a, M, y);
      doc.setTextColor(0); y += a.length * 15 + 12;
    });
    doc.save(`${deck.title || "flashcards"}.pdf`);
  };

  const tutorTopic = deck?.title || "";

  /* ============================== render ============================== */
  let content: React.ReactNode;

  if (!deck) {
    content = (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a topic (e.g. 'Quantum physics basics') or paste your notes…"
            rows={5}
            className="w-full resize-none rounded-xl border bg-transparent p-3.5 text-[15px] leading-relaxed outline-none transition focus:border-white/30"
            style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)" }}
          />

          {/* upload + examples */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onPdf(e.target.files?.[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={pdfBusy}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition hover:opacity-80 disabled:opacity-60"
              style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
            >
              {pdfBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload PDF
            </button>
            <span className="h-4 w-px" style={{ background: "var(--ezd-hairline)" }} />
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setInput(ex)} className="rounded-full border px-3 py-1 text-[12px] transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>
                {ex}
              </button>
            ))}
          </div>
          {pdfMsg && <p className="mt-2 text-[12px]" style={{ color: "var(--ezd-fg-quiet)" }}>{pdfMsg}</p>}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px]" style={{ color: "var(--ezd-fg-muted)" }}>Cards</span>
              <div className="inline-flex overflow-hidden rounded-lg border" style={{ borderColor: "var(--ezd-hairline)" }}>
                {COUNTS.map((n) => (
                  <button key={n} onClick={() => setCount(n)} className="px-3 py-1.5 text-[13px] font-medium transition" style={count === n ? { background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" } : { background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => generate()}
              disabled={loading || input.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "48px" }}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Sparkles size={16} /> Generate flashcards</>}
            </button>
          </div>

          {error && <p className="mt-3 rounded-lg border px-3 py-2 text-[13px]" style={{ borderColor: "rgba(248,113,113,.3)", background: "rgba(248,113,113,.06)", color: "#fca5a5" }}>{error}</p>}
        </div>
        <p className="mt-4 text-center text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          Free · Upload a PDF or type a topic · Study + quiz · Export to PDF or Anki · Up to 30 cards
        </p>
      </div>
    );
  } else {
    content = (
      <div className="mx-auto w-full max-w-3xl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>{deck.title}</h2>
            <p className="text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>{total} cards · {known.size} known</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="inline-flex overflow-hidden rounded-lg border" style={{ borderColor: "var(--ezd-hairline)" }}>
              <button onClick={() => switchMode("study")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium transition" style={mode === "study" ? { background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" } : { background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>
                <BookOpen size={13} /> Study
              </button>
              <button onClick={() => switchMode("quiz")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium transition" style={mode === "quiz" ? { background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" } : { background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>
                <ListChecks size={13} /> Quiz
              </button>
            </div>
            <select
              value={density}
              onChange={(e) => changeDensity(e.target.value)}
              disabled={busyAll}
              title="Answer density — rewrites all cards"
              className="rounded-lg border px-2 py-1.5 text-[12.5px] font-medium outline-none transition disabled:opacity-50"
              style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}
            >
              <option value="brief">Brief</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
            {busyAll && <Loader2 size={14} className="animate-spin" style={{ color: "var(--ezd-fg-muted)" }} />}
            <IconBtn title="Add a card" onClick={() => setShowAdd(true)}><FilePlus2 size={15} /></IconBtn>
            <IconBtn title="Export PDF" onClick={exportPDF}><FileText size={15} /></IconBtn>
            <IconBtn title="Export CSV (Anki)" onClick={exportCSV}><Download size={15} /></IconBtn>
            <IconBtn title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => setFullscreen((v) => !v)}>{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</IconBtn>
            <IconBtn title="New set" onClick={reset}><Plus size={15} /></IconBtn>
          </div>
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: "rgba(0,0,0,.55)" }} onClick={() => !addBusy && setShowAdd(false)}>
            <div className="w-full max-w-md rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-page)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>Add a flashcard</h3>
                <button onClick={() => !addBusy && setShowAdd(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg transition hover:opacity-70" style={{ color: "var(--ezd-fg-muted)" }}><X size={16} /></button>
              </div>
              <label className="mt-4 block text-[12.5px] font-medium" style={{ color: "var(--ezd-fg-muted)" }}>Question</label>
              <textarea value={addQ} onChange={(e) => setAddQ(e.target.value)} rows={2} placeholder="e.g. What is the powerhouse of the cell?" className="mt-1 w-full resize-none rounded-xl border bg-transparent p-3 text-[14px] outline-none transition focus:border-white/30" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)" }} />
              <label className="mt-3 block text-[12.5px] font-medium" style={{ color: "var(--ezd-fg-muted)" }}>Answer <span style={{ color: "var(--ezd-fg-quiet)" }}>— leave blank and AI writes it</span></label>
              <textarea value={addA} onChange={(e) => setAddA(e.target.value)} rows={2} placeholder="Optional" className="mt-1 w-full resize-none rounded-xl border bg-transparent p-3 text-[14px] outline-none transition focus:border-white/30" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)" }} />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => !addBusy && setShowAdd(false)} className="rounded-full border px-4 py-2 text-[13px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }}>Cancel</button>
                <button onClick={addCard} disabled={addBusy || addQ.trim().length === 0} className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
                  {addBusy ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : "Add card"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* progress */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--ezd-bg-hover)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${mode === "study" ? (studyDone ? 100 : ((pos + 1) / total) * 100) : (Math.min(qPos, total) / total) * 100}%`, background: "var(--ezd-fg-strong)" }} />
        </div>

        {/* ---------------- STUDY ---------------- */}
        {mode === "study" && !studyDone && curCard && (
          <div className="mt-5">
            {/* color theme swatches */}
            <div className="mb-3 flex items-center justify-center gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  title={t.label}
                  aria-label={t.label}
                  className="h-6 w-6 rounded-full border transition hover:scale-110"
                  style={{ background: t.swatch, borderColor: t.id === themeId ? t.ring : "var(--ezd-hairline)", boxShadow: t.id === themeId ? `0 0 0 2px var(--ezd-bg-page), 0 0 0 4px ${t.ring}` : "none" }}
                />
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
              <span>{pos + 1} / {total}</span>
              <button onClick={reshuffle} className="inline-flex items-center gap-1.5 transition hover:opacity-80" style={{ color: "var(--ezd-fg-muted)" }}>
                <Shuffle size={13} /> Shuffle
              </button>
            </div>

            <button onClick={() => setFlipped((f) => !f)} className="block w-full" style={{ perspective: "1600px" }} aria-label="Flip card">
              <div className="relative w-full transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: "clamp(220px, 38vh, 340px)" }}>
                <Face bg={theme.face}>
                  <span className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.muted }}>Question</span>
                  <p className="text-[clamp(18px,3.4vw,26px)] font-semibold leading-snug" style={{ color: theme.fg }}>{curCard.q}</p>
                  <span className="mt-5 text-[12px]" style={{ color: theme.muted }}>Tap or press Space to flip</span>
                </Face>
                <Face back bg={theme.face}>
                  <span className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>Answer</span>
                  <p className="text-[clamp(17px,3vw,24px)] font-medium leading-snug" style={{ color: theme.fg }}>{curCard.a}</p>
                </Face>
              </div>
            </button>

            <div className="mt-5 flex items-center justify-between gap-3">
              <IconBtn title="Previous" onClick={() => go(-1)} disabled={pos === 0}><ArrowLeft size={16} /></IconBtn>
              <div className="flex items-center gap-2">
                <button onClick={() => markKnown(false)} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-medium transition hover:opacity-80" style={{ borderColor: "rgba(248,113,113,.35)", color: "#fca5a5", minHeight: "44px" }}>
                  <RotateCcw size={14} /> Review
                </button>
                <button onClick={() => markKnown(true)} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-medium transition hover:opacity-80" style={{ borderColor: "rgba(52,211,153,.4)", color: "#6ee7b7", minHeight: "44px" }}>
                  <Check size={14} /> Got it
                </button>
              </div>
              <IconBtn title="Next" onClick={() => go(1)}><ArrowRight size={16} /></IconBtn>
            </div>
          </div>
        )}

        {/* ---------------- STUDY COMPLETE ---------------- */}
        {mode === "study" && studyDone && (
          <div className="mt-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}><Trophy size={28} /></div>
            <h3 className="mt-4 text-[20px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>You went through all {total} cards! 🎉</h3>
            <p className="mt-1 text-[13.5px]" style={{ color: "var(--ezd-fg-muted)" }}>
              {known.size} marked known · {unknownIdx.length} to review. What next?
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <button onClick={() => studyAgain()} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition hover:opacity-90" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "44px" }}>
                <RotateCcw size={14} /> Study again
              </button>
              <button onClick={() => studyAgain(unknownIdx)} disabled={unknownIdx.length === 0} className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition hover:opacity-80 disabled:opacity-40" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)", minHeight: "44px" }}>
                <BookOpen size={14} /> Review {unknownIdx.length} unknown
              </button>
              <button onClick={() => { setStudyDone(false); switchMode("quiz"); }} className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)", minHeight: "44px" }}>
                <ListChecks size={14} /> Take the quiz
              </button>
            </div>
          </div>
        )}

        {/* ---------------- QUIZ ---------------- */}
        {mode === "quiz" && !quizDone && quizItem && (
          <div className="mt-6">
            <p className="mb-1 text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>Question {qPos + 1} of {total}</p>
            <h3 className="text-[clamp(17px,3vw,22px)] font-semibold leading-snug" style={{ color: "var(--ezd-fg-strong)" }}>{quizItem.card.q}</h3>
            <div className="mt-5 grid gap-2.5">
              {quizItem.options.map((opt) => {
                const isCorrect = opt === quizItem.answer;
                const isPicked = picked === opt;
                let st: React.CSSProperties = { borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg)" };
                if (picked) {
                  if (isCorrect) st = { borderColor: "rgba(52,211,153,.6)", background: "rgba(52,211,153,.12)", color: "var(--ezd-fg-strong)" };
                  else if (isPicked) st = { borderColor: "rgba(248,113,113,.6)", background: "rgba(248,113,113,.12)", color: "var(--ezd-fg-strong)" };
                  else st = { borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-quiet)" };
                }
                return (
                  <button key={opt} onClick={() => pick(opt)} disabled={!!picked} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-[14.5px] transition hover:opacity-95 disabled:cursor-default" style={{ ...st, minHeight: "52px" }}>
                    <span>{opt}</span>
                    {picked && isCorrect && <Check size={16} className="shrink-0" style={{ color: "#34d399" }} />}
                    {picked && isPicked && !isCorrect && <X size={16} className="shrink-0" style={{ color: "#f87171" }} />}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="mt-5 flex justify-end">
                <button onClick={nextQuestion} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition hover:opacity-90" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "48px" }}>
                  {qPos + 1 === total ? "See results" : "Next"} <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- QUIZ RESULTS ---------------- */}
        {mode === "quiz" && quizDone && (
          <div className="mt-8 text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full" style={{ background: "var(--ezd-bg-hover)" }}>
              <span className="text-[26px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>{Math.round((score / total) * 100)}%</span>
            </div>
            <h3 className="mt-4 text-[20px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>You scored {score} / {total}</h3>
            <p className="mt-1 text-[13.5px]" style={{ color: "var(--ezd-fg-muted)" }}>
              {score === total ? "Perfect — you know this cold." : score / total >= 0.7 ? "Strong. Review the misses and you're set." : "Good start. Study the cards and try again."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button onClick={restartQuiz} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition hover:opacity-90" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "44px" }}>
                <RefreshCw size={14} /> Retake quiz
              </button>
              <button onClick={generateMore} disabled={moreBusy} className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-semibold transition hover:opacity-80 disabled:opacity-50" style={{ borderColor: "var(--ezd-fg-strong)", color: "var(--ezd-fg-strong)", minHeight: "44px" }}>
                {moreBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate more questions
              </button>
              <button onClick={() => switchMode("study")} className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)", minHeight: "44px" }}>
                <BookOpen size={14} /> Back to study
              </button>
            </div>
            {error && <p className="mx-auto mt-4 max-w-sm text-[12.5px]" style={{ color: "#fca5a5" }}>{error}</p>}

            <div className="mt-8 space-y-2.5 text-left">
              {quiz.map((it, i) => {
                const got = answers[i];
                if (got === it.answer) return null;
                return (
                  <div key={i} className="rounded-xl border p-3.5" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)" }}>
                    <p className="text-[13.5px] font-medium" style={{ color: "var(--ezd-fg-strong)" }}>{it.card.q}</p>
                    <p className="mt-1 text-[13px]" style={{ color: "#6ee7b7" }}>Correct: {it.answer}</p>
                    {got && <p className="text-[13px]" style={{ color: "#fca5a5" }}>You picked: {got}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const inner = (
    <div className={`lg:flex lg:items-start lg:gap-6 ${fullscreen ? "h-full overflow-hidden" : ""}`}>
      <div className={`min-w-0 flex-1 ${fullscreen ? "h-full overflow-y-auto" : ""}`}>{content}</div>
      {deck && <TutorChat topic={tutorTopic} fullscreen={fullscreen} />}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--ezd-bg-page)" }}>
        <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--ezd-divider)" }}>
          <span className="truncate text-[13px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{deck?.title || "Flashcards"}</span>
          <button onClick={() => setFullscreen(false)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }}>
            <Minimize2 size={13} /> Exit fullscreen
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">{inner}</div>
      </div>
    );
  }

  return inner;
}

/* ----------------------------- small bits ----------------------------- */
function Face({ children, back = false, bg }: { children: React.ReactNode; back?: boolean; bg: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-6 text-center sm:p-8"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        borderColor: "var(--ezd-divider)",
        background: bg,
        boxShadow: "0 10px 30px -18px rgba(0,0,0,.5)",
      }}
    >
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} className="grid place-items-center rounded-lg border transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)", height: "40px", width: "40px" }}>
      {children}
    </button>
  );
}
