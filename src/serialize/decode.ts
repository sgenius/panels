// Decode a DFS (pre-order) string back into the board tree.
// Self-delimiting: an F token encodes its exact child count (cols*rows).
// See docs/tech-spec.md §5.8.

import type { FrameNode, Panel } from '../board/model';

function bitsToPattern(bits: string): boolean[] {
  return bits.split('').map((c) => c === '1');
}

function parseColors(s: string): number[] {
  return s.split('').map((c) => Number(c));
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
        text: parts[2] ?? '',
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
        text: parts[2] ?? '',
        textPos: (parts[3] as 't' | 'b' | 'c') ?? 'c',
      };
    case 'B':
      return {
        type: 'button',
        opacity: parts[0] === 'o' ? 'opaque' : 'transparent',
        litColor: parts[1] === 'x' ? null : Number(parts[1]),
        text: parts[2] ?? '',
        textPos: (parts[3] as 't' | 'b') ?? 'b',
        sharedTextKey: '',
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

function read(cursor: Cursor, level: number, btnCounter: { n: number }): FrameNode {
  const token = cursor.next();
  if (token[0] === 'F') {
    const [colsStr, rowsStr] = token.slice(1).split('!');
    const cols = Number(colsStr);
    const rows = Number(rowsStr);
    const children: FrameNode[] = [];
    for (let i = 0; i < cols * rows; i++) children.push(read(cursor, level + 1, btnCounter));
    return { kind: 'node', level, cols, rows, children };
  }
  const panel = parsePanel(token);
  if (panel.type === 'button') panel.sharedTextKey = `btn-${btnCounter.n++}`;
  return { kind: 'leaf', level, panel };
}

export function decodeBoard(serialized: string): FrameNode {
  const tokens = serialized.split('-').filter((t) => t.length > 0);
  const cursor = new Cursor(tokens);
  const root = read(cursor, 0, { n: 0 });
  if (!cursor.done()) throw new Error('Trailing tokens after root tree');
  return root;
}
