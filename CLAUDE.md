# CLAUDE.md

Guidance for working in this repo. Read this first.

## What this is

**Panels App** — a frontend-only React "interface toy" that generates pseudo-random
sci-fi/retro control-panel UIs. A recursive tree of grid **frames** holds **panels**
(LEDs, buttons, blanks) styled with a skeuomorphic **metallic** theme. The board state
is serialized into the URL hash so any board can be recreated by sharing its link.

- Product spec: `docs/prod-spec.md` (the source of truth for behavior)
- Technical spec / architecture decisions: `docs/tech-spec.md`

When a request conflicts with the specs, prefer the user's latest instruction, then
update the relevant spec to match.

## Tech stack

React 18 + TypeScript + Vite. State via **Zustand**. Tests via **Vitest**. No backend,
no router — URL state is read/written directly through the History API hash.

**Rendering is CSS/HTML, not Canvas** — deliberately. CSS Grid maps 1:1 onto the frame
tree, resize is automatic, right-click hit-testing is free via DOM events, and the
metallic look is pure CSS. See `docs/tech-spec.md §2` for the full rationale. A
per-panel `<canvas>` escape hatch is allowed later if a panel needs pixel effects.

## Commands

- `npm run dev` — Vite dev server (port 5173). Prefer the Preview tool's launch config
  (`.claude/launch.json`, server name `panels-dev`) over running this in Bash.
- `npm test` — run Vitest once. **Use `--reporter=basic`** for clean, parseable output.
- `npm run build` — `tsc -b` + production build.

### Running tests — important

- Run tests **once, in a single invocation, and wait for it to finish.** Do NOT fire
  off multiple test runs in parallel. Each Vitest run spawns ~13 worker processes; in a
  past session repeated/overlapping runs left ~90 orphaned `node` processes that
  exhausted memory and produced a misleading "Fatal process out of memory" /
  "no tests" error that looked like a test failure but was an environment problem.
- If you see that error or hangs, check for stray processes and kill only the
  vitest-related ones (match on command line, don't blanket-kill `node`):
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'vitest' } | % { Stop-Process -Id $_.ProcessId -Force }`
- Avoid piping `vitest` through `tail` — output is buffered until completion and the
  captured file looks empty mid-run.

## Architecture

State is split into two intentionally separate domains:

1. **Board configuration (the tree)** — `BoardConfig` { root frame, theme, 8 colors }.
   Created once at load (or restored from the URL), changes only on new-board/config
   edits. **This is what gets serialized.** Held in React state (`App.tsx`).
2. **Runtime state** — `tick` + 6-value `registry` + button on/off + shared text.
   Changes every tick, **never serialized.** Lives in a Zustand store OUTSIDE React
   render (`src/runtime/store.ts`) so panels subscribe only to the slices they read and
   a tick re-renders just the affected panels. This selective subscription is what
   keeps the DOM approach performant — preserve it.

### Source layout

```
src/
  board/      model.ts (types + constants), prng.ts (seedable mulberry32),
              text.ts (Latin-1-biased random labels), generate.ts (recursive gen),
              tree.ts (path get/update + power-panel helpers)
  runtime/    store.ts (Zustand: tick+registry), tick.ts (useTickEngine, TICK_MS)
  serialize/  encode.ts, decode.ts (DFS), url.ts (hash <-> BoardConfig)
  theme/      metallic.ts (theme + 8 colors as CSS vars), theme.css
  components/ Board, Frame (recursive), Panel (dispatcher),
              panels/{Blank,Led,Button}Panel, ContextMenu
  App.tsx, main.tsx
