/**
 * Model benchmark data — measured on GroqCloud with a standardized
 * single-slide generation task (see scripts/bench-models.js). Numbers are
 * averages over multiple runs. These power the public /benchmarks page.
 *
 * Metrics:
 *   • latencyMs        — average wall-clock time to a full response
 *   • tokensPerSec     — output throughput (higher = faster)
 *   • jsonReliability  — % of runs that returned valid, usable JSON
 *   • creditMultiplier — cost rate relative to the base (from lib/models.ts)
 */
import { MODELS, MODEL_ORDER, type ModelId, DEFAULT_MODEL } from "./models";

export type Benchmark = {
  id: ModelId;
  latencyMs: number;
  tokensPerSec: number;
  jsonReliability: number; // 0..100
  /** Short human verdict for the "best for" column. */
  bestFor: string;
};

/** Last time the benchmark suite was run. */
export const BENCHMARK_DATE = "2026-07-11";

export const BENCHMARKS: Record<ModelId, Benchmark> = {
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    latencyMs: 1089,
    tokensPerSec: 149,
    jsonReliability: 100,
    bestFor: "Balanced default — reliable quality for any deck",
  },
  "llama-3.1-8b-instant": {
    id: "llama-3.1-8b-instant",
    latencyMs: 415,
    tokensPerSec: 253,
    jsonReliability: 100,
    bestFor: "Fastest & cheapest — quick drafts",
  },
  "meta-llama/llama-4-scout-17b-16e-instruct": {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    latencyMs: 639,
    tokensPerSec: 220,
    jsonReliability: 100,
    bestFor: "Fast with the most token headroom",
  },
  "qwen/qwen3-32b": {
    id: "qwen/qwen3-32b",
    latencyMs: 1156,
    tokensPerSec: 361,
    jsonReliability: 100,
    bestFor: "Strong reasoning, high throughput",
  },
  "qwen/qwen3.6-27b": {
    id: "qwen/qwen3.6-27b",
    latencyMs: 1870,
    tokensPerSec: 0,
    jsonReliability: 60,
    bestFor: "Multilingual prose (less reliable for strict JSON)",
  },
  "openai/gpt-oss-20b": {
    id: "openai/gpt-oss-20b",
    latencyMs: 1061,
    tokensPerSec: 510,
    jsonReliability: 100,
    bestFor: "Highest throughput — premium quality",
  },
  "openai/gpt-oss-120b": {
    id: "openai/gpt-oss-120b",
    latencyMs: 1156,
    tokensPerSec: 291,
    jsonReliability: 100,
    bestFor: "Largest open model — top quality",
  },
};

export type BenchmarkRow = {
  id: ModelId;
  label: string;
  provider: string;
  latencyMs: number;
  tokensPerSec: number;
  jsonReliability: number;
  creditMultiplier: number;
  contextWindow: number;
  maxOutput: number;
  bestFor: string;
  isDefault: boolean;
};

/** Combined model + benchmark rows in display order for the page. */
export function benchmarkRows(): BenchmarkRow[] {
  return MODEL_ORDER.map((id) => {
    const m = MODELS[id];
    const b = BENCHMARKS[id];
    return {
      id,
      label: m.label,
      provider: m.provider,
      latencyMs: b.latencyMs,
      tokensPerSec: b.tokensPerSec,
      jsonReliability: b.jsonReliability,
      creditMultiplier: m.multiplier,
      contextWindow: m.contextWindow,
      maxOutput: m.maxOutput,
      bestFor: b.bestFor,
      isDefault: id === DEFAULT_MODEL,
    };
  });
}
