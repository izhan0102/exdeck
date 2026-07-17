import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO, SAMPLE_DECKS } from "../theme";
import { Background } from "../components/Background";
import { SlideCard } from "../components/SlideCard";

/** Scene — editing: a slide with a moving cursor + AI chat bubble typing. */
export const EditorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panel = spring({ frame, fps, config: { damping: 18, stiffness: 180 } });
  // cursor travels then "drags"
  const cx = interpolate(frame, [10, 40, 55], [1200, 700, 700], { extrapolateRight: "clamp" });
  const cy = interpolate(frame, [10, 40, 55], [300, 430, 430], { extrapolateRight: "clamp" });

  const chat = "make the title bolder";
  const chatChars = Math.floor(interpolate(frame, [30, 62], [0, chat.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Background hue={190} intensity={0.85} />
      <div style={{ position: "absolute", top: 66, fontFamily: MONO, fontSize: 24, letterSpacing: 8, color: "rgba(255,255,255,0.6)" }}>
        EDIT ANYTHING — LIVE
      </div>
      <div style={{ position: "relative", width: 1160, height: 652, opacity: interpolate(panel, [0, 1], [0, 1]), transform: `scale(${interpolate(panel, [0, 1], [0.85, 1])})` }}>
        <SlideCard deck={SAMPLE_DECKS[2]} enter={0} />
      </div>

      {/* AI chat bubble */}
      <div style={{ position: "absolute", bottom: 120, right: 220, width: 460, background: "rgba(10,12,22,0.85)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 20, padding: "20px 24px", opacity: interpolate(frame, [26, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>✦ ASK AI</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 30, color: "#fff" }}>{chat.slice(0, chatChars)}<span style={{ opacity: Math.floor(frame / 6) % 2 ? 1 : 0 }}>|</span></div>
      </div>

      {/* cursor */}
      <div style={{ position: "absolute", left: cx, top: cy, width: 26, height: 26, zIndex: 20 }}>
        <svg viewBox="0 0 24 24" width={30} height={30}><path d="M4 2 L4 20 L9 15 L13 22 L16 20 L12 14 L20 14 Z" fill="#fff" stroke="#000" strokeWidth="1.5" /></svg>
      </div>
    </AbsoluteFill>
  );
};

/** Scene — export to .pptx / .pdf. */
export const ExportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const files = [
    { ext: ".pptx", label: "PowerPoint" },
    { ext: ".pdf", label: "PDF" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Background hue={150} intensity={1.05} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 84, letterSpacing: -3, color: "#fff", marginBottom: 56, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }) }}>
          Yours to keep. No lock-in.
        </div>
        <div style={{ display: "flex", gap: 44, justifyContent: "center" }}>
          {files.map((f, i) => {
            const s = spring({ frame: frame - 8 - i * 8, fps, config: { damping: 11, stiffness: 150 } });
            return (
              <div key={f.ext} style={{ width: 320, height: 200, borderRadius: 24, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px) scale(${interpolate(s, [0, 1], [0.8, 1])})`, opacity: interpolate(s, [0, 1], [0, 1]), boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, color: "#fff" }}>{f.ext}</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 28, color: "rgba(255,255,255,0.7)" }}>{f.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
