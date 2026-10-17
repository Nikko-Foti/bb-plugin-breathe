import { expect, it } from 'vitest';
import { createFakePluginHost } from '@get-bb/plugin-sdk/testing';
import plugin from './server';
it('saves a validated settings patch atomically and preserves every untouched setting', async () => {
  const { bb, harness } = createFakePluginHost({ pluginId: 'breathe', settings: { inhale: 6, hold: 0, exhale: 9 } });
  plugin(bb);
  try {
    const expected = { enabled: false, inhale: 6, hold: 0, exhale: 9 };
    expect(await harness.behavior.callRpc('saveSettings', { enabled: false })).toEqual(expected);
    for (const invalid of [{ inhale: 0, enabled: true }, { hold: -1 }, { exhale: 31 }, { inhale: 1.5 }, { animation: 'unknown' }, { enabled: 'yes' }, { extra: true }]) {
      await expect(harness.behavior.callRpc('saveSettings', invalid)).rejects.toThrow();
      expect(await harness.behavior.callRpc('saveSettings', {})).toEqual(expected);
    }
    const reloaded = await harness.lifecycle.reload(plugin);
    try { expect(await reloaded.harness.behavior.callRpc('saveSettings', {})).toEqual(expected); }
    finally { await reloaded.harness.lifecycle.dispose(); }
  } finally { await harness.lifecycle.dispose(); }
});
