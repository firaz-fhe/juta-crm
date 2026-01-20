import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import SendMessageBlock from './SendMessageBlock';
import IfElseBlock from './IfElseBlock';
import DelayBlock from './DelayBlock';
import LoopBlock from './LoopBlock';
import TriggerBlock from './TriggerBlock';
import WhatsAppTriggerBlock from './WhatsAppTriggerBlock';
import SetVariableBlock from './SetVariableBlock';
import AIAssistantBlock from './AIAssistantBlock';
import ChatSimulator from './ChatSimulator';
import { toast } from 'react-toastify';

// Custom node types
const nodeTypes = {
  sendMessage: SendMessageBlock,
  ifElse: IfElseBlock,
  delay: DelayBlock,
  loop: LoopBlock,
  trigger: TriggerBlock,
  whatsappTrigger: WhatsAppTriggerBlock,
  setVariable: SetVariableBlock,
  aiAssistant: AIAssistantBlock,
};

interface BotFlowBuilderProps {
  companyId: string;
  onSave?: () => void;
  onBack?: () => void;
}

interface BlockType {
  type: string;
  label: string;
  icon: string;
  description: string;
}

const availableBlocks: BlockType[] = [

  {
    type: 'sendMessage',
    label: 'Send Message',
    icon: '💬',
    description: 'Send a text message to the user',
  },
  {
    type: 'aiAssistant',
    label: 'AI Assistant',
    icon: '🤖',
    description: 'Get AI-generated response',
  },
  {
    type: 'ifElse',
    label: 'If / Else',
    icon: '🔀',
    description: 'Branch based on a condition',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: '⏱️',
    description: 'Wait before next action',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: '🔁',
    description: 'Repeat actions multiple times',
  },
  {
    type: 'setVariable',
    label: 'Set Variable',
    icon: '📦',
    description: 'Store a value in a variable',
  },
];

const BotFlowBuilder: React.FC<BotFlowBuilderProps> = ({ companyId, onSave, onBack }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowName, setFlowName] = useState('Untitled Bot Flow');
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatSimulatorOpen, setIsChatSimulatorOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(1);

  // Load existing flow on mount
  useEffect(() => {
    loadBotFlow();
  }, [companyId]);

  const loadBotFlow = async () => {
    try {
      const response = await fetch(
        `http://localhost:8443/api/bot-flow?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.flow && data.flow.nodes && data.flow.nodes.length > 0) {
          setNodes(data.flow.nodes || []);
          setEdges(data.flow.edges || []);
          setFlowName(data.flow.name || 'Untitled Bot Flow');
          nodeIdCounter.current = Math.max(...data.flow.nodes.map((n: Node) => parseInt(n.id) || 0), 0) + 1;
        } else {
          // No existing flow, create default WhatsApp trigger node
          createDefaultTriggerNode();
        }
      } else {
        // Error loading, create default trigger
        createDefaultTriggerNode();
      }
    } catch (error) {
      console.error('Error loading bot flow:', error);
      // On error, create default trigger
      createDefaultTriggerNode();
    }
  };

  const createDefaultTriggerNode = () => {
    const triggerNode: Node = {
      id: '1',
      type: 'whatsappTrigger',
      position: { x: 250, y: 20 },
      data: {
        label: 'WhatsApp Trigger',
      },
    };
    setNodes([triggerNode]);
    nodeIdCounter.current = 2;
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance || !selectedBlock) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${nodeIdCounter.current++}`,
        type: selectedBlock.type,
        position,
        data: {
          label: selectedBlock.label,
          condition: '',
          message: '',
          onDelete: () => deleteNode(`${nodeIdCounter.current - 1}`),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedBlock(null);
    },
    [reactFlowInstance, selectedBlock, setNodes]
  );

  const onDragStart = (event: React.DragEvent, block: BlockType) => {
    setSelectedBlock(block);
    event.dataTransfer.effectAllowed = 'move';
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const saveBotFlow = async () => {
    setIsSaving(true);
    try {
      const flowData = {
        companyId,
        name: flowName,
        nodes,
        edges,
      };

      const response = await fetch('http://localhost:8443/api/bot-flow', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      });

      if (response.ok) {
        toast.success('Bot flow saved successfully!');
        if (onSave) onSave();
      } else {
        throw new Error('Failed to save bot flow');
      }
    } catch (error) {
      console.error('Error saving bot flow:', error);
      toast.error('Failed to save bot flow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-full w-full'} flex flex-col bg-slate-900 overflow-hidden`}>
      {/* Header */}
      <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 shadow-lg px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && !isFullscreen && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-all duration-200 text-sm"
              >
                ← Back
              </button>
            )}
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none outline-none focus:border-b border-slate-600 text-white placeholder-gray-500 px-2"
              placeholder="Flow Name"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChatSimulatorOpen(true)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
            >
              🧪 Test Flow
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
            >
              {isFullscreen ? '⤓' : '⤢'}
            </button>
            <button
              onClick={saveBotFlow}
              disabled={isSaving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium"
            >
              {isSaving ? 'Saving...' : '💾 Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Blocks Sidebar */}
        <div className="w-48 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700 p-3 overflow-y-auto flex-shrink-0">
          <h3 className="text-xs font-semibold mb-3 text-gray-400 uppercase tracking-wide">Blocks</h3>
          <div className="space-y-2">
            {availableBlocks.map((block) => (
              <div
                key={block.type}
                draggable
                onDragStart={(e) => onDragStart(e, block)}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600/50 cursor-move transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{block.icon}</span>
                  <div>
                    <div className="font-medium text-xs text-gray-200">{block.label}</div>
                    <div className="text-[10px] text-gray-500">{block.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 bg-slate-900" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-900"
          >
            <Background color="#334155" gap={16} size={1} className="bg-slate-900" />
            <Controls className="bg-slate-800 border-slate-700" />
            <MiniMap 
              className="bg-slate-800 border-slate-700" 
              nodeColor="#475569"
              maskColor="rgba(15, 23, 42, 0.6)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Chat Simulator Modal */}
      <ChatSimulator
        isOpen={isChatSimulatorOpen}
        onClose={() => setIsChatSimulatorOpen(false)}
        nodes={nodes}
        edges={edges}
      />
    </div>
  );
};

export default BotFlowBuilder;
