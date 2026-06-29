"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, ArrowUp, GraduationCap, Loader2 } from "lucide-react";
import { getIdToken, isLoggedIn } from "@/lib/auth";

type Msg = { role: "user" | "assistant"; content: string };

/** Minimal, safe inline renderer: **bold** + line breaks. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block min-h-[2px]">
          {line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>,
          )}
        </span>
      ))}
    </>
  );
}

export default function TutorChat({ topic, fullscreen = false }: { topic?: string; fullscreen?: boolean }) {
  const router = useRouter();
  const subject = (topic || "").trim();
  const label = subject || "study";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Seed a friendly greeting the first time the panel opens.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm **EX-AI**, your ${label} tutor 👋\n\nAsk me anything — a concept, a doubt, or "explain it simply". I won't keep you waiting, and you can ask as many times as you like.`,
      }]);
    }
  }, [open, messages.length, label]);

  // Auto-scroll to the newest content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(40, el.scrollHeight))}px`;
  }, [input]);

  const send = useCallback(async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    if (!isLoggedIn()) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }

    setError("");
    setInput("");
    const base = [...messages, { role: "user", content: text } as Msg];
    // add an empty assistant message we will stream into
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const token = await getIdToken();
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ topic: subject, messages: base }),
      });

      if (res.status === 401) { router.push(`/auth?redirect=${encodeURIComponent("/flashcards")}`); return; }
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
      if (!acc.trim()) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: "Hmm, I didn't catch that — could you rephrase?" };
          return next;
        });
      }
    } catch (e: any) {
      setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant bubble
      setError(e?.message || "Couldn't reach the tutor. Try again.");
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages, subject, router]);

  const suggestions = subject
    ? [`Explain ${subject} simply`, "Give me an example", "Quiz me on this"]
    : ["Explain this simply", "Give me an example", "Quiz me"];

  const lastIsStreaming = busy && messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <>
      {/* Floating launcher (mobile only — on desktop the pane is always open) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold shadow-lg transition hover:scale-105 lg:hidden"
          style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
          aria-label="Open EX-AI tutor"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: "var(--ezd-button-strong-fg)", opacity: 0.6 }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "var(--ezd-button-strong-fg)" }} />
          </span>
          <Sparkles size={16} /> Ask EX-AI
        </button>
      )}

      {/* Backdrop (mobile/tablet drawer only) */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l shadow-2xl transition-transform duration-300 ease-out sm:w-[380px] ${open ? "translate-x-0" : "translate-x-full"} ${fullscreen ? "lg:static lg:z-auto lg:h-full lg:w-[360px] lg:shrink-0 lg:translate-x-0 lg:rounded-none lg:border-0 lg:border-l lg:shadow-none" : "lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-9rem)] lg:w-[340px] lg:shrink-0 lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-none"}`}
        style={{ background: "var(--ezd-bg-page)", borderColor: "var(--ezd-divider)" }}
        role="complementary"
        aria-label="EX-AI tutor chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: "var(--ezd-divider)" }}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}>
              <GraduationCap size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-[14px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>EX-AI</div>
              <div className="text-[11.5px] capitalize" style={{ color: "var(--ezd-fg-quiet)" }}>{label} tutor · always here</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg transition hover:opacity-70 lg:hidden" style={{ color: "var(--ezd-fg-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => {
            const streaming = lastIsStreaming && i === messages.length - 1;
            const empty = streaming && m.content.length === 0;
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed"
                  style={m.role === "user"
                    ? { background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", borderBottomRightRadius: 6 }
                    : { background: "var(--ezd-bg-card)", color: "var(--ezd-fg)", border: "1px solid var(--ezd-hairline)", borderBottomLeftRadius: 6 }}
                >
                  {empty ? (
                    <span className="inline-flex gap-1 py-1">
                      <Dot /> <Dot d={150} /> <Dot d={300} />
                    </span>
                  ) : (
                    <>
                      <Rich text={m.content} />
                      {streaming && <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse align-middle" style={{ background: "currentColor" }} />}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <p className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: "rgba(248,113,113,.3)", background: "rgba(248,113,113,.06)", color: "#fca5a5" }}>{error}</p>
          )}

          {/* Suggestion chips (only before the student has asked anything) */}
          {messages.filter((m) => m.role === "user").length === 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-[12px] transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-muted)" }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t p-3" style={{ borderColor: "var(--ezd-divider)" }}>
          <div className="flex items-end gap-2 rounded-2xl border p-1.5" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)" }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={`Ask your ${label} tutor…`}
              className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] outline-none"
              style={{ color: "var(--ezd-fg)" }}
            />
            <button
              onClick={() => send()}
              disabled={busy || input.trim().length === 0}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
              aria-label="Send"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>EX-AI can make mistakes — double-check what matters.</p>
        </div>
      </aside>
    </>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--ezd-fg-quiet)", animationDelay: `${d}ms` }} />;
}
