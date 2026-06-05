// Tick engine. Drives the runtime store on a tunable interval.
// See docs/tech-spec.md §5.6.

import { useEffect } from 'react';
import { useRuntime } from './store';

// Tunable tick cadence. Default 250ms for v0.
export const TICK_MS = 250;

// Headless hook: starts/stops the global tick loop.
export function useTickEngine(intervalMs: number = TICK_MS): void {
  useEffect(() => {
    const id = window.setInterval(() => {
      useRuntime.getState().advance(Math.random);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
