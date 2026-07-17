"use client";
import { useEffect, useState } from "react";

const STEPS = ["Composing layouts", "Setting typography", "Balancing content", "Final review"];

/** Minimal post-outline transition using the same monochrome system as EXdeck. */
export default function MagicOverlay({ open, title, slideCount }: {
  open: boolean;
  title?: string;
  slideCount?: number;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setStep(0);
      const frame = requestAnimationFrame(() => setVisible(true));
      const timer = window.setInterval(() => setStep((value) => Math.min(STEPS.length - 1, value + 1)), 1100);
      return () => { cancelAnimationFrame(frame); window.clearInterval(timer); };
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 480);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Designing your presentation"
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background: "var(--ezd-bg-page)",
        color: "var(--ezd-fg)",
        opacity: visible ? 1 : 0,
        transition: "opacity 460ms ease",
      }}
    >
      <style>{minimalCss}</style>
      <div className="dm-grid" aria-hidden />

      <header className="dm-header">
        <span className="dm-wordmark">EXdeck</span>
        <span>DESIGNING · {String((slideCount || 8)).padStart(2, "0")} SLIDES</span>
      </header>

      <main className="dm-main">
        <div className="dm-copy">
          <p>DESIGN PASS</p>
          <h1>Designing your presentation</h1>
          <span>{title?.trim() || "Untitled presentation"}</span>
        </div>

        <div className="dm-frame" aria-hidden>
          <div className="dm-canvas">
            <span className="dm-index">01</span>
            <div className="dm-kicker" />
            <div className="dm-title dm-title-a" />
            <div className="dm-title dm-title-b" />
            <div className="dm-rule" />
            <div className="dm-columns">
              <div><b /><i /><i /><i /></div>
              <div><b /><i /><i /></div>
            </div>
            <div className="dm-scan" />
          </div>
        </div>

        <div className="dm-status">
          <div className="dm-steps">
            {STEPS.map((label, index) => (
              <div key={label} className={index === step ? "is-active" : index < step ? "is-done" : ""}>
                <i>{index < step ? "✓" : String(index + 1).padStart(2, "0")}</i>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="dm-progress"><i /></div>
          <p>{STEPS[step]}</p>
        </div>
      </main>
    </div>
  );
}

const minimalCss = `
.dm-grid{position:absolute;inset:0;opacity:.28;background-image:linear-gradient(var(--ezd-divider) 1px,transparent 1px),linear-gradient(90deg,var(--ezd-divider) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(75% 75% at 50% 45%,black,transparent)}
.dm-header{position:relative;z-index:2;height:62px;padding:0 26px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--ezd-divider);font:600 9px ui-monospace,SFMono-Regular,monospace;letter-spacing:.16em;color:var(--ezd-fg-quiet)}
.dm-wordmark{font:700 13px ui-sans-serif,system-ui;letter-spacing:-.02em;color:var(--ezd-fg-strong)}
.dm-main{position:relative;z-index:2;width:min(720px,calc(100% - 40px));height:calc(100vh - 62px);min-height:520px;margin:auto;display:flex;flex-direction:column;justify-content:center}
.dm-copy{text-align:center}.dm-copy p{margin:0;font:700 9px ui-monospace,SFMono-Regular,monospace;letter-spacing:.2em;color:var(--ezd-fg-quiet)}.dm-copy h1{margin:10px 0 0;font-size:clamp(27px,4vw,42px);font-weight:650;line-height:1;letter-spacing:-.035em;color:var(--ezd-fg-strong)}.dm-copy>span{display:block;margin-top:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--ezd-fg-muted)}
.dm-frame{margin:30px auto 0;width:min(590px,100%);padding:10px;border:1px solid var(--ezd-divider);border-radius:16px;background:var(--ezd-bg-card);box-shadow:0 24px 70px rgba(0,0,0,.12)}
.dm-canvas{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid var(--ezd-hairline);border-radius:9px;background:var(--ezd-bg-page);animation:dm-enter .65s cubic-bezier(.2,.75,.2,1) both}
.dm-index{position:absolute;right:7%;top:9%;font:600 8px ui-monospace,SFMono-Regular,monospace;color:var(--ezd-fg-quiet)}
.dm-kicker,.dm-title,.dm-rule,.dm-columns b,.dm-columns i{position:absolute;display:block;border-radius:99px;background:var(--ezd-hairline)}
.dm-kicker{left:8%;top:16%;width:15%;height:5px;background:var(--ezd-fg-muted);animation:dm-reveal .45s .18s both}
.dm-title{left:8%;height:13px;background:var(--ezd-fg-strong);animation:dm-reveal .55s both}.dm-title-a{top:27%;width:47%;animation-delay:.28s}.dm-title-b{top:35%;width:34%;animation-delay:.38s}.dm-rule{left:8%;top:48%;width:84%;height:1px;animation:dm-rule .7s .55s both}
.dm-columns{position:absolute;left:8%;right:8%;bottom:13%;height:27%;display:grid;grid-template-columns:1fr 1fr;gap:5%}.dm-columns>div{position:relative;border:1px solid var(--ezd-divider);border-radius:7px;animation:dm-reveal .55s .65s both}.dm-columns b{left:10%;top:18%;width:27%;height:6px;background:var(--ezd-fg-muted)}.dm-columns i{position:relative;left:10%;top:48%;width:76%;height:4px;margin-bottom:7px}.dm-columns i:nth-of-type(2){width:58%}.dm-columns i:nth-of-type(3){width:68%}
.dm-scan{position:absolute;left:0;right:0;top:-10%;height:16%;border-bottom:1px solid color-mix(in srgb,var(--ezd-fg-strong) 28%,transparent);background:linear-gradient(to bottom,transparent,color-mix(in srgb,var(--ezd-fg-strong) 3%,transparent));animation:dm-scan 2.8s .8s ease-in-out infinite}
.dm-status{width:min(590px,100%);margin:24px auto 0}.dm-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.dm-steps>div{display:flex;align-items:center;gap:7px;min-width:0;opacity:.3;transition:opacity .3s ease}.dm-steps>div.is-active{opacity:1}.dm-steps>div.is-done{opacity:.58}.dm-steps i{display:grid;width:21px;height:21px;flex:0 0 21px;place-items:center;border:1px solid var(--ezd-divider);border-radius:50%;font:600 7px ui-monospace,SFMono-Regular,monospace;color:var(--ezd-fg-muted)}.dm-steps .is-active i{border-color:var(--ezd-fg-strong);background:var(--ezd-fg-strong);color:var(--ezd-bg-page)}.dm-steps span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;color:var(--ezd-fg-muted)}
.dm-progress{height:2px;margin-top:18px;overflow:hidden;border-radius:99px;background:var(--ezd-divider)}.dm-progress i{display:block;width:100%;height:100%;background:var(--ezd-fg-strong);transform-origin:left;animation:dm-progress 4.75s linear both}.dm-status>p{margin:8px 0 0;text-align:right;font:600 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.08em;color:var(--ezd-fg-quiet)}
@keyframes dm-enter{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}@keyframes dm-reveal{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}@keyframes dm-rule{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1);transform-origin:left}}@keyframes dm-scan{0%{transform:translateY(0);opacity:0}18%{opacity:1}82%{opacity:1}100%{transform:translateY(680%);opacity:0}}@keyframes dm-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media(max-width:600px){.dm-header{height:54px;padding:0 16px}.dm-main{height:calc(100vh - 54px);width:calc(100% - 28px)}.dm-frame{margin-top:24px;padding:7px;border-radius:13px}.dm-steps{grid-template-columns:1fr 1fr;gap:9px 14px}.dm-steps span{font-size:9px}.dm-status{margin-top:18px}}
@media(prefers-reduced-motion:reduce){.dm-canvas,.dm-kicker,.dm-title,.dm-rule,.dm-columns>div,.dm-scan,.dm-progress i{animation:none!important}}
`;
