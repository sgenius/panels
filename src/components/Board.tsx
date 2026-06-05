// The board: fills the viewport and renders the root frame.

import type { FrameNode } from '../board/model';
import { Frame } from './Frame';

export function Board({ root }: { root: FrameNode }) {
  return (
    <div className="board">
      <Frame node={root} path="0" />
    </div>
  );
}
