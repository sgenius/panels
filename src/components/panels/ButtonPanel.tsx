// Button panel: depressible button, opaque or semi-transparent (can light up).
// On/off and label text are stored in the global runtime store (shared).
// See docs/prod-spec.md (Button).

import { useEffect } from 'react';
import type { Panel } from '../../board/model';
import { useRuntime } from '../../runtime/store';
import { effectiveTextPos } from './util';

type ButtonPanelData = Extract<Panel, { type: 'button' }>;

function colorVar(index: number): string {
  return `var(--color-${index})`;
}

export function ButtonPanel({
  panel,
  level,
  poweredOff,
}: {
  panel: ButtonPanelData;
  level: number;
  poweredOff: boolean;
}) {
  const storeOn = useRuntime((s) => !!s.buttonOn[panel.sharedTextKey]);
  const on = storeOn && !poweredOff; // powered-off buttons show up (not depressed)
  const text = useRuntime((s) => s.sharedText[panel.sharedTextKey] ?? panel.text);
  const toggle = useRuntime((s) => s.toggleButton);
  const setSharedText = useRuntime((s) => s.setSharedText);

  // Seed the shared text once.
  useEffect(() => {
    if (panel.text) setSharedText(panel.sharedTextKey, panel.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const litStyle =
    panel.opacity === 'transparent' && panel.litColor !== null
      ? ({ ['--lit-color' as string]: colorVar(panel.litColor) })
      : undefined;

  const pos = effectiveTextPos(panel.textPos, level);
  const onFace = pos === 'c';

  const classes = [
    'button',
    panel.opacity === 'transparent' ? 'transparent' : 'opaque',
    on ? 'on' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="panel panel-button">
      {pos === 't' && text ? <span className="panel-label">{text}</span> : null}
      <button
        type="button"
        className={classes}
        style={litStyle}
        onClick={() => toggle(panel.sharedTextKey)}
        aria-label={text}
      >
        {onFace && text ? <span className="button-face">{text}</span> : null}
      </button>
      {pos === 'b' && text ? <span className="panel-label">{text}</span> : null}
    </div>
  );
}
