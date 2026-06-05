// Per-panel configuration. Fields depend on the panel type.

import { useState } from 'react';
import type { Panel, TextPos, ButtonTextPos } from '../../board/model';
import { REGISTRY_SIZE } from '../../board/model';
import { Dialog, ColorSwatches } from './Dialog';

interface Props {
  panel: Panel;
  colors: string[]; // 8 theme colors (hex)
  onApply: (panel: Panel) => void;
  onClose: () => void;
}

export function ConfigDialog({ panel, colors, onApply, onClose }: Props) {
  if (panel.type === 'blank') {
    return (
      <Dialog title="Configure blank panel" onClose={onClose}>
        <p className="dialog-note">A blank panel has no options.</p>
      </Dialog>
    );
  }
  if (panel.type === 'led') return <LedForm panel={panel} colors={colors} onApply={onApply} onClose={onClose} />;
  return <ButtonForm panel={panel} colors={colors} onApply={onApply} onClose={onClose} />;
}

type LedPanel = Extract<Panel, { type: 'led' }>;
type ButtonPanel = Extract<Panel, { type: 'button' }>;

function LedForm({ panel, colors, onApply, onClose }: { panel: LedPanel } & Omit<Props, 'panel'>) {
  const [mode, setMode] = useState<'regular' | 'rhythmic'>(panel.mode);
  const [sel, setSel] = useState<number[]>(panel.colors);
  const [text, setText] = useState(panel.text);
  const [textPos, setTextPos] = useState<TextPos>(panel.textPos);
  const [registryIndex, setRegistryIndex] = useState(panel.mode === 'regular' ? panel.registryIndex : 0);
  const [pattern, setPattern] = useState<boolean[]>(
    panel.mode === 'rhythmic' ? panel.pattern : [true, false, false, true, true, false, true, false],
  );

  const toggleColor = (i: number) =>
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)));
  const togglePatternStep = (i: number) => setPattern((p) => p.map((b, j) => (j === i ? !b : b)));

  const valid = sel.length >= 1 && (mode !== 'rhythmic' || pattern.some(Boolean));

  const apply = () => {
    const base = { type: 'led' as const, colors: sel, text, textPos };
    onApply(
      mode === 'regular'
        ? { ...base, mode: 'regular', registryIndex }
        : { ...base, mode: 'rhythmic', pattern },
    );
    onClose();
  };

  return (
    <Dialog
      title="Configure LED"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={apply} disabled={!valid}>
            Apply
          </button>
        </>
      }
    >
      <Field label="Mode">
        <label className="radio">
          <input type="radio" checked={mode === 'regular'} onChange={() => setMode('regular')} /> Regular
        </label>
        <label className="radio">
          <input type="radio" checked={mode === 'rhythmic'} onChange={() => setMode('rhythmic')} /> Rhythmic
        </label>
      </Field>

      <Field label="On colors">
        <ColorSwatches colors={colors} selected={sel} onToggle={toggleColor} />
        {sel.length === 0 && <span className="dialog-error">Pick at least one color.</span>}
      </Field>

      {mode === 'regular' ? (
        <Field label="Registry index">
          <select value={registryIndex} onChange={(e) => setRegistryIndex(Number(e.target.value))}>
            {Array.from({ length: REGISTRY_SIZE }, (_, i) => (
              <option key={i} value={i}>
                {i}
                {i === REGISTRY_SIZE - 1 ? ' (counter)' : ''}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Blink pattern">
          <div className="pattern-row">
            {pattern.map((on, i) => (
              <button
                key={i}
                type="button"
                className={`pattern-step${on ? ' on' : ''}`}
                onClick={() => togglePatternStep(i)}
                title={`Step ${i}`}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Text">
        <input type="text" value={text} maxLength={12} onChange={(e) => setText(e.target.value)} placeholder="(none)" />
      </Field>
      <Field label="Text position">
        <PosSelect value={textPos} onChange={setTextPos} options={['t', 'b', 'c']} />
      </Field>
    </Dialog>
  );
}

function ButtonForm({ panel, colors, onApply, onClose }: { panel: ButtonPanel } & Omit<Props, 'panel'>) {
  const [opacity, setOpacity] = useState<'opaque' | 'transparent'>(panel.opacity);
  const [litColor, setLitColor] = useState<number | null>(panel.litColor);
  const [text, setText] = useState(panel.text);
  const [textPos, setTextPos] = useState<ButtonTextPos>(panel.textPos);

  const apply = () => {
    onApply({ ...panel, opacity, litColor, text, textPos });
    onClose();
  };

  return (
    <Dialog
      title="Configure button"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={apply}>
            Apply
          </button>
        </>
      }
    >
      <Field label="Surface">
        <label className="radio">
          <input type="radio" checked={opacity === 'opaque'} onChange={() => setOpacity('opaque')} /> Opaque
        </label>
        <label className="radio">
          <input type="radio" checked={opacity === 'transparent'} onChange={() => setOpacity('transparent')} />{' '}
          Transparent
        </label>
      </Field>

      <Field label="Lights up in">
        <div className="swatch-row">
          <button
            type="button"
            className={`swatch swatch-none${litColor === null ? ' selected' : ''}`}
            onClick={() => setLitColor(null)}
            title="None"
          >
            ∅
          </button>
          {colors.map((c, i) => (
            <button
              key={i}
              type="button"
              className={`swatch${litColor === i ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setLitColor(i)}
              title={`Color ${i}`}
            />
          ))}
        </div>
      </Field>

      <Field label="Text">
        <input type="text" value={text} maxLength={12} onChange={(e) => setText(e.target.value)} placeholder="(none)" />
      </Field>
      <Field label="Text position">
        <PosSelect value={textPos} onChange={setTextPos} options={['t', 'b', 'c']} />
      </Field>
    </Dialog>
  );
}

const POS_LABEL: Record<string, string> = { t: 'Top', b: 'Bottom', c: 'Center' };

function PosSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {POS_LABEL[o]}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dialog-field">
      <label className="dialog-label">{label}</label>
      <div className="dialog-control">{children}</div>
    </div>
  );
}
