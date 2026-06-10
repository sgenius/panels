import { describe, it, expect } from 'vitest';
import { serializeToHash, deserializeFromHash } from './url';
import type { BoardConfig } from '../board/model';

const board: BoardConfig = {
  root: { kind: 'node', level: 0, cols: 2, rows: 1, children: [
    { kind: 'leaf', level: 1, panel: { type: 'blank' } },
    { kind: 'leaf', level: 1, panel: { type: 'blank' } },
  ] },
  theme: 'metallic',
  colors: ['#112233', '#445566', '#778899', '#aabbcc', '#ddeeff', '#012345', '#6789ab', '#cdef01'],
};

describe('URL (de)serialization hardening', () => {
  it('round-trips a board through the hash', () => {
    const cfg = deserializeFromHash('#' + serializeToHash(board));
    expect(cfg).not.toBeNull();
    expect(cfg!.theme).toBe('metallic');
    expect(cfg!.colors).toEqual(board.colors);
  });

  it('returns null (→ fresh board) for malformed input', () => {
    expect(deserializeFromHash('')).toBeNull();
    expect(deserializeFromHash('#')).toBeNull();
    expect(deserializeFromHash('#@@@bad@@@')).toBeNull(); // undecodable tree
  });

  it('rejects non-hex colors instead of passing them into CSS', () => {
    // valid tree, but colors contain a CSS-injection attempt
    const malicious = 'X;metallic;' + 'red;}'.padEnd(48, 'z');
    const cfg = deserializeFromHash('#' + malicious);
    expect(cfg).not.toBeNull();
    expect(cfg!.colors).toEqual([]); // dropped → App falls back to theme defaults
  });

  it('falls back to a known theme for an unknown theme id', () => {
    const cfg = deserializeFromHash('#X;evil-theme;');
    expect(cfg).not.toBeNull();
    expect(cfg!.theme).toBe('metallic');
  });
});
