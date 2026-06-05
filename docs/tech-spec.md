# Panels App — Technical Specification & Implementation Plan

This document translates [`prod-spec.md`](./prod-spec.md) into a technical plan: the
rendering technology decision, the architecture, the data model, and a phased
implementation roadmap.

---

## 1. Summary & recommendation

**Build the board with React + CSS/HTML (CSS Grid + DOM elements), not Canvas.**

The product is, at its core, a **recursive grid of interactive widgets** that must
reflow on resize, capture right-clicks per-panel, and re-skin via a theme. Every one
of those requirements is something the browser's layout, event, and styling engines
already do for us. Canvas would force us to re-implement layout, hit-testing, text,
and DPI handling by hand for very little gain at this scale.

We keep Canvas in our back pocket as a **per-panel escape hatch** (Section 5.4): if a
specific panel ever needs pixel-level effects (CRT scanlines, fluid metallic
reflections, oscilloscope traces), that single panel can render into its own
`<canvas>` while everything around it stays in the DOM.

---

## 2. Rendering technology comparison

The decision is "how do we draw the board and its panels." Both options use React;
the question is what React renders into.

### Option A — Pure CSS / HTML (DOM elements styled with CSS)

The frame tree becomes nested `<div>`s. Each node frame is a `display: grid`
container; each leaf frame holds a panel component. Panels are styled with CSS
gradients, `box-shadow`, and transforms.

**Pros**
- **CSS Grid is a 1:1 match for the spec.** "A grid of N columns × M rows, equal
  cells, filling 100% of the frame, ordered left-to-right top-to-bottom" *is* the
  default behavior of `grid-template-columns/rows` with `fr` units. The frame
  division model maps directly onto the layout engine.
- **Responsiveness is free.** "The UI adapts when the window is resized" requires
  zero code — percentage/`fr`-based grids reflow automatically. No resize listeners,
  no manual recompute.
- **Hit-testing is free.** "Right-click registers which panel was clicked" is just an
  `onContextMenu` handler on the panel element. With Canvas we'd hand-roll
  point-in-rect tests against the frame tree.
- **Skeuomorphism is very achievable in CSS.** Metallic plates (layered
  `linear-gradient` + `repeating-linear-gradient` for brushed steel), 3D buttons
  (`box-shadow` + `:active` depress), recessed LED wells (inset shadows), and glow
  (`box-shadow`/`filter: drop-shadow` on "on" state) are all standard CSS technique.
- **Context menus, config popups, color pickers** are ordinary DOM/React — no
  overlay-coordinate math.
- **Theming via CSS custom properties.** The 8 theme colors and metallic surface
  become CSS variables on a root element; "change theme colors" updates variables and
  the whole board re-skins instantly, no redraw loop.
- **Plays to React's strengths.** React is a DOM reconciler. The component tree mirrors
  the frame tree directly, and debugging uses normal DevTools (inspect any panel).
- **Accessibility & text** come for free (real text nodes, focusable buttons).

**Cons**
- **DOM node count** grows with the tree. Worst-case theoretical fan-out is large,
  but it's bounded (Section 5.2) and realistic boards are dozens–low-hundreds of
  panels — well within DOM's comfort zone.
- **High-frequency animation across many nodes** can cause layout thrash *if done
  naively*. Mitigated by (a) a sane tick rate, (b) animating only compositor-friendly
  properties (color/opacity/box-shadow, not layout), and (c) fine-grained store
  subscriptions so only affected panels re-render (Section 4).
- **Pixel-perfect / continuous effects** (true fluid reflections, scanlines) are
  harder than in Canvas. → handled by the per-panel Canvas escape hatch.

### Option B — HTML Canvas (imperative draw into a `<canvas>`)

A single (or few) canvas; a render loop draws frames and panels each tick.

**Pros**
- **One render loop, many elements.** Excellent if we had thousands of constantly
  animating elements at 60fps — drawing is cheap and uniform.
- **Total pixel control.** Gradients, glows, noise, scanlines, oscilloscope sweeps,
  and analog reflections are natural here.
- **Animation cost is decoupled from element count** in the DOM sense — no reflow.

**Cons**
- **We must build a layout engine.** Grid math is simple, but we'd compute every
  frame's rectangle manually and recompute on every resize. The browser already does
  this perfectly for CSS Grid.
- **We must build hit-testing.** Mapping a right-click (x, y) back to "which panel" =
  walking the frame tree and testing rectangles ourselves, on every click.
- **Manual DPI handling.** Must scale the backing store by `devicePixelRatio` and
  redraw on resize or everything looks blurry.
- **Text is manual** (`fillText`, manual measurement/wrapping, no real font flow).
- **Popups/menus still need the DOM anyway** — so a Canvas build is *already* a hybrid,
  just with the harder half done the hard way.
