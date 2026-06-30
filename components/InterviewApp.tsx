"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, ArrowRight, Check, Lightbulb, RefreshCw,
  ChevronDown, Award, FileText, MessageSquare,
} from "lucide-react";
import { getIdToken, isLoggedIn } from "@/lib/auth";

type Question = { q: string; competency: string };
type Feedback = { score: number; verdict: string; strengths: string[]; improvements: string[]; modelAnswer: string };
type Answer = { q: string; competency: string; answer: string; feedback: Feedback };
type Summary = {
  overall: number;
  byCompetency: { competency: string; score: number }[];
  strengths: string[]; improvements: string[]; advice: string;
};

const ROLES = ["Software Engineer", "Product Manager", "Data Analyst", "UX Designer", "Marketing Manager", "Sales Representative", "Consultant"];
const TYPES: { id: string; label: string }[] = [
  { id: "behavioral", label: "Behavioral" }, { id: "technical", label: "Technical" }, { id: "mixed", label: "Mixed" },
];
const LEVELS: { id: string; label: string }[] = [
  { id: "junior", label: "Junior" }, { id: "mid", label: "Mid" }, { id: "senior", label: "Senior" },
];

/* fade/slide-in on mount */
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={className} style={{ opacity: on ? 1 : 0, transform: on ? "translateY(0)" : "translateY(10px)", transition: "opacity .45s ease, transform .45s ease" }}>
      {children}
    </div>
  );
}

