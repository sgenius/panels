import { describe, it, expect } from 'vitest';
import { encodeBoard } from './encode';
import { decodeBoard } from './decode';
import { generateBoard } from '../board/generate';
import { makeRng } from '../board/prng';
import { DEFAULT_GENERATION_PARAMS } from '../board/model';

describe('serialization round-trip (DFS, self-delimiting)', () => {
  it('matches the worked example from the tech spec', () => {
    const s = 'F2!1-X-F1!2-K0345!01101001!Hi!t-D012!2-';
    const tree = decodeBoard(s);
    expect(encodeBoard(tree)).toBe(s);
    expect(tree.kind).toBe('node');
    if (tree.kind === 'node') {
      expect(tree.cols).toBe(2);
      expect(tree.rows).toBe(1);
      expect(tree.children).toHaveLength(2);
    }
  });

  it('is stable across encode -> decode -> encode for many random boards', () => {
    for (let seed = 0; seed < 200; seed++) {
      const root = generateBoard(makeRng(seed), DEFAULT_GENERATION_PARAMS);
      const s1 = encodeBoard(root);
      const s2 = encodeBoard(decodeBoard(s1));
      expect(s2).toBe(s1);
    }
  });

  it('rejects trailing tokens', () => {
    expect(() => decodeBoard('X-X-')).toThrow();
  });
});
