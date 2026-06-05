// Right-click context menu. Records which panel was targeted.
// Config/theme dialogs are stubbed for v0 (wired in a later phase).

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
  onNewRandomBoard: () => void;
}

export function ContextMenu({ menu, onClose, onNewRandomBoard }: Props) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('keydown', (e) => e.key === 'Escape' && onClose());
    return () => window.removeEventListener('click', close);
  }, [onClose]);

  const stub = (label: string) => () => {
    // eslint-disable-next-line no-alert
    alert(`${label} — coming in a later phase.\nTarget: ${menu.panelType ?? 'board'} @ ${menu.panelPath ?? '-'}`);
    onClose();
  };

  return (
    <div className="context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
      <button onClick={stub('Configure...')} disabled={!menu.panelPath}>
        Configure{menu.panelType ? ` ${menu.panelType}` : ''}…
      </button>
      <button onClick={stub('Change theme...')}>Change theme…</button>
      <button onClick={stub('Change theme colors...')}>Change theme colors…</button>
      <button
        onClick={() => {
          onNewRandomBoard();
          onClose();
        }}
      >
        New random board
      </button>
      <button onClick={stub('New board with parameters...')}>New board with parameters…</button>
    </div>
  );
}