- **Weak React integration.** React can't reconcile canvas pixels; the board becomes
  imperative `useRef` + draw code, losing the component model and DevTools
  introspection.
- **More code, slower v0.** Significantly more infrastructure before the first panel
  lights up.

### Verdict

| Requirement                          | CSS/HTML            | Canvas                      |
|--------------------------------------|---------------------|-----------------------------|
| Recursive grid layout                | ✅ Native (CSS Grid) | ⚠️ Build it                 |
| Resize / responsiveness              | ✅ Automatic         | ⚠️ Manual recompute+redraw  |
| Per-panel right-click hit-test       | ✅ DOM events        | ⚠️ Manual point-in-rect     |
| Skeuomorphic metallic look           | ✅ Good              | ✅ Excellent                |
| Continuous pixel effects             | ⚠️ Limited          | ✅ Excellent                |
| Context menus / popups / pickers     | ✅ Native DOM        | ⚠️ DOM overlay anyway       |
| Theming (live re-skin)               | ✅ CSS variables     | ⚠️ Redraw                   |
| React fit / debuggability            | ✅ Strong            | ⚠️ Imperative               |
| Time-to-first-panel                  | ✅ Fast              | ⚠️ Slow                     |
| Many elements @ 60fps                | ⚠️ Needs care       | ✅ Strong                   |

The only columns Canvas wins are pixel effects and raw high-frequency throughput —
neither of which v0 needs, and both of which we can opt into per-panel later. **CSS/HTML
wins decisively for this product.**

---

## 3. Proposed tech stack

- **React 18 + TypeScript** — typed data model is valuable for the serialization layer.
- **Vite** — fast dev server / build; matches a frontend-only SPA.
- **State:** a small external store with selector subscriptions. Recommend **Zustand**
  (or a hand-rolled `useSyncExternalStore`) so that on each tick only the panels that
  actually read a changed registry value re-render — critical for keeping the
  CSS/HTML approach smooth (Section 4).
- **No backend, no router library** — URL state is read/written directly via the
  History API (`window.location.hash`).
- **Styling:** CSS Modules or plain CSS with custom properties for theming. No heavy
  CSS framework (the look is bespoke skeuomorphism).
- **Testing:** Vitest for the pure logic that matters most — board generation and the
  serialize ⇄ deserialize round-trip.

---

## 4. State architecture (the key to performance)

Two distinct kinds of state, deliberately separated:

1. **Board configuration (the tree).** The frames/panels structure + each node's
   instantiation config. Created once at load, changes only on "new board" / config
   edits. This is what gets serialized to the URL.
2. **Runtime registry + tick.** `tick: 0–65535` and `registry: [6 × (0–255)]`. Changes
   every tick; **never serialized**.

The runtime store lives **outside React's render cycle** (Zustand /
`useSyncExternalStore`). The tick engine mutates it on an interval. Each panel
**subscribes only to the slices it reads** — a regular LED listening to registry[2]
re-renders only when registry[2] changes; a blank panel never re-renders on tick at
all. This is what makes "many DOM panels updating on a clock" cheap, and is the
linchpin that makes the CSS/HTML recommendation hold up.

The configuration tree is kept in React state/context since it changes rarely.

---

## 5. Architecture & modules

### 5.1 Data model (TypeScript)

```ts
type NodeId = string;

type FrameNode =
  | { kind: 'node'; level: number; cols: number; rows: number; children: BoardNode[] }
  | { kind: 'leaf'; level: number; panel: Panel };

type BoardNode = FrameNode;

type Panel =
  | { type: 'blank' }
  | { type: 'led'; mode: 'regular'; colors: number[]; registryIndex: number;
      text?: string; textPos: 't' | 'b' | 'c' }
  | { type: 'led'; mode: 'rhythmic'; colors: number[]; pattern: boolean[]; // length 8
      text?: string; textPos: 't' | 'b' | 'c' }
  | { type: 'button'; opacity: 'opaque' | 'transparent'; litColor: number | null;
      text?: string; textPos: 't' | 'b'; sharedTextKey: string };

interface BoardConfig {
  root: FrameNode;          // always kind: 'node', level 0
  theme: ThemeId;           // 'metallic'
  colors: string[];         // 8 theme colors (overrides)
}

interface GenerationParams {
  maxDepth: number;         // 1–6, default 4
  blinkProbability: number; // default 0.5
  gridMin: { cols: number; rows: number };
  gridMax: { cols: number; rows: number }; // cols ≤6, rows ≤4, ≥2 cells
}
```

### 5.2 Board generation (`board/generate.ts`)

Recursive descent per the spec's algorithm:
- Root (level 0) is always a node frame.
- For each frame: roll leaf-vs-node. **P(leaf) rises as level → maxDepth** (e.g.
  `p = level / maxDepth`, clamped); at maxDepth force leaf.
