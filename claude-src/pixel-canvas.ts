/** A small software surface for the shared pixel renderers, with no DOM or Node dependency. */
type Color = [number, number, number, number];
type Transform = { x: number; y: number; sx: number; sy: number };
class Gradient {
  stops: { offset: number; color: Color }[] = [];
  constructor(readonly x: number, readonly y: number, readonly radius: number, readonly transform: Transform) {}
  addColorStop(offset: number, color: string) {
    this.stops.push({ offset, color: parseColor(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }
  at(x: number, y: number): Color {
    const t = Math.min(1, Math.hypot((x - this.transform.x) / this.transform.sx - this.x, (y - this.transform.y) / this.transform.sy - this.y) / this.radius);
    const last = this.stops[this.stops.length - 1]!;
    let left = this.stops[0] ?? { offset: 0, color: [0, 0, 0, 0] as Color };
    for (const right of this.stops) {
      if (t <= right.offset) {
        const mix = Math.max(0, (t - left.offset) / (right.offset - left.offset || 1));
        return left.color.map((n, i) => n + (right.color[i]! - n) * mix) as Color;
      }
      left = right;
    }
    return last?.color ?? [0, 0, 0, 0];
  }
}
export function parseColor(value: string): Color {
  if (value[0] === '#') {
    const full = value.length === 4 ? value.slice(1).split('').map(c => c + c).join('') : value.slice(1);
    const color = parseInt(full, 16);
    return [(color >>> 16) & 255, (color >>> 8) & 255, color & 255, 1];
  }
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}
export class PixelCanvas {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  pixels: Uint8Array;
  private background: Color;
  private context: PixelContext;
  constructor(width: number, height: number, background = '#141319') {
    this.width = width; this.height = height;
    this.clientWidth = width * 2; this.clientHeight = height * 2;
    this.pixels = new Uint8Array(width * height * 3);
    this.background = parseColor(background);
    this.context = new PixelContext(this);
    this.clear(0, 0, width, height);
  }
  getContext() { return this.context; }
  /** The shared renderer uses only the canvas operations implemented below. */
  canvas() { return this as unknown as HTMLCanvasElement; }
  clear(x: number, y: number, width: number, height: number) { this.paint(x, y, width, height, this.background, 1); }
  paint(x: number, y: number, width: number, height: number, color: Color | Gradient, alpha: number) {
    for (let py = Math.max(0, Math.floor(y)); py < Math.min(this.height, Math.ceil(y + height)); py++) {
      for (let px = Math.max(0, Math.floor(x)); px < Math.min(this.width, Math.ceil(x + width)); px++) {
        const c = color instanceof Gradient ? color.at(px + .5, py + .5) : color;
        const a = Math.min(1, Math.max(0, c[3] * alpha));
        const i = (py * this.width + px) * 3;
        for (let channel = 0; channel < 3; channel++) this.pixels[i + channel] = Math.round(c[channel]! * a + this.pixels[i + channel]! * (1 - a));
      }
    }
  }
}
class PixelContext {
  private style: string | Gradient = '#000000';
  private color: Color | Gradient = [0, 0, 0, 1];
  globalAlpha = 1;
  imageSmoothingEnabled = false;
  // Canvas shadow is decorative. The shared renderer also paints explicit glow gradients.
  shadowBlur = 0;
  shadowColor = 'transparent';
  private transform: Transform = { x: 0, y: 0, sx: 1, sy: 1 };
  private stack: { transform: Transform; alpha: number; style: string | Gradient }[] = [];
  constructor(private target: PixelCanvas) {}
  get fillStyle() { return this.style; }
  set fillStyle(value: string | Gradient) { this.style = value; this.color = typeof value === 'string' ? parseColor(value) : value; }
  clearRect(x: number, y: number, w: number, h: number) { this.target.clear(x, y, w, h); }
  fillRect(x: number, y: number, w: number, h: number) {
    const t = this.transform;
    this.target.paint(t.x + x * t.sx, t.y + y * t.sy, w * t.sx, h * t.sy, this.color, this.globalAlpha);
  }
  createRadialGradient(x: number, y: number, _r0: number, _x1: number, _y1: number, radius: number) { return new Gradient(x, y, radius, { ...this.transform }); }
  save() { this.stack.push({ transform: { ...this.transform }, alpha: this.globalAlpha, style: this.style }); }
  restore() { const saved = this.stack.pop(); if (saved) { this.transform = saved.transform; this.globalAlpha = saved.alpha; this.fillStyle = saved.style; } }
  translate(x: number, y: number) { this.transform.x += x * this.transform.sx; this.transform.y += y * this.transform.sy; }
  scale(x: number, y: number) { this.transform.sx *= x; this.transform.sy *= y; }
}

function rgb(canvas: PixelCanvas, x: number, y: number): number {
  const index = (Math.min(canvas.height - 1, Math.max(0, y)) * canvas.width + Math.min(canvas.width - 1, Math.max(0, x))) * 3;
  return (canvas.pixels[index]! << 16) | (canvas.pixels[index + 1]! << 8) | canvas.pixels[index + 2]!;
}
export function raster(canvas: PixelCanvas, columns: number, rows: number) {
  const data = new Uint32Array(columns * rows * 3);
  // Area sampling preserves narrow tiles and gaps when the terminal has fewer
  // pixels than the scene. Nearest sampling aliases the three-pixel grid badly.
  const sample = (x: number, y: number) => {
    const left = x * canvas.width / columns, right = (x + 1) * canvas.width / columns;
    const top = y * canvas.height / (rows * 2), bottom = (y + 1) * canvas.height / (rows * 2);
    const sums = [0, 0, 0]; let total = 0;
    for (let py = Math.floor(top); py < Math.ceil(bottom); py++) for (let px = Math.floor(left); px < Math.ceil(right); px++) {
      const weight = (Math.min(right, px + 1) - Math.max(left, px)) * (Math.min(bottom, py + 1) - Math.max(top, py));
      const index = (Math.min(canvas.height - 1, py) * canvas.width + Math.min(canvas.width - 1, px)) * 3;
      for (let c = 0; c < 3; c++) sums[c]! += canvas.pixels[index + c]! * weight;
      total += weight;
    }
    return (Math.round(sums[0]! / total) << 16) | (Math.round(sums[1]! / total) << 8) | Math.round(sums[2]! / total);
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const i = (y * columns + x) * 3;
    data[i] = 0x2580;
    data[i + 1] = sample(x, y * 2);
    data[i + 2] = sample(x, y * 2 + 1);
  }
  // Explicit base64 keeps the bundle portable across both the mod runtime and Node tests.
  const bytes = new Uint8Array(data.buffer), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let cells = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    cells += alphabet[(n >>> 18) & 63]! + alphabet[(n >>> 12) & 63]! + (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[n & 63] : '=');
  }
  return { columns, rows, cells };
}
export function svg(canvas: PixelCanvas) {
  const paths = new Map<number, string[]>();
  // Eight levels per byte are below the pixel art's native palette contrast and bound SVG size.
  const quantized = (x: number, y: number) => rgb(canvas, x, y) & 0xf8f8f8;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width;) {
      const color = quantized(x, y), start = x++;
      while (x < canvas.width && quantized(x, y) === color) x++;
      const segments = paths.get(color) ?? [];
      segments.push(`M${start} ${y}h${x - start}`); paths.set(color, segments);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="184" viewBox="0 -.5 ${canvas.width} ${canvas.height}" shape-rendering="crispEdges">${[...paths].map(([color, lines]) => `<path stroke="#${color.toString(16).padStart(6, '0')}" d="${lines.join('')}"/>`).join('')}</svg>`;
}
