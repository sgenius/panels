// Dispatches a Panel model to its concrete component.

import type { Panel } from '../board/model';
import { BlankPanel } from './panels/BlankPanel';
import { LedPanel } from './panels/LedPanel';
import { ButtonPanel } from './panels/ButtonPanel';

export function PanelView({ panel }: { panel: Panel }) {
  switch (panel.type) {
    case 'blank':
      return <BlankPanel />;
    case 'led':
      return <LedPanel panel={panel} />;
    case 'button':
      return <ButtonPanel panel={panel} />;
  }
}
