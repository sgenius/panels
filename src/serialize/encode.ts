// Encode the board tree to a compact DFS (pre-order) string.
// See docs/tech-spec.md §5.8.

import type { FrameNode, Panel } from '../board/model';

function patternToBits(pattern: boolean[]): string {
  return pattern.map((b) => (b ? '1' : '0')).join('');
}

function panelToken(panel: Panel): string {
  switch (panel.type) {
    case 'blank':
      return 'X';
    case 'led':
      if (panel.mode === 'rhythmic') {
        return `K${panel.colors.join('')}!${patternToBits(panel.pattern)}!${panel.text}!${panel.textPos}`;
      }
      return `D${panel.colors.join('')}!${panel.registryIndex}!${panel.text}!${panel.textPos}`;
    case 'button': {
      const op = panel.opacity === 'opaque' ? 'o' : 't';
      const lit = panel.litColor === null ? 'x' : String(panel.litColor);
      return `B${op}!${lit}!${panel.text}!${panel.textPos}`;
    }
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
