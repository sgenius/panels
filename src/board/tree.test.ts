import { describe, it, expect } from 'vitest';
import { isPowerText } from './model';
import type { FrameNode } from './model';
import { isPowerPanel, collectPowerKeys } from './tree';

describe('power panel detection', () => {
  it('recognizes trigger texts case-insensitively', () => {
    for (const t of ['Power', 'POWER', 'on', 'OFF', 'On/Off', '  power  ']) {
      expect(isPowerText(t)).toBe(true);
    }
    for (const t of ['powerful', 'onward', '', 'X7', 'offset']) {
      expect(isPowerText(t)).toBe(false);
    }
  });

  it('only buttons and switches can be power panels', () => {
    expect(isPowerPanel({ type: 'button', opacity: 'opaque', litColor: null, text: 'POWER', textPos: 'b', sharedTextKey: 'b1' })).toBe(true);
    expect(isPowerPanel({ type: 'switch', orientation: 'v', text: 'on', textPos: 'b', stateKey: 's1' })).toBe(true);
    expect(isPowerPanel({ type: 'button', opacity: 'opaque', litColor: null, text: 'GO', textPos: 'b', sharedTextKey: 'b2' })).toBe(false);
    expect(isPowerPanel({ type: 'led', mode: 'rhythmic', colors: [1], pattern: [true], text: 'POWER', textPos: 'c' })).toBe(false);
  });

  it('collects power keys split by kind', () => {
    const tree: FrameNode = {
      kind: 'node',
      level: 0,
      cols: 2,
      rows: 1,
      children: [
        { kind: 'leaf', level: 1, panel: { type: 'button', opacity: 'opaque', litColor: null, text: 'POWER', textPos: 'b', sharedTextKey: 'b1' } },
        {
          kind: 'node',
          level: 1,
          cols: 2,
          rows: 1,
          children: [
            { kind: 'leaf', level: 2, panel: { type: 'switch', orientation: 'v', text: 'On/Off', textPos: 'b', stateKey: 's1' } },
            { kind: 'leaf', level: 2, panel: { type: 'switch', orientation: 'v', text: 'XY', textPos: 'b', stateKey: 's2' } },
          ],
        },
      ],
    };
    expect(collectPowerKeys(tree)).toEqual({ buttons: ['b1'], switches: ['s1'] });
  });
});
