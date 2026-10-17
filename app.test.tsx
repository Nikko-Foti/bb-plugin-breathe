// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@get-bb/plugin-sdk/testing/app';
import { BreatheSettings } from './components/breathe-settings';

// Rendering and timer lifecycles are covered by the real-canvas component suites.
vi.mock('./components/breathe-wave', () => ({ BreatheWave: ({ timing }: { timing: { inhale: number; hold: number; exhale: number } }) => <div data-testid="wave-preview">{timing.inhale}/{timing.hold}/{timing.exhale}</div> }));
const initial = { enabled: true, inhale: 4, hold: 7, exhale: 8 };
afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());
function mount(save = vi.fn(input => ({ ...initial, ...input })), onClose?: () => void) {
  return { save, view: renderSlot({ component: () => <BreatheSettings onClose={onClose} /> }, {}, { settings: initial, rpc: { saveSettings: save } }) };
}
it('uses one settings surface in the native composer popup and plugin settings', async () => {
  const app = await loadPluginApp(() => import('./app'));
  expect(app.composerCustomizations[0]?.scopes).toEqual(['thread']);
  expect(app.composerCustomizations[0]?.banners?.[0]?.chrome).toBe('bare');
  expect(app.composerCustomizations[0]?.experimental_popups?.[0]?.id).toBe('settings');
  expect(app.settingsSections[0]?.component).toBe(BreatheSettings);
});
it('previews presets without writing; Undo restores the saved settings', () => {
  const { view, save } = mount();
  fireEvent.click(view.getByRole('button', { name: /Unwind/ }));
  expect(view.getByTestId('wave-preview').textContent).toBe('4/0/6');
  expect(view.getByText('10s per breath')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(view.getByRole('button', { name: 'Undo' }));
  expect(view.getByTestId('wave-preview').textContent).toBe('4/7/8');
  expect(view.queryByRole('button', { name: 'Apply' })).toBeNull();
});
it('keeps a failed draft, retries only changed fields, and retains the successful result before realtime arrives', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Network failure')).mockImplementationOnce(input => ({ ...initial, ...input }));
  const close = vi.fn();
  const { view } = mount(save, close);
  fireEvent.change(view.getByLabelText('Hold seconds'), { target: { value: '0' } });
  fireEvent.click(view.getByRole('button', { name: 'Apply' }));
  await view.findByRole('alert');
  expect(close).not.toHaveBeenCalled();
  expect((view.getByLabelText('Hold seconds') as HTMLInputElement).value).toBe('0');
  fireEvent.click(view.getByRole('button', { name: 'Apply' }));
  await view.findByText('Saved', { selector: 'p[role="status"]' });
  expect(close).toHaveBeenCalledOnce();
  expect(save).toHaveBeenLastCalledWith({ hold: 0 });
  expect((view.getByLabelText('Hold seconds') as HTMLInputElement).value).toBe('0');
  fireEvent.click(view.getByRole('button', { name: 'Increase breathe in' }));
  fireEvent.click(view.getByRole('button', { name: 'Undo' }));
  expect((view.getByLabelText('Hold seconds') as HTMLInputElement).value).toBe('0');
});
it('validates custom values', () => {
  const { view, save } = mount();
  for (const value of ['', '-1', '31', '1.5']) {
    fireEvent.change(view.getByLabelText('Hold seconds'), { target: { value } });
    expect((view.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.getByLabelText('Hold seconds').getAttribute('aria-invalid')).toBe('true');
  }
  expect(view.getByLabelText('Hold seconds').getAttribute('aria-invalid')).toBe('true');
  expect(save).not.toHaveBeenCalled();
});
it('saves enablement without modifying untouched rhythm settings', async () => {
  const { view, save } = mount();
  fireEvent.click(view.getByRole('switch'));
  fireEvent.click(view.getByRole('button', { name: 'Apply' }));
  await view.findByText('Saved', { selector: 'p[role="status"]' });
  expect(save).toHaveBeenCalledWith({ enabled: false });
});
it('buttons and Enter save without submitting or triggering keyboard handlers on the host composer', async () => {
  const hostSubmit = vi.fn(event => event.preventDefault());
  const hostKey = vi.fn();
  const save = vi.fn(input => ({ ...initial, ...input }));
  const view = renderSlot({ component: () => <form onSubmit={hostSubmit} onKeyDown={hostKey}><BreatheSettings /></form> }, {}, { settings: initial, rpc: { saveSettings: save } });
  fireEvent.change(view.getByLabelText('Hold seconds'), { target: { value: '0' } });
  fireEvent.keyDown(view.getByLabelText('Hold seconds'), { key: 'Enter' });
  await view.findByText('Saved', { selector: 'p[role="status"]' });
  fireEvent.keyDown(view.getByRole('switch'), { key: 'Enter' });
  fireEvent.click(view.getByRole('button', { name: /Even/ }));
  fireEvent.click(view.getByRole('button', { name: 'Apply' }));
  await view.findByText('Saved', { selector: 'p[role="status"]' });
  expect(hostSubmit).not.toHaveBeenCalled(); expect(hostKey).not.toHaveBeenCalled();
});
it('locks edits while saving and does not double-submit', async () => {
  let finish!: (value: typeof initial) => void;
  const save = vi.fn(() => new Promise<typeof initial>(resolve => { finish = resolve; }));
  const close = vi.fn();
  const { view } = mount(save, close);
  fireEvent.click(view.getByRole('button', { name: /Even/ }));
  const apply = view.getByRole('button', { name: 'Apply' });
  fireEvent.click(apply); fireEvent.click(apply);
  expect(save).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  expect((view.getByLabelText('Hold seconds') as HTMLInputElement).disabled).toBe(true);
  await act(async () => finish({ ...initial, hold: 4, exhale: 4 }));
  await view.findByText('Saved', { selector: 'p[role="status"]' });
  expect(close).toHaveBeenCalledOnce();
});
