// Core data model for the Panels board tree.
// See docs/tech-spec.md §5.1.

export type TextPos = 't' | 'b' | 'c'; // top, bottom, center
// Buttons can also place text on their face (center), above (top), or below (bottom).
export type ButtonTextPos = TextPos;
export type TopBottom = 't' | 'b'; // switches & bar meters: top/bottom only
export type Orientation = 'h' | 'v';

export type PanelType = 'blank' | 'led' | 'button' | 'switch' | 'barmeter';

// Bar-meter value source: a single registry value, or an op between two of them.
export type ValueOp = '+' | '-' | '*' | '/' | '%';
export type ValueExpr =
  | { kind: 'reg'; a: number }
  | { kind: 'op'; a: number; op: ValueOp; b: number };

export type Panel =
  | { type: 'blank' }
  | {
      type: 'led';
      mode: 'regular';
      colors: number[]; // indices into the 8 theme colors
      registryIndex: number; // 0..5
      text: string;
      textPos: TextPos;
    }
  | {
      type: 'led';
      mode: 'rhythmic';
      colors: number[];
      pattern: boolean[]; // length 8
      text: string;
      textPos: TextPos;
    }
  | {
      type: 'button';
      opacity: 'opaque' | 'transparent';
      litColor: number | null; // theme color index, or null
      text: string;
      textPos: ButtonTextPos;
      sharedTextKey: string; // key into global shared-text store (also its on/off key)
    }
  | {
      type: 'switch';
      orientation: Orientation;
      text: string;
      textPos: TopBottom;
      stateKey: string; // key into the runtime on/off store
    }
  | {
      type: 'barmeter';
      subtype: number; // 0..255 (requested; resolved per theme)
      value: ValueExpr;
      min: number;
      max: number;
      step: number;
      text: string;
      textPos: TopBottom;
    };

export type FrameNode =
  | {
      kind: 'node';
      level: number;
      cols: number; // 1..6
      rows: number; // 1..4
      children: FrameNode[]; // length cols*rows, row-major order
    }
  | {
      kind: 'leaf';
      level: number;
      panel: Panel;
    };

export type ThemeId = 'metallic';

export interface BoardConfig {
  root: FrameNode; // always kind: 'node', level 0
  theme: ThemeId;
  colors: string[]; // 8 theme colors (hex), may override theme defaults
}

export interface GridBounds {
  minCols: number;
  maxCols: number; // <= 6
  minRows: number;
  maxRows: number; // <= 4
}

export interface GenerationParams {
  maxDepth: number; // 1..6
  blinkProbability: number; // 0..1
  grid: GridBounds;
  maxNodes: number; // soft cap on total nodes
}

export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  maxDepth: 4,
  blinkProbability: 0.5,
  grid: { minCols: 1, maxCols: 6, minRows: 1, maxRows: 4 },
  maxNodes: 120,
};

export const REGISTRY_SIZE = 6;
export const REGISTRY_MAX = 255;
export const TICK_MAX = 65535; // wraps after this

// Bar-meter range defaults.
export const BARMETER_DEFAULTS = { min: 0, max: 65000, step: 5000 };

// Text triggers (case-insensitive) that make a user-input two-state panel a
// "Power" panel. See docs/prod-spec.md and tech-spec §9.4.
export const POWER_TRIGGERS = ['on', 'off', 'on/off', 'power'];

export function isPowerText(text: string): boolean {
  return POWER_TRIGGERS.includes(text.trim().toLowerCase());
}
