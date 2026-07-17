import { NextRequest, NextResponse } from "next/server";
import { generateDeck, generateDeckFromContent } from "@/lib/groq";
import { authenticateIdentity, AuthError } from "@/lib/firebaseAdmin";
import { PlanLimitError } from "@/lib/planServer";
import { requireCredits, deductCreditsAmount } from "@/lib/credits";
import { rateLimitResponse } from "@/lib/rateLimit";
import { normalizeModel, computeGenerationCredits } from "@/lib/models";
import { claimGuestTrial, GuestTrialError } from "@/lib/guestTrial";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse("generate");
  if (limited) return limited;
  let guestTrial: Awaited<ReturnType<typeof claimGuestTrial>> | null = null;
  let generationSucceeded = false;
  try {
    const identity = await authenticateIdentity(req, true);
    const uid = identity.uid;
    // Anonymous sessions get exactly one constrained deck. The reservation is
    // server-side and happens before the costly model request.
    if (!identity.isAnonymous) await requireCredits(uid);
    const body = await req.json();
    const { prompt, slideCount, audience, tone, density, includeReferences, directives, sourceText } = body || {};
    // The model the user picked in the dashboard (validated against the
    // allow-list). Determines both which Groq model runs and the credit
    // multiplier applied to the token-based charge.
    const model = identity.isAnonymous ? "meta-llama/llama-4-scout-17b-16e-instruct" : normalizeModel(body?.model);

    // Keep the anonymous trial inexpensive even if a caller bypasses the UI.
    // Normal accounts retain the product's broader input limits.
    if (identity.isAnonymous && (
      (typeof prompt === "string" && prompt.length > 1_000) ||
      (typeof sourceText === "string" && sourceText.length > 6_000) ||
      (typeof directives === "string" && directives.length > 1_000)
    )) {
      return NextResponse.json({ error: "Guest prompts are limited to a short brief or a few pages of text." }, { status: 400 });
    }

    // Import mode: the user pasted/uploaded their own content. Organize it
    // into slides rather than generating from a brief. A short prompt is
    // optional here (intent/audience hint), so we don't require it.
    const hasSource = typeof sourceText === "string" && sourceText.trim().length >= 40;

    if (!hasSource && (!prompt || typeof prompt !== "string" || prompt.trim().length < 5)) {
      return NextResponse.json({ error: "Prompt is required (min 5 chars)." }, { status: 400 });
    }

    if (identity.isAnonymous) guestTrial = await claimGuestTrial(req, uid);

    let deck;
    if (hasSource) {
      // Let the AI decide the count; cap it relative to the requested size so
      // a user who asked for ~8 doesn't get 30, but long content can expand.
      const requested = Math.min(identity.isAnonymous ? 8 : 20, Math.max(3, Number(slideCount) || 0));
      const maxSlides = requested ? Math.max(requested, identity.isAnonymous ? 8 : 12) : 0;
      deck = await generateDeckFromContent({
        sourceText: sourceText.trim(),
        prompt: typeof prompt === "string" ? prompt.trim() : "",
        audience,
        tone,
        density,
        includeReferences,
        directives: typeof directives === "string" ? directives : "",
        maxSlides,
        model,
      });
      deck.topic = (typeof prompt === "string" && prompt.trim()) || deck.title;
    } else {
      const count = Math.min(identity.isAnonymous ? 8 : 20, Math.max(3, Number(slideCount) || 8));
      deck = await generateDeck({
        prompt: prompt.trim(),
        slideCount: count,
        audience,
        tone,
        density,
        includeReferences,
        directives: typeof directives === "string" ? directives : "",
        model,
      });
      deck.topic = prompt.trim();
    }

    deck.audience = audience;
    deck.tone = tone;
    deck.density = density;

    // Token-based credit charge: cost scales with how many tokens the model
    // read + wrote (so a 20-slide deck costs more than a 10-slide one) and is
    // multiplied by the chosen model's rate. Fixed-cost actions are unchanged.
    const usedTokens = Number((deck as any).__tokens) || 0;
    const charge = computeGenerationCredits(usedTokens, model);
    delete (deck as any).__tokens;
    if (!identity.isAnonymous) deductCreditsAmount(uid, charge).catch(() => {});

    generationSucceeded = true;
    if (guestTrial) {
      await guestTrial.complete().catch((err) => {
        console.error("[/api/generate] couldn't complete guest trial:", err);
      });
    }
    return NextResponse.json({ deck, credits: { charged: charge, tokens: usedTokens, model } });
  } catch (err: any) {
    if (guestTrial && !generationSucceeded) {
      await guestTrial.release().catch((releaseErr) => {
        console.error("[/api/generate] couldn't release failed guest trial:", releaseErr);
      });
    }
    console.error("[/api/generate] error:", err);
    const status = Number(err?.status || err?.statusCode || 0);
    const msg = String(err?.message || err?.error?.message || "Generation failed.").trim();
    let code = "unknown";
    if (err instanceof GuestTrialError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    } else if (err instanceof PlanLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    } else if (err instanceof AuthError) {
      code = "user_auth";
    } else if (status === 429 || /rate.?limit|quota/i.test(msg)) {
      code = "rate_limit";
    } else if (status === 401 || status === 403 || /invalid.api.key|unauthorized/i.test(msg)) {
      code = "auth";
    } else if (/json|parse|invalid/i.test(msg)) {
      code = "parse";
    }
    return NextResponse.json({ error: msg, code }, { status: status || 500 });
  }
}
