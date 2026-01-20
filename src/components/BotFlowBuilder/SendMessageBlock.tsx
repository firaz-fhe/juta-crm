import React, { useState, memo } from 'react';
import { Handle, Position } from 'reactflow';

interface SendMessageBlockProps {
  data: {
    label: string;
    condition?: string;
    message?: string;
    onDelete?: () => void;
  };
  id: string;
}

const SendMessageBlock: React.FC<SendMessageBlockProps> = ({ data, id }) => {
  const [condition, setCondition] = useState(data.condition || '');
  const [message, setMessage] = useState(data.message || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCondition(e.target.value);
    data.condition = e.target.value;
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    data.message = e.target.value;
  };

  return (
    <div className="bg-slate-700 rounded-lg shadow-lg border border-slate-600 min-w-[180px]">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-blue-500"
      />

      {/* Header */}
      <div className="bg-slate-600/50 text-white px-2 py-1.5 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">💬</span>
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
        {/* Message Input - Always visible or expandable */}
        {isExpanded && (
          <>
            <div>
              <label className="block text-[10px] font-medium text-gray-300 mb-1">
                📝 Type your message:
              </label>
              <textarea
                value={message}
                onChange={handleMessageChange}
                placeholder="Hello! How can I help you?"
                rows={3}
                className="w-full px-2 py-1 border border-slate-600 rounded bg-slate-800 text-gray-200 text-[10px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
              <div className="text-[9px] text-gray-500 mt-1">
                💡 Use {"{{name}}"} for customer name, {"{{phone}}"} for phone
              </div>
            </div>
          </>
        )}

        {/* Preview when collapsed */}
        {!isExpanded && (
          <div className="text-[10px] text-gray-400">
            {message ? (
              <div className="truncate text-gray-300">
                {message.substring(0, 30)}{message.length > 30 ? '...' : ''}
              </div>
            ) : (
              <div className="text-gray-500 italic">Click ▶ to write message</div>
            )}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-blue-500"
      />
    </div>
  );
};

export default memo(SendMessageBlock);