function Ring({ value, max, size = 92, children }: { value: number; max: number; size?: number; children: React.ReactNode }) {
  const sw = 8;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ezd-bg-hover)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ezd-fg-strong)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export default function InterviewApp() {
  const router = useRouter();

  const [phase, setPhase] = useState<"setup" | "interview" | "summary">("setup");
  const [role, setRole] = useState("");
  const [type, setType] = useState("mixed");
  const [level, setLevel] = useState("mid");
  const [count, setCount] = useState(5);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [normRole, setNormRole] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [fbBusy, setFbBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null); // current question's feedback
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);

  // typewriter for the current question
  const [typed, setTyped] = useState("");
  const current = questions[index];

  useEffect(() => {
    if (phase !== "interview" || !current) return;
    setTyped("");
    const full = current.q;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(full.slice(0, i));
      if (i >= full.length) { setTyped(full); clearInterval(id); }
    }, 16);
    return () => clearInterval(id);
  }, [phase, index, current]);

  const post = async (payload: any) => {
    const token = await getIdToken();
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) { router.push(`/auth?redirect=${encodeURIComponent("/interview")}`); throw new Error("auth"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
    return data;
  };

  const start = useCallback(async () => {
    const r = role.trim();
    if (!r || loading) return;
    if (!isLoggedIn()) { router.push(`/auth?redirect=${encodeURIComponent("/interview")}`); return; }
    setLoading(true); setError("");
    try {
      const data = await post({ phase: "questions", role: r, company, type, difficulty: level, count });
      const qs: Question[] = Array.isArray(data?.questions) ? data.questions : [];
      if (qs.length === 0) throw new Error("Couldn't build the interview — try a clearer role.");
      setQuestions(qs); setNormRole(data?.role || r);
      setIndex(0); setAnswers([]); setAnswerText(""); setFeedback(null); setSummary(null);
      setPhase("interview");
    } catch (e: any) {
      if (e?.message !== "auth") setError(e?.message || "Couldn't start the interview.");
    } finally {
      setLoading(false);
    }
  }, [role, type, level, count, loading, router]);

  const submitAnswer = async () => {
    const a = answerText.trim();
    if (!a || fbBusy || !current) return;
    setFbBusy(true); setError("");
    try {
      const data = await post({ phase: "feedback", role: normRole, type, question: current.q, answer: a, competency: current.competency });
      const fb: Feedback = data?.feedback;
      if (!fb) throw new Error("No feedback came back.");
      setFeedback(fb);
      setAnswers((prev) => [...prev, { q: current.q, competency: current.competency, answer: a, feedback: fb }]);
    } catch (e: any) {
      if (e?.message !== "auth") setError(e?.message || "Couldn't score that answer.");
    } finally {
      setFbBusy(false);
    }
  };

  const next = async () => {
    setFeedback(null); setAnswerText("");
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      return;
    }
    // finish -> summary
    setSummaryBusy(true); setError("");
    try {
      const transcript = answers.map((x) => ({ q: x.q, competency: x.competency, score: x.feedback.score }));
      const data = await post({ phase: "summary", role: normRole, type, transcript });
      if (!data?.summary) throw new Error("Couldn't build the report.");
      setSummary(data.summary);
      setPhase("summary");
    } catch (e: any) {
      if (e?.message !== "auth") setError(e?.message || "Couldn't build the report.");
    } finally {
      setSummaryBusy(false);
    }
  };

  const generateMore = async () => {
    if (moreBusy || summaryBusy) return;
    setMoreBusy(true); setError("");
    try {
      const data = await post({ phase: "questions", role: normRole, company, type, difficulty: level, count });
      const incoming: Question[] = Array.isArray(data?.questions) ? data.questions : [];
      const seen = new Set(questions.map((q) => q.q.toLowerCase().trim()));
      const fresh = incoming.filter((q) => q.q && !seen.has(q.q.toLowerCase().trim()));
      if (fresh.length === 0) throw new Error("No new questions this time — finish to see your report.");
      const startIdx = questions.length;
      setQuestions((prev) => [...prev, ...fresh]);
      setFeedback(null); setAnswerText("");
      setIndex(startIdx);
    } catch (e: any) {
      if (e?.message !== "auth") setError(e?.message || "Couldn't generate more questions.");
    } finally {
      setMoreBusy(false);
    }
  };

  const restart = () => {
    setPhase("setup"); setQuestions([]); setAnswers([]); setAnswerText("");
    setFeedback(null); setSummary(null); setIndex(0); setError("");
  };

  /* ============================== SETUP ============================== */
  if (phase === "setup") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border p-5 sm:p-7" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <label className="block text-[13px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Role or job description</label>
          <p className="mt-1 text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>Enter a role, or paste a job description for a tailored interview.</p>
          <textarea
            value={role}
            onChange={(e) => setRole(e.target.value)}
            rows={3}
            placeholder="e.g. Senior Product Manager — or paste the full job description…"
            className="mt-3 w-full resize-none rounded-xl border bg-transparent p-3.5 text-[15px] leading-relaxed outline-none transition focus:border-white/30"
            style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)" }}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button key={r} onClick={() => setRole(r)} className="rounded-full border px-3 py-1 text-[12px] transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}>{r}</button>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-[13px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Company <span className="font-normal" style={{ color: "var(--ezd-fg-quiet)" }}>(optional)</span></label>
            <p className="mt-1 text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>Add a company (e.g. Google, Amazon) and we&rsquo;ll tailor the questions to its known interview style.</p>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name (optional)"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-[14.5px] outline-none transition focus:border-white/30"
              style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)" }}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="Interview type">
              <Segmented options={TYPES} value={type} onChange={setType} />
            </Field>
            <Field label="Level">
              <Segmented options={LEVELS} value={level} onChange={setLevel} />
            </Field>
            <Field label="Questions (max 20)">
              <div className="inline-flex w-full items-center justify-between rounded-lg border" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)" }}>
                <button onClick={() => setCount((n) => Math.max(3, n - 1))} disabled={count <= 3} className="grid h-9 w-11 place-items-center text-[18px] font-medium transition hover:opacity-70 disabled:opacity-30" style={{ color: "var(--ezd-fg-strong)" }} aria-label="Fewer questions">−</button>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--ezd-fg-strong)" }}>{count}</span>
                <button onClick={() => setCount((n) => Math.min(20, n + 1))} disabled={count >= 20} className="grid h-9 w-11 place-items-center text-[18px] font-medium transition hover:opacity-70 disabled:opacity-30" style={{ color: "var(--ezd-fg-strong)" }} aria-label="More questions">+</button>
              </div>
            </Field>
          </div>

          <button
            onClick={start}
            disabled={loading || role.trim().length < 2}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "50px" }}
          >
            {loading ? <><Loader2 size={17} className="animate-spin" /> Preparing your interview…</> : <><Sparkles size={17} /> Start mock interview</>}
          </button>
          {error && <p className="mt-3 rounded-lg border px-3 py-2 text-[13px]" style={{ borderColor: "rgba(248,113,113,.3)", background: "rgba(248,113,113,.06)", color: "#fca5a5" }}>{error}</p>}
        </div>
        <p className="mt-4 text-center text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          Realistic questions · Scored feedback · A model answer for every question · Final report
        </p>
      </div>
    );
  }

  /* ============================ INTERVIEW ============================ */
  if (phase === "interview") {
    const answered = !!feedback;
    return (
      <div className="mx-auto w-full max-w-2xl">
        {/* progress */}
        <div className="mb-3 flex items-center justify-between text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          <span>Question {index + 1} of {questions.length}</span>
          <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-muted)" }}>{current?.competency}</span>
        </div>
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--ezd-bg-hover)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%`, background: "var(--ezd-fg-strong)" }} />
        </div>

        {/* interviewer question */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}><MessageSquare size={17} /></span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--ezd-fg-quiet)" }}>Interviewer</div>
            <p className="mt-1 text-[clamp(17px,2.6vw,21px)] font-semibold leading-snug" style={{ color: "var(--ezd-fg-strong)" }}>
              {typed}{typed.length < (current?.q.length || 0) && <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse align-middle" style={{ background: "currentColor" }} />}
            </p>
          </div>
        </div>

        {/* answer / feedback */}
        {!answered ? (
          <div className="mt-5">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={6}
              placeholder="Type your answer as you would say it out loud…"
              className="w-full resize-none rounded-xl border bg-transparent p-4 text-[14.5px] leading-relaxed outline-none transition focus:border-white/30"
              style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg)" }}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>{answerText.trim() ? `${answerText.trim().split(/\s+/).length} words` : "Tip: use STAR — Situation, Task, Action, Result"}</span>
              <button onClick={submitAnswer} disabled={fbBusy || answerText.trim().length < 2} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "46px" }}>
                {fbBusy ? <><Loader2 size={15} className="animate-spin" /> Reviewing…</> : <>Submit answer <ArrowRight size={15} /></>}
              </button>
            </div>
            {error && <p className="mt-3 text-[13px]" style={{ color: "#fca5a5" }}>{error}</p>}
          </div>
        ) : (
          <FadeIn className="mt-5">
            <div className="rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
              <div className="flex items-center gap-4">
                <Ring value={feedback!.score} max={10}>
                  <div>
                    <div className="text-[20px] font-bold leading-none" style={{ color: "var(--ezd-fg-strong)" }}>{feedback!.score}</div>
                    <div className="text-[10px]" style={{ color: "var(--ezd-fg-quiet)" }}>/ 10</div>
                  </div>
                </Ring>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--ezd-fg-quiet)" }}>Feedback</div>
                  <p className="mt-0.5 text-[14.5px] font-medium leading-snug" style={{ color: "var(--ezd-fg-strong)" }}>{feedback!.verdict}</p>
                </div>
              </div>

              {feedback!.strengths.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {feedback!.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px]" style={{ color: "var(--ezd-fg-muted)" }}><Check size={15} className="mt-0.5 shrink-0" style={{ color: "#34d399" }} />{s}</li>
                  ))}
                </ul>
              )}
              {feedback!.improvements.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {feedback!.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px]" style={{ color: "var(--ezd-fg-muted)" }}><Lightbulb size={15} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />{s}</li>
                  ))}
                </ul>
              )}
              {feedback!.modelAnswer && (
                <details className="group mt-4 rounded-xl border p-3" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)" }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>
                    See a strong model answer <ChevronDown size={15} className="transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{feedback!.modelAnswer}</p>
                </details>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              {index + 1 >= questions.length && (
                <button onClick={generateMore} disabled={moreBusy || summaryBusy} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[14px] font-semibold transition hover:opacity-80 disabled:opacity-50" style={{ borderColor: "var(--ezd-fg-strong)", color: "var(--ezd-fg-strong)", minHeight: "46px" }}>
                  {moreBusy ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate more questions</>}
                </button>
              )}
              <button onClick={next} disabled={summaryBusy || moreBusy} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition hover:opacity-90 disabled:opacity-60" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "46px" }}>
                {summaryBusy ? <><Loader2 size={15} className="animate-spin" /> Building report…</> : index + 1 < questions.length ? <>Next question <ArrowRight size={15} /></> : <>Finish &amp; see report <Award size={15} /></>}
              </button>
            </div>
          </FadeIn>
        )}
      </div>
    );
  }

  /* ============================= SUMMARY ============================= */
  const s = summary!;
  return (
    <FadeIn className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border p-6 text-center sm:p-8" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--ezd-fg-quiet)" }}>Your interview report</div>
        <div className="mt-4 flex justify-center">
          <Ring value={s.overall} max={100} size={120}>
            <div>
              <div className="text-[30px] font-bold leading-none" style={{ color: "var(--ezd-fg-strong)" }}>{s.overall}</div>
              <div className="text-[11px]" style={{ color: "var(--ezd-fg-quiet)" }}>/ 100</div>
            </div>
          </Ring>
        </div>
        <h3 className="mt-4 text-[18px] font-bold" style={{ color: "var(--ezd-fg-strong)" }}>
          {normRole}{s.overall >= 80 ? " · Interview-ready" : s.overall >= 60 ? " · Solid, with gaps to close" : " · Keep practicing"}
        </h3>
      </div>

      {s.byCompetency.length > 0 && (
        <div className="mt-4 rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <div className="text-[12.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>By competency</div>
          <div className="mt-3 space-y-2.5">
            {s.byCompetency.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-[12.5px]" style={{ color: "var(--ezd-fg-muted)" }}><span>{c.competency}</span><span>{c.score}</span></div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--ezd-bg-hover)" }}>
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: "var(--ezd-fg-strong)", transition: "width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {s.strengths.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
            <div className="text-[12.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Strengths</div>
            <ul className="mt-2 space-y-1.5">{s.strengths.map((x, i) => <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--ezd-fg-muted)" }}><Check size={14} className="mt-0.5 shrink-0" style={{ color: "#34d399" }} />{x}</li>)}</ul>
          </div>
        )}
        {s.improvements.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
            <div className="text-[12.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Focus next on</div>
            <ul className="mt-2 space-y-1.5">{s.improvements.map((x, i) => <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--ezd-fg-muted)" }}><Lightbulb size={14} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />{x}</li>)}</ul>
          </div>
        )}
      </div>

      {s.advice && (
        <div className="mt-4 rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <div className="text-[12.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Coach's advice</div>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{s.advice}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button onClick={restart} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition hover:opacity-90" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)", minHeight: "44px" }}>
          <RefreshCw size={14} /> New interview
        </button>
        <a href="/resume" className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)", minHeight: "44px" }}>
          <FileText size={14} /> Polish your resume
        </a>
      </div>
    </FadeIn>
  );
}

/* ----------------------------- small bits ----------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium" style={{ color: "var(--ezd-fg-muted)" }}>{label}</div>
      {children}
    </div>
  );
}
function Segmented({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--ezd-hairline)" }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className="flex-1 px-2 py-2 text-[12.5px] font-medium transition"
          style={value === o.id ? { background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" } : { background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-muted)" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
