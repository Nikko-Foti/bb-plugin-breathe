import { expect, it } from 'vitest';
import { PALETTES, readPalette } from './palettes';
import { readBreatheSettings } from './settings';
function luminance(hex: string) {
  const rgb = hex.match(/[\da-f]{2}/gi)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
}
function contrast(a: string, b: string) {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light! + .05) / (dark! + .05);
}
it('keeps phase text readable and the crest distinct on representative host surfaces', () => {
  for (const palette of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      const colors = palette[mode];
      for (const background of mode === 'light' ? ['#ffffff', '#fafafa', '#f0f0f0'] : ['#141414', '#18181b', '#28282c']) {
        expect(contrast(colors.text, background), `${palette.id} ${mode} phase text on ${background}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.bands[3], background), `${palette.id} ${mode} crest on ${background}`).toBeGreaterThanOrEqual(3);
      }
      const lightness = colors.bands.map(luminance);
      expect(lightness).toEqual([...lightness].sort((a, b) => mode === 'dark' ? a - b : b - a));
    }
  }
});
it('loads old and invalid preferences as Lavender without altering saved timing', () => {
  for (const palette of [undefined, null, 'unknown', {}, 2]) {
    expect(readPalette(palette)).toBe('lavender');
    expect(readBreatheSettings({ palette, inhale: 6, hold: 0, exhale: 9 })).toEqual({ palette: 'lavender', enabled: true, inhale: 6, hold: 0, exhale: 9 });
  }
});
