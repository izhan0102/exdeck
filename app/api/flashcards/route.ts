import { NextRequest, NextResponse } from "next/server";
import { withGroqClient } from "@/lib/groqClient";
import { authenticateRequest, AuthError } from "@/lib/firebaseAdmin";
import { requireCredits, deductCredits } from "@/lib/credits";
import { PlanLimitError } from "@/lib/planServer";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * AI flashcards + quiz generator.
 *
 * The client sends a topic ("the French Revolution") or pasted notes, plus how
 * many cards it wants. We return a list of study cards, each with a question
 * (front), a concise answer (back), and three plausible distractors. The same
 * cards power both the flip-to-study mode and the multiple-choice quiz (the
 * client shuffles [answer, ...distractors] into options), so one generation
 * drives both experiences.
 */

const SYSTEM_PROMPT = `You are a study-aid generator. From the user's topic or notes, write high-quality flashcards.

Output ONLY a JSON object of this exact shape:
{
  "title": string,                       // a short deck title (max 60 chars)
  "cards": [
    {
      "q": string,                       // the question or term (the card FRONT) — clear and self-contained
      "a": string,                       // the correct answer (the card BACK) — concise, <= 18 words
      "distractors": [string, string, string]  // exactly 3 WRONG answers, same topic/style/length as "a", each plausible but clearly incorrect
    }
  ]
}

Rules:
- Make exactly the requested number of cards. Cover the topic broadly; no duplicate or near-duplicate questions.
- Questions must be answerable from general knowledge of the topic, not "according to the text".
- Keep "a" factual and tight. Distractors must be the same KIND of thing as the answer (e.g. all years, all names, all short phrases) so the quiz is fair.
- No markdown, no commentary, no trailing text. Return only the JSON object.`;

function clampInt(n: any, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return dflt;
  return Math.max(lo, Math.min(hi, v));
}

type RawCard = { q?: unknown; a?: unknown; distractors?: unknown };
function cleanStr(s: unknown): string {
  return typeof s === "string" ? s.replace(/[\u0000-\u001F\u007F]/g, " ").trim() : "";
}

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse("visualize");
  if (limited) return limited;
  try {
    const uid = await authenticateRequest(req);
    await requireCredits(uid);

    const body = (await req.json().catch(() => ({}))) as {
      input?: string; count?: number;
      question?: string; answer?: string;
      mode?: string; cards?: { q?: unknown; a?: unknown }[]; density?: string; topic?: string;
    };
    const density = ["brief", "balanced", "detailed"].includes(String(body?.density)) ? String(body.density) : "balanced";
    const densityRule = density === "brief"
      ? "Make the answer very short — at most 8 words, just the key fact."
      : density === "detailed"
      ? "Make the answer 2-3 short sentences (up to ~45 words) with a brief explanation."
      : "Make the answer one clear sentence (up to ~18 words).";
    const topicHint = cleanStr(body?.topic).slice(0, 120);

    // ---- Mode: one custom card (manual Q/A, or Q only with AI-written answer) ----
    if (typeof body?.question === "string" && body.question.trim()) {
      const question = cleanStr(body.question).slice(0, 600);
      const provided = cleanStr(body.answer).slice(0, 600);
      const sys = `You write ONE study flashcard as JSON {"a": string, "distractors": [string,string,string]}.
${provided ? "An ANSWER is provided — keep it as the correct answer (you may lightly tidy it)." : "Write the correct answer to the QUESTION."} ${densityRule}
distractors: exactly 3 WRONG but plausible answers, the same kind and length as the answer. No markdown, JSON only.`;
      const completion = await withGroqClient((client) =>
        client.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.4, max_tokens: 600, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Topic: ${topicHint || "general"}\nQUESTION: ${question}${provided ? `\nANSWER: ${provided}` : ""}` },
          ],
        }),
      );
      let p: any = {}; try { p = JSON.parse(completion.choices[0]?.message?.content || "{}"); } catch { p = {}; }
      const a = provided || cleanStr(p?.a);
      const distractors = (Array.isArray(p?.distractors) ? p.distractors : []).map(cleanStr).filter(Boolean).slice(0, 3);
      if (!a) return NextResponse.json({ error: "Couldn't build that card — add an answer or rephrase." }, { status: 422 });
      deductCredits(uid, "visualize").catch(() => {});
      return NextResponse.json({ card: { q: question, a, distractors } });
    }

    // ---- Mode: rewrite every answer to a new density ----
    if (body?.mode === "redensify" && Array.isArray(body?.cards)) {
      const incoming = body.cards.map((c) => ({ q: cleanStr(c?.q).slice(0, 600), a: cleanStr(c?.a).slice(0, 600) })).filter((c) => c.q).slice(0, 40);
      if (incoming.length === 0) return NextResponse.json({ error: "No cards to update." }, { status: 400 });
      const sys = `You rewrite study flashcards to a target density. Output JSON {"cards":[{"q":string,"a":string,"distractors":[string,string,string]}]}.
Keep each question EXACTLY as given, in the same order and count. Rewrite each answer to stay correct and: ${densityRule}
distractors: 3 WRONG but plausible answers per card, same kind/length as the new answer. JSON only, no markdown.`;
      const completion = await withGroqClient((client) =>
        client.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.3, max_tokens: 4000, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Topic: ${topicHint || "general"}\nDensity: ${density}\nCards:\n${JSON.stringify(incoming)}` },
          ],
        }),
      );
      let p: any = {}; try { p = JSON.parse(completion.choices[0]?.message?.content || "{}"); } catch { p = {}; }
      const out = (Array.isArray(p?.cards) ? p.cards : [])
        .map((c: RawCard) => ({ q: cleanStr(c?.q), a: cleanStr(c?.a), distractors: (Array.isArray(c?.distractors) ? c.distractors : []).map(cleanStr).filter(Boolean).slice(0, 3) }))
        .filter((c: { q: string; a: string }) => c.q && c.a);
      if (out.length === 0) return NextResponse.json({ error: "Couldn't update the cards — try again." }, { status: 422 });
      deductCredits(uid, "visualize").catch(() => {});
      return NextResponse.json({ cards: out });
    }

    const input = cleanStr(body?.input).slice(0, 8000);
    const count = clampInt(body?.count, 4, 30, 12);

    if (input.length < 2) {
      return NextResponse.json({ error: "Enter a topic or paste some notes first." }, { status: 400 });
    }

    const completion = await withGroqClient((client) =>
      client.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.4,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Make ${count} flashcards from the following topic or notes:\n\n${input}` },
        ],
      }),
    );

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const title = cleanStr(parsed?.title).slice(0, 80);
    const cards = (Array.isArray(parsed?.cards) ? parsed.cards : [])
      .map((c: RawCard) => {
        const q = cleanStr(c?.q);
        const a = cleanStr(c?.a);
        const distractors = (Array.isArray(c?.distractors) ? c.distractors : [])
          .map(cleanStr)
          .filter(Boolean)
          .slice(0, 3);
        return { q, a, distractors };
      })
      .filter((c: { q: string; a: string }) => c.q && c.a)
      .slice(0, count);

    if (cards.length === 0) {
      return NextResponse.json({ error: "Couldn't build flashcards from that — try a clearer topic." }, { status: 422 });
    }

    deductCredits(uid, "visualize").catch(() => {});
    return NextResponse.json({ title: title || "Flashcards", cards });
  } catch (err: any) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // eslint-disable-next-line no-console
    console.error("[/api/flashcards] error:", err);
    return NextResponse.json({ error: err?.message || "Could not generate flashcards." }, { status: 500 });
  }
}
