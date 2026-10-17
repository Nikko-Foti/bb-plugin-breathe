import { breathAt, drawWave, readTiming, stardustAt, type Timing } from '../lib/breath';
import { PixelCanvas, raster, svg } from './pixel-canvas';
export type Settings = Timing & { enabled: boolean; still: boolean };
export function settingsOf(value?: unknown): Settings {
  const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { ...readTiming(source), enabled: source.enabled !== false, still: source.still === true };
}
export type Scene = { elapsed: number; canvas: PixelCanvas };
export function createScene(): Scene { return { elapsed: 0, canvas: new PixelCanvas(180, 92) }; }
export function advance(scene: Scene, delta: number, settings: Settings) {
  if (!settings.still && Number.isFinite(delta)) scene.elapsed += Math.min(250, Math.max(0, delta));
}
export function phaseOf(scene: Scene, settings: Settings) { return settings.still ? 'Still' : breathAt(scene.elapsed, settings).phase; }
export function frame(scene: Scene, settings: Settings, columns = 72, rows = 18) {
  const phase = breathAt(scene.elapsed, settings);
  drawWave(scene.canvas.canvas(), settings.still ? .5 : phase.amount, [], stardustAt(scene.elapsed, settings, settings.still));
  return { svg: svg(scene.canvas), raster: raster(scene.canvas, columns, rows), phase: phaseOf(scene, settings) };
}
