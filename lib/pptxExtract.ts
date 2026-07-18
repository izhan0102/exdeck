/**
 * Client-side PPTX extractor (fidelity-focused).
 *
 * A .pptx is a ZIP of Open-XML. We unzip (JSZip) + parse XML (DOMParser) — no
 * server, no new deps — and reconstruct each slide as closely as the format
 * allows:
 *   - BACKGROUND  : slide → layout → master <p:bg> (picture → exact image;
 *                   solid/gradient → reproduced on a canvas)
 *   - IMAGES      : <p:pic> blipFill → embedded media, positioned
 *   - TEXT        : <p:sp> with paragraphs + per-run color/size/bold; when the
 *                   shape is a placeholder with no coords, we inherit position
 *                   AND default font size from the matching layout/master
 *                   placeholder (this is what PowerPoint itself does)
 *   - TABLES      : <a:tbl> → rows/cols with per-cell text, fills, widths
 *
 * Sizes: EMU (914400/in, 12700/pt). Positions → % of slide. Font size is
 * stored as % of slide height so the editor can scale it to any canvas size.
 */
import JSZip from "jszip";

export type TextRun = { text: string; color?: string; bold?: boolean; italic?: boolean; sizePct?: number; font?: string };
export type TextParagraph = { runs: TextRun[]; align?: string };
export type TableCell = { paragraphs: TextParagraph[]; fill?: string; bold?: boolean };

export type ExtractedElement =
  | { id: string; kind: "text"; xPct: number; yPct: number; wPct: number; hPct: number; paragraphs: TextParagraph[]; preview: string; vAlign?: string; lineHeightEm?: number; rev?: number }
  | { id: string; kind: "image"; xPct: number; yPct: number; wPct: number; hPct: number; src: string; isLogo?: boolean }
  | { id: string; kind: "table"; xPct: number; yPct: number; wPct: number; hPct: number; rows: TableCell[][]; colPct: number[] };

export type BgDecor =
  | { kind: "image"; xPct: number; yPct: number; wPct: number; hPct: number; src: string }
  | { kind: "rect"; xPct: number; yPct: number; wPct: number; hPct: number; fill: string };

export type ExtractedSlide = {
  index: number;
  bgImage?: string;
  bgColor?: string;
  bgDecor?: BgDecor[];
  elements: ExtractedElement[];
};

export type ExtractedDeck = {
  widthEmu: number;
  heightEmu: number;
  aspect: number;
  slides: ExtractedSlide[];
};

