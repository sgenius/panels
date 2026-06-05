// Runtime state: tick + registry + shared button text + button on/off.
// Lives outside React render cycle; panels subscribe to slices.
// See docs/tech-spec.md §4.

import { create } from 'zustand';
import { REGISTRY_SIZE, REGISTRY_MAX, TICK_MAX } from '../board/model';

interface RuntimeState {
  tick: number;
  registry: number[]; // length REGISTRY_SIZE, each 0..255
  buttonOn: Record<string, boolean>;
  sharedText: Record<string, string>;
  advance: (rng: () => number) => void;
  toggleButton: (key: string) => void;
  setSharedText: (key: string, text: string) => void;
  reset: () => void;
}

function freshRegistry(): number[] {
  return Array.from({ length: REGISTRY_SIZE }, () => 0);
}

export const useRuntime = create<RuntimeState>((set) => ({
  tick: 0,
  registry: freshRegistry(),
  buttonOn: {},
  sharedText: {},
  advance: (rng) =>
    set((s) => {
      const tick = s.tick >= TICK_MAX ? 0 : s.tick + 1;
      const reg = s.registry.slice();
      const counterIdx = reg.length - 1; // last value is a steady counter
      const poolSize = counterIdx; // indices 0..counterIdx-1 are the random pool

      // Last value: a counter, +1 each tick, wrapping at REGISTRY_MAX.
      reg[counterIdx] = reg[counterIdx] >= REGISTRY_MAX ? 0 : reg[counterIdx] + 1;

      // Change 2, 3, or 4 of the pool values this tick; index 0 always changes.
      // Pick distinct indices by shuffling the other pool indices (no rejection
      // sampling, so a degenerate RNG can't spin forever).
      const changeCount = Math.min(2 + Math.floor(rng() * 3), poolSize); // 2..4
      const others: number[] = [];
      for (let i = 1; i < poolSize; i++) others.push(i);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      const chosen = [0, ...others.slice(0, changeCount - 1)];
      for (const i of chosen) reg[i] = Math.floor(rng() * (REGISTRY_MAX + 1));

      return { tick, registry: reg };
    }),
  toggleButton: (key) => set((s) => ({ buttonOn: { ...s.buttonOn, [key]: !s.buttonOn[key] } })),
  setSharedText: (key, text) => set((s) => ({ sharedText: { ...s.sharedText, [key]: text } })),
  reset: () => set({ tick: 0, registry: freshRegistry(), buttonOn: {}, sharedText: {} }),
}));
