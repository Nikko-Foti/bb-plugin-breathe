export const PALETTE_IDS = ['lavender', 'ocean', 'sage', 'rose', 'amber'] as const;
export type PaletteId = typeof PALETTE_IDS[number];
export type WaveColors = {
  bands: readonly [string, string, string, string];
  halo: string;
  dot: string;
  shimmer: string;
  spark: string;
  shadow: string;
  ripple: readonly [string, string];
  text: string;
};
type Palette = { id: PaletteId; name: string; light: WaveColors; dark: WaveColors };

// Shared sRGB tokens keep Canvas, SVG, and terminal output consistent.
// New ramps were balanced in OKLCH; see docs/color-research.md.
export const PALETTES: readonly Palette[] = [
  {
    id: 'lavender', name: 'Lavender',
    dark: { bands: ['#292538', '#4d446e', '#9281bf', '#d2c6ed'], halo: '162,128,235', dot: '#eee7ff', shimmer: '#f1e5ff', spark: '#f1e5ff', shadow: '#d9b8ff', ripple: ['#eee7ff', '#b4a0e2'], text: '#b8accb' },
    light: { bands: ['#b6a1cc', '#a481c6', '#8352b3', '#633592'], halo: '162,128,235', dot: '#633592', shimmer: '#f1e5ff', spark: '#8352b3', shadow: '#b486d2', ripple: ['#633592', '#8352b3'], text: '#715c85' },
  },
  {
    id: 'ocean', name: 'Ocean',
    dark: { bands: ['#1d2b34', '#294c60', '#5d94b3', '#aad1e8'], halo: '85,169,214', dot: '#dceefa', shimmer: '#d2ecfc', spark: '#d2ecfc', shadow: '#94cdee', ripple: ['#dceefa', '#94cdee'], text: '#9eb9c9' },
    light: { bands: ['#91b4c9', '#6097b7', '#29749a', '#134e6a'], halo: '85,169,214', dot: '#134e6a', shimmer: '#d2ecfc', spark: '#29749a', shadow: '#6097b7', ripple: ['#134e6a', '#29749a'], text: '#3c5d70' },
  },
  {
    id: 'sage', name: 'Sage',
    dark: { bands: ['#202c22', '#394e3d', '#75967b', '#bad2be'], halo: '124,172,133', dot: '#e0f0e3', shimmer: '#d8efdc', spark: '#d8efdc', shadow: '#accfb2', ripple: ['#e0f0e3', '#accfb2'], text: '#a8b9ab' },
    light: { bands: ['#9fb5a2', '#78997e', '#4e7757', '#315038'], halo: '124,172,133', dot: '#315038', shimmer: '#d8efdc', spark: '#4e7757', shadow: '#78997e', ripple: ['#315038', '#4e7757'], text: '#4a5e4e' },
  },
  {
    id: 'rose', name: 'Rose',
    dark: { bands: ['#342426', '#623b42', '#b77883', '#ecbcc3'], halo: '217,128,145', dot: '#fbe5e8', shimmer: '#fedfe3', spark: '#fedfe3', shadow: '#f2afba', ripple: ['#fbe5e8', '#f2afba'], text: '#ccaaaf' },
    light: { bands: ['#cca1a8', '#ba7b86', '#9c5161', '#6b343f'], halo: '217,128,145', dot: '#6b343f', shimmer: '#fedfe3', spark: '#9c5161', shadow: '#ba7b86', ripple: ['#6b343f', '#9c5161'], text: '#724c52' },
  },
  {
    id: 'amber', name: 'Amber',
    dark: { bands: ['#30271b', '#584426', '#a78657', '#dfc6a5'], halo: '197,149,79', dot: '#f5e9d9', shimmer: '#f6e5cf', spark: '#f6e5cf', shadow: '#e1be8e', ripple: ['#f5e9d9', '#e1be8e'], text: '#c3b19a' },
    light: { bands: ['#c0aa8c', '#aa895a', '#8b6324', '#5f4110'], halo: '197,149,79', dot: '#5f4110', shimmer: '#f6e5cf', spark: '#8b6324', shadow: '#aa895a', ripple: ['#5f4110', '#8b6324'], text: '#685439' },
  },
];
export function readPalette(value: unknown): PaletteId {
  return PALETTE_IDS.includes(value as PaletteId) ? value as PaletteId : 'lavender';
}
export function waveColors(palette: PaletteId = 'lavender', mode: 'light' | 'dark' = 'dark'): WaveColors {
  return (PALETTES.find(item => item.id === palette) ?? PALETTES[0]!)[mode];
}
