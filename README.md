# Panels

[![Build & Deploy](https://github.com/OWNER/REPO/actions/workflows/deploy.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/deploy.yml)

<!-- Replace OWNER/REPO above with your GitHub org/user and repository name. -->

An **interface toy**: a frontend-only React app that generates pseudo-random
sci-fi / retro control-panel UIs. A recursive tree of grid **frames** holds
**panels** — LEDs, buttons, flick switches, bar meters, and blanks — styled with a
skeuomorphic **metallic** theme. Every board is serialized into the URL, so any layout
can be shared and recreated just by sharing its link.

There is no backend, no account, and no tracking — it's a single static page.

## Features

- **Recursive board** of CSS-Grid frames that fills the viewport and reflows on resize.
- **Panel types**: blank, LED (steady or rhythmic/blinking), button (opaque or
  semi-transparent, text on face/above/below), flick switch (3D toggle), and bar meter
  (thermometer or radio style, value driven by the global registry).
- **Live animation** via a global "registry" updated on a tick.
- **Power panels**: a button/switch labelled `on`/`off`/`on/off`/`power` acts as a
  master switch that powers its sibling panels off.
- **Shareable URLs**: the whole board is encoded in the URL hash.
- **Right-click to configure**: per-panel settings, theme colors, and new-board
  parameters.

## Tech stack

React 18 + TypeScript + Vite, with Zustand for runtime state and Vitest for tests.
See [`docs/tech-spec.md`](docs/tech-spec.md) for architecture and
[`docs/prod-spec.md`](docs/prod-spec.md) for the product behavior.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) **18+** and npm.

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:5173
```

Open the printed URL in a browser. **Right-click** any panel for the context menu
(Configure, change theme/colors, new board).

## Scripts

| Command            | What it does                                             |
|--------------------|----------------------------------------------------------|
| `npm run dev`      | Start the Vite dev server (hot reload) on port 5173.     |
| `npm run build`    | Type-check (`tsc -b`) and build the production bundle to `dist/`. |
| `npm run preview`  | Serve the built `dist/` locally to verify the production build. |
| `npm test`         | Run the unit tests once (Vitest).                        |
| `npm run test:watch` | Run the tests in watch mode.                           |

## Building & deploying

```bash
npm run build      # outputs static files to dist/
npm run preview    # optional: preview the production build locally
```

`dist/` is a fully static site (HTML, CSS, JS) — deploy it to any static host such as
GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any web server / object store.
The build uses **relative asset paths** (`base: './'` in
[`vite.config.ts`](vite.config.ts)), so it works whether it's served from a domain root
or a subpath (e.g. a GitHub Pages project URL).

### Automatic deploy via GitHub Pages

This repo includes a GitHub Actions workflow
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that builds and runs
the tests on every push/PR, and **deploys to GitHub Pages** on pushes to the default
branch (`main` or `master`).

One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**. After the next push, the site publishes to your Pages URL.

> **Important:** use the **GitHub Actions** source, *not* "Deploy from a branch."
> The workflow builds the app and publishes the contents of `dist/` (so the served
> `/index.html` is the built `dist/index.html`). The `index.html` at the repo root is
> only Vite's dev entry point — serving the repo root directly (as branch deploys do)
> would not work.

## Project structure

```
src/
  board/       data model, seeded PRNG, board generation, tree helpers
  runtime/     Zustand store (tick + registry + control state) and the tick engine
  serialize/   URL encode/decode (board tree + theme + colors)
  theme/       metallic theme (colors as CSS variables) and styles
  components/  Board, recursive Frame, panels, context menu, config dialogs
  App.tsx, main.tsx
docs/          prod-spec.md (behavior), tech-spec.md (architecture)
```

## Security & privacy

- **Frontend-only and self-contained.** No backend, no network requests, no cookies,
  and no `localStorage`/`sessionStorage`. The only persisted state is in the URL hash.
- **No unsafe rendering.** All panel text is rendered as React text (auto-escaped);
  there is no `dangerouslySetInnerHTML`, `eval`, or `innerHTML`. URL input is parsed
  defensively: malformed board data falls back to a fresh board, theme colors are
  validated as strict 6-digit hex before use, and the theme id is checked against the
  known themes.
- **Audit note.** `npm audit` reports advisories only in **dev/build tooling**
  (esbuild → Vite → Vitest); these affect the local dev server only and are **not part
  of the published `dist/` bundle**. The runtime dependencies (react, react-dom,
  zustand) are clean.
