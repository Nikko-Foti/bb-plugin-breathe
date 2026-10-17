import { describe, expect, it } from 'vitest';
import { shouldShowScene } from './visibility';
describe('working-only visibility', () => {
  const working = { status: 'active', runtimeStatus: 'active', hasPendingInteraction: false };
  it('shows only during a connected active turn without pending input', () => {
    expect(shouldShowScene(working, 'connected', true, true)).toBe(true);
    for (const status of ['idle', 'starting', 'stopping', 'failed', 'unknown']) {
      expect(shouldShowScene({ ...working, status }, 'connected', true, true)).toBe(false);
    }
    for (const runtimeStatus of ['waiting-for-host', 'provisioning', 'stopping']) {
      expect(shouldShowScene({ ...working, runtimeStatus }, 'connected', true, true)).toBe(false);
    }
    expect(shouldShowScene({ ...working, hasPendingInteraction: true }, 'connected', true, true)).toBe(false);
    expect(shouldShowScene(working, 'reconnecting', true, true)).toBe(false);
    expect(shouldShowScene(undefined, 'connected', true, true)).toBe(false);
    expect(shouldShowScene(working, 'connected', false, true)).toBe(false);
    expect(shouldShowScene(working, 'connected', true, false)).toBe(false);
  });
});
