// Helpers to locate and immutably update nodes in the frame tree by path.
// Paths look like "0.2.1": leading "0" is the root, then child indices.

import type { FrameNode, Panel } from './model';

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