```

## Key behaviors & invariants

- **Generation** (`board/generate.ts`): recursive. Leaf probability rises with depth
  and under a soft node cap (`maxNodes`) that raises P(leaf) as the count grows.
  Root is always a node frame.
- **Aspect-aware grids**: a child of a `cols×rows` grid has
  `childAspect = parentAspect × rows / cols`. Aspect is threaded from the viewport
  through generation, and grid dimensions are chosen to keep children near-square
  (short axis small, long axis sized to square things up). This is what prevents skinny
  cells — applied to ALL node cells, not just already-skinny ones, because skinny
  *leaves* are created by the *parent's* grid choice.
- **Panel types**: blank, LED (regular/rhythmic), button, **flick switch** (`S`,
  user-only on/off in the store), **bar meter** (`M`, value derived from the registry;
  orientation from cell aspect via container query; subtype 0=thermometer/fill,
  1=radio/stick). **Subtypes** are theme-declared with round-robin fallback
  (`theme/metallic.ts resolveSubtype`).
- **Power panels** (`board/tree.ts`, `Frame.tsx`): a button/switch whose text is a
  trigger (`on`/`off`/`on/off`/`power`, case-insensitive) is a Power panel — derived
  from text only, no dedicated token. If a Power child is off, its siblings and their
  subtrees render forced-off (OR across multiple); **Power panels are exempt** (never
  powered off — `Frame` passes `poweredOff=false` to power children). System-created
  Power panels start on (`store.primePower`, called from `App` on load/new-board).
  Bar-meter `min`/`max` may be negative; serialized with an `n` prefix (the `-` is the
  token delimiter, like `s` for subtract in value expressions).
- **Registry tick** (`runtime/store.ts advance`): the LAST registry value is a counter
  (+1 each tick, wraps at 255). Each tick changes **2–4** of the remaining pool values,
  with **index 0 always** among them. Selection uses a **shuffle** of the other pool
  indices — NOT rejection sampling, which could spin forever once the minimum is ≥2.
- **Tick cadence**: `TICK_MS` in `runtime/tick.ts`, default 250ms (tunable).
- **LED rendering** (`theme.css`): the lit bulb's `background` (a gradient, can't be
  interpolated → snaps) and its glow `box-shadow` (color IS interpolated) must NOT have
  a CSS transition — otherwise on a color change the glow lags a different color than
  the bulb. LEDs snap on/off intentionally.
- **Panel text & layout** (`Frame.tsx`, `panels/util.ts`, `theme.css`): the panel is a
  CSS size container (`container-type: size`); circular/inner elements are sized in
  `cqmin`/`cqw`/`cqh` and buttons use `%` padding so nothing clips the panel border at
  any cell size. Label font size (`--label-size`, set per-leaf by level) is larger on
  levels 0–1 and graduates down with depth. Text position is forced to center for
  panels at level > 2 (`effectiveTextPos`). Buttons render text on their face when the
  effective position is center; above/below for top/bottom.

## Serialization (most correctness-sensitive code)

URL hash = `<boardTree> ; <themeId> ; <8 colors as 48 hex chars>`.

The board tree uses a **DFS, self-delimiting pre-order** format (`docs/tech-spec.md
§5.8`): an `F{cols}!{rows}` token encodes its exact child count (`cols×rows`), so
decode just reads a token and recurses that many times — no level markers or brackets.
Node IDs: `F` frame, `X` blank, `K` rhythmic LED, `D` regular LED, `B` button; `!`
separates config values, `-` separates tokens.

Always keep the **round-trip test green**: encode → decode → encode must be stable.
Decoding is backward-compatible with the older short `D{colors}!{index}` regular-LED
form (text defaults to empty, position to center).

Panel `text` (K/D/B tokens) is escaped via `serialize/textCodec.ts` so it can't
collide with the `!`/`-`/`;` delimiters or URL-special chars: `escapeText` =
`encodeURIComponent` plus escaping `-` and `!` (which encodeURIComponent leaves
alone); `unescapeText` reverses it and is tolerant of malformed input.

## Conventions

- TypeScript strict mode with `noUnusedLocals`/`noUnusedParameters` — remove dead code
  or tsc fails. Run `npm run build` (or `tsc -b`) to catch this.
- Pure logic (generation, serialization, store) is unit-tested; UI is verified visually
  via the Preview tool screenshot. Add/keep tests when touching `board/`, `serialize/`,
  or `runtime/`.
- All randomness goes through the seedable `Rng` (`board/prng.ts`) for reproducibility.
- Commit only when asked. Verify with `npm run build` + `npm test` first.
