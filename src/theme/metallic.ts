// Metallic theme definition. See docs/tech-spec.md §5.7.

import type { PanelType, ThemeId } from '../board/model';

export interface Theme {
  id: ThemeId;
  name: string;
  // Exactly 8 colors. By convention:
  //   index 0 = positive, 1 = warning, 2 = danger, 3..7 = free.
  colors: string[];
  semantic: { positive: number; warning: number; danger: number };
  // Subtypes this theme actually renders, per panel type. A requested subtype the
  // theme doesn't support is mapped by round-robin (see resolveSubtype).
  subtypes: Partial<Record<PanelType, number[]>>;
}

export const METALLIC: Theme = {
  id: 'metallic',
  name: 'Metallic',
  colors: [
    '#39ff8b', // 0 positive  - green
    '#ffcc33', // 1 warning   - amber
    '#ff3b30', // 2 danger    - red
    '#33b5ff', // 3 cyan-blue
    '#c060ff', // 4 violet
    '#ff7ac0', // 5 pink
    '#f0f0f0', // 6 white
    '#ff8a3d', // 7 orange
  ],
  semantic: { positive: 0, warning: 1, danger: 2 },
  subtypes: { barmeter: [0, 1] }, // 0 = thermometer, 1 = radio
};

// Resolve a requested subtype (0..255) to one the theme supports, round-robin.
export function resolveSubtype(theme: ThemeId, type: PanelType, requested: number): number {
  const supported = THEMES[theme].subtypes[type];
  if (!supported || supported.length === 0) return 0;
  return supported[requested % supported.length];
}

export const THEMES: Record<ThemeId, Theme> = {
  metallic: METALLIC,
};

export function defaultColors(theme: ThemeId): string[] {
  return [...THEMES[theme].colors];
}

// Apply the 8 colors as CSS custom properties on a target element.
export function applyThemeColors(el: HTMLElement, colors: string[]): void {
  colors.forEach((c, i) => el.style.setProperty(`--color-${i}`, c));
}
