// Core data model for the Panels board tree.
// See docs/tech-spec.md §5.1.

export type TextPos = 't' | 'b' | 'c';
export type ButtonTextPos = 't' | 'b';

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
      sharedTextKey: string; // key into global shared-text store
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
