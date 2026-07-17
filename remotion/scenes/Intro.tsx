import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO } from "../theme";
import { Background, LogoMark } from "../components/Background";

const SNAP = { damping: 18, mass: 0.7, stiffness: 180 };

/** Scene 1 — the hook. Kinetic problem statement over color. */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const l1 = spring({ frame: frame - 2, fps, config: SNAP });
  const l2 = spring({ frame: frame - 10, fps, config: SNAP });
  const caret = Math.floor(frame / 7) % 2 === 0;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
      <Background hue={300} />
      <div style={{ position: "relative", maxWidth: 1400, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 8, color: "rgba(255,255,255,0.7)", marginBottom: 32, opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>
          11:58 PM · SLIDE 2 OF 20
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, lineHeight: 1.0, letterSpacing: -4, color: "#fff", opacity: interpolate(l1, [0, 1], [0, 1]), transform: `translateY(${interpolate(l1, [0, 1], [50, 0])}px)` }}>
          Still fighting
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, lineHeight: 1.05, letterSpacing: -4, color: "#fff", opacity: interpolate(l2, [0, 1], [0, 1]), transform: `translateY(${interpolate(l2, [0, 1], [50, 0])}px)` }}>
          with slides?
          <span style={{ display: "inline-block", width: 9, height: 92, marginLeft: 18, verticalAlign: -14, background: "#fff", opacity: caret ? 1 : 0 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 2 — brand slam with the EX logo mark. */
export const BrandScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.8, stiffness: 140 } });
  const word = spring({ frame: frame - 6, fps, config: SNAP });
  const tag = spring({ frame: frame - 14, fps, config: SNAP });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Background hue={210} intensity={1.15} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32, transform: `scale(${interpolate(pop, [0, 1], [0.5, 1])})` }}>
          <div style={{ transform: `rotate(${interpolate(pop, [0, 1], [-40, 0])}deg)`, boxShadow: "0 0 80px rgba(255,255,255,0.35)", borderRadius: 34 }}>
            <LogoMark size={150} />
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 180, letterSpacing: -8, color: "#fff", opacity: interpolate(word, [0, 1], [0, 1]) }}>
            EX<span style={{ opacity: 0.72 }}>deck</span>
          </div>
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 50, letterSpacing: -1, color: "rgba(255,255,255,0.82)", marginTop: 24, opacity: interpolate(tag, [0, 1], [0, 1]), transform: `translateY(${interpolate(tag, [0, 1], [24, 0])}px)` }}>
          AI presentations, in seconds.
        </div>
      </div>
    </AbsoluteFill>
  );
};
