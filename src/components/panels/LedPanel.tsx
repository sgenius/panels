// LED panel: round light in a recessed well, optional label above/below/center.
// Regular LEDs derive state from a registry value; rhythmic from the tick.
// See docs/prod-spec.md (LED) and tech-spec §5.3/§5.6.

import type { Panel, TextPos } from '../../board/model';
import { useRuntime } from '../../runtime/store';
import { effectiveTextPos } from './util';

type LedPanelData = Extract<Panel, { type: 'led' }>;

function colorVar(index: number): string {
  return `var(--color-${index})`;
}

// Map a 0..255 registry value to off (-1) or a color index from `colors`.
// Equal probability across {off, ...colors}.
function regularState(value: number, colors: number[]): number {
  const states = colors.length + 1; // off + each color
  const bucket = value % states;
  return bucket === 0 ? -1 : colors[bucket - 1];
}

function Label({ text, pos, at }: { text: string; pos: TextPos; at: TextPos }) {
  if (!text || pos !== at) return null;
  return <span className="panel-label">{text}</span>;
}

export function LedPanel({ panel, level }: { panel: LedPanelData; level: number }) {
  // Subscribe only to the slice that drives this LED.
  const driver = useRuntime((s) =>
    panel.mode === 'regular' ? s.registry[panel.registryIndex] : s.tick,
  );

  let colorIndex = -1;
  if (panel.mode === 'regular') {
    colorIndex = regularState(driver, panel.colors);
  } else {
    const step = driver % 8;
    if (panel.pattern[step]) {
      // Rotate through the LED's colors once per full 8-tick cycle.
      const cycle = Math.floor(driver / 8);
      colorIndex = panel.colors[cycle % panel.colors.length];
    }
  }

  const on = colorIndex >= 0;
  const pos = effectiveTextPos(panel.textPos, level);

  return (
    <div className="panel panel-led">
      <Label text={panel.text} pos={pos} at="t" />
      <div className="led-well">
        <div
          className={`led-bulb${on ? ' on' : ''}`}
          style={on ? ({ ['--led-color' as string]: colorVar(colorIndex) }) : undefined}
        />
      </div>
      <Label text={panel.text} pos={pos} at="b" />
      {pos === 'c' && panel.text ? <span className="panel-label panel-label-center">{panel.text}</span> : null}
    </div>
  );
}
