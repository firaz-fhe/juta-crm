import React, { useState, useRef, useEffect } from 'react';

interface ChatSimulatorProps {
  nodes: any[];
  edges: any[];
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  fromUser: boolean;
  timestamp: Date;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ nodes, edges, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      // Reset and start simulation
      setMessages([]);
      setCurrentNodeId(null);
      addBotMessage('👋 Simulation started! Send a message to trigger the bot flow.');
    }
  }, [isOpen]);

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      fromUser: false,
      timestamp: new Date(),
    }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      fromUser: true,
      timestamp: new Date(),
    }]);
  };

  const findTriggerNode = () => {
    return nodes.find(node => node.type === 'trigger' || node.type === 'whatsappTrigger');
  };

  const findNextNode = (currentNode: any, output?: string) => {
    const edge = edges.find(e => {
      if (output) {
        return e.source === currentNode.id && e.sourceHandle === output;
      }
      return e.source === currentNode.id;
    });
    
    if (!edge) return null;
    return nodes.find(n => n.id === edge.target);
  };

  const evaluateCondition = (condition: string, userMessage: string, variables: any): boolean => {
    try {
      // Simple condition evaluation
      let evalCondition = condition;
      
      // Replace variables
      evalCondition = evalCondition.replace(/\{\{message\}\}/g, `"${userMessage}"`);
      evalCondition = evalCondition.replace(/\{\{phone\}\}/g, `"+1234567890"`);
      evalCondition = evalCondition.replace(/\{\{name\}\}/g, `"Test User"`);
      
      // Handle common operators
      if (evalCondition.includes('contains')) {
        const match = evalCondition.match(/"([^"]+)"\s+contains\s+"([^"]+)"/);
        if (match) {
          return match[1].toLowerCase().includes(match[2].toLowerCase());
        }
      }
      
      if (evalCondition.includes('==')) {
        const match = evalCondition.match(/"([^"]+)"\s*==\s*"([^"]+)"/);
        if (match) {
          return match[1].toLowerCase() === match[2].toLowerCase();
        }
      }

      if (evalCondition.includes('starts with')) {
        const match = evalCondition.match(/"([^"]+)"\s+starts\s+with\s+"([^"]+)"/);
        if (match) {
          return match[1].toLowerCase().startsWith(match[2].toLowerCase());
        }
      }

      // Default to false if we can't evaluate
      return false;
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  };

  const replaceVariables = (text: string, userMessage: string): string => {
    return text
      .replace(/\{\{message\}\}/g, userMessage)
      .replace(/\{\{phone\}\}/g, '+1234567890')
      .replace(/\{\{name\}\}/g, 'Test User');
  };

  const processFlow = async (userMessage: string) => {
    setIsProcessing(true);
    
    try {
      // Start from trigger node
      const triggerNode = findTriggerNode();
      if (!triggerNode) {
        addBotMessage('❌ No trigger node found. Please add a WhatsApp Trigger block to start the flow.');
        setIsProcessing(false);
        return;
      }

      let currentNode = findNextNode(triggerNode);
      let iterations = 0;
      const maxIterations = 50; // Prevent infinite loops
      const variables: Record<string, string> = {}; // Store variables during flow execution

      while (currentNode && iterations < maxIterations) {
        iterations++;

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500));

        if (currentNode.type === 'sendMessage') {
          let message = currentNode.data.message || '';
          // Replace standard variables
          message = message
            .replace(/\{\{message\}\}/g, userMessage)
            .replace(/\{\{phone\}\}/g, '+1234567890')
            .replace(/\{\{name\}\}/g, 'Test User');
          
          // Replace stored variables from AI Assistant or Set Variable blocks
          Object.keys(variables).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            message = message.replace(regex, variables[key]);
          });
          
          if (message) {
            addBotMessage(message);
          }
          currentNode = findNextNode(currentNode);
        } 
        else if (currentNode.type === 'aiAssistant') {
          const instruction = currentNode.data.instruction || 'Analyze the message';
          const selectedVars = currentNode.data.variables || [];
          const outputVar = currentNode.data.outputVariable || 'aiResponse';
          
          // Simulate AI processing
          addBotMessage(`🤖 AI is thinking...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock AI response based on instruction
          let aiResponse = '';
          if (instruction.toLowerCase().includes('sentiment')) {
            aiResponse = userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('great') 
              ? 'Positive sentiment detected' 
              : 'Neutral/Negative sentiment detected';
          } else if (instruction.toLowerCase().includes('summary')) {
            aiResponse = `Summary: ${userMessage.substring(0, 50)}...`;
          } else {
            aiResponse = `AI analyzed: "${userMessage}" - Based on your instruction: "${instruction}"`;
          }
          
          addBotMessage(`🤖 AI Response saved to {{${outputVar}}}: "${aiResponse}"`);
          
          // Store AI response in variables for later use
          variables[outputVar] = aiResponse;
          
          currentNode = findNextNode(currentNode);
        }
        else if (currentNode.type === 'ifElse') {
          const condition = currentNode.data.condition || '';
          const result = evaluateCondition(condition, userMessage, {});
          
          addBotMessage(`🔀 Condition evaluated: ${result ? 'TRUE' : 'FALSE'}`);
          currentNode = findNextNode(currentNode, result ? 'true' : 'false');
        }
        else if (currentNode.type === 'delay') {
          const seconds = currentNode.data.seconds || 1;
          addBotMessage(`⏱️ Waiting ${seconds} seconds...`);
          await new Promise(resolve => setTimeout(resolve, seconds * 1000));
          currentNode = findNextNode(currentNode);
        }
        else if (currentNode.type === 'setVariable') {
          const varName = currentNode.data.variableName || 'variable';
          const varValue = currentNode.data.variableValue || '';
          
          variables[varName] = varValue;
          addBotMessage(`📦 Variable saved: {{${varName}}} = "${varValue}"`);
          
          currentNode = findNextNode(currentNode);
        }
        else if (currentNode.type === 'loop') {
          const loopType = currentNode.data.loopType || 'times';
          const count = currentNode.data.count || 3;
          
          addBotMessage(`🔁 Starting loop (${loopType}, ${count} times)...`);
          
          // For simulation, we'll just execute the loop body once
          currentNode = findNextNode(currentNode, 'body');
          
          // After loop body, continue
          if (currentNode) {
            const loopNode = nodes.find(n => n.type === 'loop' && n.id === currentNode.id);
            currentNode = findNextNode(loopNode, 'continue');
          }
        }
        else {
          // Unknown node type, try to continue
          currentNode = findNextNode(currentNode);
        }
      }

      if (iterations >= maxIterations) {
        addBotMessage('⚠️ Flow stopped: Maximum iterations reached (possible infinite loop)');
      } else {
        addBotMessage('✅ Flow completed!');
      }
    } catch (error) {
      console.error('Error processing flow:', error);
      addBotMessage('❌ Error processing flow');
    }

    setIsProcessing(false);
  };

  const handleSend = () => {
    if (!inputMessage.trim() || isProcessing) return;

    addUserMessage(inputMessage);
    const message = inputMessage;
    setInputMessage('');
    
    // Process the flow with the user message
    processFlow(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentNodeId(null);
    addBotMessage('👋 Simulation reset! Send a message to trigger the bot flow.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Chat Simulator</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Test your bot flow in real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all"
            >
              🔄 Reset
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-4xl mb-2">💬</p>
                <p>No messages yet</p>
                <p className="text-sm">Send a message to start the simulation</p>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-2xl ${
                  msg.fromUser
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-sm shadow-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.fromUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-bl-sm shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isProcessing}
              className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isProcessing || !inputMessage.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📤 Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSimulator;
