import { expect, mock, test } from 'claude-code/testing';

const BAND = { plugin: 'breathe', component: 'AbovePrompt', requestId: 'above-prompt', viewport: { columns: 100, rows: 32, isFullscreen: true }, props: { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 80, scroll: { offset: 0, bodyRows: 12 }, view: {} } } as const;
const PANE = { plugin: 'breathe', component: 'Pane', requestId: 'breathe-settings', viewport: { columns: 100, rows: 40 }, props: { title: 'Breathe', isFocused: true, bodyColumns: 52, placement: 'inline', scroll: { offset: 0, bodyRows: 28 }, view: {} } } as const;
const initial = { enabled: true, inhale: 6, hold: 7, exhale: 8, still: false };

function setup(on, options = {}) {
  const calls = { ticks: 0 };
  const clock = mock.clock((name, handler) => on(name, ($, e, next) => { if (name === 'clock.every') calls.ticks++; return handler($, e, next); }));
  const saved = new Map([['settings', options.saved ?? { ...initial }]]);
  const writes = [];
  const closes = [];
  const fail = { read: !!options.readFailure, write: !!options.writeFailure, close: !!options.closeFailure };
  on('store.get', ($, e) => fail.read ? { deny: 'offline' } : { value: saved.get(e.key) });
  on('store.set', ($, e) => {
    if (fail.write) return { deny: 'offline' };
    writes.push(e.value); saved.set(e.key, e.value); return { value: undefined };
  });
  on('command.register', () => ({ value: undefined }));
  on('ui.open', () => ({ value: { isPlaced: true } }));
  on('ui.panes', () => ({ value: options.retainedPane ? [{ id: 'breathe-settings', title: 'Breathe', isShown: true, isPlaced: true, isFocused: true }] : [] }));
  on('ui.close', ($, e) => { if (fail.close) return { deny: 'blocked' }; closes.push(e.id); return { value: undefined }; });
  on('session.start', () => ({ cwd: '/work' }));
  on('classic.SessionStart', () => ({}));
  on('session.end', () => ({ sessionId: 'test' }));
  on('session.detach', ($, e) => ({ clientId: e.clientId }));
  on('turn.start', ($, e) => ({ turnId: e.turnId }));
  on('turn.complete', ($, e) => ({ text: e.answer }));
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['other mod'] }));
  return { clock, saved, writes, closes, fail, calls };
}
async function start($) { await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' }); }

test('terminal and Desktop draw real changing scenes, preserve other mods, and stop on completion', async ($, on) => {
  const { clock } = setup(on);
  await start($); await $.turn.start({ text: 'probe', turnId: 'main' });
  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' });
  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' });
  const first = await terminal.find({ type: 'Raster' });
  expect(first?.props.columns).toBe(36);
  expect(first?.props.rows).toBe(9);
  expect(await desktop.find({ type: 'Svg' })).toBeDefined();
  expect(await desktop.find({ type: 'Text', text: 'other mod' })).toBeDefined();
  await clock.advance(1000);
  expect((await terminal.find({ type: 'Raster' }))?.props.cells).not.toBe(first?.props.cells);
  await $.turn.complete({ turnId: 'child', agentId: 'child-agent', answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer' });
  expect(await terminal.find({ type: 'Raster' })).toBeDefined();
  await $.turn.complete({ turnId: 'main', answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer' });
  await clock.advance(1000);
  expect(await terminal.find({ type: 'Raster' })).toBeUndefined();
  expect(await desktop.find({ type: 'Svg' })).toBeUndefined();
  expect(await terminal.find({ type: 'Text', text: 'other mod' })).toBeDefined();
  await terminal.unmount(); await desktop.unmount();
});

test('preview is a draft; Apply persists and closes, including zero hold', async ($, on) => {
  const { saved, writes, closes } = setup(on);
  await start($);
  await $.command.run({ command: 'breathe', args: '' });
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
    await ui.press({ key: 'unwind' });
  expect(writes).toHaveLength(0);
  expect(saved.get('settings')).toEqual(initial);
  await ui.press({ key: 'apply' });
  expect(writes).toHaveLength(1);
  expect(saved.get('settings')).toEqual({ ...initial, inhale: 4, hold: 0, exhale: 6 });
  expect(closes).toEqual(['breathe-settings']);
  await ui.unmount();
});

test('a failed save retains the draft and can be retried', async ($, on) => {
  const { fail, writes, closes } = setup(on, { writeFailure: true });
  await start($); await $.command.run({ command: 'breathe', args: '' });
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' });
  await ui.press({ key: 'motion' }); await ui.press({ key: 'apply' });
  expect(writes).toHaveLength(0); expect(closes).toHaveLength(0);
  expect(await ui.find({ type: 'Text', text: /Could not save/ })).toBeDefined();
  fail.write = false; await ui.press({ key: 'apply' });
  expect(writes).toHaveLength(1); expect(writes[0].still).toBe(true);
  expect(closes).toHaveLength(1); await ui.unmount();
});

test('surveys pause the banner, resuming preserves the scene, and Hide lasts only for the current turn', async ($, on) => {
  const { clock } = setup(on);
  await start($); await $.turn.start({ text: 'probe', turnId: 'main' });
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' });
  await clock.advance(4000);
  const before = (await ui.find({ type: 'Raster' }))?.props.cells;
  await ui.redraw({ ...BAND.props, hasSurvey: true });
  expect(await ui.find({ type: 'Raster' })).toBeUndefined();
  await clock.advance(20000);
  await ui.redraw(BAND.props);
  expect((await ui.find({ type: 'Raster' }))?.props.cells).toBe(before);
  await ui.press({ key: 'hide' });
  expect(await ui.find({ type: 'Raster' })).toBeUndefined();
  await $.turn.start({ text: 'next', turnId: 'next' });
  expect(await ui.find({ type: 'Raster' })).toBeDefined();
  expect((await ui.find({ type: 'Raster' }))?.props.cells).not.toBe(before);
  await ui.unmount();
});

test('invalid duration cannot save Undo restores every setting', async ($, on) => {
  const { saved, writes, closes } = setup(on);
  await start($); await $.command.run({ command: 'breathe', args: '' });
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
    for (const value of ['', '1.5', '-1', '31', 'NaN']) {
    await ui.input({ key: 'inhale', text: value, kind: 'change' });
    await ui.press({ key: 'apply' });
    expect(await ui.find({ type: 'Text', text: /whole seconds/ })).toBeDefined();
    expect(writes).toHaveLength(0); expect(closes).toHaveLength(0);
  }
  await ui.press({ key: 'apply' });
  expect(writes).toHaveLength(0);
  await ui.press({ key: 'enabled' }); await ui.press({ key: 'motion' }); await ui.press({ key: 'undo' }); await ui.press({ key: 'apply' });
  expect(saved.get('settings')).toEqual(initial); expect(closes).toHaveLength(1);
  await ui.unmount();
});

test('Close discards draft changes and preview Replay leaves the active world untouched', async ($, on) => {
  const { clock, saved, writes } = setup(on);
  await start($); await $.turn.start({ text: 'probe', turnId: 'main' });
  const banner = await $.ui.mount({ ...BAND, surface: 'terminal' });
  await clock.advance(8000);
  const before = (await banner.find({ type: 'Raster' }))?.props.cells;
  await $.command.run({ command: 'breathe', args: '' });
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' });
  await pane.press({ key: 'replay' });
  expect((await banner.find({ type: 'Raster' }))?.props.cells).toBe(before);
  await pane.press({ key: 'motion' }); await pane.press({ key: 'close' });
  expect(writes).toHaveLength(0); expect(saved.get('settings')).toEqual(initial);
  expect(await pane.find({ type: 'Raster' })).toBeUndefined();
  await $.command.run({ command: 'breathe', args: '' });
  expect(await pane.find({ key: 'motion' })).toBeDefined();
  expect((await pane.find({ key: 'motion' }))?.props.label).toBe('Animated');
  await pane.unmount(); await banner.unmount();
});

test('Still mode freezes frames and disabling the plugin hides the banner without losing preview', async ($, on) => {
  const { clock } = setup(on, { saved: { ...initial, still: true } });
  await start($); await $.turn.start({ text: 'probe', turnId: 'main' });
  const banner = await $.ui.mount({ ...BAND, surface: 'desktop' });
  const first = (await banner.find({ type: 'Svg' }))?.props.source;
  await clock.advance(20000);
  expect((await banner.find({ type: 'Svg' }))?.props.source).toBe(first);
  await $.command.run({ command: 'breathe', args: '' });
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' });
  await pane.press({ key: 'enabled' }); await pane.press({ key: 'apply' });
  expect(await banner.find({ type: 'Svg' })).toBeUndefined();
  await $.command.run({ command: 'breathe', args: '' });
  expect(await pane.find({ type: 'Svg' })).toBeDefined();
  expect((await pane.find({ key: 'enabled' }))?.props.label).toBe('Off');
  await pane.unmount(); await banner.unmount();
});

test('a read failure blocks saving defaults over existing settings until Retry succeeds', async ($, on) => {
  const { fail, saved, writes } = setup(on, { readFailure: true });
  await start($); await $.command.run({ command: 'breathe', args: '' });
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(await pane.find({ type: 'Text', text: /Could not load/ })).toBeDefined();
  await pane.press({ key: 'apply' }); expect(writes).toHaveLength(0);
  fail.read = false; await pane.press({ key: 'retry-load' });
  expect((await pane.find({ key: 'motion' }))?.props.label).toBe('Animated');
  await pane.press({ key: 'apply' }); expect(saved.get('settings')).toEqual(initial);
  await pane.unmount();
});

test('resumes from a mid-turn load, respects a narrow viewport, and recovers after clear', async ($, on) => {
  const { clock } = setup(on);
  await start($);
  // No turn.start after a plugin reload: the live render state is sufficient.
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' });
  const before = (await ui.find({ type: 'Raster' }))?.props.cells;
  await clock.advance(1000);
  expect((await ui.find({ type: 'Raster' }))?.props.cells).not.toBe(before);
  await ui.redraw({ ...BAND.props, bodyColumns: 18, maxRows: 4 });
  expect(await ui.find({ type: 'Raster' })).toBeUndefined();
  expect(await ui.find({ type: 'Text', text: 'other mod' })).toBeDefined();
  await $.session.end({ reason: 'clear' });
  await $.classic.SessionStart({ source: 'clear' });
  await $.turn.start({ text: 'after clear', turnId: 'after-clear' });
  await ui.redraw(BAND.props);
  expect(await ui.find({ type: 'Raster' })).toBeDefined();
  await $.turn.complete({ turnId: 'after-clear', answer: '', durationMs: 100, isAborted: true, reason: 'aborted' });
  expect(await ui.find({ type: 'Raster' })).toBeUndefined();
  await ui.unmount();
});

test('one timer advances the breathing phase once with two simultaneous surfaces', async ($, on) => {
  const { clock } = setup(on, { saved: { ...initial, inhale: 4, hold: 7, exhale: 8 } });
  await start($); await $.turn.start({ text: 'probe', turnId: 'main' });
  const a = await $.ui.mount({ ...BAND, surface: 'terminal' });
  const b = await $.ui.mount({ ...BAND, surface: 'desktop' });
  await clock.advance(3000);
  expect(await a.find({ type: 'Text', text: 'breathe in' })).toBeDefined();
  expect(await b.find({ type: 'Text', text: 'breathe in' })).toBeDefined();
  await clock.advance(1000);
  expect(await a.find({ type: 'Text', text: 'hold' })).toBeDefined();
  await a.unmount(); await b.unmount();
});

test('retained panes recover after reload, while headless commands never animate', async ($, on) => {
  const { clock, calls } = setup(on, { retainedPane: true });
  await $.session.start({ surface: null, isInteractive: false, cwd: '/work' });
  await $.command.run({ command: 'breathe', args: '' });
  await clock.advance(2000); expect(calls.ticks).toBe(0);
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(await pane.find({ key: 'apply' })).toBeDefined();
  await clock.advance(100); expect(calls.ticks).toBeGreaterThan(0);
  await pane.unmount(); await clock.advance(1500);
  const stopped = calls.ticks; await clock.advance(2000); expect(calls.ticks).toBe(stopped);
});

test('a retained pane can render on startup without reopening its command', async ($, on) => {
  setup(on, { retainedPane: true }); await start($);
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' });
  expect(await pane.find({ key: 'apply' })).toBeDefined(); await pane.unmount();
});

test('compaction preserves Hide and a detached surface stops its clock', async ($, on) => {
  const { clock, calls } = setup(on); await start($); await $.turn.start({ text: 'x', turnId: 'main' });
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' }); await ui.press({ key: 'hide' });
  await $.classic.SessionStart({ source: 'compact' }); await ui.redraw();
  expect(await ui.find({ type: 'Svg' })).toBeUndefined();
  await $.turn.start({ text: 'x', turnId: 'next' }); await clock.advance(100);
  await ui.unmount(); await $.session.detach({ surface: 'desktop', clientId: 'd1', reason: 'detach' });
  const stopped = calls.ticks; await clock.advance(2000); expect(calls.ticks).toBe(stopped);
});

test('Apply merges the changed fields with settings changed by another session', async ($, on) => {
  const { saved } = setup(on); await start($); await $.command.run({ command: 'breathe', args: '' });
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' });
  saved.set('settings', { ...initial, enabled: false, hold: 0 });
  await pane.press({ key: 'motion' }); await pane.press({ key: 'apply' });
  expect(saved.get('settings')).toEqual({ ...initial, still: true, enabled: false, hold: 0 });
  await pane.unmount();
});

test('a rejected close keeps the saved panel visible with feedback and permits retry', async ($, on) => {
  const { fail, writes, closes } = setup(on, { closeFailure: true });
  await start($); await $.command.run({ command: 'breathe', args: '' });
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' });
  await pane.press({ key: 'motion' }); await pane.press({ key: 'apply' });
  expect(writes).toHaveLength(1); expect(closes).toHaveLength(0);
  expect(await pane.find({ type: 'Text', text: /Saved. Close/ })).toBeDefined();
  expect(await pane.find({ type: 'Raster' })).toBeDefined();
  fail.close = false; await pane.press({ key: 'close' });
  expect(await pane.find({ type: 'Raster' })).toBeUndefined(); await pane.unmount();
});

test('settings panes retained across clear and resume recover their content', async ($, on) => {
  setup(on, { retainedPane: true }); await start($);
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' });
  await pane.press({ key: 'motion' });
  await $.session.end({ reason: 'clear' });
  await $.classic.SessionStart({ source: 'clear' }); await pane.redraw();
  expect(await pane.find({ key: 'apply' })).toBeDefined();
  expect((await pane.find({ key: 'motion' }))?.props.label).toBe('Animated');
  await $.classic.SessionStart({ source: 'resume' }); await pane.redraw();
  expect(await pane.find({ key: 'apply' })).toBeDefined(); await pane.unmount();
});

function controlsIn(node, out = {}) {
  if (node && typeof node === 'object') {
    if ((node.type === 'Button' || node.type === 'Input') && node.props?.key) out[node.props.key] = node.press;
    if (node.children) for (const child of node.children) controlsIn(child, out);
  }
  return out;
}
test('all continuously drawn Desktop controls retain their handles across 30 animation frames', async ($, on) => {
  const { clock } = setup(on); await start($);
  await $.command.run({ command: 'breathe', args: '' });
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' });
  const initialHandles = controlsIn(await ui.drawn());
  expect(initialHandles.enabled).toBeDefined();
  for (let i=0;i<30;i++) {
    await clock.advance(100);
    expect(controlsIn(await ui.drawn())).toEqual(initialHandles);
  }
  await ui.press({ key: 'enabled' });
  const afterEdit = controlsIn(await ui.drawn());
  expect(afterEdit.enabled).toEqual(initialHandles.enabled);
  expect(afterEdit.motion).toEqual(initialHandles.motion);
  const inputHandle = afterEdit.inhale;
  await clock.advance(1000);
  expect(controlsIn(await ui.drawn()).inhale).toEqual(inputHandle);
  await ui.input({ key: 'inhale', text: '9', kind: 'change' });
  expect((await ui.find({ key: 'inhale' }))?.props.value).toBe('9');
  await ui.press({ key: 'motion' });
  expect((await ui.find({ key: 'motion' }))?.props.label).toBe('Still');
  await ui.press({ key: 'motion' });
  expect((await ui.find({ key: 'motion' }))?.props.label).toBe('Animated');
  await ui.unmount();
});