- Node frames: pick `cols ∈ [1,6]`, `rows ∈ [1,4]` with **smaller grids more likely
  at deeper levels** (bias the distribution downward by level), enforcing **≥2 cells**.
  Generate `cols × rows` children in row-major order.
- Leaf frames: pick a panel type. Apply **sibling-influence rules**: if a cell in a
  grid becomes an LED, raise P(LED) for remaining siblings in that grid.
- Panel instantiation rolls all per-panel config (colors, registry index, blink
  pattern via blinkProbability, random Unicode text, text position).
- **Bounding (soft cap):** the generator keeps a **running count of nodes created**.
  As the count approaches a configured recommended maximum (`maxNodes`), it **boosts
  P(leaf)** so frames increasingly resolve to panels instead of subdividing — e.g.
  blend the depth-based leaf probability with a pressure term
  `p_leaf = clamp(max(level / maxDepth, count / maxNodes))`, forcing leaves once the
  cap is reached. This degrades gracefully (no hard truncation) and keeps boards sane.
  `maxNodes` is a generation param.

#### Random text character set

LED/button text is "open" Unicode but **strongly biased toward Latin-1** characters
(letters, digits, common symbols). Implement as a weighted pick: high weight on a
Latin-1 set, small residual weight on a curated wider set (e.g. box-drawing, arrows,
Greek) so occasional exotic glyphs appear without harming legibility. Keep the wide
set curated to glyphs the chosen font renders.

A single seedable PRNG drives all "random" choices so a board is reproducible — useful
for tests and a possible future "seed in URL" optimization.

### 5.3 Rendering components

```
<App>
 ├─ <ThemeProvider>            // injects 8 colors + metallic surface as CSS vars
 ├─ <Board>                    // renders root FrameNode
 │   └─ <Frame>                // recursive; node → CSS Grid of <Frame>, leaf → <Panel>
 │        └─ <Panel> → <BlankPanel> | <LedPanel> | <ButtonPanel>
 ├─ <ContextMenu>              // on right-click; knows the target panel id
 ├─ <ConfigDialog>             // per-panel config (type-specific form)
 ├─ <ThemeDialog>, <ColorsDialog>, <NewBoardDialog>
 └─ <TickEngine/>              // headless; drives the runtime store
```

- `<Frame kind="node">` → `<div style="display:grid; grid-template-columns:repeat(cols,1fr); grid-template-rows:repeat(rows,1fr)">` mapping children in order. Frame reflow on resize is automatic.
- Panels read runtime state via store selectors (Section 4).
- The root fills the viewport (`100vw × 100vh`, `box-sizing: border-box`).

### 5.4 Per-panel Canvas escape hatch

A panel may internally render to a `<canvas>` sized to its frame (via
`ResizeObserver` + `devicePixelRatio`) without affecting the surrounding DOM layout.
Reserved for future panels needing pixel effects; **not used in v0**.

### 5.6 Tick engine (`runtime/tick.ts`)

