import { NextRequest, NextResponse } from "next/server";
import { withGroqClient } from "@/lib/groqClient";
import { authenticateRequest, AuthError } from "@/lib/firebaseAdmin";
import { requireCredits, deductCredits } from "@/lib/credits";
import { PlanLimitError } from "@/lib/planServer";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * AI Mock Interview.
 *
 * Three phases, all returning JSON:
 *   - "questions": generate the full question set up front (one call) so the
 *     client can present them smoothly without a round-trip per question.
 *   - "feedback":  score and coach a single answer (the only per-answer call).
 *   - "summary":   a final performance report from the transcript.
 */

type Phase = "questions" | "feedback" | "summary";

function clampInt(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt;
}
function clean(s: unknown, max = 4000): string {
  return typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").trim().slice(0, max) : "";
}
function parseJson(raw: string): any {
  try { return JSON.parse(raw); } catch { return {}; }
}
function strList(arr: unknown, max = 4): string[] {
  return (Array.isArray(arr) ? arr : []).map((s) => clean(s, 300)).filter(Boolean).slice(0, max);
}

const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TYPES = ["behavioral", "technical", "mixed"];
const LEVELS = ["junior", "mid", "senior"];

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse("visualize");
  if (limited) return limited;
  try {
    const uid = await authenticateRequest(req);
    await requireCredits(uid);

    const body = (await req.json().catch(() => ({}))) as {
      phase?: Phase;
      role?: string; type?: string; difficulty?: string; count?: number; company?: string;
      question?: string; answer?: string; competency?: string;
      transcript?: { q?: string; competency?: string; score?: number }[];
    };

    const role = clean(body?.role, 1200) || "the role";
    const company = clean(body?.company, 80);
    const type = TYPES.includes(String(body?.type)) ? String(body.type) : "mixed";
    const difficulty = LEVELS.includes(String(body?.difficulty)) ? String(body.difficulty) : "mid";
    const phase: Phase = body?.phase === "feedback" || body?.phase === "summary" ? body.phase : "questions";

    /* ---------------------------- questions ---------------------------- */
    if (phase === "questions") {
      const count = clampInt(body?.count, 3, 20, 5);
      const sys = `You are an expert technical and behavioral interviewer. Generate a realistic ${type} interview for a ${difficulty}-level candidate for: "${role}".${company ? `\nThis interview is at "${company}". If you know ${company}'s interview process, tailor the questions to its well-known public interview style, values, competencies, and typical rounds (e.g. company-specific leadership principles or formats). Do not fabricate confidential or leaked questions.` : ""}
Output ONLY JSON: {"role": string (a short normalized role title), "questions": [{"q": string, "competency": string}]}.
- Exactly ${count} questions, ordered from warm-up to harder. No duplicates.
- Each "competency" is the 1-3 word skill the question probes (e.g. "Communication", "Problem solving", "System design", "Leadership", "Ownership").
- Questions must be specific and realistic for ${role}; for technical/mixed, include role-relevant technical depth. No markdown, JSON only.`;
      const completion = await withGroqClient((c) => c.chat.completions.create({
        model: MODEL, temperature: 0.5, max_tokens: 2400, response_format: { type: "json_object" },
        messages: [{ role: "system", content: sys }, { role: "user", content: `${company ? `Company: ${company}\n` : ""}Role: ${role}` }],
      }));
      const p = parseJson(completion.choices[0]?.message?.content || "{}");
      const questions = (Array.isArray(p?.questions) ? p.questions : [])
        .map((x: any) => ({ q: clean(x?.q, 600), competency: clean(x?.competency, 60) || "General" }))
        .filter((x: { q: string }) => x.q)
        .slice(0, count);
      if (questions.length === 0) return NextResponse.json({ error: "Couldn't build the interview — try a clearer role." }, { status: 422 });
      deductCredits(uid, "visualize").catch(() => {});
      return NextResponse.json({ role: clean(p?.role, 80) || role, questions });
    }

    /* ---------------------------- feedback ---------------------------- */
    if (phase === "feedback") {
      const question = clean(body?.question, 800);
      const answer = clean(body?.answer, 4000);
      const competency = clean(body?.competency, 60) || "General";
      if (!question || !answer) return NextResponse.json({ error: "Question and answer required." }, { status: 400 });
      const sys = `You are a senior, supportive interviewer giving sharp, constructive feedback for a ${role} interview (competency: ${competency}).
Given the QUESTION and the candidate's ANSWER, evaluate honestly. Output ONLY JSON:
{"score": integer 0-10, "verdict": one short sentence, "strengths": [1-3 short bullets], "improvements": [1-3 short, specific bullets], "modelAnswer": a strong concise example answer (<=120 words)}.
Be fair but rigorous; reward structure, specifics, and impact. JSON only.`;
      const completion = await withGroqClient((c) => c.chat.completions.create({
        model: MODEL, temperature: 0.3, max_tokens: 900, response_format: { type: "json_object" },
        messages: [{ role: "system", content: sys }, { role: "user", content: `QUESTION: ${question}\n\nANSWER: ${answer}` }],
      }));
      const p = parseJson(completion.choices[0]?.message?.content || "{}");
      const fb = {
        score: clampInt(p?.score, 0, 10, 5),
        verdict: clean(p?.verdict, 240),
        strengths: strList(p?.strengths, 3),
        improvements: strList(p?.improvements, 3),
        modelAnswer: clean(p?.modelAnswer, 1200),
      };
      deductCredits(uid, "visualize").catch(() => {});
      return NextResponse.json({ feedback: fb });
    }

    /* ---------------------------- summary ---------------------------- */
    const transcript = (Array.isArray(body?.transcript) ? body.transcript : [])
      .map((t) => ({ q: clean(t?.q, 400), competency: clean(t?.competency, 60) || "General", score: clampInt(t?.score, 0, 10, 0) }))
      .filter((t) => t.q)
      .slice(0, 12);
    if (transcript.length === 0) return NextResponse.json({ error: "No transcript to summarize." }, { status: 400 });
    const sys = `You are an interview coach writing a final report for a ${role} mock interview. Given the transcript (questions, competencies, per-answer scores 0-10), output ONLY JSON:
{"overall": integer 0-100, "byCompetency": [{"competency": string, "score": integer 0-100}], "strengths": [2-4 bullets], "improvements": [2-4 specific bullets], "advice": 2-3 sentences of concrete next steps}.
Base "overall" and competency scores on the per-answer scores and the spread. Be honest and encouraging. JSON only.`;
    const completion = await withGroqClient((c) => c.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 1200, response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, { role: "user", content: JSON.stringify({ role, type, transcript }) }],
    }));
    const p = parseJson(completion.choices[0]?.message?.content || "{}");
    const summary = {
      overall: clampInt(p?.overall, 0, 100, Math.round((transcript.reduce((s, t) => s + t.score, 0) / transcript.length) * 10)),
      byCompetency: (Array.isArray(p?.byCompetency) ? p.byCompetency : [])
        .map((x: any) => ({ competency: clean(x?.competency, 60), score: clampInt(x?.score, 0, 100, 0) }))
        .filter((x: { competency: string }) => x.competency).slice(0, 8),
      strengths: strList(p?.strengths, 4),
      improvements: strList(p?.improvements, 4),
      advice: clean(p?.advice, 800),
    };
    deductCredits(uid, "visualize").catch(() => {});
    return NextResponse.json({ summary });
  } catch (err: any) {
    if (err instanceof PlanLimitError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    // eslint-disable-next-line no-console
    console.error("[/api/interview] error:", err);
    return NextResponse.json({ error: err?.message || "Interview is unavailable right now." }, { status: 500 });
  }
}
