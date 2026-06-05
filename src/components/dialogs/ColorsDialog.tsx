// Editor for the 8 theme colors. Semantic roles (positive/warning/danger) are labeled.

import { useState } from 'react';
import type { ThemeId } from '../../board/model';
import { THEMES, defaultColors } from '../../theme/metallic';
import { Dialog } from './Dialog';

interface Props {
  theme: ThemeId;
  colors: string[]; // current 8 hex colors
  onApply: (colors: string[]) => void;
  onClose: () => void;
}

export function ColorsDialog({ theme, colors, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<string[]>(colors);
  const semantic = THEMES[theme].semantic;
  const roleFor = (i: number): string => {
    if (i === semantic.positive) return 'positive';
    if (i === semantic.warning) return 'warning';
    if (i === semantic.danger) return 'danger';
    return '';
  };

  const setColor = (i: number, value: string) => setDraft((d) => d.map((c, j) => (j === i ? value : c)));

  return (
    <Dialog
      title="Change theme colors"
      onClose={onClose}
      footer={
        <>
          <button onClick={() => setDraft(defaultColors(theme))}>Reset to defaults</button>
          <span style={{ flex: 1 }} />
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply
          </button>
        </>
      }
    >
      <div className="color-grid">
        {draft.map((c, i) => (
          <label key={i} className="color-cell">
            <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} />
            <span className="color-meta">
              <strong>{i}</strong>
              {roleFor(i) && <em>{roleFor(i)}</em>}
            </span>
          </label>
        ))}
      </div>
    </Dialog>
  );
}
