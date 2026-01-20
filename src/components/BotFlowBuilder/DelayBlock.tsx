import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

interface DelayBlockProps {
  data: {
    label: string;
    delay?: number;
    unit?: 'seconds' | 'minutes' | 'hours';
    onDelete?: () => void;
    onChange?: (delay: number, unit: string) => void;
  };
  id: string;
}

const DelayBlock: React.FC<DelayBlockProps> = ({ data, id }) => {
  const [delay, setDelay] = useState(data.delay || 1);
  const [unit, setUnit] = useState(data.unit || 'seconds');

  const handleDelayChange = (newDelay: number, newUnit: string) => {
    setDelay(newDelay);
    setUnit(newUnit as 'seconds' | 'minutes' | 'hours');
    if (data.onChange) {
      data.onChange(newDelay, newUnit);
    }
  };

  return (
    <div className="px-2 py-2 shadow-lg rounded-lg bg-slate-700 border border-slate-600 min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-2 !h-2" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs">⏱️</span>
          <div className="font-medium text-xs text-white">{data.label}</div>
        </div>
        {data.onDelete && (
          <button
            onClick={data.onDelete}
            className="text-gray-300 hover:text-red-400 text-sm transition-colors"
            title="Delete block"
          >
            ×
          </button>
        )}
      </div>

      <div className="mb-2 bg-slate-600/50 rounded p-1">
        <label className="text-[10px] text-gray-300 block mb-1">Wait for:</label>
        <div className="flex gap-1">
          <input
            type="number"
            value={delay}
            onChange={(e) => handleDelayChange(parseInt(e.target.value) || 1, unit)}
            min="1"
            className="flex-1 px-1 py-1 text-[10px] rounded bg-slate-800 text-gray-200 outline-none w-12 border border-slate-600 focus:ring-1 focus:ring-orange-500"
          />
          <select
            value={unit}
            onChange={(e) => handleDelayChange(delay, e.target.value)}
            className="px-1 py-1 text-[10px] rounded bg-slate-800 text-gray-200 outline-none border border-slate-600 focus:ring-1 focus:ring-orange-500"
          >
            <option value="seconds">Sec</option>
            <option value="minutes">Min</option>
            <option value="hours">Hr</option>
          </select>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-2 !h-2" />
    </div>
  );
};

export default DelayBlock;
