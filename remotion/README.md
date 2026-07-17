# EXdeck promo video (Remotion)

A 30-second, 1080p promo built with [Remotion](https://remotion.dev) — React-driven
motion graphics. Monochrome brand chrome, with color coming only from the product's
own slide output (same identity as the site).

## Preview & render

```bash
# Live studio (scrub, tweak, hot-reload)
npm run video

# Render the final MP4 -> out/exdeck-promo.mp4
npm run video:render

# Render one still frame for a quick check -> out/frame.png
npm run video:still
```

## Storyboard (900 frames @ 30fps)

| Time | Scene | Message |
| --- | --- | --- |
| 0–4s | Hook | "Still building slides at midnight?" |
| 4–7s | Brand | EXdeck — AI presentations, in seconds |
| 7–12s | Brief | Type one line → Generate |
| 12–16s | Generating | AI designs the deck |
| 16–22s | Deck reveal | A finished, editable, colorful deck |
| 22–26s | Features | Export, charts, themes, editing |
| 26–30s | CTA | exdeck.xyz · free, no login |

## Background music (IMPORTANT — read this)

The video ships **silent** with a ready audio slot. I did **not** bundle a song,
because using an unlicensed/random track gets videos muted or struck on YouTube,
Instagram, TikTok, and LinkedIn. Add a licensed or royalty-free track instead:

1. Download a track (see recommendations below).
2. Save it as `public/audio/promo.mp3`.
3. In `remotion/Promo.tsx`, uncomment the `<Audio>` block near the top of `Promo`.
4. Re-render with `npm run video:render`.

The `<Audio>` slot already fades in/out and is volume-shaped to sit under the visuals.

### Recommended royalty-free tracks (match this edit's clean, modern, building tempo)

Free / free-with-attribution:
- **Pixabay Music** (pixabay.com/music) — filter "Corporate / Technology / Upbeat".
  100% free, no attribution required. Search: "minimal tech", "clean corporate".
- **Uppbeat** (uppbeat.io) — generous free tier with a clear-license code.
  Look for genres "Corporate" / "Ambient tech".
- **YouTube Audio Library** — free, filter by "Cinematic" / "Inspirational", ~120 BPM.

Paid but licensed (best quality):
- **Artlist** or **Epidemic Sound** — subscription; safe across all platforms.

Pick something around **120 BPM** — the scene cuts are placed on a 120 BPM grid
(15 frames per beat), so a 120 BPM track will land its downbeats on the transitions.

## Files

```
remotion/
  index.ts               registerRoot entry
  Root.tsx               composition registration + font loading
  Promo.tsx              the 7-scene timeline + audio slot
  theme.ts               brand tokens, sample decks, tempo constants
  components/SlideCard.tsx   the colorful animated product slide
  scenes/
    Intro.tsx            Hook + Brand
    Workflow.tsx         Brief + Generating
    DeckReveal.tsx       the payoff
    Outro.tsx            Features + CTA
```

## Tweaking

- Scene durations live in `SCENES` in `remotion/Promo.tsx`.
- Colors/sample decks in `remotion/theme.ts` (`SAMPLE_DECKS`).
- All motion uses `spring()` on transform/opacity only, so it stays smooth.
