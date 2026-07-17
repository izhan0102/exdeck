import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { HookScene, BrandScene } from "./scenes/Intro";
import { BriefScene, GeneratingScene } from "./scenes/Workflow";
import { DeckRevealScene } from "./scenes/DeckReveal";
import { EditorScene, ExportScene } from "./scenes/Extras";
import { FeaturesScene, CTAScene } from "./scenes/Outro";

/**
 * Faster, fuller cut (30fps). Cuts land on the 15-frame (120 BPM) grid so
 * the generated track's downbeats hit the transitions. ~27s total.
 */
export const SCENES = [
  { comp: HookScene, dur: 60 },        // 0.0–2.0s
  { comp: BrandScene, dur: 60 },       // 2.0–4.0s
  { comp: BriefScene, dur: 105 },      // 4.0–7.5s
  { comp: GeneratingScene, dur: 75 },  // 7.5–10.0s
  { comp: DeckRevealScene, dur: 120 }, // 10.0–14.0s
  { comp: EditorScene, dur: 90 },      // 14.0–17.0s
  { comp: FeaturesScene, dur: 90 },    // 17.0–20.0s
  { comp: ExportScene, dur: 75 },      // 20.0–22.5s
  { comp: CTAScene, dur: 135 },        // 22.5–27.0s
] as const;

export const TOTAL_DURATION = SCENES.reduce((n, s) => n + s.dur, 0); // 810 frames = 27s

const CrossFade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const fade = 6;
  const op = interpolate(frame, [0, fade, dur - fade, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

export const Promo: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: "#05060B" }}>
      {/* Original synthesized 120 BPM track (scripts/generate-promo-audio.mjs). */}
      <Audio
        src={staticFile("audio/promo.wav")}
        volume={(f) =>
          interpolate(f, [0, 18, TOTAL_DURATION - 45, TOTAL_DURATION], [0, 0.8, 0.8, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {SCENES.map((s, i) => {
        const from = at;
        at += s.dur;
        const Comp = s.comp;
        return (
          <Sequence key={i} from={from} durationInFrames={s.dur}>
            <CrossFade dur={s.dur}>
              <Comp />
            </CrossFade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
