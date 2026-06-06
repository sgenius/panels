// Flick switch: a chrome lever in two positions (on/off), set by the user only.
// Vertical: up = on, down = off. Horizontal: right = on, left = off.

import type { Panel } from '../../board/model';
import { useRuntime } from '../../runtime/store';

type SwitchPanelData = Extract<Panel, { type: 'switch' }>;

export function SwitchPanel({
  panel,
  poweredOff,
}: {
  panel: SwitchPanelData;
  level: number;
  poweredOff: boolean;
}) {
  const storeOn = useRuntime((s) => !!s.switchOn[panel.stateKey]);
  const on = storeOn && !poweredOff; // powered-off switches show the off position
  const toggle = useRuntime((s) => s.toggleSwitch);

  const classes = ['switch', panel.orientation === 'h' ? 'horizontal' : 'vertical', on ? 'on' : 'off'].join(' ');

  return (
    <div className="panel panel-switch">
      {panel.textPos === 't' && panel.text ? <span className="panel-label">{panel.text}</span> : null}
      <button
        type="button"
        className={classes}
        onClick={() => toggle(panel.stateKey)}
        aria-pressed={on}
        aria-label={panel.text || 'switch'}
      >
        <span className="switch-base" />
        <span className="switch-stick" />
      </button>
      {panel.textPos === 'b' && panel.text ? <span className="panel-label">{panel.text}</span> : null}
    </div>
  );
}