const EMU_PER_PX = 9525;   // 96 dpi
const EMU_PER_PT = 12700;  // 1pt
let uid = 0;
const nextId = () => `el_${Date.now().toString(36)}_${uid++}`;

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}
function els(root: Element | Document, local: string): Element[] {
  const out: Element[] = [];
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) if (all[i].localName === local) out.push(all[i]);
  return out;
}
/** direct-child lookup by localName (so nested shapes don't leak in). */
function childEls(el: Element, local: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.children.length; i++) if (el.children[i].localName === local) out.push(el.children[i]);
  return out;
}
function firstEl(root: Element | Document, local: string): Element | null {
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) if (all[i].localName === local) return all[i];
  return null;
}
function firstChild(el: Element, local: string): Element | null {
  for (let i = 0; i < el.children.length; i++) if (el.children[i].localName === local) return el.children[i];
  return null;
}
function attr(el: Element | null, name: string): string | null {
  if (!el) return null;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (a.name === name || a.localName === name) return a.value;
  }
  return null;
}

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  bmp: "image/bmp", webp: "image/webp", svg: "image/svg+xml", emf: "image/emf", wmf: "image/wmf",
};
async function mediaDataUrl(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path.replace(/^\//, ""));
  if (!file) return null;
  const ext = (path.split(".").pop() || "").toLowerCase();
  const b64 = await file.async("base64");
  return `data:${MIME[ext] || "image/png"};base64,${b64}`;
}

async function relsFor(zip: JSZip, xmlPath: string): Promise<Record<string, string>> {
  const dir = xmlPath.substring(0, xmlPath.lastIndexOf("/"));
  const base = xmlPath.substring(xmlPath.lastIndexOf("/") + 1);
  const f = zip.file(`${dir}/_rels/${base}.rels`);
  const map: Record<string, string> = {};
  if (!f) return map;
  const doc = parseXml(await f.async("text"));
  for (const rel of els(doc, "Relationship")) {
    const id = attr(rel, "Id");
    let target = attr(rel, "Target") || "";
    if (id) {
      if (target.startsWith("../")) target = `ppt/${target.replace(/^\.\.\//, "")}`;
      else if (!target.startsWith("/") && !target.startsWith("ppt/")) target = `${dir}/${target}`;
      map[id] = target.replace(/^\//, "");
    }
  }
  return map;
}
async function relTargetByType(zip: JSZip, path: string, typeSuffix: string): Promise<string | null> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  const base = path.substring(path.lastIndexOf("/") + 1);
  const f = zip.file(`${dir}/_rels/${base}.rels`);
  if (!f) return null;
  const doc = parseXml(await f.async("text"));
  for (const rel of els(doc, "Relationship")) {
    if ((attr(rel, "Type") || "").endsWith(typeSuffix)) {
      let target = attr(rel, "Target") || "";
      if (target.startsWith("../")) target = `ppt/${target.replace(/^\.\.\//, "")}`;
      else if (!target.startsWith("ppt/")) target = `${dir}/${target}`;
      return target.replace(/^\//, "");
    }
  }
  return null;
}

const emuPct = (v: string | null, total: number) => (total ? (Number(v || 0) / total) * 100 : 0);

function solidColor(node: Element | null): string | null {
  if (!node) return null;
  const srgb = firstEl(node, "srgbClr");
  if (srgb) { const v = attr(srgb, "val"); if (v) return `#${v}`; }
  const scheme = firstEl(node, "schemeClr");
  if (scheme) {
    let v = attr(scheme, "val") || "";
    v = SCHEME_ALIAS[v] || v;
    if (THEME[v]) return THEME[v];
  }
  return null;
}

/** Theme color scheme (name → hex), populated per slide from theme{n}.xml. */
let THEME: Record<string, string> = {};
const SCHEME_ALIAS: Record<string, string> = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };

async function loadTheme(zip: JSZip, masterPath: string | null): Promise<void> {
  THEME = {};
  if (!masterPath) return;
  const themePath = await relTargetByType(zip, masterPath, "theme");
  if (!themePath || !zip.file(themePath)) return;
  const doc = parseXml(await zip.file(themePath)!.async("text"));
  const scheme = firstEl(doc, "clrScheme");
  if (!scheme) return;
  for (let i = 0; i < scheme.children.length; i++) {
    const c = scheme.children[i];
    const name = c.localName; // dk1, lt1, dk2, lt2, accent1..6, hlink…
    const srgb = firstEl(c, "srgbClr");
    const sys = firstEl(c, "sysClr");
    let hex: string | null = null;
    if (srgb) hex = `#${attr(srgb, "val")}`;
    else if (sys) {
      const last = attr(sys, "lastClr");
      hex = last ? `#${last}` : (attr(sys, "val") === "window" ? "#FFFFFF" : "#000000");
    }
    if (name && hex) THEME[name] = hex;
  }
}

/** Decorative background layer from a layout/master spTree, in z-order:
 *  filled shapes (white content panel, colored side strips) + pictures. */
async function bgDecorFrom(doc: Document, rels: Record<string, string>, zip: JSZip, wEmu: number, hEmu: number): Promise<BgDecor[]> {
  const out: BgDecor[] = [];
  const tree = firstEl(doc, "spTree");
  if (!tree) return out;
  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i];
    if (node.localName === "pic") {
      const blip = firstEl(node, "blip");
      const rId = blip ? (attr(blip, "embed") || attr(blip, "link")) : null;
      if (!rId || !rels[rId]) continue;
      const src = await mediaDataUrl(zip, rels[rId]);
      if (!src) continue;
      const xf = xfrmOf(node);
      out.push({ kind: "image", xPct: emuPct(xf?.x ?? null, wEmu), yPct: emuPct(xf?.y ?? null, hEmu), wPct: emuPct(xf?.cx ?? null, wEmu) || 100, hPct: emuPct(xf?.cy ?? null, hEmu) || 100, src });
    } else if (node.localName === "sp") {
      // Only decorative filled shapes with no text (panels, strips, bars).
      const txt = els(node, "t").map((t) => t.textContent || "").join("").trim();
      if (txt) continue;
      const spPr = firstChild(node, "spPr");
      if (!spPr) continue;
      const fill = solidColor(firstChild(spPr, "solidFill")) ||
        (firstChild(spPr, "gradFill") ? (els(firstChild(spPr, "gradFill")!, "gs").map((g) => solidColor(g)).filter(Boolean)[0] as string) : null);
      const xf = xfrmOf(node);
      if (!fill || !xf) continue;
      out.push({ kind: "rect", xPct: emuPct(xf.x, wEmu), yPct: emuPct(xf.y, hEmu), wPct: emuPct(xf.cx, wEmu), hPct: emuPct(xf.cy, hEmu), fill });
    }
  }
  return out;
}

