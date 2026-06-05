import { describe, it, expect, beforeEach } from 'vitest';
import { useRuntime } from './store';

// A scripted RNG that returns a fixed sequence (for deterministic assertions).
// RNG consumption order in advance(): [changeCount], [3 shuffle rolls], [changeCount values].
function scriptedRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

function setRegistry(values: number[]) {
  useRuntime.setState({ tick: 0, registry: values.slice() });
}

// changeCount = min(2 + floor(rng*3), 5). Shuffle rolls of 0 turn others=[1,2,3,4]
// into [2,3,4,1], so chosen = [0, 2, 3, 4][..changeCount]. New values 0.5 -> 128.
describe('runtime registry tick rules', () => {
  beforeEach(() => useRuntime.getState().reset());

  it('always increments the last value as a wrapping counter', () => {
    setRegistry([10, 20, 30, 40, 50, 60]);
    useRuntime.getState().advance(scriptedRng([0, 0, 0, 0, 0.5, 0.5]));
    expect(useRuntime.getState().registry[5]).toBe(61);
  });

  it('wraps the counter from 255 back to 0', () => {
    setRegistry([10, 20, 30, 40, 50, 255]);
    useRuntime.getState().advance(scriptedRng([0, 0, 0, 0, 0.5, 0.5]));
    expect(useRuntime.getState().registry[5]).toBe(0);
  });

  it('changes 4 pool values (incl. index 0) when changeCount is 4', () => {
    // changeCount = 2 + floor(0.9*3) = 4; chosen = [0,2,3,4]; new values = 128.
    const seq = [0.9, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    setRegistry([10, 20, 30, 40, 50, 60]);
    useRuntime.getState().advance(scriptedRng(seq));
    const reg = useRuntime.getState().registry;
    expect(reg).toEqual([128, 20, 128, 128, 128, 61]);

    const before = [10, 20, 30, 40, 50];
    const changed = before.filter((v, i) => v !== reg[i]).length;
    expect(changed).toBe(4);
    expect(reg[0]).not.toBe(10); // index 0 always changes
  });

  it('changes exactly two pool values (incl. index 0) when changeCount is 2', () => {
    // changeCount = 2 + floor(0*3) = 2; chosen = [0,2]; new values = 128.
    setRegistry([10, 20, 30, 40, 50, 60]);
    useRuntime.getState().advance(scriptedRng([0, 0, 0, 0, 0.5, 0.5]));
    const reg = useRuntime.getState().registry;
    expect(reg).toEqual([128, 20, 128, 40, 50, 61]);
    expect(reg[0]).not.toBe(10); // index 0 always changes
  });

  it('never changes more than 4 or fewer than 2 pool values, over many ticks (real RNG)', () => {
    setRegistry([0, 0, 0, 0, 0, 0]);
    let prevCounter = useRuntime.getState().registry[5];
    for (let t = 0; t < 500; t++) {
      const prev = useRuntime.getState().registry.slice(0, 5);
      useRuntime.getState().advance(Math.random);
      const reg = useRuntime.getState().registry;
      const now = reg.slice(0, 5);
      const changed = prev.filter((v, i) => v !== now[i]).length;
      // Index 0 is always selected; at most 4 pool values change. Value
      // collisions can only lower the observed count, so the upper bound is the
      // firm guarantee.
      expect(changed).toBeLessThanOrEqual(4);
      // Counter advances by exactly 1 (mod wrap).
      expect(reg[5]).toBe(prevCounter >= 255 ? 0 : prevCounter + 1);
      prevCounter = reg[5];
    }
  });
});
