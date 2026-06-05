// Recursive frame renderer.
//  - node frame -> CSS Grid of child frames (row-major)
//  - leaf frame -> a panel
// See docs/tech-spec.md §5.3.

import type { FrameNode } from '../board/model';
import { PanelView } from './Panel';

export function Frame({ node, path }: { node: FrameNode; path: string }) {
  if (node.kind === 'leaf') {
    return (
      <div className="frame-leaf" data-panel-path={path} data-panel-type={node.panel.type}>
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
