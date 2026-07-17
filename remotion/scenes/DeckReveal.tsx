import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, SAMPLE_DECKS } from "../theme";
import { SlideCard } from "../components/SlideCard";
import { Background } from "../components/Background";

/**
 * Scene 5 — the payoff. A hero deck snaps in full-frame, then a fan of
 * additional decks cascades behind it to show range (themes, charts).
 */
export const DeckRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const label = spring({ frame, fps, config: { damping: 18, stiffness: 180 } });

  const fan = [
    { deck: SAMPLE_DECKS[1], rot: -8, x: -520, y: 60, s: 0.72, enter: 6 },
    { deck: SAMPLE_DECKS[2], rot: 8, x: 520, y: 60, s: 0.72, enter: 10 },
    { deck: SAMPLE_DECKS[3], rot: -3, x: -240, y: 30, s: 0.82, enter: 14 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Background hue={200} intensity={0.9} />
      <div
        style={{
          position: "absolute",
          top: 70,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 44,
          color: "#fff",
          opacity: interpolate(label, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(label, [0, 1], [-20, 0])}px)`,
        }}
      >
        A finished, editable deck — in seconds.
      </div>

      {fan.map((f, i) => {
        const s = spring({ frame: frame - f.enter, fps, config: { damping: 18, stiffness: 170 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 1180,
              height: 664,
              transform: `translate(${f.x}px, ${f.y}px) rotate(${f.rot}deg) scale(${interpolate(s, [0, 1], [0.6, f.s])})`,
              opacity: interpolate(s, [0, 1], [0, 0.6]),
            }}
          >
            <SlideCard deck={f.deck} enter={0} />
          </div>
        );
      })}

      <div style={{ position: "absolute", width: 1180, height: 664, zIndex: 5 }}>
        <SlideCard deck={SAMPLE_DECKS[0]} enter={2} />
      </div>
    </AbsoluteFill>
  );
};
