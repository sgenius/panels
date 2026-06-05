// URL (location.hash) (de)serialization of the whole BoardConfig.
// Layout:  <boardTree> ; <themeId> ; <8 colors as concatenated 6-hex>
// See docs/tech-spec.md §5.8.

import type { BoardConfig, ThemeId } from '../board/model';
import { encodeBoard } from './encode';
import { decodeBoard } from './decode';

const SEP = ';';

function colorsToHex(colors: string[]): string {
  return colors.map((c) => c.replace('#', '').padStart(6, '0')).join('');
}

function hexToColors(hex: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 8; i++) out.push('#' + hex.slice(i * 6, i * 6 + 6));
  return out;
}

export function serializeToHash(config: BoardConfig): string {
  return [encodeBoard(config.root), config.theme, colorsToHex(config.colors)].join(SEP);
}

export function deserializeFromHash(hash: string): BoardConfig | null {
  const clean = hash.replace(/^#/, '');
  if (!clean) return null;
  try {
    const [boardStr, theme, colorsHex] = clean.split(SEP);
    if (!boardStr) return null;
    const root = decodeBoard(boardStr);
    return {
      root,
      theme: (theme as ThemeId) || 'metallic',
      colors: colorsHex && colorsHex.length >= 48 ? hexToColors(colorsHex) : [],
    };
  } catch {
    return null;
  }
}

export function readHash(): string {
  return window.location.hash;
}

export function writeHash(config: BoardConfig): void {
  const hash = serializeToHash(config);
  // Avoid adding history entries on every board change.
  history.replaceState(null, '', '#' + hash);
}
