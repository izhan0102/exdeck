"use client";
import { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";

/**
 * "EXdeck is doing the magic" overlay — played for ~5s after the outline is
 * confirmed, while the deck is designed. Deliberately distinct from the
 * generation overlay: a wand casts sparkles onto a stack of slide cards that
 * rise and fan into place, ending with a smooth fade-out that reveals the
 * finished deck underneath.
 *
 * Only transform/opacity are animated (compositor-only) so it stays smooth.
 */
export default function MagicOverlay({ open }: { open: boolean }) {
  // Keep mounted briefly after `open` flips false so we can fade out over the
  // deck (which is already rendered beneath) for a seamless hand-off.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // next frame -> trigger the fade/scale-in
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    // closing: fade out, then unmount
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 560);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center"
      style={{
        background: "radial-gradient(120% 120% at 50% 18%, var(--ezd-bg-hover) 0%, var(--ezd-bg-page) 60%)",
        color: "var(--ezd-fg)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(1.04)",
        transition: "opacity 520ms ease, transform 520ms ease",
      }}
    >
      <style>{magicCss}</style>

      {/* Soft drifting glow */}
      <div className="exm-glow" />

      <div className="relative flex flex-col items-center">
        {/* Slide stack that fans out */}
        <div className="exm-stage">
          <div className="exm-card exm-card-3" />
          <div className="exm-card exm-card-2" />
          <div className="exm-card exm-card-1">
            <span className="exm-line exm-line-a" />
            <span className="exm-line exm-line-b" />
            <span className="exm-line exm-line-c" />
            <span className="exm-chip" />
          </div>

          {/* Sparkles cast by the wand */}
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="exm-spark"
              style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s`, width: s.r, height: s.r }}
            />
          ))}

          {/* Wand */}
          <div className="exm-wand">
            <Wand2 size={26} />
          </div>
        </div>

        {/* Brand + status */}
        <div className="mt-9 text-center">
          <div className="exm-title text-[22px] font-extrabold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>
            EXdeck is doing the magic
          </div>
          <div className="mt-1.5 text-[13px]" style={{ color: "var(--ezd-fg-muted)" }}>Designing your slides…</div>
          <div className="exm-bar mt-4"><span /></div>
        </div>
      </div>
    </div>
  );
}

const SPARKLES = [
  { x: 12, y: 18, d: 0.0, r: "7px" },
  { x: 82, y: 26, d: 0.5, r: "5px" },
  { x: 30, y: 70, d: 0.9, r: "6px" },
  { x: 68, y: 64, d: 1.3, r: "8px" },
  { x: 50, y: 8, d: 0.3, r: "5px" },
  { x: 90, y: 54, d: 1.6, r: "6px" },
  { x: 8, y: 48, d: 1.1, r: "5px" },
];

const magicCss = `
.exm-glow{position:absolute;inset:0;background:radial-gradient(40% 50% at 50% 35%, color-mix(in srgb, var(--ezd-fg-strong) 10%, transparent), transparent 70%);filter:blur(12px);animation:exm-pulse 3.2s ease-in-out infinite}
.exm-stage{position:relative;width:240px;height:150px}
.exm-card{position:absolute;left:50%;top:50%;width:150px;height:96px;border-radius:14px;background:var(--ezd-bg-card);border:1px solid var(--ezd-hairline);box-shadow:0 24px 60px -20px rgba(0,0,0,0.45);transform:translate(-50%,-50%)}
.exm-card-1{animation:exm-rise1 3.4s ease-in-out infinite;z-index:3;padding:16px}
.exm-card-2{animation:exm-rise2 3.4s ease-in-out infinite;z-index:2;opacity:.85}
.exm-card-3{animation:exm-rise3 3.4s ease-in-out infinite;z-index:1;opacity:.6}
.exm-line{display:block;height:8px;border-radius:4px;margin-bottom:8px}
.exm-line-a{width:64%;background:var(--ezd-fg-strong);animation:exm-grow 3.4s ease-in-out infinite}
.exm-line-b{width:88%;background:var(--ezd-hairline);animation:exm-grow 3.4s ease-in-out .15s infinite}
.exm-line-c{width:74%;background:var(--ezd-hairline);animation:exm-grow 3.4s ease-in-out .3s infinite}
.exm-chip{position:absolute;right:14px;bottom:14px;width:34px;height:22px;border-radius:6px;background:var(--ezd-fg-strong);animation:exm-grow 3.4s ease-in-out .45s infinite}
.exm-spark{position:absolute;border-radius:50%;background:var(--ezd-fg-strong);box-shadow:0 0 10px 2px color-mix(in srgb, var(--ezd-fg-strong) 45%, transparent);animation:exm-spark 1.8s ease-in-out infinite}
.exm-wand{position:absolute;left:-6px;top:-14px;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;color:var(--ezd-bg-page);background:var(--ezd-fg-strong);box-shadow:0 10px 30px -6px rgba(0,0,0,0.4);animation:exm-wave 2.6s ease-in-out infinite;transform-origin:60% 60%}
.exm-bar{position:relative;height:4px;width:220px;border-radius:999px;overflow:hidden;background:var(--ezd-hairline)}
.exm-bar>span{position:absolute;inset:0;width:40%;border-radius:999px;background:linear-gradient(90deg,transparent,var(--ezd-fg-strong),transparent);animation:exm-slide 1.4s ease-in-out infinite}
@keyframes exm-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes exm-rise1{0%,100%{transform:translate(-50%,-46%) rotate(-2deg)}50%{transform:translate(-50%,-54%) rotate(2deg)}}
@keyframes exm-rise2{0%,100%{transform:translate(-72%,-44%) rotate(-9deg)}50%{transform:translate(-78%,-50%) rotate(-13deg)}}
@keyframes exm-rise3{0%,100%{transform:translate(-28%,-44%) rotate(9deg)}50%{transform:translate(-22%,-50%) rotate(13deg)}}
@keyframes exm-grow{0%,100%{opacity:.5;transform:scaleX(.82)}50%{opacity:1;transform:scaleX(1)}}
@keyframes exm-spark{0%{opacity:0;transform:scale(0)}40%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.3) translateY(-10px)}}
@keyframes exm-wave{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(10deg)}}
@keyframes exm-slide{0%{left:-40%}100%{left:100%}}
.exm-stage,.exm-card,.exm-wand,.exm-spark,.exm-glow,.exm-bar>span,.exm-line,.exm-chip{will-change:transform,opacity}
@media (prefers-reduced-motion: reduce){.exm-card,.exm-wand,.exm-spark,.exm-glow,.exm-line,.exm-chip,.exm-bar>span{animation:none!important}}
`;