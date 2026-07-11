/**
 * Robust JSON completion — one Groq call that survives the quirks of every
 * model in our picker, on the free tier:
 *
 *   • TPM sizing:   Groq counts prompt+max_tokens against a per-minute token
 *                   budget (as low as 6k free). We estimate the prompt and
 *                   size max_tokens to fit, then adapt if a 413 still comes
 *                   back with the real numbers.
 *   • Reasoning:    gpt-oss / qwen "think" before answering. With strict
 *                   response_format:json_object + a tight budget they often
 *                   return `json_validate_failed`. On that error we retry
 *                   WITHOUT the strict format and parse the JSON out of the
 *                   text (extractJson), which reasoning models handle fine.
 *
 * Returns the raw content string (caller parses) plus the token usage so the
 * caller can charge token-based credits.
 */
import { withGroqClient } from "./groqClient";
import { type ModelId, generationMaxTokens, MODELS, MIN_VIABLE_OUTPUT } from "./models";

const TPM_MARGIN = 256;

function estimatePromptTokens(messages: { content: string }[]): number {
  const chars = messages.reduce((n, m) => n + (m.content?.length || 0), 0);
  return Math.ceil(chars / 3.5) + messages.length * 8;
}

function parseTpmLimit(err: any): { limit: number; requested: number } | null {
  const msg = String(err?.error?.error?.message || err?.error?.message || err?.message || "");
  const m = msg.match(/Limit\s+(\d+),\s*Requested\s+(\d+)/i);
  if (!m) return null;
  const limit = Number(m[1]);
  const requested = Number(m[2]);
  if (!isFinite(limit) || !isFinite(requested)) return null;
  return { limit, requested };
}

function isJsonValidateFail(err: any): boolean {
  const code = err?.error?.error?.code || err?.error?.code || "";
  if (code === "json_validate_failed") return true;
  const msg = String(err?.error?.error?.message || err?.message || "").toLowerCase();
  return /validate json|json_validate/.test(msg);
}

/** Strip code fences / prose and isolate the outermost JSON object. */
export function extractJsonObject(raw: string): string {
  let s = (raw || "").trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

export type RobustResult = { content: string; usage: number };

export async function robustJsonCompletion(opts: {
  model: ModelId;
  temperature: number;
  desiredMaxTokens: number;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}): Promise<RobustResult> {
  const { model, temperature, messages } = opts;
  const promptEst = estimatePromptTokens(messages);
  const maxTokens = generationMaxTokens(model, opts.desiredMaxTokens, promptEst);

  if (maxTokens < MIN_VIABLE_OUTPUT) {
    const info = MODELS[model];
    console.warn(`[robustCompletion] ${info.label} tpm=${info.tpm} promptEst=${promptEst} — request too large to fit`);
    throw new Error(`This model can't handle this request. Please pick another model.`);
  }

  const call = (mt: number, strictJson: boolean) =>
    withGroqClient((client) =>
      client.chat.completions.create({
        model,
        temperature,
        max_tokens: mt,
        ...(strictJson ? { response_format: { type: "json_object" as const } } : {}),
        messages,
      }),
    );

  const pick = (c: any): RobustResult => ({
    content: c.choices?.[0]?.message?.content || "",
    usage: c.usage?.total_tokens || 0,
  });

  try {
    return pick(await call(maxTokens, true));
  } catch (err: any) {
    // Reasoning models frequently fail strict JSON validation — retry in plain
    // mode and parse the JSON out of the text.
    if (isJsonValidateFail(err)) {
      return pick(await call(maxTokens, false));
    }
    // Still over the TPM budget — refit from the real limit and retry once.
    const info = parseTpmLimit(err);
    if (info) {
      const promptTokens = Math.max(0, info.requested - maxTokens);
      const fitted = info.limit - promptTokens - TPM_MARGIN;
      if (fitted >= MIN_VIABLE_OUTPUT && fitted < maxTokens) {
        try {
          return pick(await call(fitted, true));
        } catch (err2: any) {
          if (isJsonValidateFail(err2)) return pick(await call(fitted, false));
          throw err2;
        }
      }
      console.warn(`[robustCompletion] tpm limit ${info.limit} < prompt ${promptTokens} — can't fit`);
      throw new Error(`This model can't handle this request. Please pick another model.`);
    }
    throw err;
  }
}
