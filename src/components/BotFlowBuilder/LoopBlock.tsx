import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

interface LoopBlockProps {
  data: {
    label: string;
    loopType?: 'forEach' | 'repeat';
    iterations?: number;
    listVariable?: string;
    onDelete?: () => void;
    onChange?: (loopType: string, iterations: number, listVariable: string) => void;
  };
  id: string;
}

const LoopBlock: React.FC<LoopBlockProps> = ({ data, id }) => {
  const [loopType, setLoopType] = useState(data.loopType || 'repeat');
  const [iterations, setIterations] = useState(data.iterations || 1);
  const [listVariable, setListVariable] = useState(data.listVariable || '');

  const handleChange = (
    newLoopType: string,
    newIterations: number,
    newListVariable: string
  ) => {
    setLoopType(newLoopType as 'forEach' | 'repeat');
    setIterations(newIterations);
    setListVariable(newListVariable);
    if (data.onChange) {
      data.onChange(newLoopType, newIterations, newListVariable);
    }
  };

  return (
    <div className="px-2 py-2 shadow-lg rounded-lg bg-slate-700 border border-slate-600 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-2 !h-2" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs">🔁</span>
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

      <div className="mb-2 bg-slate-600/50 rounded p-1.5">
        <label className="text-[10px] font-medium text-gray-300 block mb-1">
          🔄 How many times?
        </label>
        <input
          type="number"
          value={iterations}
          onChange={(e) => handleChange(loopType, parseInt(e.target.value) || 1, listVariable)}
          min="1"
          max="100"
          className="w-full px-2 py-1 text-[10px] rounded bg-slate-800 text-gray-200 outline-none border border-slate-600 focus:ring-1 focus:ring-teal-500"
        />
        <div className="text-[9px] text-gray-500 mt-1">
          💡 Connect ▶ Next to what should repeat
        </div>
      </div>

      <div className="flex justify-between items-center px-1">
        <div className="text-[9px] text-teal-400 font-medium">▶ Next</div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="loop"
        className="!bg-teal-500 !w-2 !h-2"
        style={{ left: '50%' }}
      />
    </div>
  );
};

export default LoopBlock;
