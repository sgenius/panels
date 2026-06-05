import type { TextPos } from '../../board/model';

// Panels deeper than this level force their text to center, since the cells are
// small and a centered label reads best there.
export const FORCE_CENTER_BEYOND_LEVEL = 2;

export function effectiveTextPos(pos: TextPos, level: number): TextPos {
  return level > FORCE_CENTER_BEYOND_LEVEL ? 'c' : pos;
}
