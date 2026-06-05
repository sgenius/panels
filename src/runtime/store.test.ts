import { describe, it, expect, beforeEach } from 'vitest';
import { useRuntime } from './store';

// A scripted RNG that returns a fixed sequence (for deterministic assertions).
function scriptedRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

function setRegistry(values: number[]) {
  useRuntime.setState({ tick: 0, registry: values.slice() });
}

describe('runtime registry tick rules', () => {
  beforeEach(() => useRuntime.getState().reset());

  it('always increments the last value as a wrapping counter', () => {
    setRegistry([10, 20, 30, 40, 50, 60]);
    useRuntime.getState().advance(scriptedRng([0, 0, 0]));
    expect(useRuntime.getState().registry[5]).toBe(61);
  });

  it('wraps the counter from 255 back to 0', () => {
    setRegistry([10, 20, 30, 40, 50, 255]);
    useRuntime.getState().advance(scriptedRng([0, 0, 0]));
    expect(useRuntime.getState().registry[5]).toBe(0);
  });

  it('changes only 1..3 pool values, always including index 0', () => {
    // changeCount = 1 + floor(0.7*3) = 3; pick indices 2 and 3; new values = 128.
    const seq = [0.7, 0.5, 0.7, 0.5, 0.5, 0.5];
    setRegistry([10, 20, 30, 40, 50, 60]);
    useRuntime.getState().advance(scriptedRng(seq));
    const reg = useRuntime.getState().registry;
    expect(reg).toEqual([128, 20, 128, 128, 50, 61]);

    // index 0 changed, counter changed, exactly 3 pool values changed.
    const before = [10, 20, 30, 40, 50];
    const changed = before.filter((v, i) => v !== reg[i]).length;
    expect(changed).toBe(3);
    expect(reg[0]).not.toBe(10); // index 0 always changes
  });

  it('changes exactly one pool value (index 0) when changeCount is 1', () => {
    // changeCount = 1 + floor(0*3) = 1; only index 0; new value = 200.
    setRegistry([10, 20, 30, 40, 50, 60]);
    useRuntime.getState().advance(scriptedRng([0, 200 / 256]));
    const reg = useRuntime.getState().registry;
    expect(reg[0]).toBe(200);
    expect(reg.slice(1, 5)).toEqual([20, 30, 40, 50]); // untouched pool values
    expect(reg[5]).toBe(61); // counter
  });
});
