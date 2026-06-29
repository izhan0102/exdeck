import { NextRequest, NextResponse } from "next/server";
import { withGroqClient } from "@/lib/groqClient";
import { authenticateRequest, AuthError } from "@/lib/firebaseAdmin";
import { PlanLimitError } from "@/lib/planServer";
import { requireExai, bumpExai } from "@/lib/exai";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * EX-AI tutor chat — streams a reply token-by-token so the client can show a
 * live typing animation. The tutor adopts a teacher persona for whatever topic
 * the student is studying (passed from the flashcards page).
 */

type Msg = { role: "user" | "assistant"; content: string };

function sanitizeTopic(t: unknown): string {
  return (typeof t === "string" ? t : "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/["`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse("visualize");
  if (limited) return limited;
  try {
    const uid = await authenticateRequest(req);
    await requireExai(uid);

    const body = (await req.json().catch(() => ({}))) as { topic?: string; messages?: Msg[] };
    const topic = sanitizeTopic(body?.topic) || "the topic you're studying";
    const history: Msg[] = (Array.isArray(body?.messages) ? body!.messages : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return NextResponse.json({ error: "Send a question." }, { status: 400 });
    }

    const system = `You are EX-AI, a warm, upbeat personal tutor and an expert teacher of ${topic}.

Style:
- Teach with genuine enthusiasm; keep the student engaged and confident.
- Be concise and clear. Short paragraphs, simple language, concrete examples and analogies.
- Use **bold** for key terms, and short numbered steps or bullets when they help.
- If the student is wrong, gently correct them and explain why.
- End most replies with a tiny check-for-understanding or an invitation to go deeper (e.g. "Want a quick example?").
- If a question drifts off ${topic}, answer briefly, then steer back.
- Never mention being an AI language model or name any model/company. If asked what you are, say you're "EX-AI, your ${topic} tutor".
Keep replies under ~170 words unless the student asks you to elaborate.`;

    const stream: any = await withGroqClient((client) =>
      client.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.6,
        max_tokens: 800,
        stream: true,
        messages: [{ role: "system", content: system }, ...history],
      }) as any,
    );

    bumpExai(uid).catch(() => {});

    const encoder = new TextEncoder();
    const rs = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk?.choices?.[0]?.delta?.content || "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          /* end of stream / upstream hiccup — close gracefully */
        } finally {
          controller.close();
        }
      },
    });

    return new Response(rs, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // eslint-disable-next-line no-console
    console.error("[/api/tutor] error:", err);
    return NextResponse.json({ error: err?.message || "Tutor is unavailable right now." }, { status: 500 });
  }
}
