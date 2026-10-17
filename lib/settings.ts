import { readTiming, type Timing } from './breath';

export type BreatheSettings = Timing & { enabled: boolean };
export type SettingsDraft = Partial<{ enabled: boolean; inhale: string; hold: string; exhale: string }>;
export const TIMING_FIELDS = [
  { key: 'inhale', label: 'Breathe in', min: 1 },
  { key: 'hold', label: 'Hold', min: 0 },
  { key: 'exhale', label: 'Breathe out', min: 1 },
] as const;
export const RHYTHMS = [
  { name: 'Classic', timing: { inhale: 4, hold: 7, exhale: 8 } },
  { name: 'Even', timing: { inhale: 4, hold: 4, exhale: 4 } },
  { name: 'Unwind', timing: { inhale: 4, hold: 0, exhale: 6 } },
] as const;
export function readBreatheSettings(values?: Record<string, unknown>): BreatheSettings {
  return { enabled: values?.enabled !== false, ...readTiming(values) };
}
export function resolveDraft(saved: BreatheSettings, draft: SettingsDraft) {
  const errors: Partial<Record<keyof Timing, string>> = {};
  const next = { ...saved, enabled: draft.enabled ?? saved.enabled };
  for (const { key, min } of TIMING_FIELDS) {
    const raw = draft[key] ?? String(saved[key]);
    const value = Number(raw);
    if (raw.trim() === '' || !Number.isInteger(value) || value < min || value > 30) errors[key] = `${min}–30 whole seconds`;
    else next[key] = value;
  }
  const patch: Partial<BreatheSettings> = {};
  for (const key of ['enabled', 'inhale', 'hold', 'exhale'] as const) {
    if (next[key] !== saved[key]) Object.assign(patch, { [key]: next[key] });
  }
  return { next, patch, errors, valid: Object.keys(errors).length === 0, dirty: Object.keys(patch).length > 0 || Object.keys(errors).length > 0 };
}
