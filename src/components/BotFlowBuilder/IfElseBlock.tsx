import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

interface IfElseBlockProps {
  data: {
    label: string;
    condition?: string;
    onDelete?: () => void;
    onChange?: (condition: string) => void;
  };
  id: string;
}

const IfElseBlock: React.FC<IfElseBlockProps> = ({ data, id }) => {
  const [condition, setCondition] = useState(data.condition || '{{message}} == \'\'');
  const [selectedVariable, setSelectedVariable] = useState('{{message}}');
  const [expectedValue, setExpectedValue] = useState('');

  // Parse existing condition on mount
  React.useEffect(() => {
    if (data.condition) {
      const parts = data.condition.split('==');
      if (parts.length === 2) {
        setSelectedVariable(parts[0].trim());
        setExpectedValue(parts[1].replace(/'/g, '').trim());
      }
    }
  }, [data.condition]);

  const handleConditionChange = (variable: string, value: string) => {
    const newCondition = `${variable} == '${value}'`;
    setCondition(newCondition);
    setSelectedVariable(variable);
    setExpectedValue(value);
    if (data.onChange) {
      data.onChange(newCondition);
    }
  };

  return (
    <div className="px-2 py-2 shadow-lg rounded-lg bg-slate-700 border border-slate-600 min-w-[170px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-2 !h-2" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs">🔀</span>
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
          🤔 Check what?
        </label>
        <select
          value={selectedVariable}
          onChange={(e) => handleConditionChange(e.target.value, expectedValue)}
          className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none mb-2"
        >
          <option value="{{message}}">Customer's message</option>
          <option value="{{name}}">Customer's name</option>
          <option value="{{phone}}">Customer's phone</option>
          <option value="{{email}}">Customer's email</option>
        </select>
        
        <label className="text-[10px] font-medium text-gray-300 block mb-1">
          ✏️ Should equal:
        </label>
        <input
          type="text"
          value={expectedValue}
          onChange={(e) => handleConditionChange(selectedVariable, e.target.value)}
          placeholder="yes"
          className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none"
        />
        <div className="text-[9px] text-gray-500 mt-1">
          💡 Match = ✓ True, No match = ✗ False
        </div>
      </div>

      <div className="flex gap-1">
        <div className="flex-1 text-center">
          <div className="text-[9px] text-green-400 mb-1">✓ True</div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!bg-green-500 !left-[25%] !w-2 !h-2"
          />
        </div>
        <div className="flex-1 text-center">
          <div className="text-[9px] text-red-400 mb-1">✗ False</div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!bg-red-500 !left-[75%] !w-2 !h-2"
          />
        </div>
      </div>
    </div>
  );
};

export default IfElseBlock;
