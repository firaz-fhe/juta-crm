import React from 'react';
import { Handle, Position } from 'reactflow';

interface TriggerBlockProps {
  data: {
    label: string;
  };
}

const TriggerBlock: React.FC<TriggerBlockProps> = ({ data }) => {
  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl shadow-xl border-2 border-green-400 min-w-[200px]">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📱</span>
          <div>
            <div className="font-bold text-sm">WhatsApp Trigger</div>
            <div className="text-xs opacity-90">When message received</div>
          </div>
        </div>
        <div className="text-xs bg-white/20 p-2 rounded-lg mt-2">
          <div className="font-semibold mb-1">Available Variables:</div>
          <div className="space-y-1">
            <div>• <code className="bg-black/20 px-1 rounded">{'{{message}}'}</code> - User's message</div>
            <div>• <code className="bg-black/20 px-1 rounded">{'{{phone}}'}</code> - User's phone</div>
            <div>• <code className="bg-black/20 px-1 rounded">{'{{name}}'}</code> - User's name</div>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
    </div>
  );
};

export default TriggerBlock;
