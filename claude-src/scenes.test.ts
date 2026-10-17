import { expect, it } from 'vitest';
import { createScene, advance, frame, phaseOf, settingsOf } from './scenes';
import { PixelCanvas, raster } from './pixel-canvas';
it('normalizes settings, omits scene selection, and freezes Still frames', () => {
  const config = settingsOf({ enabled: 'no', animation: 'volcano', inhale: 0, hold: 0, exhale: Infinity, still: true });
  expect(config).toEqual({ enabled: true, inhale: 4, hold: 0, exhale: 8, still: true });
  const scene = createScene(), before = frame(scene, config);
  advance(scene, 1000, config); expect(frame(scene, config)).toEqual(before);
  expect(scene.elapsed).toBe(0); expect(phaseOf(scene, config)).toBe('Still');
});
it('stays within payload limits through full breathing cycles and zero hold', () => {
  for (const timing of [{ inhale: 4, hold: 7, exhale: 8 }, { inhale: 1, hold: 0, exhale: 1 }, { inhale: 30, hold: 30, exhale: 30 }]) {
    const scene = createScene(), config = settingsOf(timing);
    for (let t=0;t<100000;t+=250) {
      advance(scene, 250, config); const output = frame(scene, config, 72, 18);
      expect(output.svg.length).toBeLessThan(75000); expect(output.raster.cells.length).toBe(72*18*16);
    }
  }
});

it('composites alpha, clears damage, and restores transform and paint state', () => {
  const canvas = new PixelCanvas(4, 4, '#000000'), ctx = canvas.getContext();
  ctx.fillStyle = '#ff0000'; ctx.globalAlpha = .5; ctx.fillRect(0, 0, 4, 4);
  ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 0, 4, 4);
  expect([...canvas.pixels.slice(0, 3)]).toEqual([64, 0, 128]);
  ctx.save(); ctx.translate(2, 2); ctx.scale(2, 2); ctx.globalAlpha = 1; ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 0, 1, 1); ctx.restore();
  expect([...canvas.pixels.slice(30, 33)]).toEqual([0, 255, 0]);
  expect(ctx.globalAlpha).toBe(.5); expect(ctx.fillStyle).toBe('#0000ff');
  ctx.clearRect(2, 2, 2, 2);
  expect([...canvas.pixels.slice(30, 33)]).toEqual([0, 0, 0]);
});

it('encodes little-endian one-cell half blocks with separate top and bottom colors', () => {
  const canvas = new PixelCanvas(1, 2, '#000000'), ctx = canvas.getContext();
  ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#abcdef'; ctx.fillRect(0, 1, 1, 1);
  const output = raster(canvas, 1, 1), data = Buffer.from(output.cells, 'base64');
  expect(data.length).toBe(12); expect(data.readUInt32LE(0)).toBe(0x2580);
  expect(data.readUInt32LE(4)).toBe(0x123456); expect(data.readUInt32LE(8)).toBe(0xabcdef);
});

it('keeps narrow pixel tiles visible when reducing to terminal cells', () => {
  const canvas = new PixelCanvas(6, 4, '#000000');
  const ctx = canvas.getContext(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 2, 2);
  const data = Buffer.from(raster(canvas, 1, 1).cells, 'base64');
  expect(data.readUInt32LE(4)).toBe(0x555555);
  expect(data.readUInt32LE(8)).toBe(0);
});

