// Random label generator for LEDs/buttons.
// Open Unicode but strongly biased to Latin-1. See docs/tech-spec.md §5.2.

import type { Rng } from './prng';

const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Curated wide set: glyphs that render reliably in common monospace fonts.
const WIDE = '▲▼◆●■□△▽→←↑↓ΣΩΔΦΨαβγλμπ±×÷°';

const WIDE_PROBABILITY = 0.12;

function pickChar(rng: Rng): string {
  const pool = rng.chance(WIDE_PROBABILITY) ? WIDE : LATIN;
  return pool[rng.int(pool.length)];
}

// Generate a short label (1..maxLen chars), Latin-1 biased.
export function randomText(rng: Rng, maxLen = 3): string {
  const len = rng.range(1, maxLen);
  let out = '';
  for (let i = 0; i < len; i++) out += pickChar(rng);
  return out;
}
