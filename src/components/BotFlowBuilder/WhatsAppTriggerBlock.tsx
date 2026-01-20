import React from 'react';
import { Handle, Position } from 'reactflow';

interface WhatsAppTriggerBlockProps {
  data: {
    label: string;
  };
}

const WhatsAppTriggerBlock: React.FC<WhatsAppTriggerBlockProps> = ({ data }) => {
  return (
    <div className="px-3 py-2.5 shadow-lg rounded-lg bg-slate-700 border border-slate-600 min-w-[140px] text-white">
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-2 !h-2" />
      
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-sm">
          📱
        </div>
        <div>
          <div className="font-semibold text-xs text-gray-100">Start</div>
          <div className="text-[10px] text-gray-400">WhatsApp Message</div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTriggerBlock;
