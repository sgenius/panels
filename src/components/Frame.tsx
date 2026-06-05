// Recursive frame renderer.
//  - node frame -> CSS Grid of child frames (row-major)
//  - leaf frame -> a panel
// See docs/tech-spec.md §5.3.

import type { FrameNode } from '../board/model';
import { PanelView } from './Panel';

// Deterministic brushed-metal angle per panel, derived from its path, so adjacent
// plates look like separate milled pieces rather than one continuous sheet.
const PLATE_ANGLES = [115, 135, 150, 200, 235, 250];
function plateAngle(path: string): string {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
  return `${PLATE_ANGLES[h % PLATE_ANGLES.length]}deg`;
}

export function Frame({ node, path }: { node: FrameNode; path: string }) {
  if (node.kind === 'leaf') {
    return (
      <div
        className="frame-leaf"
        data-panel-path={path}
        data-panel-type={node.panel.type}
        style={{ ['--plate-angle' as string]: plateAngle(path) }}
      >
        <PanelView panel={node.panel} />
      </div>
    );
  }

  return (
    <div
      className="frame-node"
      style={{
        gridTemplateColumns: `repeat(${node.cols}, 1fr)`,
        gridTemplateRows: `repeat(${node.rows}, 1fr)`,
      }}
    >
      {node.children.map((child, i) => (
        <Frame key={i} node={child} path={`${path}.${i}`} />
      ))}
    </div>
  );
}
