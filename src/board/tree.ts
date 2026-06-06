// Helpers to locate and immutably update nodes in the frame tree by path.
// Paths look like "0.2.1": leading "0" is the root, then child indices.

import type { FrameNode, Panel } from './model';
import { isPowerText } from './model';

// A Power panel is a button or switch whose (case-insensitive) text is a trigger.
export function isPowerPanel(panel: Panel): boolean {
  return (panel.type === 'button' || panel.type === 'switch') && isPowerText(panel.text);
}

export function powerKey(panel: Panel): string | null {
  if (panel.type === 'button') return panel.sharedTextKey;
  if (panel.type === 'switch') return panel.stateKey;
  return null;
}

// Collect runtime keys of all Power panels, split by kind (for priming "on").
export function collectPowerKeys(root: FrameNode): { buttons: string[]; switches: string[] } {
  const buttons: string[] = [];
  const switches: string[] = [];
  const walk = (n: FrameNode) => {
    if (n.kind === 'leaf') {
      if (isPowerPanel(n.panel)) {
        if (n.panel.type === 'button') buttons.push(n.panel.sharedTextKey);
        else if (n.panel.type === 'switch') switches.push(n.panel.stateKey);
      }
      return;
    }
    n.children.forEach(walk);
  };
  walk(root);
  return { buttons, switches };
}

function indices(path: string): number[] {
  return path.split('.').slice(1).map(Number); // drop the leading root segment
}

export function getFrameByPath(root: FrameNode, path: string): FrameNode | null {
  let node: FrameNode = root;
  for (const idx of indices(path)) {
    if (node.kind !== 'node') return null;
    const child = node.children[idx];
    if (!child) return null;
    node = child;
  }
  return node;
}

export function getPanelByPath(root: FrameNode, path: string): Panel | null {
  const node = getFrameByPath(root, path);
  return node && node.kind === 'leaf' ? node.panel : null;
}

// Returns a new tree with the panel at `path` replaced.
export function updatePanelByPath(root: FrameNode, path: string, panel: Panel): FrameNode {
  const parts = indices(path);
  const rec = (node: FrameNode, depth: number): FrameNode => {
    if (depth === parts.length) {
      return node.kind === 'leaf' ? { ...node, panel } : node;
    }
    if (node.kind !== 'node') return node;
    const idx = parts[depth];
    const children = node.children.slice();
    children[idx] = rec(node.children[idx], depth + 1);
    return { ...node, children };
  };
  return rec(root, 0);
}
