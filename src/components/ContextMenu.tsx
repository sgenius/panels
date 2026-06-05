// Right-click context menu. Records which panel was targeted and dispatches
// to the dialog handlers in App.

import { useEffect } from 'react';

export interface MenuState {
  x: number;
  y: number;
  panelPath: string | null;
  panelType: string | null;
}

interface Props {
  menu: MenuState;
  onClose: () => void;
  onConfigure: (path: string) => void;
  onChangeTheme: () => void;
  onChangeColors: () => void;
  onNewRandomBoard: () => void;
  onNewBoardWithParams: () => void;
}

export function ContextMenu({
  menu,
  onClose,
  onConfigure,
  onChangeTheme,
  onChangeColors,
  onNewRandomBoard,
  onNewBoardWithParams,
}: Props) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  // Keep the menu within the viewport.
  const style: React.CSSProperties = {
    left: Math.min(menu.x, window.innerWidth - 220),
    top: Math.min(menu.y, window.innerHeight - 210),
  };

  return (
    <div className="context-menu" style={style} onClick={(e) => e.stopPropagation()}>
      <button onClick={run(() => menu.panelPath && onConfigure(menu.panelPath))} disabled={!menu.panelPath}>
        Configure{menu.panelType ? ` ${menu.panelType}` : ''}…
      </button>
      <button onClick={run(onChangeTheme)}>Change theme…</button>
      <button onClick={run(onChangeColors)}>Change theme colors…</button>
      <div className="context-sep" />
      <button onClick={run(onNewRandomBoard)}>New random board</button>
      <button onClick={run(onNewBoardWithParams)}>New board with parameters…</button>
    </div>
  );
}
