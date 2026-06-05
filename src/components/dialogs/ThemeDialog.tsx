// Theme selector. Only "metallic" exists for now.

import { useState } from 'react';
import type { ThemeId } from '../../board/model';
import { THEMES } from '../../theme/metallic';
import { Dialog } from './Dialog';

interface Props {
  theme: ThemeId;
  onApply: (theme: ThemeId) => void;
  onClose: () => void;
}

export function ThemeDialog({ theme, onApply, onClose }: Props) {
  const [sel, setSel] = useState<ThemeId>(theme);
  const ids = Object.keys(THEMES) as ThemeId[];

  return (
    <Dialog
      title="Change theme"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              onApply(sel);
              onClose();
            }}
          >
            Apply
          </button>
        </>
      }
    >
      {ids.map((id) => (
        <label key={id} className="radio block">
          <input type="radio" checked={sel === id} onChange={() => setSel(id)} /> {THEMES[id].name}
        </label>
      ))}
      <p className="dialog-note">Applying a theme resets the 8 colors to that theme's defaults.</p>
    </Dialog>
  );
}
