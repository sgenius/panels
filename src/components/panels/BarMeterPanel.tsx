// Bar meter: a long measure box with value bars and an indicator showing a value
// derived from the registry. Orientation is derived from the cell aspect via a CSS
// container query. Subtype 0 = thermometer (fill), subtype 1 = radio (stick).

import type { Panel, ValueExpr } from '../../board/model';
import { useRuntime } from '../../runtime/store';
import { resolveSubtype } from '../../theme/metallic';

type BarMeterData = Extract<Panel, { type: 'barmeter' }>;

function evalExpr(v: ValueExpr, reg: number[]): number {
  if (v.kind === 'reg') return reg[v.a] ?? 0;
  const a = reg[v.a] ?? 0;
  const b = reg[v.b] ?? 0;
  let r: number;
  switch (v.op) {
    case '+':
      r = a + b;
      break;
    case '-':
      r = a - b;
      break;
    case '*':
      r = a * b;
      break;
    case '/':
      r = b === 0 ? 0 : a / b;
      break;
    case '%':
      r = b === 0 ? 0 : a % b;
      break;
  }
  return r;
}

export function BarMeterPanel({ panel }: { panel: BarMeterData; level: number }) {
  // Subscribe to the derived, clamped value (re-renders only when it changes).
  const value = useRuntime((s) => {
    const raw = Math.round(evalExpr(panel.value, s.registry));
    return Math.max(panel.min, Math.min(panel.max, raw)); // out-of-range pins to min/max
  });

  const subtype = resolveSubtype('metallic', 'barmeter', panel.subtype);
  const span = panel.max - panel.min;
  const frac = span > 0 ? (value - panel.min) / span : 0;
  // Spacing between value bars, as a fraction of the box length.
  const tickFrac = span > 0 ? Math.min(0.5, Math.max(0.02, panel.step / span)) : 0.1;

  const style = {
    ['--frac' as string]: String(frac),
    ['--tick' as string]: `${tickFrac * 100}%`,
  };

  return (
    <div className="panel panel-meter" data-subtype={subtype}>
      {panel.textPos === 't' && panel.text ? <span className="panel-label">{panel.text}</span> : null}
      <div className="meter" style={style}>
        <div className="meter-box">
          <div className="meter-ticks" />
          <div className="meter-indicator" />
        </div>
      </div>
      {panel.textPos === 'b' && panel.text ? <span className="panel-label">{panel.text}</span> : null}
    </div>
  );
}