function xfrmOf(sp: Element): { x: string | null; y: string | null; cx: string | null; cy: string | null } | null {
  const xfrm = firstEl(sp, "xfrm");
  if (!xfrm) return null;
  const off = firstEl(xfrm, "off");
  const ext = firstEl(xfrm, "ext");
  if (!off && !ext) return null;
  return { x: attr(off, "x"), y: attr(off, "y"), cx: attr(ext, "cx"), cy: attr(ext, "cy") };
}

function fillToImage(widthEmu: number, heightEmu: number, colors: string[]): string {
  const w = Math.max(1, Math.round(widthEmu / EMU_PER_PX));
  const h = Math.max(1, Math.round(heightEmu / EMU_PER_PX));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (colors.length >= 2) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = colors[0] || "#ffffff";
  ctx.fillRect(0, 0, w, h);
  return canvas.toDataURL("image/png");
}

async function backgroundFrom(doc: Document, rels: Record<string, string>, zip: JSZip, wEmu: number, hEmu: number) {
  const bg = firstEl(doc, "bg");
  if (!bg) return null;
  const blip = firstEl(bg, "blip");
  if (blip) {
    const rId = attr(blip, "embed") || attr(blip, "link");
    if (rId && rels[rId]) { const src = await mediaDataUrl(zip, rels[rId]); if (src) return { bgImage: src }; }
  }
  const grad = firstEl(bg, "gradFill");
  if (grad) {
    const stops = els(grad, "gs").map((gs) => solidColor(gs)).filter(Boolean) as string[];
    if (stops.length) return { bgImage: fillToImage(wEmu, hEmu, stops.slice(0, 2)), bgColor: stops[0] };
  }
  const c = solidColor(firstEl(bg, "solidFill"));
  if (c) return { bgImage: fillToImage(wEmu, hEmu, [c]), bgColor: c };
  return null;
}

/** Build a placeholder lookup { "type:idx" → xfrm + default sz } from a doc. */
function placeholderMap(doc: Document | null, hEmu: number): Record<string, { x: string | null; y: string | null; cx: string | null; cy: string | null; szPct?: number }> {
  const map: Record<string, any> = {};
  if (!doc) return map;
  const tree = firstEl(doc, "spTree");
  if (!tree) return map;
  for (const sp of els(tree, "sp")) {
    const ph = firstEl(sp, "ph");
    if (!ph) continue;
    const type = attr(ph, "type") || "body";
    const idx = attr(ph, "idx") || "";
    const xfrm = xfrmOf(sp);
    const sz = attr(firstEl(sp, "defRPr"), "sz") || attr(firstEl(sp, "rPr"), "sz");
    const entry = { ...(xfrm || { x: null, y: null, cx: null, cy: null }), szPct: sz ? (Number(sz) / 100) / (hEmu / EMU_PER_PT) * 100 : undefined };
    if (xfrm || sz) {
      map[`${type}:${idx}`] = entry;
      map[`${type}:`] = map[`${type}:`] || entry; // type-only fallback
      if (idx) map[`:${idx}`] = map[`:${idx}`] || entry;
    }
  }
  return map;
}

function runsFromParagraph(p: Element, hEmu: number, defColor: string | undefined, defSizePct: number | undefined): TextParagraph {
  const align = attr(firstChild(p, "pPr"), "algn") || undefined;
  const runs: TextRun[] = [];
  for (const r of childEls(p, "r")) {
    const t = firstChild(r, "t")?.textContent ?? "";
    if (!t) continue;
    const rPr = firstChild(r, "rPr");
    const sz = rPr ? attr(rPr, "sz") : null;
    const color = solidColor(rPr ? firstChild(rPr, "solidFill") : null) || defColor;
    const latin = rPr ? firstChild(rPr, "latin") : null;
    const font = latin ? (attr(latin, "typeface") || undefined) : undefined;
    runs.push({
      text: t,
      color,
      bold: rPr ? attr(rPr, "b") === "1" : false,
      italic: rPr ? attr(rPr, "i") === "1" : false,
      sizePct: sz ? (Number(sz) / 100) / (hEmu / EMU_PER_PT) * 100 : defSizePct,
      font,
    });
  }
  // <a:br> line breaks or empty paragraph → keep as a blank line
  if (!runs.length) runs.push({ text: "", sizePct: defSizePct, color: defColor });
  return { runs, align };
}

