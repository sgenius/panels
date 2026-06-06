// App root: loads/creates the board, applies theme, runs the tick, wires menu + dialogs.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardConfig, GenerationParams, Panel, ThemeId } from './board/model';
import { DEFAULT_GENERATION_PARAMS } from './board/model';
import { generateBoard } from './board/generate';
import { makeRng, randomSeed } from './board/prng';
import { collectPowerKeys, getPanelByPath, updatePanelByPath } from './board/tree';
import { deserializeFromHash, readHash, writeHash } from './serialize/url';
import { applyThemeColors, defaultColors } from './theme/metallic';
import { useRuntime } from './runtime/store';
import { useTickEngine } from './runtime/tick';
import { Board } from './components/Board';
import { ContextMenu, type MenuState } from './components/ContextMenu';
import { ConfigDialog } from './components/dialogs/ConfigDialog';
import { ThemeDialog } from './components/dialogs/ThemeDialog';
import { ColorsDialog } from './components/dialogs/ColorsDialog';
import { NewBoardDialog } from './components/dialogs/NewBoardDialog';

type DialogState =
  | { kind: 'config'; path: string }
  | { kind: 'theme' }
  | { kind: 'colors' }
  | { kind: 'newboard' }
  | null;

function createBoard(params: GenerationParams, theme: ThemeId, colors: string[]): BoardConfig {
  const rng = makeRng(randomSeed());
  const aspect = window.innerWidth / window.innerHeight;
  return { root: generateBoard(rng, params, aspect), theme, colors };
}

function loadOrCreate(params: GenerationParams): BoardConfig {
  const fromUrl = deserializeFromHash(readHash());
  if (fromUrl) {
    return {
      ...fromUrl,
      colors: fromUrl.colors.length === 8 ? fromUrl.colors : defaultColors(fromUrl.theme),
    };
  }
  const fresh = createBoard(params, 'metallic', defaultColors('metallic'));
  writeHash(fresh);
  return fresh;
}

export default function App() {
  const [params, setParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS);
  // One-time board init via a ref guard. This MUST run exactly once: it has side
  // effects (random board creation, writeHash, priming Power panels on). React
  // StrictMode double-invokes useState initializers, which would otherwise build a
  // second random board and prime the discarded board's keys — leaking "on" state
  // onto unrelated panels.
  const initRef = useRef<BoardConfig | null>(null);
  if (initRef.current === null) {
    const c = loadOrCreate(DEFAULT_GENERATION_PARAMS);
    const { buttons, switches } = collectPowerKeys(c.root);
    useRuntime.getState().primePower(buttons, switches); // Power panels start on
    initRef.current = c;
  }
  const [config, setConfig] = useState<BoardConfig>(initRef.current);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const resetRuntime = useRuntime((s) => s.reset);
  const setSharedText = useRuntime((s) => s.setSharedText);
  const primePower = useRuntime((s) => s.primePower);

  useTickEngine();

  // Apply theme colors as CSS variables on the document root.
  useEffect(() => {
    applyThemeColors(document.documentElement, config.colors);
  }, [config.colors]);

  // Persist any config change to the URL.
  const commit = useCallback((next: BoardConfig) => {
    setConfig(next);
    writeHash(next);
  }, []);

  const newBoard = useCallback(
    (p: GenerationParams) => {
      const fresh = createBoard(p, config.theme, config.colors);
      resetRuntime();
      const { buttons, switches } = collectPowerKeys(fresh.root);
      primePower(buttons, switches);
      commit(fresh);
    },
    [commit, config.theme, config.colors, resetRuntime, primePower],
  );

  const applyPanel = useCallback(
    (path: string, panel: Panel) => {
      // Keep the runtime shared-text store in sync for buttons.
      if (panel.type === 'button' && panel.sharedTextKey) setSharedText(panel.sharedTextKey, panel.text);
      commit({ ...config, root: updatePanelByPath(config.root, path, panel) });
    },
    [commit, config, setSharedText],
  );

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
  const configPanel = dialog?.kind === 'config' ? getPanelByPath(config.root, dialog.path) : null;

  return (
    <div onContextMenu={onContextMenu} style={{ width: '100%', height: '100%' }}>
      {boardEl}

      {menu && (
        <ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onConfigure={(path) => setDialog({ kind: 'config', path })}
          onChangeTheme={() => setDialog({ kind: 'theme' })}
          onChangeColors={() => setDialog({ kind: 'colors' })}
          onNewRandomBoard={() => newBoard(params)}
          onNewBoardWithParams={() => setDialog({ kind: 'newboard' })}
        />
      )}

      {dialog?.kind === 'config' && configPanel && (
        <ConfigDialog
          panel={configPanel}
          colors={config.colors}
          onApply={(panel) => applyPanel(dialog.path, panel)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'theme' && (
        <ThemeDialog
          theme={config.theme}
          onApply={(theme) => commit({ ...config, theme, colors: defaultColors(theme) })}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'colors' && (
        <ColorsDialog
          theme={config.theme}
          colors={config.colors}
          onApply={(colors) => commit({ ...config, colors })}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'newboard' && (
        <NewBoardDialog
          params={params}
          onCreate={(p) => {
            setParams(p);
            newBoard(p);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
