import { describe, it, expect } from 'vitest';
import { encodeBoard } from './encode';
import { decodeBoard } from './decode';
import { generateBoard } from '../board/generate';
import { makeRng } from '../board/prng';
import { DEFAULT_GENERATION_PARAMS, type FrameNode } from '../board/model';

describe('serialization round-trip (DFS, self-delimiting)', () => {
  it('matches the worked example from the tech spec', () => {
    const s = 'F2!1-X-F1!2-K0345!01101001!Hi!t-D012!2!OK!b-';
    const tree = decodeBoard(s);
    expect(encodeBoard(tree)).toBe(s);
    expect(tree.kind).toBe('node');
    if (tree.kind === 'node') {
      expect(tree.cols).toBe(2);
      expect(tree.rows).toBe(1);
      expect(tree.children).toHaveLength(2);
    }
  });

  it('decodes a regular LED with text and position, and stays stable', () => {
    const tree = decodeBoard('D35!4!GO!t-');
    expect(tree.kind).toBe('leaf');
    if (tree.kind === 'leaf' && tree.panel.type === 'led' && tree.panel.mode === 'regular') {
      expect(tree.panel.colors).toEqual([3, 5]);
      expect(tree.panel.registryIndex).toBe(4);
      expect(tree.panel.text).toBe('GO');
      expect(tree.panel.textPos).toBe('t');
    }
  });

  it('still decodes the older D{colors}!{index} form (backward compatible)', () => {
    const tree = decodeBoard('D012!2-');
    expect(tree.kind).toBe('leaf');
    if (tree.kind === 'leaf' && tree.panel.type === 'led' && tree.panel.mode === 'regular') {
      expect(tree.panel.text).toBe('');
      expect(tree.panel.textPos).toBe('c');
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

  it('escapes delimiters and URL-special chars in panel text', () => {
    const nasty = "A-B!C;D&E=F/G:H I#J%K'L(M)~N";
    const root: FrameNode = {
      kind: 'leaf',
      level: 0,
      panel: {
        type: 'button',
        opacity: 'opaque',
        litColor: null,
        text: nasty,
        textPos: 'b',
        sharedTextKey: '',
      },
    };
    const s = encodeBoard(root);

    // The encoded text region must not contain our delimiters ('-' '!' ';') or
    // URL-breaking characters ('&' '=' '/' ':' '#' '?' whitespace). Characters
    // encodeURIComponent leaves alone (' ( ) ~) are harmless in a URL fragment.
    const textRegion = s.slice(0, -1).split('!')[2]; // Bo ! x ! <text> ! b
    expect(textRegion).not.toMatch(/[-!;&=/:#?\s]/);

    // ...and it round-trips back to the exact original string.
    const tree = decodeBoard(s);
    expect(tree.kind).toBe('leaf');
    if (tree.kind === 'leaf' && tree.panel.type === 'button') {
      expect(tree.panel.text).toBe(nasty);
    }
  });
});
