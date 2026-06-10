// URL (location.hash) (de)serialization of the whole BoardConfig.
// Layout:  <boardTree> ; <themeId> ; <8 colors as concatenated 6-hex>
// See docs/tech-spec.md §5.8.

import type { BoardConfig, ThemeId } from '../board/model';
import { THEMES } from '../theme/metallic';
import { encodeBoard } from './encode';
import { decodeBoard } from './decode';

const SEP = ';';
const HEX6 = /^[0-9a-fA-F]{6}$/;

function colorsToHex(colors: string[]): string {
  return colors.map((c) => c.replace('#', '').padStart(6, '0')).join('');
}

// Parse exactly 8 strict 6-hex colors, or null if the input is malformed.
// (These become CSS custom properties, so we never pass through untrusted text.)
function hexToColors(hex: string): string[] | null {
  if (hex.length < 48) return null;
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const c = hex.slice(i * 6, i * 6 + 6);
    if (!HEX6.test(c)) return null;
    out.push('#' + c);
  }
  return out;
}

function validTheme(t: string | undefined): ThemeId {
  return t && t in THEMES ? (t as ThemeId) : 'metallic';
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
      theme: validTheme(theme),
      colors: hexToColors(colorsHex ?? '') ?? [],
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
