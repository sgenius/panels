// Small seedable PRNG (mulberry32) so board generation is reproducible.
// See docs/tech-spec.md §5.2.

export interface Rng {
  next(): number; // [0, 1)
  int(maxExclusive: number): number; // [0, maxExclusive)
  range(minInclusive: number, maxInclusive: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    range: (min, max) => min + int(max - min + 1),
    chance: (p) => next() < p,
    pick: (items) => items[int(items.length)],
  };
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
