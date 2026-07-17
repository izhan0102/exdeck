import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO } from "../theme";
import { Background, LogoMark } from "../components/Background";

const FEATURES = [
  "Real .pptx & PDF export",
  "AI 3D data charts",
  "45 themes · 200k icons",
  "Edit every slide inline",
  "Speaker notes & present mode",
];

/** Scene — kinetic feature list, fast stagger from the left. */
export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 200px" }}>
      <Background hue={280} />
      <div style={{ position: "relative" }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 8, color: "rgba(255,255,255,0.6)", marginBottom: 40 }}>EVERYTHING IN THE BOX</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {FEATURES.map((f, i) => {
            const s = spring({ frame: frame - i * 5, fps, config: { damping: 16, mass: 0.5, stiffness: 190 } });
            return (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 26, opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateX(${interpolate(s, [0, 1], [-70, 0])}px)` }}>
                <span style={{ fontSize: 46, color: "#fff" }}>✓</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 70, letterSpacing: -2, color: "#fff" }}>{f}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Scene — the close. Logo, headline, URL, no-login proof. */
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const head = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 180 } });
  const url = spring({ frame: frame - 20, fps, config: { damping: 10, stiffness: 150 } });
  const proof = spring({ frame: frame - 30, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Background hue={220} intensity={1.2} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 30, transform: `scale(${interpolate(logo, [0, 1], [0.5, 1])})`, filter: "drop-shadow(0 0 50px rgba(255,255,255,0.4))" }}>
          <LogoMark size={110} />
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 104, letterSpacing: -4, color: "#fff", lineHeight: 1.0, opacity: interpolate(head, [0, 1], [0, 1]), transform: `translateY(${interpolate(head, [0, 1], [40, 0])}px)` }}>
          Stop staring
          <br />
          at the empty slide.
        </div>
        <div style={{ marginTop: 48, display: "inline-block", padding: "26px 62px", borderRadius: 999, background: "#fff", color: "#05060B", fontFamily: DISPLAY, fontWeight: 800, fontSize: 54, letterSpacing: -1, transform: `scale(${interpolate(url, [0, 1], [0.8, 1])})`, opacity: interpolate(frame, [20, 26], [0, 1], { extrapolateRight: "clamp" }), boxShadow: "0 0 90px rgba(255,255,255,0.5)" }}>
          exdeck.xyz
        </div>
        <div style={{ marginTop: 34, fontFamily: DISPLAY, fontSize: 34, color: "rgba(255,255,255,0.85)", opacity: interpolate(proof, [0, 1], [0, 1]), transform: `translateY(${interpolate(proof, [0, 1], [16, 0])}px)` }}>
          Free · No card · No login for your first deck
        </div>
      </div>
    </AbsoluteFill>
  );
};
