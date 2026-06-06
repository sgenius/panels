// Dispatches a Panel model to its concrete component.

import type { Panel } from '../board/model';
import { BlankPanel } from './panels/BlankPanel';
import { LedPanel } from './panels/LedPanel';
import { ButtonPanel } from './panels/ButtonPanel';
import { SwitchPanel } from './panels/SwitchPanel';
import { BarMeterPanel } from './panels/BarMeterPanel';

export function PanelView({ panel, level }: { panel: Panel; level: number }) {
  switch (panel.type) {
    case 'blank':
      return <BlankPanel />;
    case 'led':
      return <LedPanel panel={panel} level={level} />;
    case 'button':
      return <ButtonPanel panel={panel} level={level} />;
    case 'switch':
      return <SwitchPanel panel={panel} level={level} />;
    case 'barmeter':
      return <BarMeterPanel panel={panel} level={level} />;
  }
}
