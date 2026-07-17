import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO, SAMPLE_DECKS } from "../theme";

type Deck = (typeof SAMPLE_DECKS)[number];

/**
 * A single colorful deck slide — a miniature of the real product output.
 * `enter` is the frame (relative to the current Sequence) the card begins
 * animating in. Bars, kicker, title, and bullets stagger with springs.
 */
export const SlideCard: React.FC<{
  deck: Deck;
  enter?: number;
  chart?: boolean;
}> = ({ deck, enter = 0, chart = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - enter;

  const rise = spring({ frame: local, fps, config: { damping: 200, mass: 0.7 } });
  const y = interpolate(rise, [0, 1], [40, 0]);
  const op = interpolate(local, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 24,
        overflow: "hidden",
        background: deck.bg,
        color: deck.fg,
        opacity: op,
        transform: `translateY(${y}px)`,
        boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
        display: "flex",
      }}
    >
      {/* accent spine */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: deck.accent }} />

      {/* left: copy */}
      <div style={{ flex: 1.25, padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        <StaggerText delay={6} local={local} fps={fps}>
          <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 6, color: deck.accent, fontWeight: 700 }}>
            {deck.kicker}
          </div>
        </StaggerText>
        <StaggerText delay={12} local={local} fps={fps}>
          <div style={{ fontFamily: DISPLAY, fontSize: 60, fontWeight: 700, lineHeight: 1.02, letterSpacing: -1.5 }}>
            {deck.title}
          </div>
        </StaggerText>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 14 }}>
          {deck.bullets.map((b, i) => (
            <StaggerText key={b} delay={20 + i * 6} local={local} fps={fps}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, opacity: 0.92 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: deck.accent }} />
                {b}
              </div>
            </StaggerText>
          ))}
        </div>
      </div>

      {/* right: chart */}
      {chart && (
        <div style={{ flex: 0.85, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 20, padding: "72px 56px" }}>
          {deck.bars.map((h, i) => {
            const grow = spring({ frame: local - (24 + i * 5), fps, config: { damping: 200 } });
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: `${interpolate(grow, [0, 1], [0, h])}%`,
                  borderRadius: 10,
                  background: deck.accent,
                  opacity: 0.4 + (i / deck.bars.length) * 0.6,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const StaggerText: React.FC<{ children: React.ReactNode; delay: number; local: number; fps: number }> = ({
  children,
  delay,
  local,
  fps,
}) => {
  const s = spring({ frame: local - delay, fps, config: { damping: 200, mass: 0.6 } });
  return (
    <div
      style={{
        opacity: interpolate(s, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};
