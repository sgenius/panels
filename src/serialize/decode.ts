// Decode a DFS (pre-order) string back into the board tree.
// Self-delimiting: an F token encodes its exact child count (cols*rows).
// See docs/tech-spec.md §5.8.

import type { FrameNode, Panel, ValueExpr, ValueOp } from '../board/model';
import { BARMETER_DEFAULTS } from '../board/model';
import { unescapeText } from './textCodec';

function bitsToPattern(bits: string): boolean[] {
  return bits.split('').map((c) => c === '1');
}

function parseColors(s: string): number[] {
  return s.split('').map((c) => Number(c));
}

// Serialized op chars -> model ops ('s' = subtract).
const CHAR_TO_OP: Record<string, ValueOp> = { '+': '+', s: '-', '*': '*', '/': '/', '%': '%' };

// Signed integer; 'n' prefix means negative (see encode.intToStr).
function parseInt2(s: string | undefined, fallback: number): number {
  if (s === undefined || s === '') return fallback;
  return s[0] === 'n' ? -Number(s.slice(1)) : Number(s);
}

function parseValueExpr(s: string): ValueExpr {
  for (const ch of Object.keys(CHAR_TO_OP)) {
    const i = s.indexOf(ch);
    if (i > 0) {
      return { kind: 'op', a: Number(s.slice(0, i)), op: CHAR_TO_OP[ch], b: Number(s.slice(i + 1)) };
    }
  }
  return { kind: 'reg', a: Number(s) };
}

function parsePanel(token: string): Panel {
  const id = token[0];
  const rest = token.slice(1);
  const parts = rest.split('!');
  switch (id) {
    case 'X':
      return { type: 'blank' };
    case 'K':
      return {
        type: 'led',
        mode: 'rhythmic',
        colors: parseColors(parts[0]),
        pattern: bitsToPattern(parts[1]),
        text: unescapeText(parts[2] ?? ''),
        textPos: (parts[3] as 't' | 'b' | 'c') ?? 'c',
      };
    case 'D':
      return {
        type: 'led',
        mode: 'regular',
        colors: parseColors(parts[0]),
        registryIndex: Number(parts[1]),
        // text/pos are optional for backward compatibility with older URLs
        // that used the shorter `D{colors}!{index}` form.
        text: unescapeText(parts[2] ?? ''),
        textPos: (parts[3] as 't' | 'b' | 'c') ?? 'c',
      };
    case 'B':
      return {
        type: 'button',
        opacity: parts[0] === 'o' ? 'opaque' : 'transparent',
        litColor: parts[1] === 'x' ? null : Number(parts[1]),
        text: unescapeText(parts[2] ?? ''),
        textPos: (parts[3] as 't' | 'b' | 'c') ?? 'b',
        sharedTextKey: '',
      };
    case 'S':
      return {
        type: 'switch',
        // bare `S` (no config) defaults to vertical with empty text.
        orientation: parts[0] === 'h' ? 'h' : 'v',
        text: unescapeText(parts[1] ?? ''),
        textPos: (parts[2] as 't' | 'b') ?? 'b',
        stateKey: '',
      };
    case 'M':
      return {
        type: 'barmeter',
        subtype: Number(parts[0] ?? 0),
        value: parseValueExpr(parts[1] ?? '0'),
        min: parseInt2(parts[2], BARMETER_DEFAULTS.min),
        max: parseInt2(parts[3], BARMETER_DEFAULTS.max),
        step: parseInt2(parts[4], BARMETER_DEFAULTS.step),
        text: unescapeText(parts[5] ?? ''),
        textPos: (parts[6] as 't' | 'b') ?? 'b',
      };
    default:
      throw new Error(`Unknown panel token: ${token}`);
  }
}

class Cursor {
  private i = 0;
  constructor(private readonly tokens: string[]) {}
  next(): string {
    if (this.i >= this.tokens.length) throw new Error('Unexpected end of token stream');
    return this.tokens[this.i++];
  }
  done(): boolean {
    return this.i >= this.tokens.length;
  }
}

interface KeyCounters {
  btn: number;
  sw: number;
}

function read(cursor: Cursor, level: number, keys: KeyCounters): FrameNode {
  const token = cursor.next();
  if (token[0] === 'F') {
    const [colsStr, rowsStr] = token.slice(1).split('!');
    const cols = Number(colsStr);
    const rows = Number(rowsStr);
    const children: FrameNode[] = [];
    for (let i = 0; i < cols * rows; i++) children.push(read(cursor, level + 1, keys));
    return { kind: 'node', level, cols, rows, children };
  }
  const panel = parsePanel(token);
  if (panel.type === 'button') panel.sharedTextKey = `btn-${keys.btn++}`;
  if (panel.type === 'switch') panel.stateKey = `sw-${keys.sw++}`;
  return { kind: 'leaf', level, panel };
}

export function decodeBoard(serialized: string): FrameNode {
  const tokens = serialized.split('-').filter((t) => t.length > 0);
  const cursor = new Cursor(tokens);
  const root = read(cursor, 0, { btn: 0, sw: 0 });
  if (!cursor.done()) throw new Error('Trailing tokens after root tree');
  return root;
}
