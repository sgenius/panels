// Generic modal shell used by all config dialogs.

import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ title, onClose, children, footer }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="dialog-header">
          <span>{title}</span>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Reusable swatch row for picking one or many of the 8 theme colors.
export function ColorSwatches({
  colors,
  selected,
  onToggle,
  multi = true,
}: {
  colors: string[];
  selected: number[];
  onToggle: (index: number) => void;
  multi?: boolean;
}) {
  return (
    <div className="swatch-row">
      {colors.map((c, i) => (
        <button
          key={i}
          type="button"
          className={`swatch${selected.includes(i) ? ' selected' : ''}`}
          style={{ background: c }}
          onClick={() => onToggle(i)}
          aria-label={`Color ${i}${multi ? '' : ''}`}
          title={`Color ${i}`}
        />
      ))}
    </div>
  );
}
