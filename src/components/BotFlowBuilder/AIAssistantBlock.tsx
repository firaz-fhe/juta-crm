import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

interface AIAssistantBlockProps {
  data: {
    label: string;
    instruction?: string;
    variables?: string[];
    outputVariable?: string;
    onDelete?: () => void;
    onChange?: (instruction: string, variables: string[], outputVariable: string) => void;
  };
  id: string;
}

const AIAssistantBlock: React.FC<AIAssistantBlockProps> = ({ data, id }) => {
  const [instruction, setInstruction] = useState(data.instruction || '');
  const [selectedVariables, setSelectedVariables] = useState<string[]>(data.variables || []);
  const [outputVariable, setOutputVariable] = useState(data.outputVariable || 'aiResponse');
  const [isExpanded, setIsExpanded] = useState(false);

  const availableVariables = [
    { value: '{{message}}', label: 'Customer Message' },
    { value: '{{name}}', label: 'Customer Name' },
    { value: '{{phone}}', label: 'Customer Phone' },
    { value: '{{email}}', label: 'Customer Email' },
    { value: '{{address}}', label: 'Customer Address' },
    { value: '{{notes}}', label: 'Notes' },
  ];

  const handleChange = (newInstruction: string, newVariables: string[], newOutput: string) => {
    setInstruction(newInstruction);
    setSelectedVariables(newVariables);
    setOutputVariable(newOutput);
    if (data.onChange) {
      data.onChange(newInstruction, newVariables, newOutput);
    }
  };

  const toggleVariable = (variable: string) => {
    const newVariables = selectedVariables.includes(variable)
      ? selectedVariables.filter(v => v !== variable)
      : [...selectedVariables, variable];
    handleChange(instruction, newVariables, outputVariable);
  };

  return (
    <div className="bg-slate-700 rounded-lg shadow-lg border border-slate-600 min-w-[200px]">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-pink-500"
      />

      {/* Header */}
      <div className="bg-slate-600/50 text-white px-2 py-1.5 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🤖</span>
          <span className="font-medium text-xs">{data.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-300 hover:text-white rounded px-1 text-xs transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          {data.onDelete && (
            <button
              onClick={data.onDelete}
              className="text-gray-300 hover:text-red-400 rounded px-1 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-2 space-y-2">
        {isExpanded ? (
          <>
            {/* Instruction Input */}
            <div>
              <label className="block text-[10px] font-medium text-gray-300 mb-1">
                📝 AI Instructions:
              </label>
              <textarea
                value={instruction}
                onChange={(e) => handleChange(e.target.value, selectedVariables, outputVariable)}
                placeholder="Analyze customer sentiment and suggest response..."
                rows={3}
                className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none"
              />
            </div>

            {/* Variables Selection */}
            <div>
              <label className="block text-[10px] font-medium text-gray-300 mb-1">
                📊 Feed these variables to AI:
              </label>
              <div className="space-y-1 bg-slate-800 rounded p-1.5 max-h-32 overflow-y-auto">
                {availableVariables.map((variable) => (
                  <label
                    key={variable.value}
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVariables.includes(variable.value)}
                      onChange={() => toggleVariable(variable.value)}
                      className="w-3 h-3 rounded border-slate-600 text-pink-500 focus:ring-1 focus:ring-pink-500"
                    />
                    <span className="text-[10px] text-gray-300">{variable.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Output Variable */}
            <div>
              <label className="block text-[10px] font-medium text-gray-300 mb-1">
                💾 Save AI response as:
              </label>
              <input
                type="text"
                value={outputVariable}
                onChange={(e) => handleChange(instruction, selectedVariables, e.target.value)}
                placeholder="aiResponse"
                className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none"
              />
              <div className="text-[9px] text-gray-500 mt-1">
                💡 Use in messages with {`{{${outputVariable}}}`}
              </div>
            </div>
          </>
        ) : (
          <div className="text-[10px] text-gray-400">
            {instruction ? (
              <>
                <div className="truncate text-gray-300 mb-1">
                  {instruction.substring(0, 40)}{instruction.length > 40 ? '...' : ''}
                </div>
                <div className="text-[9px] text-pink-400">
                  {selectedVariables.length} variable{selectedVariables.length !== 1 ? 's' : ''} → {`{{${outputVariable}}}`}
                </div>
              </>
            ) : (
              <div className="text-gray-500 italic">Click ▶ to configure AI</div>
            )}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-pink-500"
      />
    </div>
  );
};

export default AIAssistantBlock;
