import { NextRequest, NextResponse } from "next/server";
import { withGroqClient } from "@/lib/groqClient";
import { cleanChartSpec } from "@/lib/charts";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * POST /api/template-ai — write BODY CONTENT for one slide.
 *
 * The AI never edits the slide's existing fields/labels (the user fills those).
 * It writes the content that goes UNDER the heading, matched to the slide's
 * role, honoring a strict density, and may return a table for structured data.
 *
 * Body: { intent, slideTitle, deckTitles[], density: "concise"|"balanced"|"detailed" }
 * Returns: { bullets: string[], table?: { headers: string[], rows: string[][] } }
 */
/** Fix invalid Mermaid patterns models commonly emit. */
function sanitizeMermaid(code: string): string {
  let c = (code || "").replace(/```(mermaid)?/gi, "").trim();
  c = c.replace(/\|\s*>/g, "|");                 // "|label|>" → "|label|"
  if (/^\s*(flowchart|graph)\b/i.test(c)) c = c.replace(/-->>/g, "-->");
  c = c.replace(/([^-])--\|/g, "$1 -->|");        // "--|" → "-->|"
  return c.trim();
}

const DENSITY: Record<string, string> = {
  concise: "4–5 bullet points, each a clear phrase of about 6–10 words. Not one-word, not full paragraphs.",
  balanced: "6–7 bullet points, each ONE short line (about 8–14 words). Keep them tight — no long sentences.",
  detailed: "9–12 bullet points with specific detail (each up to ~18 words).",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const intent = String(body?.intent || "").trim();

    // Diagram generation: describe a diagram → return Mermaid code.
    const diagramPrompt = String(body?.diagramPrompt || "").trim();
    if (diagramPrompt) {
      const sys = `You generate Mermaid diagram code. Return STRICT JSON: {"mermaid":"<code>"}.

SYNTAX RULES (follow exactly, invalid syntax breaks the render):
- Start with a valid header: "flowchart LR" or "flowchart TB" (or sequenceDiagram when a sequence is clearly better).
- Labeled arrow is: A -->|label| B   ← there is NO ">" after the closing "|". NEVER write "|label|>".
- Node text with special characters (/, (), :, etc.) MUST be quoted: A["User / Admin"].
- Node ids are simple (A, B, step1). Define text in brackets: A["Login"].
- No markdown fences, no comments, no HTML.

EXAMPLE (correct):
flowchart LR
  A["User"] -->|register / login| B["NGO Platform"]
  B --> C{"Verified?"}
  C -->|Yes| D["Dashboard"]
  C -->|No| E["Rejected"]`;
      const c = await withGroqClient((client) => client.chat.completions.create({
        model: "llama-3.3-70b-versatile", temperature: 0.3, response_format: { type: "json_object" },
        messages: [{ role: "system", content: sys }, { role: "user", content: `Diagram: ${diagramPrompt}` }],
      }));
      let p: any = {}; try { p = JSON.parse(c.choices?.[0]?.message?.content || "{}"); } catch { p = {}; }
      let code = typeof p.mermaid === "string" ? p.mermaid : (typeof p.code === "string" ? p.code : "");
      code = sanitizeMermaid(code);
      return NextResponse.json({ mermaid: code });
    }

    if (!intent) return NextResponse.json({ error: "intent required" }, { status: 400 });

    const slideTitle = String(body?.slideTitle || "");
    const deckTitles: string[] = Array.isArray(body?.deckTitles) ? body.deckTitles : [];
    const density = DENSITY[String(body?.density)] ? String(body?.density) : "balanced";
    // Existing tables on the slide → we FILL these instead of writing bullets.
    const existingTables: { id: string; rows: string[][] }[] = Array.isArray(body?.existingTables) ? body.existingTables : [];

    if (existingTables.length) {
      const sys = `You fill the data of existing tables on a presentation slide for a project. Keep each table's column count and (roughly) row count. Fill headers + rows with realistic, specific content for the project. Use realistic placeholders for private data (e.g. "Student 1"). Return STRICT JSON: {"tables": {"<id>": [["cell",...],...]}}. Only the table ids given.`;
      const usr = `Project: ${intent}\nSlide: ${slideTitle}\nTables to fill:\n${existingTables.map((t) => `- id=${t.id}: ${JSON.stringify(t.rows).slice(0, 600)}`).join("\n")}`;
      const c = await withGroqClient((client) => client.chat.completions.create({
        model: "llama-3.3-70b-versatile", temperature: 0.5, response_format: { type: "json_object" },
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
      }));
      let p: any = {}; try { p = JSON.parse(c.choices?.[0]?.message?.content || "{}"); } catch { p = {}; }
      const validIds = new Set(existingTables.map((t) => t.id));
      const tables: Record<string, string[][]> = {};
      if (p.tables && typeof p.tables === "object") {
        for (const [id, rows] of Object.entries<any>(p.tables)) {
          if (validIds.has(id) && Array.isArray(rows)) tables[id] = rows.map((r: any) => Array.isArray(r) ? r.map((x: any) => String(x)) : [String(r)]);
        }
      }
      return NextResponse.json({ bullets: [], tables });
    }

    const system = `You write the BODY CONTENT for one slide of a presentation.

CONTEXT
- This slide's heading/role: ${slideTitle || "(untitled)"}
- All slide headings: ${deckTitles.slice(0, 40).join(" | ")}

RULES
- Write ONLY the content that goes UNDER the heading. NEVER repeat the heading/title.
- Match content to THIS slide's role (Introduction → intro; Objectives → objectives; Methodology → methods; etc.).
- DENSITY (follow STRICTLY): ${DENSITY[density]}
- Be specific and concrete to the described project. No generic filler, no markdown symbols.
- If the slide's role calls for structured or comparative data (e.g. comparison, timeline, features, budget, tech stack), ALSO return a "table" with clear headers and rows.
- If the slide suits a GRAPH (metrics, growth, market size, distribution, survey results, comparisons of numbers), ALSO return a "chart": {"type":"bar|line|pie|donut","title":"...","unit":"%","data":[{"label":"...","value":12}]} with 3–6 realistic data points.
- Return STRICT JSON:
  {"bullets": ["point 1", ...], "table": {"headers": [...], "rows": [[...]]}, "chart": {"type":"bar","title":"...","data":[{"label":"...","value":10}]}}
  Omit "table"/"chart" when not useful. "bullets" is required.`;

    const user = `Project / description: ${intent}\n\nWrite the ${density} body content for the "${slideTitle || "this"}" slide.`;

    const completion = await withGroqClient((client) =>
      client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    );

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    let bullets: string[] = [];
    const b = parsed.bullets ?? parsed.body ?? parsed.points ?? parsed.content;
    if (Array.isArray(b)) bullets = b.map((x) => (typeof x === "string" ? x : x?.text || "")).filter((s: string) => s && s.trim());
    else if (typeof b === "string") bullets = b.split("\n").map((s) => s.trim()).filter(Boolean);

    let table: { headers: string[]; rows: string[][] } | undefined;
    if (parsed.table && Array.isArray(parsed.table.headers) && Array.isArray(parsed.table.rows)) {
      table = {
        headers: parsed.table.headers.map((h: any) => String(h)),
        rows: parsed.table.rows.map((r: any) => (Array.isArray(r) ? r.map((c: any) => String(c)) : [String(r)])),
      };
    }

    return NextResponse.json({ bullets, table, chart: cleanChartSpec(parsed.chart) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI write failed" }, { status: 500 });
  }
}
