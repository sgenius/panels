// App root: loads/creates the board, applies theme, runs the tick, wires menu.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BoardConfig } from './board/model';
import { DEFAULT_GENERATION_PARAMS } from './board/model';
import { generateBoard } from './board/generate';
import { makeRng, randomSeed } from './board/prng';
import { deserializeFromHash, readHash, writeHash } from './serialize/url';
import { applyThemeColors, defaultColors } from './theme/metallic';
import { useRuntime } from './runtime/store';
import { useTickEngine } from './runtime/tick';
import { Board } from './components/Board';
import { ContextMenu, type MenuState } from './components/ContextMenu';

function createBoard(): BoardConfig {
  const rng = makeRng(randomSeed());
  return {
    root: generateBoard(rng, DEFAULT_GENERATION_PARAMS),
    theme: 'metallic',
    colors: defaultColors('metallic'),
  };
}

function loadOrCreate(): BoardConfig {
  const fromUrl = deserializeFromHash(readHash());
  if (fromUrl) {
    return {
      ...fromUrl,
      colors: fromUrl.colors.length === 8 ? fromUrl.colors : defaultColors(fromUrl.theme),
    };
  }
  const fresh = createBoard();
  writeHash(fresh);
  return fresh;
}

export default function App() {
  const [config, setConfig] = useState<BoardConfig>(loadOrCreate);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const resetRuntime = useRuntime((s) => s.reset);

  useTickEngine();

  // Apply theme colors as CSS variables on the document root.
  useEffect(() => {
    applyThemeColors(document.documentElement, config.colors);
  }, [config.colors]);

  const newRandomBoard = useCallback(() => {
    const fresh = createBoard();
    writeHash(fresh);
    resetRuntime();
    setConfig(fresh);
  }, [resetRuntime]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = (e.target as HTMLElement).closest('[data-panel-path]');
    setMenu({
      x: e.clientX,
      y: e.clientY,
      panelPath: target?.getAttribute('data-panel-path') ?? null,
      panelType: target?.getAttribute('data-panel-type') ?? null,
    });
  }, []);

  const boardEl = useMemo(() => <Board root={config.root} />, [config.root]);

  return (
    <div onContextMenu={onContextMenu} style={{ width: '100%', height: '100%' }}>
      {boardEl}
      {menu && (
        <ContextMenu menu={menu} onClose={() => setMenu(null)} onNewRandomBoard={newRandomBoard} />
      )}
    </div>
  );
}