- `setInterval` (or rAF-gated) at a **configurable interval**, exposed as a tunable
  `TICK_MS` constant, **default 250 ms** for v0. (Single-digit ms as the spec's "every
  few ms" suggests would be wasteful and isn't needed for legible blinking.)
- Each tick: `tick = (tick + 1) % 65536`; update the 6 registry values (v0: random
  0–255). Writes to the external store; subscribed panels re-render selectively.
- Rhythmic LEDs derive on/off from `pattern[tick % 8]` — pure function of tick, no
  per-panel state needed.

### 5.7 Theming (`theme/metallic.ts`)

- A JSON theme object: metallic surface definition + 8 colors (3 semantic: warning,
  danger, positive; 5 free). Exposed as CSS custom properties.
- Metallic plate, 3D button, recessed LED well are CSS recipes keyed off those vars.
- "Change theme colors" mutates the color vars live; "change theme" swaps the object.

### 5.8 Serialization (`serialize/`)

The most correctness-sensitive module — covered by round-trip tests.

**Chosen format: self-delimiting pre-order (DFS).** `prod-spec.md` now leaves the
traversal open ("*could* be traversed in a BFS fashion"), so we serialize in the same
DFS order the generator builds the tree. This removes the level markers (`L{n}`),
removes the BFS↔DFS reconciliation, and lets encode/decode/generate share one
recursive shape — strictly simpler and more compact code.

**Why no markers are needed:** a node frame's token `F{cols}!{rows}` already encodes
its **exact child count** = `cols × rows`. So a pre-order stream is fully
self-delimiting: read a token; if it's `F`, recurse exactly `cols × rows` times to
collect its children; otherwise it's a leaf panel. No level numbers, no brackets, no
end-of-children sentinels. Level is implicit in recursion depth (not stored).

**Node strings** are unchanged from the spec's table — `{Serialization ID}{config}`
with `!` between config values, and `-` between node strings:

| Node        | ID | Config                                   | Example          |
|-------------|----|------------------------------------------|------------------|
| Node frame  | F  | `{cols}!{rows}`                           | `F2!5`           |
| Blank       | X  | —                                        | `X`              |
| Blinking LED| K  | `{colors}!{pattern}!{text}!{pos t/b/c}`  | `K0345!01101001!Hi!t` |
| Regular LED | D  | `{colors}!{registry index}`              | `D012!2`         |
| Button      | B  | `{o/t}!{lit color or x}!{text}!{pos t/b}`| `Bt!2!hi!b`      |

**Encode (pre-order):**
```
emit(node):
  if node is leaf:  out += panelToken(node.panel) + '-'
  else:             out += 'F' + cols + '!' + rows + '-';  for child in children: emit(child)
```

**Decode (mirror):** tokenize by `-`, walk a cursor:
```
read():
  tok = tokens[cursor++]
  if tok starts with 'F':
     (cols, rows) = parse(tok)
     children = [ read() for _ in range(cols*rows) ]   // recursion consumes the stream
     return NodeFrame(cols, rows, children)
  else:
     return LeafFrame(parsePanel(tok))
root = read()   // consumes exactly one full tree
```

**Worked example.** Root `F2!1` (2 cells) → child 1 = Blank, child 2 = `F1!2`
(2 cells) → Blinking LED, Regular LED:

```
F2!1-X-F1!2-K0345!01101001!Hi!t-D012!2-
```

Decode: `F2!1` wants 2 children → `X` (leaf), then `F1!2` wants 2 children →
`K…` (leaf), `D…` (leaf). Stream fully consumed, tree reconstructed unambiguously.

- **Board variables:** theme + the 8 colors appended as a second segment.
- **URL:** store the whole thing in `location.hash`; keep it compact. Update the hash
  after generating a new board; on load, parse hash → if present and valid, rebuild;
  else generate fresh and write hash.
- **Tests:** generate random boards (seeded PRNG) → encode → decode → re-encode and
  assert byte-for-byte equality (round-trip), plus structural equality of the trees.

---

## 6. Implementation phases

1. **Scaffold** — Vite + React + TS, folder structure, CSS-vars theme skeleton, empty
   full-viewport board.
2. **Data model + generation** — typed model, seedable PRNG, recursive generator with
   depth/grid biasing and sibling-influence; render plain colored frames (no styling)
   to verify the tree + CSS Grid layout and resize behavior.
3. **Runtime store + tick engine** — external store, tick loop, registry; wire
   selective subscriptions.
4. **Panels v1** — Blank, Regular LED, Rhythmic LED, Button with real metallic
   skeuomorphic styling and state wiring.
5. **Serialization** — encode/decode + URL load/save; **round-trip tests** as the
   gate. Reproduce a board from a pasted URL.
6. **Interaction** — right-click context menu (panel-aware), per-panel Config dialog,
   Theme / Theme-colors / New-random-board / New-board-with-params dialogs.
7. **Polish** — metallic reflections, LED glow/well depth, button depress feel,
   tune tick rate and generation distributions; verify resize across sizes.

---

## 7. Decisions & remaining risks

**Resolved:**
- **Tick rate** → tunable `TICK_MS`, **default 250 ms** for v0 (Section 5.6).
- **Board size cap** → soft cap via running node count that **raises P(leaf) as the
  count nears `maxNodes`**; no hard truncation (Section 5.2).
- **Serialization traversal** → **DFS / self-delimiting pre-order** (Section 5.8);
  `prod-spec.md` was loosened to allow this. Locked down with round-trip tests.
- **Random text** → open Unicode, **strongly biased to Latin-1** via weighted pick
  over a curated wide set (Section 5.2).

**Remaining risks:**
- **URL length.** Large boards yield long hashes. The DFS scheme is already compact;
  a future option is to store only a seed + params instead of the full tree.
- **Wide-glyph rendering.** The small residual set of exotic glyphs must be curated to
  what the chosen font renders, so no tofu (□) appears.
- **`maxNodes` tuning.** The exact cap and the leaf-pressure blend need playtesting to
  hit visually pleasing density across viewport sizes.

---

## 8. Proposed structure

```
src/
  board/        generate.ts, model.ts, prng.ts
  runtime/      store.ts, tick.ts
  serialize/    encode.ts, decode.ts, url.ts
  theme/        metallic.ts, theme.css
  components/   Board, Frame, panels/(Blank,Led,Button),
                ContextMenu, dialogs/(Config,Theme,Colors,NewBoard)
  App.tsx, main.tsx
docs/           prod-spec.md, tech-spec.md
```
