import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

interface SetVariableBlockProps {
  data: {
    label: string;
    variableName?: string;
    variableValue?: string;
    onDelete?: () => void;
    onChange?: (name: string, value: string) => void;
  };
  id: string;
}

const SetVariableBlock: React.FC<SetVariableBlockProps> = ({ data, id }) => {
  const [variableName, setVariableName] = useState(data.variableName || '');
  const [variableValue, setVariableValue] = useState(data.variableValue || '');

  const handleChange = (name: string, value: string) => {
    setVariableName(name);
    setVariableValue(value);
    if (data.onChange) {
      data.onChange(name, value);
    }
  };

  return (
    <div className="px-2 py-2 shadow-lg rounded-lg bg-slate-700 border border-slate-600 min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-2 !h-2" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs">📦</span>
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
          📝 Save as:
        </label>
        <select
          value={variableName}
          onChange={(e) => handleChange(e.target.value, variableValue)}
          className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-yellow-500 outline-none mb-2"
        >
          <option value="">Choose variable...</option>
          <option value="name">Customer Name</option>
          <option value="phone">Customer Phone</option>
          <option value="email">Customer Email</option>
          <option value="address">Customer Address</option>
          <option value="notes">Notes</option>
        </select>
        
        <label className="text-[10px] font-medium text-gray-300 block mb-1">
          ✏️ Value to save:
        </label>
        <input
          type="text"
          value={variableValue}
          onChange={(e) => handleChange(variableName, e.target.value)}
          placeholder="John Doe"
          className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-yellow-500 outline-none"
        />
        <div className="text-[9px] text-gray-500 mt-1">
          💡 Use later with {"{{" + (variableName || "name") + "}}"}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 !w-2 !h-2" />
    </div>
  );
};

export default SetVariableBlock;
