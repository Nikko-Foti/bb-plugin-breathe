import { useEffect, useRef, useState } from "react";
import { experimental_useCodeTheme } from "@get-bb/plugin-sdk/app";
import { breathAt, drawWave, stardustAt, type Phase, type Timing } from "../lib/breath";
export function BreatheWave({ timing }: { timing: Timing }) {
  const { mode } = experimental_useCodeTheme();
  const modeRef = useRef(mode);
  const repaint = useRef<() => void>(() => {});
  const rippleAt = useRef<(x: number, y: number) => void>(() => {});
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("breathe in");
  useEffect(() => {
    modeRef.current = mode;
    repaint.current();
  }, [mode]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let elapsed = 0, last = performance.now(), intersecting = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let ripples: { x: number; y: number; born: number }[] = [];
    const visible = () => intersecting && !document.hidden;
    const paint = () => {
      const frame = breathAt(elapsed, timing);
      const duration = reduced.matches ? 350 : 1800;
      ripples = ripples.filter(ripple => elapsed - ripple.born < duration);
      drawWave(el, reduced.matches ? .5 : frame.amount, ripples.map(ripple => ({
        x: ripple.x, y: ripple.y, progress: (elapsed - ripple.born) / duration, still: reduced.matches,
      })), stardustAt(elapsed, timing, reduced.matches), modeRef.current);
      setPhase(old => old === frame.phase ? old : frame.phase);
    };
    const tick = () => {
      timer = undefined;
      if (disposed || !visible()) return;
      const now = performance.now();
      elapsed += now - last;
      last = now;
      paint();
      timer = setTimeout(tick, reduced.matches ? 250 : ripples.length ? 1000 / 60 : 50);
    };
    rippleAt.current = (x, y) => {
      if (disposed || !visible()) return;
      // Keep interaction work bounded and leave the breathing clock untouched.
      ripples = [...ripples.slice(-3), { x, y, born: elapsed + performance.now() - last }];
      clearTimeout(timer);
      tick();
    };
    const sync = () => {
      clearTimeout(timer);
      timer = undefined;
      last = performance.now();
      if (!visible()) ripples = [];
      if (visible() && !disposed) { paint(); timer = setTimeout(tick, 100); }
    };
    // Theme changes repaint in place, preserving the clock and active ripples.
    repaint.current = () => { if (visible() && !disposed) paint(); };
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false;
      sync();
    });
    const resize = new ResizeObserver(() => { if (visible()) paint(); });
    observer.observe(el); resize.observe(el);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      disposed = true;
      rippleAt.current = () => {};
      repaint.current = () => {};
      clearTimeout(timer);
      observer.disconnect(); resize.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [timing.inhale, timing.hold, timing.exhale]);
  return <>
    <button type="button" className="breathe-wave-button" aria-label="Send a ripple through the wave"
      onClick={event => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.detail === 0 ? .5 : (event.clientX - rect.left) / Math.max(1, rect.width);
        const y = event.detail === 0 ? .5 : (event.clientY - rect.top) / Math.max(1, rect.height);
        rippleAt.current(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
      }}>
      <canvas ref={canvas} className="breathe-wave" width={140} height={53} aria-hidden="true" />
    </button>
    <span className="breathe-phase" data-mode={mode}>{phase}</span>
  </>;
}
