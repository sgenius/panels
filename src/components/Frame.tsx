// Recursive frame renderer.
//  - node frame -> CSS Grid of child frames (row-major)
//  - leaf frame -> a panel
// Threads `poweredOff` down: within a node, if any Power child is off, the other
// children (and their subtrees) render forced-off. Power panels are exempt.
// See docs/tech-spec.md §5.3 and §9.4.

import type { FrameNode } from '../board/model';
import { isPowerPanel, powerKey } from '../board/tree';
import { useRuntime } from '../runtime/store';
import { PanelView } from './Panel';

// Deterministic brushed-metal angle per panel, derived from its path, so adjacent
// plates look like separate milled pieces rather than one continuous sheet.
const PLATE_ANGLES = [115, 135, 150, 200, 235, 250];
function plateAngle(path: string): string {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
  return `${PLATE_ANGLES[h % PLATE_ANGLES.length]}deg`;
}

export function Frame({
  node,
  path,
  poweredOff = false,
}: {
  node: FrameNode;
  path: string;
  poweredOff?: boolean;
}) {
  return node.kind === 'leaf' ? (
    <LeafFrame node={node} path={path} poweredOff={poweredOff} />
  ) : (
    <NodeFrame node={node} path={path} poweredOff={poweredOff} />
  );
}

function LeafFrame({
  node,
  path,
  poweredOff,
}: {
  node: Extract<FrameNode, { kind: 'leaf' }>;
  path: string;
  poweredOff: boolean;
}) {
  // Larger labels on big panels (levels 0-1), graduated smaller as cells shrink
  // with depth so deep panels don't overflow.
  const labelSize =
    node.level <= 1 ? '1.05rem' : node.level === 2 ? '0.72rem' : node.level === 3 ? '0.6rem' : '0.5rem';
  return (
    <div
      className={`frame-leaf${poweredOff ? ' powered-off' : ''}`}
      data-panel-path={path}
      data-panel-type={node.panel.type}
      data-level={node.level}
      style={{
        ['--plate-angle' as string]: plateAngle(path),
        ['--label-size' as string]: labelSize,
      }}
    >
      <PanelView panel={node.panel} level={node.level} poweredOff={poweredOff} />
    </div>
  );
}

function NodeFrame({
  node,
  path,
  poweredOff,
}: {
  node: Extract<FrameNode, { kind: 'node' }>;
  path: string;
  poweredOff: boolean;
}) {
  // Direct children that are Power panels, with their runtime on/off key.
  const powerChildren = node.children.flatMap((c) =>
    c.kind === 'leaf' && isPowerPanel(c.panel)
      ? [{ kind: c.panel.type as 'button' | 'switch', key: powerKey(c.panel)! }]
      : [],
  );
  // True if any Power child is currently off (OR semantics across siblings).
  const anyPowerOff = useRuntime((s) =>
    powerChildren.some((pc) => !(pc.kind === 'button' ? s.buttonOn[pc.key] : s.switchOn[pc.key])),
  );

  return (
    <div
      className="frame-node"
      style={{
        gridTemplateColumns: `repeat(${node.cols}, 1fr)`,
        gridTemplateRows: `repeat(${node.rows}, 1fr)`,
      }}
    >
      {node.children.map((child, i) => {
        // Power panels are exempt; everyone else inherits the powered-off state.
        const childIsPower = child.kind === 'leaf' && isPowerPanel(child.panel);
        const childPoweredOff = childIsPower ? false : poweredOff || anyPowerOff;
        return <Frame key={i} node={child} path={`${path}.${i}`} poweredOff={childPoweredOff} />;
      })}
    </div>
  );
}
