import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  fromUser: boolean;
  timestamp: Date;
}

interface FlowSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  flowData: {
    nodes: any[];
    edges: any[];
  };
}

const FlowSimulator: React.FC<FlowSimulatorProps> = ({ isOpen, onClose, flowData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, fromUser: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      fromUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const simulateFlow = async (userMessage: string) => {
    setIsProcessing(true);
    
    // Add user message
    addMessage(userMessage, true);

    // Wait a bit to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find the trigger node (WhatsApp trigger)
    const triggerNode = flowData.nodes.find(node => node.type === 'whatsappTrigger');
    
    if (!triggerNode) {
      addMessage('⚠️ No WhatsApp trigger found in the flow', false);
      setIsProcessing(false);
      return;
    }

    // Find connected nodes starting from trigger
    let currentNodeId = triggerNode.id;
    let visitedNodes = new Set<string>();
    let executionPath: string[] = [];

    const executeNode = async (nodeId: string, context: any = {}) => {
      if (visitedNodes.has(nodeId)) {
        console.log('Circular reference detected, stopping execution');
        return;
      }

      visitedNodes.add(nodeId);
      const node = flowData.nodes.find(n => n.id === nodeId);
      
      if (!node) return;

      executionPath.push(node.type);

      // Simulate different node types
      switch (node.type) {
        case 'sendMessage':
          await new Promise(resolve => setTimeout(resolve, 800));
          const message = node.data.message || 'Hello! This is a test message.';
          addMessage(message, false);
          
          // Find next node
          const nextEdge = flowData.edges.find(edge => edge.source === nodeId);
          if (nextEdge) {
            await executeNode(nextEdge.target, context);
          }
          break;

        case 'ifElse':
          await new Promise(resolve => setTimeout(resolve, 500));
          const condition = node.data.condition || '';
          
          // Simple condition evaluation (can be enhanced)
          let conditionMet = false;
          if (condition.toLowerCase().includes('contains')) {
            const searchTerm = condition.match(/'([^']+)'/)?.[1] || '';
            conditionMet = userMessage.toLowerCase().includes(searchTerm.toLowerCase());
          } else if (condition.toLowerCase().includes('equals')) {
            const compareTo = condition.match(/'([^']+)'/)?.[1] || '';
            conditionMet = userMessage.toLowerCase() === compareTo.toLowerCase();
          } else {
            // Default to true for demo
            conditionMet = Math.random() > 0.5;
          }

          addMessage(`🔍 Checking condition: "${condition}" → ${conditionMet ? '✓ True' : '✗ False'}`, false);
          
          // Find the appropriate next edge
          const ifElseEdge = flowData.edges.find(
            edge => edge.source === nodeId && edge.sourceHandle === (conditionMet ? 'true' : 'false')
          );
          
          if (ifElseEdge) {
            await executeNode(ifElseEdge.target, context);
          }
          break;

        case 'delay':
          const delayAmount = node.data.delay || 1;
          const delayUnit = node.data.unit || 'seconds';
          addMessage(`⏱️ Waiting for ${delayAmount} ${delayUnit}...`, false);
          
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
          
          const delayNextEdge = flowData.edges.find(edge => edge.source === nodeId);
          if (delayNextEdge) {
            await executeNode(delayNextEdge.target, context);
          }
          break;

        case 'loop':
          const loopType = node.data.loopType || 'repeat';
          const iterations = node.data.iterations || 1;
          
          addMessage(`🔁 Starting loop (${loopType}, ${iterations} times)`, false);
          
          // Execute loop body
          const loopBodyEdge = flowData.edges.find(
            edge => edge.source === nodeId && edge.sourceHandle === 'loop'
          );
          
          if (loopBodyEdge) {
            for (let i = 0; i < iterations; i++) {
              await new Promise(resolve => setTimeout(resolve, 500));
              addMessage(`🔁 Loop iteration ${i + 1}/${iterations}`, false);
              
              // For demo, we'll just execute the next node once
              // In real implementation, this would execute the entire loop body
              if (i === 0) {
                const loopBodyNode = flowData.nodes.find(n => n.id === loopBodyEdge.target);
                if (loopBodyNode && loopBodyNode.type === 'sendMessage') {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  addMessage(loopBodyNode.data.message || 'Loop message', false);
                }
              }
            }
          }
          
          // Exit loop
          const loopExitEdge = flowData.edges.find(
            edge => edge.source === nodeId && edge.sourceHandle === 'exit'
          );
          
          if (loopExitEdge) {
            await executeNode(loopExitEdge.target, context);
          }
          break;

        case 'setVariable':
          const varName = node.data.variableName || 'variable';
          const varValue = node.data.variableValue || '';
          context[varName] = varValue;
          addMessage(`📦 Set variable: ${varName} = "${varValue}"`, false);
          
          const varNextEdge = flowData.edges.find(edge => edge.source === nodeId);
          if (varNextEdge) {
            await executeNode(varNextEdge.target, context);
          }
          break;

        default:
          // Unknown node type, just continue
          const defaultNextEdge = flowData.edges.find(edge => edge.source === nodeId);
          if (defaultNextEdge) {
            await executeNode(defaultNextEdge.target, context);
          }
      }
    };

    // Start execution from the first connected node after trigger
    const firstEdge = flowData.edges.find(edge => edge.source === triggerNode.id);
    if (firstEdge) {
      await executeNode(firstEdge.target);
      await new Promise(resolve => setTimeout(resolve, 500));
      addMessage('✅ Flow execution completed!', false);
    } else {
      addMessage('⚠️ No nodes connected to the trigger', false);
    }

    setIsProcessing(false);
  };

  const handleSend = () => {
    if (inputMessage.trim() && !isProcessing) {
      simulateFlow(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetSimulation = () => {
    setMessages([]);
    addMessage('👋 Simulation started! Send a message to test your flow.', false);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      resetSimulation();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-white/20 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <div>
              <h3 className="font-bold text-lg">Flow Simulator</h3>
              <p className="text-xs text-green-100">Test your bot flow in real-time</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetSimulation}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all"
            >
              🔄 Reset
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  msg.fromUser
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-md shadow-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <span className="text-[10px] opacity-70 mt-1 block">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-2xl rounded-bl-md shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message to test the flow..."
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isProcessing || !inputMessage.trim()}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowSimulator;
