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

      // Change 1, 2, or 3 of the pool values this tick; index 0 always changes.
      const changeCount = 1 + Math.floor(rng() * 3); // 1..3
      const chosen = new Set<number>([0]);
      while (chosen.size < changeCount && chosen.size < poolSize) {
        chosen.add(Math.floor(rng() * poolSize)); // 0..poolSize-1
      }
      for (const i of chosen) reg[i] = Math.floor(rng() * (REGISTRY_MAX + 1));

      return { tick, registry: reg };
    }),
  toggleButton: (key) => set((s) => ({ buttonOn: { ...s.buttonOn, [key]: !s.buttonOn[key] } })),
  setSharedText: (key, text) => set((s) => ({ sharedText: { ...s.sharedText, [key]: text } })),
  reset: () => set({ tick: 0, registry: freshRegistry(), buttonOn: {}, sharedText: {} }),
}));
