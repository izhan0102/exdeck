/**
 * Brand tokens for the promo video. Mirrors the EXdeck site identity:
 * a monochrome black/white chrome, with color coming ONLY from the
 * product's own slide output — exactly like the landing page.
 */
export const BRAND = {
  bg: "#000000",
  bgElev: "#0A0A0A",
  fg: "#FFFFFF",
  fgMuted: "rgba(255,255,255,0.62)",
  fgQuiet: "rgba(255,255,255,0.40)",
  hairline: "rgba(255,255,255,0.12)",
  card: "rgba(255,255,255,0.04)",
};

export const DISPLAY =
  '"Bricolage Grotesque", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
export const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, "Roboto Mono", monospace';

/** Video spec. 30 fps, 1080p, ~30s. Cuts land on a 120 BPM grid. */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 120 BPM => 2 beats/sec => 15 frames per beat at 30fps. */
export const BEAT = 15;

/** Colorful sample decks — the only color in the whole film. */
export const SAMPLE_DECKS = [
  {
    bg: "#0B1220",
    fg: "#F8FAFC",
    accent: "#38BDF8",
    kicker: "SERIES A · 2026",
    title: "Rebuilding logistics, software-first.",
    bullets: ["Dispatch to delivery in one stack", "40% lower cost per shipment", "Live in 9 metros"],
    bars: [42, 58, 71, 90],
  },
  {
    bg: "#10241C",
    fg: "#ECFDF5",
    accent: "#34D399",
    kicker: "FY26 · STRATEGY",
    title: "Where we won this year.",
    bullets: ["Net retention reached 124%", "Two new enterprise segments", "Margin up 8 points"],
    bars: [30, 52, 66, 84],
  },
  {
    bg: "#1E1B4B",
    fg: "#EEF2FF",
    accent: "#A78BFA",
    kicker: "PRODUCT · LAUNCH",
    title: "Ship your first design today.",
    bullets: ["Start from a template", "Drag, edit, recolor", "Export anywhere"],
    bars: [48, 40, 74, 62],
  },
  {
    bg: "#3B0764",
    fg: "#FDF4FF",
    accent: "#F0ABFC",
    kicker: "Q2 · IMPACT",
    title: "Cutting carbon, quarter by quarter.",
    bullets: ["Emissions down 18%", "Renewable sites doubled", "On track for 2030"],
    bars: [64, 50, 78, 95],
  },
] as const;
