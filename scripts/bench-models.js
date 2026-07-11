// Benchmark all deck models: latency, output tokens, tokens/sec, JSON validity.
// Uses a small prompt to stay within free-tier TPM.
const fs = require("fs");
const path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const key = (env.match(/^GROQ_API_KEY=(.+)$/m) || [])[1]?.trim();

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];

const SYS = `You write ONE presentation slide as JSON. Output ONLY: {"title":string,"bullets":string[]}. 4-6 concrete factual bullets. No prose.`;
const USER = `Topic: "The economic impact of renewable energy adoption". Write the slide.`;

async function bench(model, runs = 2) {
  const lats = [];
  let ok = 0, tokens = 0, tps = 0;
  for (let r = 0; r < runs; r++) {
    const t0 = Date.now();
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model, temperature: 0.4, max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: SYS }, { role: "user", content: USER }],
        }),
      });
      const ms = Date.now() - t0;
      const body = await res.json();
      if (res.ok) {
        const content = body.choices?.[0]?.message?.content || "";
        let valid = false;
        try { const p = JSON.parse(content); valid = Array.isArray(p.bullets) && p.bullets.length >= 3; } catch {}
        if (valid) ok++;
        const ct = body.usage?.completion_tokens || 0;
        tokens += ct;
        if (ct && ms) tps += (ct / (ms / 1000));
        lats.push(ms);
      } else {
        lats.push(ms);
      }
    } catch (e) { lats.push(Date.now() - t0); }
    await new Promise((r) => setTimeout(r, 800));
  }
  const avgLat = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
  return {
    model,
    avgLatencyMs: avgLat,
    avgOutputTokens: Math.round(tokens / runs),
    tokensPerSec: Math.round(tps / Math.max(1, runs)),
    jsonReliability: Math.round((ok / runs) * 100),
  };
}

(async () => {
  const out = [];
  for (const m of MODELS) {
    const r = await bench(m);
    console.log(JSON.stringify(r));
    out.push(r);
  }
  fs.writeFileSync(path.join(__dirname, "bench-results.json"), JSON.stringify(out, null, 2));
  console.log("WROTE bench-results.json");
})();
