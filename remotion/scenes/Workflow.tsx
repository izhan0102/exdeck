import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO } from "../theme";
import { Background } from "../components/Background";

const BRIEF = "Series A pitch for a logistics startup";
const SNAP = { damping: 18, mass: 0.6, stiffness: 180 };

/** Scene 3 — type a one-line brief fast, then Generate pulses. */
export const BriefScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chars = Math.floor(interpolate(frame, [6, 48], [0, BRIEF.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const typed = BRIEF.slice(0, chars);
  const done = chars >= BRIEF.length;
  const caret = Math.floor(frame / 6) % 2 === 0;

  const panel = spring({ frame, fps, config: SNAP });
  const btn = spring({ frame: frame - 52, fps, config: { damping: 9, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 160 }}>
      <Background hue={250} />
      <div style={{ position: "relative", width: 1200, opacity: interpolate(panel, [0, 1], [0, 1]), transform: `translateY(${interpolate(panel, [0, 1], [30, 0])}px)` }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 6, color: "rgba(255,255,255,0.65)", marginBottom: 22 }}>STEP 1 — YOUR BRIEF</div>
        <div style={{ border: "2px solid rgba(255,255,255,0.18)", background: "rgba(10,12,22,0.72)", backdropFilter: "blur(6px)", borderRadius: 24, padding: "44px 40px", fontFamily: DISPLAY, fontSize: 54, fontWeight: 600, color: "#fff", minHeight: 118, display: "flex", alignItems: "center" }}>
          {typed}
          <span style={{ display: "inline-block", width: 6, height: 58, marginLeft: 6, background: "#fff", opacity: caret && !done ? 1 : 0 }} />
        </div>
        <div style={{ marginTop: 26, display: "flex", gap: 16 }}>
          {["Investors", "Confident", "8 slides"].map((t, i) => (
            <span key={t} style={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "12px 24px", fontFamily: DISPLAY, fontSize: 26, color: "rgba(255,255,255,0.8)", opacity: interpolate(frame, [30 + i * 4, 38 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 38, width: "fit-content", padding: "22px 46px", borderRadius: 999, background: "#fff", color: "#05060B", fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, transform: `scale(${done ? interpolate(btn, [0, 1], [0.9, 1]) : 0.9})`, opacity: done ? 1 : 0.3, boxShadow: done ? "0 0 70px rgba(255,255,255,0.45)" : "none" }}>
          ✦ Generate
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 4 — AI designing: spinning mark + progress. */
export const GeneratingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame, fps, config: SNAP });
  const progress = interpolate(frame, [4, 60], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dots = ".".repeat((Math.floor(frame / 8) % 3) + 1);
  const spin = (frame * 9) % 360;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Background hue={160} intensity={1.1} />
      <div style={{ position: "relative", textAlign: "center", opacity: interpolate(pop, [0, 1], [0, 1]) }}>
        <div style={{ width: 150, height: 150, borderRadius: 34, margin: "0 auto", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.2)", transform: `rotate(${spin}deg)`, boxShadow: "0 0 60px rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 66, transform: `rotate(${-spin}deg)`, color: "#fff" }}>✦</div>
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 54, color: "#fff", marginTop: 38 }}>Designing your deck{dots}</div>
        <div style={{ width: 560, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.14)", margin: "34px auto 0", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#fff", borderRadius: 999 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
