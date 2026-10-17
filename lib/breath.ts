import { waveColors, type PaletteId, type WaveColors } from './palettes';
export type Timing = { inhale: number; hold: number; exhale: number };
export type Phase = "breathe in" | "hold" | "breathe out";
export const DEFAULT_TIMING: Timing = { inhale: 4, hold: 7, exhale: 8 };
export function readTiming(values?: Record<string, unknown>): Timing {
  const read = (key: keyof Timing, min: number) => {
    const n = values?.[key];
    return typeof n === "number" && Number.isInteger(n) && n >= min && n <= 30 ? n : DEFAULT_TIMING[key];
  };
  return { inhale: read("inhale", 1), hold: read("hold", 0), exhale: read("exhale", 1) };
}
export function breathAt(elapsedMs: number, timing: Timing): { phase: Phase; amount: number } {
  const t = (Math.max(0, elapsedMs) / 1000) % (timing.inhale + timing.hold + timing.exhale);
  if (t < timing.inhale) return { phase: "breathe in", amount: ease(t / timing.inhale) };
  if (t < timing.inhale + timing.hold) return { phase: "hold", amount: 1 };
  return { phase: "breathe out", amount: ease(1 - (t - timing.inhale - timing.hold) / timing.exhale) };
}
function ease(value: number) { return (1 - Math.cos(Math.PI * value)) / 2; }
export type Stardust = { seconds: number; strength: number; sparkles: number; pulse: number };
/** Gather light on inhale, sustain Stardust on hold, and release it on exhale. */
export function stardustAt(elapsedMs: number, timing: Timing, still = false): Stardust {
  if (still) return { seconds: 1.2, strength: .7, sparkles: .7, pulse: .5 };
  // Keep the particle clock continuous through every phase boundary.
  const seconds = Math.max(0, elapsedMs) / 1000;
  const t = seconds % (timing.inhale + timing.hold + timing.exhale);
  if (t < timing.inhale) {
    const progress = t / timing.inhale;
    return { seconds, strength: ease(progress), sparkles: ease(Math.max(0, progress * 3 - 2)), pulse: 1 };
  }
  const held = Math.min(t - timing.inhale, timing.hold);
  const pulse = .5 + .5 * Math.cos(held * Math.PI * 2 / 3.2);
  if (t < timing.inhale + timing.hold) return { seconds, strength: 1, sparkles: 1, pulse };
  const progress = (t - timing.inhale - timing.hold) / timing.exhale;
  return { seconds, strength: 1 - ease(progress), sparkles: 1 - ease(Math.min(1, progress / .6)), pulse };
}
/** Half CSS resolution produces crisp square pixels. */
export type Ripple = { x: number; y: number; progress: number; still?: boolean };
export function drawWave(canvas: HTMLCanvasElement, amount: number, ripples: readonly Ripple[] = [], stardust?: Stardust, mode: 'light' | 'dark' = 'dark', palette: PaletteId = 'lavender') {
  const w = Math.max(1, Math.round(canvas.clientWidth / 2));
  const h = Math.max(1, Math.round(canvas.clientHeight / 2));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const light = mode === 'light';
  // On paper, put the deepest ink at the crest and let the baseline recede.
  const ink = waveColors(palette, mode);
  const colors = ink.bands;
  // Extra transparent canvas above the button gives sparks room without moving the wave or composer.
  const headroom = 14, waveHeight = Math.max(1, h - headroom);
  const cx = Math.floor(w / 2), base = headroom + Math.floor(waveHeight * .78);
  const left = Math.floor(w * .1), right = Math.floor(w * .9);
  const spread = w * (.095 + .085 * amount), height = waveHeight * .6 * amount;
  const seconds = stardust?.seconds ?? 0, glow = stardust?.strength ?? 0;
  const sparkles = stardust?.sparkles ?? 0, pulse = stardust?.pulse ?? 0;
  const pixel = (x: number, y: number, color: string, width = 2, height = 2) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), width, height);
  };
  if (glow > 0) {
    ctx.save();
    ctx.translate(cx, base - height * .6);
    ctx.scale(w * .37, height * .9 + 5);
    const halo = ctx.createRadialGradient(0, 0, .05, 0, 0, 1);
    const alpha = glow * (.06 + pulse * .09);
    halo.addColorStop(0, `rgba(${ink.halo},${alpha})`);
    halo.addColorStop(.43, `rgba(${ink.halo},${alpha * .56})`);
    halo.addColorStop(1, `rgba(${ink.halo},0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  for (let x = left; x < right; x += 3) {
    const top = base - Math.exp(-(((x - cx) / spread) ** 2)) * height;
    for (let y = base - 3; y > top; y -= 3) {
      const ratio = (base - y) / Math.max(1, height);
      pixel(x, y, colors[ratio > .74 ? 3 : ratio > .42 ? 2 : ratio > .18 ? 1 : 0]!);
      if (glow > 0) {
        const twinkle = Math.sin((x - left) / 3 * 8.79 + y * 2.27 + seconds * 1.65);
        ctx.globalAlpha = (light ? 0 : glow * (.07 + .18 * pulse))
          + sparkles * Math.max(0, twinkle) ** 18 * (light ? .23 : .53) * Math.min(1, ratio + .2);
        pixel(x, y, ink.shimmer);
        ctx.globalAlpha = 1;
      }
    }
  }
  // A single shared baseline remains when the wave and dot settle completely.
  for (let x = left; x < right; x += 3) pixel(x, base, colors[0]!);
  pixel(cx - 1, base - height - 5 * amount, ink.dot);
  if (sparkles > 0) {
    ctx.save();
    ctx.shadowColor = ink.shadow;
    ctx.shadowBlur = 3;
    for (let i = 0; i < 5; i++) {
      const life = (seconds * .2 + i * .213) % 1;
      const x = cx + Math.sin(i * 2.45) * w * .13 + Math.sin(life * 2.9 + i) * 2;
      const birth = base - Math.exp(-(((x - cx) / spread) ** 2)) * height - 4;
      ctx.globalAlpha = Math.sin(Math.PI * life) ** 2 * sparkles * .75;
      pixel(x, Math.max(1, birth - life * 14), ink.spark, i % 2 ? 1 : 1.5, i % 2 ? 1 : 1.5);
    }
    ctx.restore();
  }
  drawRipples(ctx, w, waveHeight, ripples, headroom, ink);
}

/** Soft concentric rings sampled on the same pixel grid as the breathing wave. */
function drawRipples(ctx: CanvasRenderingContext2D, w: number, h: number, ripples: readonly Ripple[], offsetY: number, ink: WaveColors) {
  for (const ripple of ripples) {
    const p = ripple.progress;
    const radius = ripple.still ? 12 : 2 + (1 - (1 - p) ** 2) * 83;
    const fade = (1 - p) ** 1.6;
    for (let x = 1; x < w; x += 3) {
      for (let y = 1; y < h; y += 3) {
        const distance = Math.hypot(x - ripple.x * w, (y - ripple.y * h) * 1.65);
        let light = 0;
        for (let ring = 0; ring < (ripple.still ? 1 : 3); ring++) {
          const front = radius - ring * 9;
          if (front <= 0) continue;
          const delta = (distance - front) / (1.5 + ring * .35);
          light += Math.exp(-delta * delta) * (1 - ring * .24);
        }
        // A faint wider halo softens the edge without blurring the square pixels.
        const halo = Math.exp(-(((distance - radius) / 5) ** 2)) * .15;
        const edge = Math.min(1, x / 7, (w - x) / 7, y / 5, (h - y) / 5);
        const alpha = Math.min(.85, (light + halo) * fade) * edge;
        if (alpha < .015) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ink.ripple[light > .65 ? 0 : 1];
        ctx.fillRect(x, y + offsetY, 2, 2);
      }
    }
  }
  ctx.globalAlpha = 1;
}
