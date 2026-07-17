import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/**
 * Vibrant animated gradient mesh. Drifting colored blobs over a deep base —
 * gives the film energy and color instead of flat black. `hue` shifts the
 * palette per scene so cuts feel distinct.
 */
export const Background: React.FC<{ hue?: number; intensity?: number }> = ({ hue = 0, intensity = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const blob = (baseX: number, baseY: number, ampX: number, ampY: number, speed: number, phase: number) => {
    const x = baseX + Math.sin(t * speed + phase) * ampX;
    const y = baseY + Math.cos(t * speed * 0.8 + phase) * ampY;
    return { x, y };
  };

  const b1 = blob(28, 30, 8, 6, 0.5, 0);
  const b2 = blob(72, 40, 7, 8, 0.42, 2);
  const b3 = blob(50, 78, 9, 5, 0.6, 4);

  const c = (h: number, s = 85, l = 55) => `hsl(${(h + hue) % 360} ${s}% ${l}%)`;

  return (
    <AbsoluteFill style={{ background: "#0A0A16", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(38% 42% at ${b1.x}% ${b1.y}%, ${c(255)} 0%, transparent 60%),
            radial-gradient(40% 44% at ${b2.x}% ${b2.y}%, ${c(190)} 0%, transparent 60%),
            radial-gradient(44% 40% at ${b3.x}% ${b3.y}%, ${c(310)} 0%, transparent 62%)
          `,
          opacity: 0.75 * intensity,
          filter: "blur(6px)",
        }}
      />
      {/* light vignette — keeps foreground crisp without going black */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(80% 80% at 50% 50%, transparent 45%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      {/* fine grid for a product/tech texture */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: interpolate(frame, [0, 20], [0, 0.5], { extrapolateRight: "clamp" }),
          maskImage: "radial-gradient(70% 70% at 50% 50%, black, transparent 85%)",
          WebkitMaskImage: "radial-gradient(70% 70% at 50% 50%, black, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** The EX brand mark — reproduced from components/Logo.tsx as inline SVG. */
export const LogoMark: React.FC<{ size?: number; fg?: string; bg?: string }> = ({
  size = 120,
  fg = "#FFFFFF",
  bg = "#05060B",
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }}>
    <rect width="64" height="64" rx="14" fill={fg} />
    <g fill="none" stroke={bg} strokeWidth="5.5" strokeLinecap="round">
      <line x1="14" y1="22" x2="34" y2="22" />
      <line x1="14" y1="32" x2="28" y2="32" />
      <line x1="14" y1="42" x2="34" y2="42" />
    </g>
    <path
      d="M 38 22 L 50 42 M 50 22 L 38 42"
      fill="none"
      stroke={bg}
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
