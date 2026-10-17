// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { BreatheWave } from './breathe-wave';
import { DEFAULT_TIMING } from '../lib/breath';
import * as breath from '../lib/breath';
const theme = vi.hoisted(() => ({ mode: 'dark' }));
vi.mock('@get-bb/plugin-sdk/app', () => ({ experimental_useCodeTheme: () => theme }));
let onIntersection: (entries: { isIntersecting: boolean }[]) => void;
let disconnect: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  theme.mode = 'dark';
  disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof onIntersection) { onIntersection = callback; }
    observe() {} disconnect = disconnect;
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect() {}, fillRect() {}, save() {}, restore() {}, translate() {}, scale() {},
    createRadialGradient() { return { addColorStop() {} }; },
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it('advances phases, suspends when offscreen, and disposes its timer', () => {
  const view = render(<BreatheWave timing={DEFAULT_TIMING} />);
  act(() => vi.advanceTimersByTime(4000));
  expect(view.getByText('hold')).toBeTruthy();
  act(() => onIntersection([{ isIntersecting: false }]));
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(60000));
  act(() => onIntersection([{ isIntersecting: true }]));
  expect(view.getByText('hold')).toBeTruthy();
  act(() => vi.advanceTimersByTime(7000));
  expect(view.getByText('breathe out')).toBeTruthy();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(disconnect).toHaveBeenCalledOnce();
});

it('repeated ripples preserve the breathing clock and share one disposable timer', () => {
  const view = render(<BreatheWave timing={DEFAULT_TIMING} />);
  act(() => vi.advanceTimersByTime(3500));
  for (let i = 0; i < 12; i++) fireEvent.click(view.getByRole('button', { name: 'Send a ripple through the wave' }));
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime(600));
  expect(view.getByText('hold')).toBeTruthy();
  act(() => onIntersection([{ isIntersecting: false }]));
  expect(vi.getTimerCount()).toBe(0);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('recolors immediately without restarting the breath, including after an offscreen change', () => {
  const paint = vi.spyOn(breath, 'drawWave');
  const view = render(<BreatheWave timing={DEFAULT_TIMING} />);
  act(() => vi.advanceTimersByTime(5000));
  fireEvent.click(view.getByRole('button'));
  const before = paint.mock.calls.at(-1)!;
  view.rerender(<BreatheWave timing={DEFAULT_TIMING} palette="ocean" />);
  expect(paint.mock.calls.at(-1)?.slice(0, 5)).toEqual(before.slice(0, 5));
  expect(paint.mock.calls.at(-1)?.[5]).toBe('ocean');
  expect(view.getByText('hold')).toBeTruthy();
  expect(vi.getTimerCount()).toBe(1);
  act(() => onIntersection([{ isIntersecting: false }]));
  paint.mockClear();
  view.rerender(<BreatheWave timing={DEFAULT_TIMING} palette="rose" />);
  expect(paint).not.toHaveBeenCalled();
  act(() => onIntersection([{ isIntersecting: true }]));
  expect(paint.mock.calls.at(-1)?.[5]).toBe('rose');
  expect(view.getByText('hold')).toBeTruthy();
});

it('repaints the theme without resetting the breath or active ripples', () => {
  const paint = vi.spyOn(breath, 'drawWave');
  const view = render(<BreatheWave timing={DEFAULT_TIMING} />);
  act(() => vi.advanceTimersByTime(3500));
  fireEvent.click(view.getByRole('button', { name: 'Send a ripple through the wave' }));
  const before = paint.mock.calls.at(-1)!;
  expect(before[2]).toHaveLength(1);
  theme.mode = 'light';
  view.rerender(<BreatheWave timing={DEFAULT_TIMING} />);
  const after = paint.mock.calls.at(-1)!;
  expect(after.slice(0, 4)).toEqual(before.slice(0, 4));
  expect(after[4]).toBe('light');
  expect(view.getByText('breathe in').dataset.mode).toBe('light');
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime(600));
  expect(view.getByText('hold')).toBeTruthy();
  act(() => onIntersection([{ isIntersecting: false }]));
  paint.mockClear();
  theme.mode = 'dark';
  view.rerender(<BreatheWave timing={DEFAULT_TIMING} />);
  expect(paint).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  act(() => onIntersection([{ isIntersecting: true }]));
  expect(paint.mock.calls.at(-1)?.[4]).toBe('dark');
  expect(view.getByText('hold')).toBeTruthy();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
