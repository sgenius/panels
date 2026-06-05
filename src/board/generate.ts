// Recursive board generation. See docs/tech-spec.md §5.2.

import type { FrameNode, GenerationParams, Panel } from './model';
import { REGISTRY_SIZE } from './model';
import type { Rng } from './prng';
import { randomText } from './text';

type PanelType = 'blank' | 'led' | 'button';

interface GenContext {
  rng: Rng;
  params: GenerationParams;
  count: number; // running node count for the soft cap
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Probability that a frame at `level` becomes a leaf.
// Rises toward maxDepth, and under node-count pressure.
function leafProbability(ctx: GenContext, level: number): number {
  const { maxDepth, maxNodes } = ctx.params;
  const depthPressure = level / maxDepth;
  const countPressure = ctx.count / maxNodes;
  return clamp01(Math.max(depthPressure, countPressure));
}

// Pick grid dimensions, biased smaller at deeper levels, with >= 2 cells.
function pickGrid(ctx: GenContext, level: number): { cols: number; rows: number } {
  const { grid, maxDepth } = ctx.params;
  // Bias: at deeper levels skew toward the minimum.
  const skew = level / maxDepth; // 0..1
  const biased = (min: number, max: number): number => {
    // Two rolls, take the smaller as level deepens.
    const a = ctx.rng.range(min, max);
    const b = ctx.rng.range(min, max);
    return ctx.rng.chance(skew) ? Math.min(a, b) : a;
  };
  let cols = biased(grid.minCols, grid.maxCols);
  let rows = biased(grid.minRows, grid.maxRows);
  // Enforce at least 2 cells.
  while (cols * rows < 2) {
    if (cols < grid.maxCols) cols++;
    else if (rows < grid.maxRows) rows++;
    else break;
  }
  return { cols, rows };
}

const COLOR_COUNT = 8;

function pickColors(rng: Rng): number[] {
  // 1..4 distinct theme color indices.
  const n = rng.range(1, 4);
  const all = [0, 1, 2, 3, 4, 5, 6, 7];
  // Fisher-Yates partial shuffle.
  for (let i = 0; i < n; i++) {
    const j = i + rng.int(all.length - i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n).sort((a, b) => a - b);
}

function makeLed(ctx: GenContext): Panel {
  const { rng, params } = ctx;
  const colors = pickColors(rng);
  const textPos = rng.pick(['t', 'b', 'c'] as const);
  const text = randomText(rng);
  if (rng.chance(params.blinkProbability)) {
    const pattern = Array.from({ length: 8 }, () => rng.chance(0.5));
    // Avoid all-off patterns (would look dead).
    if (!pattern.some(Boolean)) pattern[rng.int(8)] = true;
    return { type: 'led', mode: 'rhythmic', colors, pattern, text, textPos };
  }
  return {
    type: 'led',
    mode: 'regular',
    colors,
    registryIndex: rng.int(REGISTRY_SIZE),
    text,
    textPos,
  };
}

function makeButton(ctx: GenContext, idCounter: { n: number }): Panel {
  const { rng } = ctx;
  const opacity = rng.pick(['opaque', 'transparent'] as const);
  const litColor = opacity === 'transparent' ? rng.int(COLOR_COUNT) : rng.chance(0.5) ? rng.int(COLOR_COUNT) : null;
  return {
    type: 'button',
    opacity,
    litColor,
    text: randomText(rng),
    textPos: rng.pick(['t', 'b'] as const),
    sharedTextKey: `btn-${idCounter.n++}`,
  };
}

// Sibling influence: LEDs make sibling LEDs slightly more likely.
function pickPanelType(rng: Rng, ledBoost: number): PanelType {
  const weights: Record<PanelType, number> = {
    blank: 1,
    led: 2 + ledBoost,
    button: 2,
  };
  const total = weights.blank + weights.led + weights.button;
  let r = rng.next() * total;
  if ((r -= weights.blank) < 0) return 'blank';
  if ((r -= weights.led) < 0) return 'led';
  return 'button';
}

function makePanel(ctx: GenContext, type: PanelType, idCounter: { n: number }): Panel {
  switch (type) {
    case 'blank':
      return { type: 'blank' };
    case 'led':
      return makeLed(ctx);
    case 'button':
      return makeButton(ctx, idCounter);
  }
}

function genFrame(ctx: GenContext, level: number, idCounter: { n: number }, ledBoost: number): FrameNode {
  ctx.count++;
  const isRoot = level === 0;
  const makeLeaf = !isRoot && ctx.rng.chance(leafProbability(ctx, level));

  if (makeLeaf || level >= ctx.params.maxDepth) {
    const type = pickPanelType(ctx.rng, ledBoost);
    return { kind: 'leaf', level, panel: makePanel(ctx, type, idCounter) };
  }

  const { cols, rows } = pickGrid(ctx, level);
  const children: FrameNode[] = [];
  let siblingLedBoost = 0;
  for (let i = 0; i < cols * rows; i++) {
    const child = genFrame(ctx, level + 1, idCounter, siblingLedBoost);
    if (child.kind === 'leaf' && child.panel.type === 'led') siblingLedBoost += 1.5;
    children.push(child);
  }
  return { kind: 'node', level, cols, rows, children };
}

export function generateBoard(rng: Rng, params: GenerationParams): FrameNode {
  const ctx: GenContext = { rng, params, count: 0 };
  return genFrame(ctx, 0, { n: 0 }, 0);
}
