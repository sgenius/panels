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
    set((s) => ({
      tick: s.tick >= TICK_MAX ? 0 : s.tick + 1,
      // v0: registry values change randomly each tick.
      registry: s.registry.map(() => Math.floor(rng() * (REGISTRY_MAX + 1))),
    })),
  toggleButton: (key) => set((s) => ({ buttonOn: { ...s.buttonOn, [key]: !s.buttonOn[key] } })),
  setSharedText: (key, text) => set((s) => ({ sharedText: { ...s.sharedText, [key]: text } })),
  reset: () => set({ tick: 0, registry: freshRegistry(), buttonOn: {}, sharedText: {} }),
}));
