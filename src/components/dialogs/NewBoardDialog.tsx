// Edit board-generation parameters, then create a new board.

import { useState } from 'react';
import type { GenerationParams } from '../../board/model';
import { Dialog } from './Dialog';

interface Props {
  params: GenerationParams;
  onCreate: (params: GenerationParams) => void;
  onClose: () => void;
}

export function NewBoardDialog({ params, onCreate, onClose }: Props) {
  const [maxDepth, setMaxDepth] = useState(params.maxDepth);
  const [blink, setBlink] = useState(params.blinkProbability);
  const [minCols, setMinCols] = useState(params.grid.minCols);
  const [maxCols, setMaxCols] = useState(params.grid.maxCols);
  const [minRows, setMinRows] = useState(params.grid.minRows);
  const [maxRows, setMaxRows] = useState(params.grid.maxRows);
  const [maxNodes, setMaxNodes] = useState(params.maxNodes);

  const create = () => {
    onCreate({
      maxDepth,
      blinkProbability: blink,
      maxNodes,
      grid: {
        minCols: Math.min(minCols, maxCols),
        maxCols: Math.max(minCols, maxCols),
        minRows: Math.min(minRows, maxRows),
        maxRows: Math.max(minRows, maxRows),
      },
    });
    onClose();
  };

  return (
    <Dialog
      title="New board with parameters"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={create}>
            Create board
          </button>
        </>
      }
    >
      <Num label="Maximum depth" value={maxDepth} min={1} max={6} onChange={setMaxDepth} />
      <div className="dialog-field">
        <label className="dialog-label">Blink probability</label>
        <div className="dialog-control">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={blink}
            onChange={(e) => setBlink(Number(e.target.value))}
          />
          <span className="range-value">{Math.round(blink * 100)}%</span>
        </div>
      </div>
      <Num label="Columns: min" value={minCols} min={1} max={6} onChange={setMinCols} />
      <Num label="Columns: max" value={maxCols} min={1} max={6} onChange={setMaxCols} />
      <Num label="Rows: min" value={minRows} min={1} max={4} onChange={setMinRows} />
      <Num label="Rows: max" value={maxRows} min={1} max={4} onChange={setMaxRows} />
      <Num label="Soft node cap" value={maxNodes} min={10} max={500} step={10} onChange={setMaxNodes} />
    </Dialog>
  );
}

function Num({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="dialog-field">
      <label className="dialog-label">{label}</label>
      <div className="dialog-control">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        />
      </div>
    </div>
  );
}
