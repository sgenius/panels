// Per-panel configuration. Fields depend on the panel type.

import { useState } from 'react';
import type { Panel, TextPos, ButtonTextPos, Orientation, ValueOp, ValueExpr } from '../../board/model';
import { REGISTRY_SIZE, isPowerText } from '../../board/model';
import { Dialog, ColorSwatches } from './Dialog';

interface Props {
  panel: Panel;
  colors: string[]; // 8 theme colors (hex)
  onApply: (panel: Panel) => void;
  onClose: () => void;
}

export function ConfigDialog({ panel, colors, onApply, onClose }: Props) {
  switch (panel.type) {
    case 'blank':
      return (
        <Dialog title="Configure blank panel" onClose={onClose}>
          <p className="dialog-note">A blank panel has no options.</p>
        </Dialog>
      );
    case 'led':
      return <LedForm panel={panel} colors={colors} onApply={onApply} onClose={onClose} />;
    case 'button':
      return <ButtonForm panel={panel} colors={colors} onApply={onApply} onClose={onClose} />;
    case 'switch':
      return <SwitchForm panel={panel} colors={colors} onApply={onApply} onClose={onClose} />;
    case 'barmeter':
      return <BarMeterForm panel={panel} colors={colors} onApply={onApply} onClose={onClose} />;
  }
}

type LedPanel = Extract<Panel, { type: 'led' }>;
type ButtonPanel = Extract<Panel, { type: 'button' }>;
type SwitchPanel = Extract<Panel, { type: 'switch' }>;
type BarMeterPanel = Extract<Panel, { type: 'barmeter' }>;

// Small hint shown when text makes a panel a "Power" panel.
function PowerHint({ text }: { text: string }) {
  if (!isPowerText(text)) return null;
  return <span className="dialog-note">⚡ This text makes it a Power panel.</span>;
}

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
        <PowerHint text={text} />
      </Field>
      <Field label="Text position">
        <PosSelect value={textPos} onChange={setTextPos} options={['t', 'b', 'c']} />
      </Field>
    </Dialog>
  );
}

function SwitchForm({ panel, onApply, onClose }: { panel: SwitchPanel } & Omit<Props, 'panel'>) {
  const [orientation, setOrientation] = useState<Orientation>(panel.orientation);
  const [text, setText] = useState(panel.text);
  const [textPos, setTextPos] = useState<'t' | 'b'>(panel.textPos);

  const apply = () => {
    onApply({ ...panel, orientation, text, textPos });
    onClose();
  };

  return (
    <Dialog
      title="Configure switch"
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
      <Field label="Orientation">
        <label className="radio">
          <input type="radio" checked={orientation === 'v'} onChange={() => setOrientation('v')} /> Vertical
        </label>
        <label className="radio">
          <input type="radio" checked={orientation === 'h'} onChange={() => setOrientation('h')} /> Horizontal
        </label>
      </Field>
      <Field label="Text">
        <input type="text" value={text} maxLength={12} onChange={(e) => setText(e.target.value)} placeholder="(none)" />
        <PowerHint text={text} />
      </Field>
      <Field label="Text position">
        <PosSelect value={textPos} onChange={setTextPos} options={['t', 'b']} />
      </Field>
    </Dialog>
  );
}

function BarMeterForm({ panel, onApply, onClose }: { panel: BarMeterPanel } & Omit<Props, 'panel'>) {
  const [subtype, setSubtype] = useState(panel.subtype);
  const [useOp, setUseOp] = useState(panel.value.kind === 'op');
  const [a, setA] = useState(panel.value.a);
  const [b, setB] = useState(panel.value.kind === 'op' ? panel.value.b : 0);
  const [op, setOp] = useState<ValueOp>(panel.value.kind === 'op' ? panel.value.op : '+');
  const [min, setMin] = useState(panel.min);
  const [max, setMax] = useState(panel.max);
  const [step, setStep] = useState(panel.step);
  const [text, setText] = useState(panel.text);
  const [textPos, setTextPos] = useState<'t' | 'b'>(panel.textPos);

  const valid = max > min && step > 0;
  const apply = () => {
    const value: ValueExpr = useOp ? { kind: 'op', a, op, b } : { kind: 'reg', a };
    onApply({ ...panel, subtype, value, min, max, step, text, textPos });
    onClose();
  };

  const regOptions = Array.from({ length: REGISTRY_SIZE }, (_, i) => i);

  return (
    <Dialog
      title="Configure bar meter"
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
      <Field label="Subtype">
        <select value={subtype} onChange={(e) => setSubtype(Number(e.target.value))}>
          <option value={0}>0 — Thermometer (fill)</option>
          <option value={1}>1 — Radio (stick)</option>
        </select>
      </Field>
      <Field label="Value">
        <select value={a} onChange={(e) => setA(Number(e.target.value))}>
          {regOptions.map((i) => (
            <option key={i} value={i}>
              reg {i}
            </option>
          ))}
        </select>
        <label className="radio">
          <input type="checkbox" checked={useOp} onChange={(e) => setUseOp(e.target.checked)} /> operate with
        </label>
        {useOp && (
          <>
            <select value={op} onChange={(e) => setOp(e.target.value as ValueOp)}>
              {(['+', '-', '*', '/', '%'] as ValueOp[]).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select value={b} onChange={(e) => setB(Number(e.target.value))}>
              {regOptions.map((i) => (
                <option key={i} value={i}>
                  reg {i}
                </option>
              ))}
            </select>
          </>
        )}
      </Field>
      <Num label="Min" value={min} onChange={setMin} />
      <Num label="Max" value={max} onChange={setMax} />
      <Num label="Step" value={step} min={1} onChange={setStep} />
      {!valid && <p className="dialog-error">Max must exceed Min, and Step must be positive.</p>}
      <Field label="Text">
        <input type="text" value={text} maxLength={12} onChange={(e) => setText(e.target.value)} placeholder="(none)" />
      </Field>
      <Field label="Text position">
        <PosSelect value={textPos} onChange={setTextPos} options={['t', 'b']} />
      </Field>
    </Dialog>
  );
}

function Num({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
      />
    </Field>
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