function parseTable(graphicFrame: Element, wEmu: number, hEmu: number): ExtractedElement | null {
  const tbl = firstEl(graphicFrame, "tbl");
  if (!tbl) return null;
  const xfrm = xfrmOf(graphicFrame);
  const grid = firstEl(tbl, "tblGrid");
  const colW = grid ? childEls(grid, "gridCol").map((g) => Number(attr(g, "w") || 0)) : [];
  const totalW = colW.reduce((a, b) => a + b, 0) || 1;
  const colPct = colW.map((w) => (w / totalW) * 100);

  const rows: TableCell[][] = [];
  for (const tr of childEls(tbl, "tr")) {
    const cells: TableCell[] = [];
    for (const tc of childEls(tr, "tc")) {
      const txBody = firstChild(tc, "txBody");
      const paragraphs: TextParagraph[] = [];
      if (txBody) for (const p of childEls(txBody, "p")) paragraphs.push(runsFromParagraph(p, hEmu, undefined, 1.8));
      const tcPr = firstChild(tc, "tcPr");
      const fill = solidColor(tcPr ? firstChild(tcPr, "solidFill") : null) || undefined;
      cells.push({ paragraphs, fill });
    }
    rows.push(cells);
  }
  if (!rows.length) return null;
  return {
    id: nextId(), kind: "table",
    xPct: emuPct(xfrm?.x ?? null, wEmu), yPct: emuPct(xfrm?.y ?? null, hEmu),
    wPct: emuPct(xfrm?.cx ?? null, wEmu) || 60, hPct: emuPct(xfrm?.cy ?? null, hEmu) || 30,
    rows, colPct,
  };
}

async function elementsFrom(
  doc: Document, rels: Record<string, string>, zip: JSZip, wEmu: number, hEmu: number,
  phLayout: ReturnType<typeof placeholderMap>, phMaster: ReturnType<typeof placeholderMap>,
): Promise<ExtractedElement[]> {
  const out: ExtractedElement[] = [];
  const tree = firstEl(doc, "spTree");
  if (!tree) return out;

  // Tables (graphicFrame)
  for (const gf of els(tree, "graphicFrame")) {
    const t = parseTable(gf, wEmu, hEmu);
    if (t) out.push(t);
  }

  // Pictures
  for (const pic of els(tree, "pic")) {
    const blip = firstEl(pic, "blip");
    const rId = blip ? (attr(blip, "embed") || attr(blip, "link")) : null;
    if (!rId || !rels[rId]) continue;
    const src = await mediaDataUrl(zip, rels[rId]);
    if (!src) continue;
    const xf = xfrmOf(pic);
    const wPct = emuPct(xf?.cx ?? null, wEmu);
    const hPct = emuPct(xf?.cy ?? null, hEmu);
    out.push({
      id: nextId(), kind: "image",
      xPct: emuPct(xf?.x ?? null, wEmu), yPct: emuPct(xf?.y ?? null, hEmu),
      wPct: wPct || 18, hPct: hPct || 18, src,
      isLogo: wPct > 0 && wPct < 22 && hPct > 0 && hPct < 22,
    });
  }

  // Text shapes (with placeholder inheritance)
  for (const sp of els(tree, "sp")) {
    const txBody = firstChild(sp, "txBody");
    if (!txBody) continue;
    const paras = childEls(txBody, "p");
    const hasText = paras.some((p) => childEls(p, "r").some((r) => (firstChild(r, "t")?.textContent || "").trim()));
    if (!hasText) continue;

    // position: own xfrm, else inherit from layout→master placeholder
    let xf = xfrmOf(sp);
    let defSize: number | undefined;
    const ph = firstEl(sp, "ph");
    if (ph) {
      const type = attr(ph, "type") || "body";
      const idx = attr(ph, "idx") || "";
      const keys = [`${type}:${idx}`, `${type}:`, `:${idx}`];
      for (const src of [phLayout, phMaster]) {
        for (const k of keys) {
          const hit = src[k];
          if (hit) {
            if (!xf && (hit.x || hit.cx)) xf = { x: hit.x, y: hit.y, cx: hit.cx, cy: hit.cy };
            if (defSize == null && hit.szPct) defSize = hit.szPct;
          }
          if (xf && defSize != null) break;
        }
      }
      if (defSize == null) defSize = type === "title" || type === "ctrTitle" ? 6.5 : 2.2;
    }

    const bodyColor = solidColor(firstChild(txBody, "solidFill")) || undefined;
    const paragraphs = paras.map((p) => runsFromParagraph(p, hEmu, bodyColor, defSize));
    const preview = paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join(" ").trim();
    const anchor = attr(firstChild(txBody, "bodyPr"), "anchor") || undefined; // t | ctr | b

    out.push({
      id: nextId(), kind: "text",
      xPct: emuPct(xf?.x ?? null, wEmu), yPct: emuPct(xf?.y ?? null, hEmu),
      wPct: emuPct(xf?.cx ?? null, wEmu) || 40, hPct: emuPct(xf?.cy ?? null, hEmu) || 12,
      paragraphs, preview, vAlign: anchor,
    });
  }
  return out;
}

