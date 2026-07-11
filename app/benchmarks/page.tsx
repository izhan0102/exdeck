import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Sparkles, Zap, Gauge, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { benchmarkRows, BENCHMARK_DATE } from "@/lib/benchmarks";

export const metadata: Metadata = {
  title: "AI Model Benchmarks — EXdeck",
  description:
    "Benchmarks for every AI model in EXdeck: Llama 3.3 70B, Llama 3.1 8B, Llama 4 Scout, Qwen 3, GPT-OSS 20B/120B. Compare speed, throughput, reliability, and credit cost, then regenerate any slide with the model you pick.",
  alternates: { canonical: "/benchmarks" },
};

export const revalidate = 86400;

function fmtCtx(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

export default function BenchmarksPage() {
  const rows = benchmarkRows();

  return (
    <main className="relative min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      {/* Nav */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo size="sm" href="/" />
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--ezd-fg-muted)" }}>
          <ArrowLeft size={12} /> Back to home
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-24">
        {/* Header */}
        <div className="mt-6 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--ezd-fg-muted)" }}>
            Model benchmarks
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--ezd-fg-strong)" }}>
            Choose the AI that fits your slide
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
            Decks are generated with our balanced default, but you can{" "}
            <strong style={{ color: "var(--ezd-fg-strong)" }}>regenerate any single slide</strong> with a different
            model — right-click a slide in the rail, or use the Regenerate button under the preview. Here&rsquo;s how
            each model performs on a standardized single-slide task. Measured on {BENCHMARK_DATE}.
          </p>
        </div>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Legend icon={<Zap size={15} />} title="Speed" desc="Average response latency — lower is faster." />
          <Legend icon={<Gauge size={15} />} title="Throughput" desc="Output tokens per second — higher is faster." />
          <Legend icon={<ShieldCheck size={15} />} title="Reliability" desc="Share of runs returning valid JSON." />
        </div>

        {/* Table */}
        <div className="mt-8 overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--ezd-hairline)" }}>
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead>
              <tr style={{ color: "var(--ezd-fg-muted)" }} className="text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Latency</th>
                <th className="px-4 py-3 font-semibold">Tokens/sec</th>
                <th className="px-4 py-3 font-semibold">JSON reliability</th>
                <th className="px-4 py-3 font-semibold">Context / Max out</th>
                <th className="px-4 py-3 font-semibold">Credit rate</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--ezd-hairline)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{r.label}</span>
                      {r.isDefault && (
                        <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--ezd-fg-muted)" }}>{r.provider}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{(r.latencyMs / 1000).toFixed(2)}s</td>
                  <td className="px-4 py-3 tabular-nums">{r.tokensPerSec > 0 ? r.tokensPerSec : "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={r.jsonReliability >= 90 ? "text-emerald-400" : "text-amber-400"}>
                      {r.jsonReliability}%
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--ezd-fg-muted)" }}>
                    {fmtCtx(r.contextWindow)} / {fmtCtx(r.maxOutput)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      r.creditMultiplier <= 1 ? "bg-emerald-400/15 text-emerald-300"
                      : r.creditMultiplier <= 2 ? "bg-amber-400/15 text-amber-300"
                      : "bg-rose-400/15 text-rose-300"
                    }`}>
                      {r.creditMultiplier}×
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ezd-fg-muted)" }}>{r.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px]" style={{ color: "var(--ezd-fg-muted)" }}>
          Credit rate multiplies the token-based cost of a generation/regeneration. Regeneration is charged by tokens
          used × the model&rsquo;s rate; a longer slide costs more than a short one. Numbers are averages and vary with
          load and prompt size.
        </p>

        {/* How to regenerate */}
        <div className="mt-12 rounded-2xl border p-6" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card, rgba(255,255,255,0.02))" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "var(--ezd-fg-strong)" }} />
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>
              New: regenerate any slide with a different model
            </h2>
          </div>
          <ol className="mt-4 space-y-2 text-[13.5px]" style={{ color: "var(--ezd-fg-muted)" }}>
            <li><strong style={{ color: "var(--ezd-fg-strong)" }}>1.</strong> Open your deck in the editor.</li>
            <li><strong style={{ color: "var(--ezd-fg-strong)" }}>2.</strong> Right-click a slide in the left rail, or use the <em>Regenerate slide</em> button under the preview.</li>
            <li><strong style={{ color: "var(--ezd-fg-strong)" }}>3.</strong> Pick a model — the slide&rsquo;s text, tables, and charts are rewritten with fresh, real data.</li>
            <li><strong style={{ color: "var(--ezd-fg-strong)" }}>4.</strong> Credits are charged by tokens used × the model&rsquo;s rate shown above.</li>
          </ol>
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition hover:opacity-90"
            style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
          >
            Build a deck free <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}

function Legend({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: "var(--ezd-hairline)" }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }}>
        {icon}
      </span>
      <div>
        <div className="text-[13px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{title}</div>
        <div className="text-[12px]" style={{ color: "var(--ezd-fg-muted)" }}>{desc}</div>
      </div>
    </div>
  );
}
