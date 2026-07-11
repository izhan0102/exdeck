/**
 * AI model registry — the single source of truth for which Groq models a user
 * can pick for deck generation, and how much each one costs in credits.
 *
 * Credits for generation are TOKEN-BASED (see computeGenerationCredits): the
 * more the model reads + writes (e.g. a 20-slide deck vs a 10-slide deck), the
 * more it costs. Each model then carries a `multiplier` that scales that base
 * cost — smaller/cheaper models cost less, larger frontier models cost more.
 *
 * Everything else (edit-slide, translate, export, …) keeps a FIXED per-action
 * cost from lib/plans.ts — only deck generation is metered by tokens.
 *
 * Both client (model picker UI) and server (validation + charge) import from
 * here, so a model change happens in exactly one place.
 */

export type ModelId =
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "meta-llama/llama-4-scout-17b-16e-instruct"
  | "qwen/qwen3-32b"
  | "qwen/qwen3.6-27b"
  | "openai/gpt-oss-20b"
  | "openai/gpt-oss-120b";

export type ModelInfo = {
  id: ModelId;
  /** Short display name for the picker. */
  label: string;
  /** Provider family, shown as a small tag. */
  provider: string;
  /** Credit multiplier applied on top of the token-based base cost. */
  multiplier: number;
  /** One-line positioning shown under the model name. */
  blurb: string;
  /** Total context window (input + output) in tokens, per Groq's model table. */
  contextWindow: number;
  /** Max completion (output) tokens the model accepts in one request. We clamp
   *  our requested `max_tokens` to this so we never trip a 413. */
  maxOutput: number;
  /** Free/on_demand tier per-minute token budget (TPM) for this account, as
   *  probed from Groq. Groq counts prompt+max_tokens against this, so we size
   *  our output request to fit within it. */
  tpm: number;
};

/**
 * The models a user may choose for generation, with real limits from Groq's
 * model table (console.groq.com/docs/models). `multiplier` scales the
 * token-based credit cost:  1.0 == "base rate".
 *
 * NOTE: meta-llama/llama-prompt-guard-2-22m is intentionally NOT here — it's a
 * 512-token safety classifier, not a text generator, so it can't build a deck
 * (it would always return a 413 "payload too large").
 */
export const MODELS: Record<ModelId, ModelInfo> = {
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    provider: "Meta",
    multiplier: 1.1,
    blurb: "Balanced default — strong quality at a fair rate.",
    contextWindow: 131072,
    maxOutput: 32768,
    tpm: 12000,
  },
  "llama-3.1-8b-instant": {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant",
    provider: "Meta",
    multiplier: 0.5,
    blurb: "Fastest & cheapest — great for quick drafts.",
    contextWindow: 131072,
    maxOutput: 131072,
    tpm: 6000,
  },
  "meta-llama/llama-4-scout-17b-16e-instruct": {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout 17B",
    provider: "Meta",
    multiplier: 1.2,
    blurb: "Fast multimodal-class model, roomy context.",
    contextWindow: 131072,
    maxOutput: 8192,
    tpm: 30000,
  },
  "qwen/qwen3-32b": {
    id: "qwen/qwen3-32b",
    label: "Qwen 3 32B",
    provider: "Qwen",
    multiplier: 2,
    blurb: "Strong reasoning — higher cost.",
    contextWindow: 131072,
    maxOutput: 40960,
    tpm: 6000,
  },
  "qwen/qwen3.6-27b": {
    id: "qwen/qwen3.6-27b",
    label: "Qwen 3.6 27B",
    provider: "Qwen",
    multiplier: 2,
    blurb: "Newer Qwen — strong multilingual output.",
    contextWindow: 131072,
    maxOutput: 32768,
    tpm: 8000,
  },
  "openai/gpt-oss-20b": {
    id: "openai/gpt-oss-20b",
    label: "GPT-OSS 20B",
    provider: "OpenAI",
    multiplier: 2.2,
    blurb: "Open-weight GPT — premium quality.",
    contextWindow: 131072,
    maxOutput: 65536,
    tpm: 8000,
  },
  "openai/gpt-oss-120b": {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    provider: "OpenAI",
    multiplier: 2.5,
    blurb: "Largest open-weight GPT — top quality, top cost.",
    contextWindow: 131072,
    maxOutput: 65536,
    tpm: 8000,
  },
};

/** Default model used everywhere unless the user picks another. */
export const DEFAULT_MODEL: ModelId = "llama-3.3-70b-versatile";

/** Display order for the picker (default first, then by ascending cost). */
export const MODEL_ORDER: ModelId[] = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];

/** Coerce any value into a valid ModelId, defaulting to DEFAULT_MODEL. */
export function normalizeModel(value: unknown): ModelId {
  return typeof value === "string" && value in MODELS
    ? (value as ModelId)
    : DEFAULT_MODEL;
}

export function getModel(id: ModelId): ModelInfo {
  return MODELS[normalizeModel(id)];
}

/** Credit multiplier for a model. */
export function modelMultiplier(id: unknown): number {
  return MODELS[normalizeModel(id)].multiplier;
}

/**
 * Safe `max_tokens` for a generation request on a given model. Groq counts
 * (promptTokens + max_tokens) against the model's per-minute token budget
 * (TPM), so we size the output to fit: min(desired, model max output, global
 * cap, tpm − promptTokens − margin). Can return a value BELOW the 512 floor
 * (even negative) when the prompt alone nearly fills the TPM budget — callers
 * should treat `< MIN_VIABLE_OUTPUT` as "this model can't do this prompt".
 */
export const GLOBAL_MAX_OUTPUT_TOKENS = 8000;
export const TPM_SAFETY_MARGIN = 256;
export const MIN_VIABLE_OUTPUT = 512;

export function generationMaxTokens(
  id: unknown,
  desired: number = GLOBAL_MAX_OUTPUT_TOKENS,
  promptTokens: number = 0,
): number {
  const info = MODELS[normalizeModel(id)];
  const want = Number.isFinite(desired) && desired > 0 ? desired : GLOBAL_MAX_OUTPUT_TOKENS;
  const tpmRoom = info.tpm - Math.max(0, promptTokens) - TPM_SAFETY_MARGIN;
  return Math.min(want, info.maxOutput, GLOBAL_MAX_OUTPUT_TOKENS, tpmRoom);
}

/**
 * Base token-to-credit rate: ~1 credit per 1,000 tokens (prompt + completion).
 * Keeps deck generation priced in line with the fixed costs in lib/plans.ts
 * (where a "typical" ~8k-token deck cost 8 credits).
 */
export const CREDITS_PER_1K_TOKENS = 1;

/** Floor so any successful generation costs at least this much. */
export const MIN_GENERATION_CREDITS = 2;

/**
 * Token-based credit charge for a single deck generation:
 *
 *   ceil( (totalTokens / 1000) * CREDITS_PER_1K_TOKENS * modelMultiplier )
 *
 * so a 20-slide deck (more tokens) costs more than a 10-slide deck, and a
 * pricier model costs a multiple of a cheaper one for the same deck.
 * Clamped to a sensible minimum. `totalTokens` is the sum of prompt +
 * completion tokens across every Groq call the generation made.
 */
export function computeGenerationCredits(totalTokens: number, modelId: unknown): number {
  const tokens = Number.isFinite(totalTokens) && totalTokens > 0 ? totalTokens : 0;
  const base = (tokens / 1000) * CREDITS_PER_1K_TOKENS * modelMultiplier(modelId);
  return Math.max(MIN_GENERATION_CREDITS, Math.ceil(base));
}
