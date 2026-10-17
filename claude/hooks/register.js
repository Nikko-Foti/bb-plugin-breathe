import { advance, createScene, frame, phaseOf, settingsOf, paletteOptions } from '../lib/scenes.js';

const PANE = 'breathe-settings';
let settings = settingsOf();
let draft = { ...settings };
let baseline = { ...settings };
let scene = createScene();
let preview = createScene();
let activeTurn = null;
let completed = false;
let dismissed = false;
let previewOpen = false;
let loaded = false;
let loadError = false;
let error = '';
let saving = false;
let timer;
let generation = 0;
let busy = false;
let last = null;
const visible = new Map();
const previews = new Map();
const controls = new Map();
let tick = 0;

// Keep live control handles while repainting. Desktop input can arrive after
// the next animation frame; replacing its callback every frame drops presses.
function controlsFor($, e) {
  const elements = $.ui.resolve(e);
  const site = `${e.surface}:${e.component}:${e.requestId}`;
  const previous = controls.get(site) ?? new Map();
  const current = new Map();
  controls.set(site, current);
  const control = (kind, props) => {
    const node = previous.get(props.key) ?? elements[kind](props);
    const { onPress, onInput, onSubmit, ...values } = props;
    const updated = { ...node, props: { ...node.props, ...values } };
    current.set(props.key, updated);
    return updated;
  };
  return { ...elements, Button: props => control('Button', props), Input: props => control('Input', props) };
}
function forgetControls(e) { controls.delete(`${e.surface}:${e.component}:${e.requestId}`); }

