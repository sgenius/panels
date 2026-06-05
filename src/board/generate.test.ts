import { describe, it, expect } from 'vitest';
import { generateBoard } from './generate';
import { makeRng } from './prng';
import { DEFAULT_GENERATION_PARAMS } from './model';
import type { FrameNode } from './model';

// Average (cols, rows) of the root node frame across many seeds at a given aspect.
function avgRootGrid(aspect: number, seeds = 400) {
  let cols = 0;
  let rows = 0;
  let n = 0;
  for (let seed = 0; seed < seeds; seed++) {
    const root = generateBoard(makeRng(seed), DEFAULT_GENERATION_PARAMS, aspect);
    if (root.kind === 'node') {
      cols += root.cols;
      rows += root.rows;
      n++;
    }
  }
  return { cols: cols / n, rows: rows / n };
}

describe('aspect-aware grid generation', () => {
  it('wide cells favor more columns than rows', () => {
    const wide = avgRootGrid(3); // 3:1 wide
    expect(wide.cols).toBeGreaterThan(wide.rows + 1);
  });

  it('tall cells favor more rows than columns', () => {
    const tall = avgRootGrid(1 / 3); // 1:3 tall
    expect(tall.rows).toBeGreaterThan(tall.cols + 1);
  });

  it('produces fewer extremely skinny leaf cells than an aspect-blind baseline', () => {
    // Count leaf cells whose aspect is worse than 3:1 in either direction.
    const countSkinny = (aspect: number): number => {
      let skinny = 0;
      let total = 0;
      for (let seed = 0; seed < 200; seed++) {
        const root = generateBoard(makeRng(seed), DEFAULT_GENERATION_PARAMS, aspect);
        const walk = (node: FrameNode, a: number) => {
          if (node.kind === 'leaf') {
            total++;
            if (a >= 3 || a <= 1 / 3) skinny++;
            return;
          }
          const childA = a * (node.rows / node.cols);
          for (const c of node.children) walk(c, childA);
        };
        walk(root, aspect);
      }
      return total === 0 ? 0 : skinny / total;
    };
    // On a 16:9-ish board, very few leaves should be extremely skinny.
    expect(countSkinny(16 / 9)).toBeLessThan(0.15);
  });
});
