// Encode the board tree to a compact DFS (pre-order) string.
// See docs/tech-spec.md §5.8.

import type { FrameNode, Panel, ValueExpr, ValueOp } from '../board/model';
import { escapeText } from './textCodec';

function patternToBits(pattern: boolean[]): string {
  return pattern.map((b) => (b ? '1' : '0')).join('');
}

// Subtraction is encoded as 's' because a raw '-' is the token delimiter.
const OP_TO_CHAR: Record<ValueOp, string> = { '+': '+', '-': 's', '*': '*', '/': '/', '%': '%' };

function valueExprToStr(v: ValueExpr): string {
  return v.kind === 'reg' ? `${v.a}` : `${v.a}${OP_TO_CHAR[v.op]}${v.b}`;
}

// Signed integer with an 'n' prefix for negatives, so the '-' delimiter is never
// produced (min/max may be negative).
function intToStr(n: number): string {
  return n < 0 ? `n${-n}` : `${n}`;
}

function panelToken(panel: Panel): string {
  switch (panel.type) {
    case 'blank':
      return 'X';
    case 'led':
      if (panel.mode === 'rhythmic') {
        return `K${panel.colors.join('')}!${patternToBits(panel.pattern)}!${escapeText(panel.text)}!${panel.textPos}`;
      }
      return `D${panel.colors.join('')}!${panel.registryIndex}!${escapeText(panel.text)}!${panel.textPos}`;
    case 'button': {
      const op = panel.opacity === 'opaque' ? 'o' : 't';
      const lit = panel.litColor === null ? 'x' : String(panel.litColor);
      return `B${op}!${lit}!${escapeText(panel.text)}!${panel.textPos}`;
    }
    case 'switch':
      return `S${panel.orientation}!${escapeText(panel.text)}!${panel.textPos}`;
    case 'barmeter':
      return (
        `M${panel.subtype}!${valueExprToStr(panel.value)}` +
        `!${intToStr(panel.min)}!${intToStr(panel.max)}!${intToStr(panel.step)}` +
        `!${escapeText(panel.text)}!${panel.textPos}`
      );
  }
}

function emit(node: FrameNode, out: string[]): void {
  if (node.kind === 'leaf') {
    out.push(panelToken(node.panel));
    return;
  }
  out.push(`F${node.cols}!${node.rows}`);
  for (const child of node.children) emit(child, out);
}

// Produces a string of node tokens joined and terminated by '-'.
export function encodeBoard(root: FrameNode): string {
  const out: string[] = [];
  emit(root, out);
  return out.join('-') + '-';
}