function stopClock() {
  generation++;
  if (timer) timer.cancel();
  timer = undefined; busy = false; last = null;
}
// Render leases expire if a surface stops drawing (hidden tab, collapse, detach).
// A command or retained but undrawn pane never starts a timer on its own.
function recentlyDrawn(views) { return [...views.values()].some(seen => tick - seen < 10); }
function activeVisible() { return !completed && !dismissed && settings.enabled && recentlyDrawn(visible); }
function previewVisible() { return previewOpen && recentlyDrawn(previews); }
function syncClock($) {
  if ((!activeVisible() || settings.still) && (!previewVisible() || draft.still)) { stopClock(); return; }
  if (timer) return;
  const mine = generation;
  timer = $.clock.every(100, async () => {
    if (busy || mine !== generation) return;
    busy = true;
    try {
      const now = await $.clock.now();
      if (mine !== generation) return;
      tick++;
      const delta = last === null ? 100 : now - last;
      last = now;
      if (activeVisible()) advance(scene, delta, settings);
      if (previewVisible()) advance(preview, delta, settingsOf(draft));
      $.ui.invalidate('ui.render');
      syncClock($);
    } finally { if (mine === generation) busy = false; }
  });
}
async function loadSettings($) {
  try { settings = settingsOf(await $.store.get('settings')); loaded = true; loadError = false; error = ''; }
  catch { loadError = true; error = 'Could not load settings. Retry before saving.'; }
}
async function openSettings($) {
  if (saving) return;
  await loadSettings($);
  draft = { ...settings }; baseline = { ...settings }; preview = createScene(); previewOpen = true;
  await $.ui.open({ id: PANE, title: 'Breathe', focus: true, closeOnEscape: true, rows: 32, columns: 54 });
  syncClock($);
  $.ui.invalidate('ui.render');
}
async function restorePane($) {
  previewOpen = (await $.ui.panes()).some(pane => pane.id === PANE);
  if (previewOpen) { draft = { ...settings }; baseline = { ...settings }; preview = createScene(); }
  previews.clear(); syncClock($); $.ui.invalidate('ui.render');
}
function edit($, patch) {
  if (saving) return;
  draft = { ...draft, ...patch }; error = loadError ? error : '';
  syncClock($); $.ui.invalidate('ui.render');
}
function validateDraft() {
  const result = { ...draft };
  for (const key of ['inhale', 'hold', 'exhale']) {
    const value = String(draft[key]);
    if (!/^\d+$/.test(value) || Number(value) < (key === 'hold' ? 0 : 1) || Number(value) > 30) return null;
    result[key] = Number(value);
  }
  return settingsOf(result);
}
function closed($) {
  previewOpen = false; previews.clear(); draft = { ...settings }; syncClock($); $.ui.invalidate('ui.render');
  for (const key of controls.keys()) if (key.includes(':Pane:')) controls.delete(key);
}
async function apply($) {
  if (saving || loadError) return;
  const next = validateDraft();
  if (!next) { error = 'Use whole seconds: inhale/exhale 1–30; hold 0–30.'; $.ui.invalidate('ui.render'); return; }
  saving = true; error = ''; $.ui.invalidate('ui.render');
  try {
    const latest = settingsOf(await $.store.get('settings'));
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== baseline[key]));
    const merged = { ...latest, ...patch };
    await $.store.set('settings', merged); settings = merged; draft = { ...merged }; baseline = { ...merged };
  }
  catch { error = 'Could not save. Your changes are still here; try again.'; saving = false; $.ui.invalidate('ui.render'); return; }
  saving = false;
  try { await $.ui.close({ id: PANE }); closed($); }
  catch { error = 'Saved. Close this panel when ready.'; }
  syncClock($);
  $.ui.invalidate('ui.render');
}
function drawing($, e, current, config, rows) {
  const { Text } = $.ui.resolve(e);
  const available = Math.max(1, Math.floor(e.props.bodyColumns ?? e.viewport.columns));
  const columns = Math.min(72, available, Math.max(8, rows * 4));
  const output = frame(current, config, columns, rows);
  if (e.surface === 'terminal') {
    const { Raster } = $.ui.resolve(e);
    return Raster({ key: e.component === 'Pane' ? 'preview' : 'scene', ...output.raster });
  }
  if (e.surface === 'desktop') {
    const { Box, Svg } = $.ui.resolve(e);
    const width = Math.min(360, available * 8);
    return Box({ key: 'scene-frame', width: '100%', flexDirection: 'row', justifyContent: 'center', children: [
      Svg({ source: output.svg, alt: 'A pixel breathing wave', width, height: width * 92 / 180 }),
    ] });
  }
  return Text({ children: [output.phase] });
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await loadSettings($);
    await restorePane($);
    await $.command.register({ name: 'breathe', description: 'Choose your wave color and breathing rhythm' });
    return next(e);
  }).catch(($, e, next) => next(e));
  on('classic.SessionStart', async ($, e, next) => {
    if (e.source !== 'startup') {
      await loadSettings($);
      if (e.source !== 'compact') { completed = false; dismissed = false; await restorePane($); }
    }
    return next(e);
  }).catch(($, e, next) => next(e));
  on('session.end', ($, e, next) => {
    stopClock(); visible.clear(); previews.clear(); activeTurn = null; completed = true; previewOpen = false; dismissed = false;
    controls.clear();
    scene = createScene(); preview = createScene();
    return next(e);
  }).catch(($, e, next) => next(e));
  on('session.detach', ($, e, next) => {
    for (const key of visible.keys()) if (key.startsWith(e.surface + ':')) visible.delete(key);
    for (const key of controls.keys()) if (key.startsWith(e.surface + ':')) controls.delete(key);
    previews.delete(e.surface); syncClock($); $.ui.invalidate('ui.render');
    return next(e);
  }).catch(($, e, next) => next(e));
  on('turn.start', ($, e, next) => {
    activeTurn = e.turnId; completed = false; dismissed = false;
    scene = createScene(); last = null;
    $.ui.invalidate('ui.render');
    return next(e);
  }).catch(($, e, next) => next(e));
  on('turn.complete', ($, e, next) => {
    if (!e.agentId && (activeTurn === null || activeTurn === e.turnId)) {
      activeTurn = null; completed = true; visible.clear(); syncClock($); $.ui.invalidate('ui.render');
    }
    return next(e);
  }).catch(($, e, next) => next(e));
  on('command.run', { command: 'breathe' }, async ($) => { await openSettings($); return {}; });
  on('ui.close', async ($, e, next) => {
    const result = await next(e);
    if (e.id === PANE && !result?.deny) closed($);
    return result;
  }).catch(($, e, next) => next(e));
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const other = await next(e);
    const show = e.props.isWorking && !e.props.hasSurvey && !e.props.view?.agentId && !completed && !dismissed && settings.enabled;
    const compact = e.props.bodyColumns < 24 || e.props.maxRows < 6;
    const key = e.surface + ':' + e.requestId;
    if (show && !compact) visible.set(key, tick); else visible.delete(key);
    syncClock($);
    if (!show) { forgetControls(e); return other; }
    const { Box, Button, Text } = controlsFor($, e);
    const rows = Math.max(2, Math.min(16, (e.props.maxRows ?? 16) - 3));
    return Box({ flexDirection: 'column', children: [
      Box({ flexDirection: 'row', columnGap: 1, children: [
        Button({ key: 'settings', label: 'Breathe', plain: true, onPress: () => openSettings($) }),
        Button({ key: 'hide', label: 'Hide', plain: true, dimColor: true, onPress: () => { dismissed = true; syncClock($); $.ui.invalidate('ui.render'); } }),
      ] }),
      ...(compact ? [] : [drawing($, e, scene, settings, rows)]),
      Text({ dimColor: true, children: [phaseOf(scene, settings)] }),
      ...(other ? [other] : []),
    ] });
  }).catch(($, e, next) => next(e));
  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE || !previewOpen) { forgetControls(e); return next(e); }
    if (!loaded && !loadError) { await loadSettings($); draft = { ...settings }; }
    previews.set(e.surface, tick); syncClock($);
    const { Box, Button, Input, Text } = controlsFor($, e);
    const config = settingsOf(draft);
    return Box({ flexDirection: 'column', rowGap: 1, children: [
      Text({ bold: true, children: ['Breathe'] }),
      drawing($, e, preview, config, Math.max(6, Math.min(16, Math.floor((e.props.bodyColumns ?? 52) / 4)))),
      Button({ key: 'replay', label: 'Replay', plain: true, onPress: () => { if (!saving) { preview = createScene(); $.ui.invalidate('ui.render'); } } }),
      Text({ children: ['Color'] }),
      ...[paletteOptions.slice(0, 3), paletteOptions.slice(3)].map(options => Box({ flexDirection: 'row', columnGap: 1, children:
        options.map(option => Button({ key: `palette-${option.id}`, label: `${draft.palette === option.id ? '✓ ' : ''}${option.name}`, onPress: () => edit($, { palette: option.id }) })),
      })),
      Box({ flexDirection: 'row', columnGap: 1, children: [
        Button({ key: 'enabled', label: draft.enabled ? 'On' : 'Off', onPress: () => edit($, { enabled: !draft.enabled }) }),
        Button({ key: 'motion', label: draft.still ? 'Still' : 'Animated', onPress: () => edit($, { still: !draft.still }) }),
      ] }),
      ...[
        Box({ flexDirection: 'row', columnGap: 1, children: [
          Button({ key: 'classic', label: '4–7–8', onPress: () => edit($, { inhale: 4, hold: 7, exhale: 8 }) }),
          Button({ key: 'even', label: '4–4–4', onPress: () => edit($, { inhale: 4, hold: 4, exhale: 4 }) }),
          Button({ key: 'unwind', label: '4–0–6', onPress: () => edit($, { inhale: 4, hold: 0, exhale: 6 }) }),
        ] }),
        ...['inhale', 'hold', 'exhale'].map(key => saving ? Text({ children: [`${key}: ${draft[key]}`] }) : Input({ key, label: key === 'inhale' ? 'Breathe in' : key === 'exhale' ? 'Breathe out' : 'Hold', value: String(draft[key]), onInput: value => edit($, { [key]: value }), onSubmit: value => { edit($, { [key]: value }); return apply($); } })),
      ],
      ...(error ? [Text({ color: 'warning', children: [error] })] : []),
      ...(loadError ? [Button({ key: 'retry-load', label: 'Retry', onPress: async () => { await loadSettings($); if (!loadError) { draft = { ...settings }; baseline = { ...settings }; } $.ui.invalidate('ui.render'); } })] : []),
      Box({ flexDirection: 'row', columnGap: 1, children: saving ? [Text({ children: ['Saving…'] })] : [
        Button({ key: 'apply', label: 'Apply', onPress: () => apply($) }),
        Button({ key: 'undo', label: 'Undo', onPress: () => { draft = { ...settings }; error = loadError ? error : ''; syncClock($); $.ui.invalidate('ui.render'); } }),
        Button({ key: 'close', label: 'Close', onPress: async () => {
          try { await $.ui.close({ id: PANE }); closed($); }
          catch { error = 'Could not close this panel. Try again.'; $.ui.invalidate('ui.render'); }
        } }),
      ] }),
    ] });
  }).catch(($, e, next) => next(e));
}
