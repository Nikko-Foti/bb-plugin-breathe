import { useEffect, useId, useRef, useState } from 'react';
import { useRpc, useSettings } from '@get-bb/plugin-sdk/app';
import type { rpcContract } from '../server';
import { RHYTHMS, TIMING_FIELDS, readBreatheSettings, resolveDraft, type SettingsDraft, type BreatheSettings as Settings } from '../lib/settings';
import type { Timing } from '../lib/breath';
import { SceneGlyph } from './scene-glyph';
import { BreatheWave } from './breathe-wave';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Icon } from './ui/icon';

function ScenePreview({ settings }: { settings: Settings }) {
  return <div className="breathe-studio-stage"><BreatheWave timing={settings} /></div>;
}

export function BreatheSettings({ onClose }: { onClose?: () => void }) {
  const { values, isLoading } = useSettings();
  const rpc = useRpc<typeof rpcContract>();
  const remote = readBreatheSettings(values);
  const remoteKey = JSON.stringify(remote);
  // Keep the acknowledged response visible until the settings subscription catches up.
  const [accepted, setAccepted] = useState<{ from: string; settings: Settings } | null>(null);
  useEffect(() => {
    if (accepted && accepted.from !== remoteKey) setAccepted(null);
  }, [accepted, remoteKey]);
  const saved = accepted?.from === remoteKey ? accepted.settings : remote;
  const [draft, setDraft] = useState<SettingsDraft>({});
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const applyButton = useRef<HTMLButtonElement>(null);
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    // BB can briefly move focus to the document when a settings broadcast rerenders its slots.
    if ((feedback || saveError) && !pending && document.activeElement === document.body) applyButton.current?.focus({ preventScroll: true });
  }, [feedback, saveError, pending, remoteKey]);
  const id = useId();
  const { next, patch, errors, valid, dirty } = resolveDraft(saved, draft);
  const locked = pending || isLoading;
  const rhythm = RHYTHMS.find(item => TIMING_FIELDS.every(({ key }) => item.timing[key] === next[key]));
  const total = next.inhale + next.hold + next.exhale;
  function edit(change: SettingsDraft) {
    setDraft(old => ({ ...old, ...change })); setFeedback(''); setSaveError('');
  }
  function setRhythm(timing: Timing) {
    edit({ inhale: String(timing.inhale), hold: String(timing.hold), exhale: String(timing.exhale) });
  }
  async function save() {
    if (!valid || !dirty || locked || inFlight.current) return;
    inFlight.current = true; setPending(true); setSaveError(''); setFeedback('');
    try {
      const result = await rpc.call('saveSettings', patch);
      setAccepted({ from: remoteKey, settings: result }); setDraft({});
      setFeedback('Saved');
      onClose?.();
    } catch {
      setSaveError('Couldn’t save your changes. Try again.');
    } finally { inFlight.current = false; setPending(false); }
  }
  return <section className="breathe-studio" aria-label="Breathe settings" aria-busy={locked}
    // The popup is nested inside BB's composer. Keep its click-to-focus handlers
    // from dismissing us before a label can activate its radio or number input.
    onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onKeyDown={event => {
    // Keep keyboard activation inside the popup, away from the composer's submit handler.
    if (event.key === 'Enter') {
      event.stopPropagation();
      if (event.target instanceof HTMLInputElement) {
        event.preventDefault();
        if (event.target.type === 'number') void save();
      }
    }
  }}>
    <header className="breathe-studio-header">
      <div className="breathe-brand-mark"><SceneGlyph /></div>
      <div className="breathe-studio-title"><h2>Breathe</h2></div>
      <input className="breathe-switch" type="checkbox" role="switch" aria-label="Show Breathe while agents work" title="Show Breathe while agents work" checked={next.enabled} disabled={locked} onChange={event => edit({ enabled: event.target.checked })} />
      {onClose && <Button type="button" variant="ghost" size="icon" className="breathe-close" aria-label="Close Breathe settings" onClick={onClose}><Icon name="X" /></Button>}
    </header>
    <div className="breathe-studio-body">
      <div className="breathe-preview-card">
        <div className="breathe-preview-toolbar">
          <Button type="button" variant="ghost" size="sm" className="breathe-replay" onClick={() => setReplay(old => old + 1)} aria-label="Replay preview"><Icon name="RotateCcw" />Replay</Button>
        </div>
        <ScenePreview key={replay} settings={next} />
      </div>
      <div className="breathe-rhythm">
        <div className="breathe-section-heading"><h3>Timing</h3><span>{valid ? `${total}s per breath` : 'Custom timing'}</span></div>
        <div className="breathe-presets" role="group" aria-label="Breathing presets">
          {RHYTHMS.map(preset => <Button key={preset.name} type="button" variant="ghost" className="breathe-preset" disabled={locked}
            aria-pressed={valid && rhythm?.name === preset.name} onClick={() => setRhythm(preset.timing)}>
            <span>{preset.name}</span><small>{preset.timing.inhale} · {preset.timing.hold} · {preset.timing.exhale}</small>
          </Button>)}
        </div>
        <div className="breathe-cycle" aria-hidden="true">{TIMING_FIELDS.map(({ key }) => next[key] > 0 && <span key={key} data-phase={key} style={{ flex: next[key] }} />)}</div>
        <div className="breathe-timing-fields">
          {TIMING_FIELDS.map(({ key, label, min }) => <div className="breathe-timing-field" key={key}>
            <label htmlFor={`${id}-${key}`}>{label}</label>
            <div className="breathe-stepper">
              <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={locked || next[key] <= min} onClick={() => edit({ [key]: String(Math.max(min, next[key] - 1)) })}>−</button>
              <Input id={`${id}-${key}`} type="number" min={min} max={30} step={1} inputMode="numeric" aria-label={`${label} seconds`} title={key === 'hold' ? 'Seconds · 0 to skip' : 'Seconds'}
                aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${id}-${key}-error` : `${id}-timing-hint`}
                value={draft[key] ?? String(saved[key])} disabled={locked} onChange={event => edit({ [key]: event.target.value })} />
              <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={locked || next[key] >= 30} onClick={() => edit({ [key]: String(Math.min(30, next[key] + 1)) })}>+</button>
            </div>
            {errors[key] && <span id={`${id}-${key}-error`} className="breathe-field-error">{errors[key]}</span>}
          </div>)}
        </div>
        <p id={`${id}-timing-hint`} className="breathe-sr-only">Seconds per phase. Set hold to 0 to skip it.</p>
      </div>
    </div>
    <footer className="breathe-studio-footer">
      <div className="breathe-save-state">
        {saveError ? <p role="alert" className="breathe-field-error">{saveError}</p> : <p role="status" className={!isLoading && !pending && !feedback ? 'breathe-sr-only' : undefined}>{isLoading ? 'Loading…' : pending ? 'Saving…' : feedback || (dirty ? 'Unsaved changes' : '')}</p>}
        {dirty && <button type="button" className="breathe-text-action" disabled={locked} onClick={() => { setDraft({}); setSaveError(''); setFeedback(''); }}>Undo</button>}
      </div>
      <Button ref={applyButton} type="button" size="sm" className="breathe-apply" aria-description={dirty ? 'Applies to all threads' : undefined} disabled={locked || !valid || (!dirty && !onClose)} onClick={() => dirty ? void save() : onClose?.()}>{pending ? 'Saving…' : dirty ? 'Apply' : onClose ? 'Done' : 'Saved'}</Button>
    </footer>
  </section>;
}