async function orderedSlidePaths(zip: JSZip): Promise<string[]> {
  const presFile = zip.file("ppt/presentation.xml");
  const paths: string[] = [];
  if (presFile) {
    const doc = parseXml(await presFile.async("text"));
    const rels = await relsFor(zip, "ppt/presentation.xml");
    for (const sldId of els(doc, "sldId")) {
      let rId: string | null = null;
      for (let i = 0; i < sldId.attributes.length; i++) { const a = sldId.attributes[i]; if (a.localName === "id" && a.name.includes(":")) rId = a.value; }
      if (!rId) rId = attr(sldId, "id");
      if (rId && rels[rId]) paths.push(rels[rId]);
    }
  }
  if (!paths.length) {
    zip.forEach((p) => { if (/^ppt\/slides\/slide\d+\.xml$/.test(p)) paths.push(p); });
    paths.sort((a, b) => (Number(a.match(/(\d+)/)?.[1]) || 0) - (Number(b.match(/(\d+)/)?.[1]) || 0));
  }
  return paths;
}

export async function extractPptx(file: File): Promise<ExtractedDeck> {
  const zip = await JSZip.loadAsync(file);

  let wEmu = 12192000, hEmu = 6858000;
  const presFile = zip.file("ppt/presentation.xml");
  if (presFile) {
    const sz = firstEl(parseXml(await presFile.async("text")), "sldSz");
    if (sz) { wEmu = Number(attr(sz, "cx")) || wEmu; hEmu = Number(attr(sz, "cy")) || hEmu; }
  }

  const slidePaths = await orderedSlidePaths(zip);
  const slides: ExtractedSlide[] = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const f = zip.file(path);
    if (!f) continue;
    const doc = parseXml(await f.async("text"));
    const rels = await relsFor(zip, path);

    // resolve layout + master once per slide
    const layoutPath = await relTargetByType(zip, path, "slideLayout");
    const layoutDoc = layoutPath && zip.file(layoutPath) ? parseXml(await zip.file(layoutPath)!.async("text")) : null;
    const masterPath = layoutPath ? await relTargetByType(zip, layoutPath, "slideMaster") : null;
    const masterDoc = masterPath && zip.file(masterPath) ? parseXml(await zip.file(masterPath)!.async("text")) : null;

    // theme palette (for scheme colors: table green, themed text, etc.)
    await loadTheme(zip, masterPath);

    // background: slide → layout → master
    let bg = await backgroundFrom(doc, rels, zip, wEmu, hEmu);
    if (!bg && layoutDoc && layoutPath) bg = await backgroundFrom(layoutDoc, await relsFor(zip, layoutPath), zip, wEmu, hEmu);
    if (!bg && masterDoc && masterPath) bg = await backgroundFrom(masterDoc, await relsFor(zip, masterPath), zip, wEmu, hEmu);

    // decorative pictures live on the master/layout (side strips, frames) —
    // composite them behind the content so the "skin" matches the original.
    const bgDecor: BgDecor[] = [];
    if (masterDoc && masterPath) bgDecor.push(...await bgDecorFrom(masterDoc, await relsFor(zip, masterPath), zip, wEmu, hEmu));
    if (layoutDoc && layoutPath) bgDecor.push(...await bgDecorFrom(layoutDoc, await relsFor(zip, layoutPath), zip, wEmu, hEmu));

    const phLayout = placeholderMap(layoutDoc, hEmu);
    const phMaster = placeholderMap(masterDoc, hEmu);
    const elements = await elementsFrom(doc, rels, zip, wEmu, hEmu, phLayout, phMaster);

    slides.push({ index: i, bgImage: bg?.bgImage, bgColor: bg?.bgColor, bgDecor, elements });
  }

  return { widthEmu: wEmu, heightEmu: hEmu, aspect: wEmu / hEmu, slides };
}
