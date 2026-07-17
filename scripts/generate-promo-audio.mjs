/**
 * Generates an ORIGINAL royalty-free promo track (no samples, fully synthesized)
 * as public/audio/promo.wav. Upbeat, clean, modern-tech — 124 BPM to match the
 * video's cut grid. Structure: intro → build → drop → outro, ~26s.
 *
 *   node scripts/generate-promo-audio.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SR = 44100;
const BPM = 120;
const beat = 60 / BPM;
const bar = beat * 4;
const DURATION = 27; // seconds
const N = Math.floor(SR * DURATION);

const left = new Float32Array(N);
const right = new Float32Array(N);

const clamp = (v) => Math.max(-1, Math.min(1, v));
const tri = (p) => 2 * Math.abs(2 * (p - Math.floor(p + 0.5))) - 1;
const saw = (p) => 2 * (p - Math.floor(p + 0.5));
const noteHz = (semisFromA4) => 440 * Math.pow(2, semisFromA4 / 12);

// Chord progression (semitone offsets from A4), one chord per 2 beats.
// Am - F - C - G  (uplifting, common pop-house loop), voiced low.
const PROG = [
  [-12, -9, -5], // Am
  [-16, -9, -4], // F
  [-9, -5, 0],   // C
  [-14, -7, -2], // G
];

function addTone(bufL, bufR, startS, durS, hz, gain, wave, pan = 0.5, attack = 0.005, release = 0.08) {
  const s0 = Math.floor(startS * SR);
  const s1 = Math.min(N, Math.floor((startS + durS) * SR));
  const aN = Math.max(1, Math.floor(attack * SR));
  const rN = Math.max(1, Math.floor(release * SR));
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const p = hz * t;
    let v = wave === "saw" ? saw(p) : wave === "tri" ? tri(p) : Math.sin(2 * Math.PI * p);
    // envelope
    const idx = i - s0;
    const total = s1 - s0;
    let env = 1;
    if (idx < aN) env = idx / aN;
    else if (idx > total - rN) env = Math.max(0, (total - idx) / rN);
    const s = clamp(v * gain * env);
    bufL[i] += s * (1 - pan);
    bufR[i] += s * pan;
  }
}

function addKick(startS) {
  const s0 = Math.floor(startS * SR);
  const dur = 0.28;
  const s1 = Math.min(N, Math.floor((startS + dur) * SR));
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const hz = 120 * Math.exp(-t * 30) + 45;
    const env = Math.exp(-t * 9);
    const s = clamp(Math.sin(2 * Math.PI * hz * t) * env * 0.9);
    left[i] += s; right[i] += s;
  }
}

function addHat(startS, gain = 0.18) {
  const s0 = Math.floor(startS * SR);
  const dur = 0.05;
  const s1 = Math.min(N, Math.floor((startS + dur) * SR));
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const env = Math.exp(-t * 90);
    const s = clamp((Math.random() * 2 - 1) * env * gain);
    left[i] += s * 0.6; right[i] += s * 0.6;
  }
}

const totalBars = Math.floor(DURATION / bar);

for (let b = 0; b < totalBars; b++) {
  const barStart = b * bar;
  const chord = PROG[b % PROG.length];
  // sections
  const isIntro = b < 2;
  const isBuild = b >= 2 && b < 4;
  const full = b >= 4;

  // Pad chords (2 per bar)
  for (let h = 0; h < 2; h++) {
    const c = PROG[(b * 2 + h) % PROG.length];
    const start = barStart + h * (bar / 2);
    c.forEach((semi, k) => {
      addTone(left, right, start, bar / 2, noteHz(semi), isIntro ? 0.10 : 0.14, "tri", 0.35 + k * 0.15, 0.04, 0.25);
    });
  }

  // Bass — root, on each beat, offbeat bounce
  if (isBuild || full) {
    const root = chord[0] - 12;
    for (let bei = 0; bei < 4; bei++) {
      addTone(left, right, barStart + bei * beat + beat * 0.5, beat * 0.45, noteHz(root), 0.22, "saw", 0.5, 0.005, 0.06);
    }
  }

  // Drums
  if (isBuild || full) {
    for (let bei = 0; bei < 4; bei++) addKick(barStart + bei * beat);
    for (let h = 0; h < 8; h++) addHat(barStart + h * (beat / 2) + beat / 2 * 0.5, full ? 0.2 : 0.12);
  } else {
    // intro: soft kick on 1 and 3
    addKick(barStart);
    addKick(barStart + 2 * beat);
  }

  // Bright pluck arpeggio in the full section for energy/sparkle
  if (full) {
    const arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12];
    for (let s = 0; s < 8; s++) {
      const semi = arp[s % arp.length];
      addTone(left, right, barStart + s * (beat / 2), beat / 2 * 0.9, noteHz(semi), 0.10, "tri", s % 2 ? 0.7 : 0.3, 0.004, 0.12);
    }
  }
}

// Master: gentle fade in/out + soft limiter
const fadeIn = Math.floor(0.4 * SR);
const fadeOut = Math.floor(1.6 * SR);
function master(buf) {
  for (let i = 0; i < N; i++) {
    let g = 1;
    if (i < fadeIn) g = i / fadeIn;
    if (i > N - fadeOut) g = Math.min(g, (N - i) / fadeOut);
    let v = buf[i] * g * 0.85;
    // soft clip
    v = Math.tanh(v * 1.2);
    buf[i] = v;
  }
}
master(left);
master(right);

// Write 16-bit stereo WAV
const bytesPerSample = 2;
const dataSize = N * 2 * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(SR, 24);
buffer.writeUInt32LE(SR * 2 * bytesPerSample, 28);
buffer.writeUInt16LE(2 * bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);
let off = 44;
for (let i = 0; i < N; i++) {
  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), off); off += 2;
  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), off); off += 2;
}
const out = path.join(process.cwd(), "public", "audio", "promo.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buffer);
console.log(`Wrote ${out} (${(buffer.length / 1e6).toFixed(2)} MB, ${DURATION}s @ ${BPM} BPM)`);
