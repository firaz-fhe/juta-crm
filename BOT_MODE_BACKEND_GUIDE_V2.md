# Bot Mode Backend Implementation Guide v2.0

## Overview

The Bot Mode feature allows users to create custom bot flows using a drag-and-drop interface with advanced control flow blocks. This guide explains how to implement the backend logic to handle bot mode execution instead of AI mode.

**Database:** Neon PostgreSQL  
**Framework:** Node.js + Express  
**WhatsApp:** WhatsApp Web.js

## New Features in v2.0

### Enhanced Block Types
1. **WhatsApp Trigger Block** - Entry point for the bot flow when a message is received
2. **Send Message Block** - Sends a text message to the user
3. **AI Assistant Block** - Uses AI to analyze data and generate responses
4. **If/Else Block** - Conditional branching based on message content or variables
5. **Delay Block** - Waits for a specified duration before continuing
6. **Loop Block** - Repeats actions multiple times
7. **Set Variable Block** - Stores values in variables for use throughout the flow

### New Capabilities
- **Fullscreen Mode** - Allows users to work in a fullscreen canvas
- **Flow Simulator** - Test bot flows in real-time with a chat interface
- **Multi-path Execution** - Support for conditional branching and loops
- **Variable Storage** - Store and retrieve data during flow execution
- **AI Integration** - Use AI to generate dynamic responses
- **Dynamic Message Templating** - Use variables in messages with `{{variableName}}` syntax

---

## Database Setup (Neon PostgreSQL)

### 1. Create Tables

Run these SQL commands in your Neon database:

```sql
-- Bot Flows table
CREATE TABLE IF NOT EXISTS bot_flows (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_flows_company_id ON bot_flows(company_id);

-- Companies table (add bot_mode column if not exists)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bot_mode VARCHAR(20) DEFAULT 'ai';

-- Create index on bot_mode for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_bot_mode ON companies(bot_mode);
```

---

## Data Structures

### Bot Flow Structure

```typescript
interface BotFlow {
  id: number;
  companyId: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
}

interface Node {
  id: string;
  type: 'whatsappTrigger' | 'sendMessage' | 'aiAssistant' | 'ifElse' | 'delay' | 'loop' | 'setVariable';
  position: { x: number; y: number };
  data: NodeData;
}

interface NodeData {
  label: string;
  
  // For sendMessage blocks
  message?: string;
  
  // For aiAssistant blocks
  instruction?: string;
  variables?: string[]; // Array of variables to feed to AI: ['{{message}}', '{{name}}']
  outputVariable?: string; // Variable name to store AI response: 'aiResponse'
  
  // For ifElse blocks
  condition?: string; // e.g., "{{message}} == 'yes'"
  
  // For delay blocks
  delay?: number;
  unit?: 'seconds' | 'minutes' | 'hours';
  
  // For loop blocks
  loopType?: 'repeat';
  iterations?: number;
  
  // For setVariable blocks
  variableName?: string;
  variableValue?: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // 'true', 'false', 'loop'
  type: 'smoothstep';
  animated: boolean;
  markerEnd: {
    type: 'arrowclosed';
  };
}
```

---

## Backend Implementation

### 1. Database Connection Setup

Add to your `server.js` or create `db.js`:

```javascript
const { Pool } = require('pg');

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
  }
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

module.exports = pool;
```

### 2. Message Handler with Mode Detection

Update `setupMessageHandler` in your main server file:

```javascript
async function setupMessageHandler(client, botName, phoneIndex) {
  client.on("message", async (msg) => {
    try {
      console.log(`🔔 [MESSAGE_HANDLER] ===== INCOMING MESSAGE =====`);
      console.log(`🔔 [MESSAGE_HANDLER] Bot: ${botName}`);
      console.log(`🔔 [MESSAGE_HANDLER] From: ${msg.from}`);
      
      // Filter out status messages
      const chatId = msg.from;
      if (
        chatId.includes("status") ||
        chatId.includes("newsletter") ||
        chatId.includes("status@broadcast")
      ) {
        console.log(`🔔 [MESSAGE_HANDLER] ❌ Status filtered - skipping`);
        return;
      }

      // Check if company is using Bot Mode or AI Mode
      const companyMode = await getCompanyMode(botName);
      
      if (companyMode === 'bot') {
        // Use Bot Flow Handler
        await handleBotFlowMessage(client, msg, botName, phoneIndex);
      } else {
        // Use existing AI Handler
        await handleNewMessagesTemplateWweb(client, msg, botName, phoneIndex);
      }

      // Broadcast message to frontend
      const extractedNumber = await safeExtractPhoneNumber(msg, client);
      if (extractedNumber) {
        const cleanExtractedNumber = extractedNumber.replace("+", "");
        const messageData = {
          chatId: msg.from,
          message: msg.body,
          extractedNumber: extractedNumber,
          contactId: `${botName}-${cleanExtractedNumber}`,
          fromMe: msg.fromMe,
          timestamp: Math.floor(Date.now() / 1000),
          messageType: msg.type,
          contactName: msg.notifyName || cleanExtractedNumber,
        };
        
        broadcastNewMessageToCompany(botName, messageData);
      }

      console.log(`🔔 [MESSAGE_HANDLER] ✅ Message processed successfully`);
    } catch (error) {
      console.error(`🔔 [MESSAGE_HANDLER] ❌ Error:`, error);
    }
  });
}
```

### 3. Get Company Mode

```javascript
const pool = require('./db'); // Your database connection

async function getCompanyMode(companyId) {
  try {
    const result = await pool.query(
      'SELECT bot_mode FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (result.rows.length === 0) {
      console.log(`Company ${companyId} not found, defaulting to AI mode`);
      return 'ai';
    }
    
    return result.rows[0].bot_mode || 'ai';
  } catch (error) {
    console.error('Error getting company mode:', error);
    return 'ai';
  }
}
```

### 4. Complete Bot Flow Handler

Create `botFlowHandler.js`:

```javascript
const pool = require('./db');
const OpenAI = require('openai');

// Initialize OpenAI for AI Assistant blocks
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Handles incoming messages using the bot flow
 */
async function handleBotFlowMessage(client, msg, companyId, phoneIndex) {
  try {
    console.log(`🤖 [BOT_FLOW] Starting bot flow execution for ${companyId}`);
    
    // Load the bot flow for this company
    const botFlow = await loadBotFlow(companyId);
    
    if (!botFlow || !botFlow.nodes || botFlow.nodes.length === 0) {
      console.log(`🤖 [BOT_FLOW] No bot flow found, sending default message`);
      await client.sendMessage(msg.from, 'Sorry, the bot is not configured yet.');
      return;
    }
    
    // Get contact info
    const contact = await msg.getContact();
    const contactName = contact.pushname || contact.name || 'User';
    const contactPhone = msg.from.replace('@c.us', '');
    
    // Initialize execution context
    const context = {
      userMessage: msg.body,
      contactId: msg.from,
      variables: {
        message: msg.body,
        name: contactName,
        phone: contactPhone,
        email: '',
        address: '',
        notes: '',
      },
      visitedNodes: new Set(),
    };
    
    // Find the trigger node (WhatsApp Trigger)
    const triggerNode = botFlow.nodes.find(node => node.type === 'whatsappTrigger');
    
    if (!triggerNode) {
      console.log(`🤖 [BOT_FLOW] No trigger node found in flow`);
      return;
    }
    
    // Find the first connected node
    const firstEdge = botFlow.edges.find(edge => edge.source === triggerNode.id);
    
    if (!firstEdge) {
      console.log(`🤖 [BOT_FLOW] No nodes connected to trigger`);
      return;
    }
    
    // Execute the flow starting from the first node
    await executeNode(client, msg, botFlow, firstEdge.target, context);
    
    console.log(`🤖 [BOT_FLOW] ✅ Flow execution completed`);
    
  } catch (error) {
    console.error(`🤖 [BOT_FLOW] ❌ Error executing bot flow:`, error);
    await client.sendMessage(msg.from, 'Sorry, an error occurred.');
  }
}

/**
 * Loads the bot flow from database
 */
async function loadBotFlow(companyId) {
  try {
    const result = await pool.query(
      'SELECT * FROM bot_flows WHERE company_id = $1',
      [companyId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const flow = result.rows[0];
    return {
      id: flow.id,
      companyId: flow.company_id,
      name: flow.name,
      nodes: flow.nodes,
      edges: flow.edges,
      createdAt: flow.created_at,
      updatedAt: flow.updated_at,
    };
  } catch (error) {
    console.error('Error loading bot flow:', error);
    return null;
  }
}

/**
 * Executes a single node in the flow
 */
async function executeNode(client, msg, botFlow, nodeId, context) {
  // Prevent infinite loops
  if (context.visitedNodes.has(nodeId)) {
    console.log(`🤖 [BOT_FLOW] Circular reference detected at node ${nodeId}, stopping`);
    return;
  }
  
  const node = botFlow.nodes.find(n => n.id === nodeId);
  
  if (!node) {
    console.log(`🤖 [BOT_FLOW] Node ${nodeId} not found`);
    return;
  }
  
  context.visitedNodes.add(nodeId);
  console.log(`🤖 [BOT_FLOW] Executing node: ${node.type} (${nodeId})`);
  
  try {
    switch (node.type) {
      case 'sendMessage':
        await executeSendMessage(client, msg, node, context);
        const nextEdge = botFlow.edges.find(edge => edge.source === nodeId);
        if (nextEdge) {
          await executeNode(client, msg, botFlow, nextEdge.target, context);
        }
        break;
        
      case 'aiAssistant':
        await executeAIAssistant(node, context);
        const aiNextEdge = botFlow.edges.find(edge => edge.source === nodeId);
        if (aiNextEdge) {
          await executeNode(client, msg, botFlow, aiNextEdge.target, context);
        }
        break;
        
      case 'ifElse':
        const conditionMet = await executeIfElse(node, context);
        const branchEdge = botFlow.edges.find(
          edge => edge.source === nodeId && 
          edge.sourceHandle === (conditionMet ? 'true' : 'false')
        );
        if (branchEdge) {
          await executeNode(client, msg, botFlow, branchEdge.target, context);
        }
        break;
        
      case 'delay':
        await executeDelay(node);
        const delayNextEdge = botFlow.edges.find(edge => edge.source === nodeId);
        if (delayNextEdge) {
          await executeNode(client, msg, botFlow, delayNextEdge.target, context);
        }
        break;
        
      case 'loop':
        await executeLoop(client, msg, botFlow, node, context);
        break;
        
      case 'setVariable':
        executeSetVariable(node, context);
        const varNextEdge = botFlow.edges.find(edge => edge.source === nodeId);
        if (varNextEdge) {
          await executeNode(client, msg, botFlow, varNextEdge.target, context);
        }
        break;
        
      default:
        console.log(`🤖 [BOT_FLOW] Unknown node type: ${node.type}`);
    }
  } catch (error) {
    console.error(`🤖 [BOT_FLOW] Error executing node ${nodeId}:`, error);
    // Continue to next node even if this one fails
    const errorNextEdge = botFlow.edges.find(edge => edge.source === nodeId);
    if (errorNextEdge) {
      await executeNode(client, msg, botFlow, errorNextEdge.target, context);
    }
  }
}

/**
 * Executes a Send Message node
 */
async function executeSendMessage(client, msg, node, context) {
  let message = node.data.message || 'Hello!';
  
  // Replace variables in message
  message = replaceVariables(message, context);
  
  console.log(`🤖 [BOT_FLOW] Sending message: ${message}`);
  await client.sendMessage(msg.from, message);
  
  // Add delay to avoid rate limiting
  await sleep(1000);
}

/**
 * Executes an AI Assistant node
 */
async function executeAIAssistant(node, context) {
  try {
    const instruction = node.data.instruction || 'Analyze the message and provide a helpful response';
    const selectedVars = node.data.variables || ['{{message}}'];
    const outputVar = node.data.outputVariable || 'aiResponse';
    
    console.log(`🤖 [BOT_FLOW] AI Assistant - Instruction: ${instruction}`);
    console.log(`🤖 [BOT_FLOW] AI Assistant - Variables: ${selectedVars.join(', ')}`);
    
    // Build context for AI
    let aiContext = `User instruction: ${instruction}\n\n`;
    aiContext += `Available data:\n`;
    
    selectedVars.forEach(varTemplate => {
      const varName = varTemplate.replace(/{{|}}/g, '');
      const varValue = context.variables[varName] || '';
      aiContext += `- ${varName}: ${varValue}\n`;
    });
    
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that follows instructions precisely. Provide concise, relevant responses.'
        },
        {
          role: 'user',
          content: aiContext
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const aiResponse = response.choices[0].message.content.trim();
    console.log(`🤖 [BOT_FLOW] AI Response: ${aiResponse}`);
    
    // Store AI response in context
    context.variables[outputVar] = aiResponse;
    
  } catch (error) {
    console.error(`🤖 [BOT_FLOW] AI Assistant error:`, error);
    // Fallback response
    context.variables[node.data.outputVariable || 'aiResponse'] = 'I apologize, I am having trouble processing your request right now.';
  }
}

/**
 * Executes an If/Else node
 */
async function executeIfElse(node, context) {
  const condition = node.data.condition || '';
  console.log(`🤖 [BOT_FLOW] Evaluating condition: ${condition}`);
  
  // Replace variables in condition
  let evalCondition = condition;
  for (const [key, value] of Object.entries(context.variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    evalCondition = evalCondition.replace(regex, value);
  }
  
  console.log(`🤖 [BOT_FLOW] Condition after variable replacement: ${evalCondition}`);
  
  // Check for '==' conditions
  if (evalCondition.includes('==')) {
    const parts = evalCondition.split('==').map(p => p.trim().replace(/'/g, ''));
    if (parts.length === 2) {
      const result = parts[0].toLowerCase() === parts[1].toLowerCase();
      console.log(`🤖 [BOT_FLOW] Condition result: ${result} (${parts[0]} == ${parts[1]})`);
      return result;
    }
  }
  
  // Check for 'contains' conditions
  if (evalCondition.toLowerCase().includes('contains')) {
    const match = evalCondition.match(/(.+)\s+contains\s+['"](.+)['"]/i);
    if (match) {
      const text = match[1].trim();
      const keyword = match[2].toLowerCase();
      const result = text.toLowerCase().includes(keyword);
      console.log(`🤖 [BOT_FLOW] Condition result: ${result} (contains)`);
      return result;
    }
  }
  
  console.log(`🤖 [BOT_FLOW] Condition defaulting to false`);
  return false;
}

/**
 * Executes a Delay node
 */
async function executeDelay(node) {
  const delay = node.data.delay || 1;
  const unit = node.data.unit || 'seconds';
  
  let milliseconds = delay * 1000;
  if (unit === 'minutes') milliseconds = delay * 60 * 1000;
  if (unit === 'hours') milliseconds = delay * 60 * 60 * 1000;
  
  console.log(`🤖 [BOT_FLOW] Delaying for ${delay} ${unit}`);
  await sleep(milliseconds);
}

/**
 * Executes a Loop node
 */
async function executeLoop(client, msg, botFlow, node, context) {
  const iterations = node.data.iterations || 1;
  
  console.log(`🤖 [BOT_FLOW] Starting loop: ${iterations} times`);
  
  // Find loop body edge
  const loopBodyEdge = botFlow.edges.find(
    edge => edge.source === node.id && edge.sourceHandle === 'loop'
  );
  
  if (loopBodyEdge) {
    for (let i = 0; i < iterations; i++) {
      console.log(`🤖 [BOT_FLOW] Loop iteration ${i + 1}/${iterations}`);
      
      // Create a new visited nodes set for each iteration
      const loopContext = {
        ...context,
        visitedNodes: new Set(),
        variables: { ...context.variables, loopIndex: i + 1 },
      };
      
      await executeNode(client, msg, botFlow, loopBodyEdge.target, loopContext);
      
      // Copy any new variables back to main context
      Object.assign(context.variables, loopContext.variables);
    }
  }
  
  // Continue after loop (single exit point)
  const exitEdge = botFlow.edges.find(
    edge => edge.source === node.id && !edge.sourceHandle
  );
  
  if (exitEdge) {
    await executeNode(client, msg, botFlow, exitEdge.target, context);
  }
}

/**
 * Executes a Set Variable node
 */
function executeSetVariable(node, context) {
  const varName = node.data.variableName || '';
  let varValue = node.data.variableValue || '';
  
  // Replace variables in value
  varValue = replaceVariables(varValue, context);
  
  console.log(`🤖 [BOT_FLOW] Setting variable: ${varName} = ${varValue}`);
  context.variables[varName] = varValue;
}

/**
 * Replaces variables in a string
 * Format: {{variableName}}
 */
function replaceVariables(text, context) {
  let result = text;
  
  // Replace all variables
  for (const [key, value] of Object.entries(context.variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  handleBotFlowMessage,
  loadBotFlow,
};
```

### 5. API Endpoints

Add these to your Express server:

```javascript
const pool = require('./db');

// GET /api/bot-flow?companyId=xxx
app.get('/api/bot-flow', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    
    const result = await pool.query(
      'SELECT * FROM bot_flows WHERE company_id = $1',
      [companyId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ flow: null });
    }
    
    const flow = result.rows[0];
    res.json({ 
      flow: {
        id: flow.id,
        companyId: flow.company_id,
        name: flow.name,
        nodes: flow.nodes,
        edges: flow.edges,
        createdAt: flow.created_at,
        updatedAt: flow.updated_at,
      }
    });
  } catch (error) {
    console.error('Error loading bot flow:', error);
    res.status(500).json({ error: 'Failed to load bot flow' });
  }
});

// POST /api/bot-flow
app.post('/api/bot-flow', async (req, res) => {
  try {
    const { companyId, name, nodes, edges } = req.body;
    
    if (!companyId || !name || !nodes || !edges) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if flow exists
    const existing = await pool.query(
      'SELECT id FROM bot_flows WHERE company_id = $1',
      [companyId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing flow
      await pool.query(
        `UPDATE bot_flows 
         SET name = $1, nodes = $2, edges = $3, updated_at = NOW()
         WHERE company_id = $4`,
        [name, JSON.stringify(nodes), JSON.stringify(edges), companyId]
      );
    } else {
      // Insert new flow
      await pool.query(
        `INSERT INTO bot_flows (company_id, name, nodes, edges)
         VALUES ($1, $2, $3, $4)`,
        [companyId, name, JSON.stringify(nodes), JSON.stringify(edges)]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving bot flow:', error);
    res.status(500).json({ error: 'Failed to save bot flow' });
  }
});

// POST /api/company-mode
app.post('/api/company-mode', async (req, res) => {
  try {
    const { companyId, mode } = req.body;
    
    if (!companyId || !['ai', 'bot'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    
    await pool.query(
      'UPDATE companies SET bot_mode = $1 WHERE id = $2',
      [mode, companyId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating company mode:', error);
    res.status(500).json({ error: 'Failed to update mode' });
  }
});

// GET /api/company-mode?companyId=xxx
app.get('/api/company-mode', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    
    const result = await pool.query(
      'SELECT bot_mode FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({ mode: result.rows[0].bot_mode || 'ai' });
  } catch (error) {
    console.error('Error getting company mode:', error);
    res.status(500).json({ error: 'Failed to get mode' });
  }
});
```

---

```javascript
async function setupMessageHandler(client, botName, phoneIndex) {
  client.on("message", async (msg) => {
    try {
      console.log(`🔔 [MESSAGE_HANDLER] ===== INCOMING MESSAGE =====`);
      console.log(`🔔 [MESSAGE_HANDLER] Bot: ${botName}`);
      console.log(`🔔 [MESSAGE_HANDLER] From: ${msg.from}`);
      
      // Filter out status messages
      const chatId = msg.from;
      if (
        chatId.includes("status") ||
        chatId.includes("newsletter") ||
        chatId.includes("status@broadcast")
      ) {
        console.log(`🔔 [MESSAGE_HANDLER] ❌ Status filtered - skipping`);
        return;
      }

      // Check if company is using Bot Mode or AI Mode
      const companyMode = await getCompanyMode(botName);
      
      if (companyMode === 'bot') {
        // Use Bot Flow Handler
        await handleBotFlowMessage(client, msg, botName, phoneIndex);
      } else {
        // Use existing AI Handler
        await handleNewMessagesTemplateWweb(client, msg, botName, phoneIndex);
      }

      // Broadcast message to frontend
      const extractedNumber = await safeExtractPhoneNumber(msg, client);
      if (extractedNumber) {
        const cleanExtractedNumber = extractedNumber.replace("+", "");
        const messageData = {
          chatId: msg.from,
          message: msg.body,
          extractedNumber: extractedNumber,
          contactId: `${botName}-${cleanExtractedNumber}`,
          fromMe: msg.fromMe,
          timestamp: Math.floor(Date.now() / 1000),
          messageType: msg.type,
          contactName: msg.notifyName || cleanExtractedNumber,
        };
        
        broadcastNewMessageToCompany(botName, messageData);
      }

      console.log(`🔔 [MESSAGE_HANDLER] ✅ Message processed successfully`);
    } catch (error) {
      console.error(`🔔 [MESSAGE_HANDLER] ❌ Error:`, error);
    }
  });
}
```

### 2. Get Company Mode

```javascript
async function getCompanyMode(companyId) {
  try {
    const firestore = admin.firestore();
    const companyDoc = await firestore
      .collection('companies')
      .doc(companyId)
      .get();
    
    if (!companyDoc.exists) {
      console.log(`Company ${companyId} not found, defaulting to AI mode`);
      return 'ai';
    }
    
    const companyData = companyDoc.data();
    return companyData.botMode || 'ai';
  } catch (error) {
    console.error('Error getting company mode:', error);
    return 'ai';
  }
}
```

### 3. Complete Bot Flow Handler

Create `botFlowHandler.js`:

```javascript
const admin = require('firebase-admin');

/**
 * Handles incoming messages using the bot flow
 */
async function handleBotFlowMessage(client, msg, companyId, phoneIndex) {
  try {
    console.log(`🤖 [BOT_FLOW] Starting bot flow execution for ${companyId}`);
    
    // Load the bot flow for this company
    const botFlow = await loadBotFlow(companyId);
    
    if (!botFlow || !botFlow.nodes || botFlow.nodes.length === 0) {
      console.log(`🤖 [BOT_FLOW] No bot flow found, sending default message`);
      await client.sendMessage(msg.from, 'Sorry, the bot is not configured yet.');
      return;
    }
    
    // Initialize execution context
    const context = {
      userMessage: msg.body,
      contactId: msg.from,
      variables: {},
      visitedNodes: new Set(),
    };
    
    // Find the trigger node (WhatsApp Trigger)
    const triggerNode = botFlow.nodes.find(node => node.type === 'whatsappTrigger');
    
    if (!triggerNode) {
      console.log(`🤖 [BOT_FLOW] No trigger node found in flow`);
      return;
    }
    
    // Find the first connected node
    const firstEdge = botFlow.edges.find(edge => edge.source === triggerNode.id);
    
    if (!firstEdge) {
      console.log(`🤖 [BOT_FLOW] No nodes connected to trigger`);
      return;
    }
    
    // Execute the flow starting from the first node
    await executeNode(client, msg, botFlow, firstEdge.target, context);
    
    console.log(`🤖 [BOT_FLOW] ✅ Flow execution completed`);
    
  } catch (error) {
    console.error(`🤖 [BOT_FLOW] ❌ Error executing bot flow:`, error);
    await client.sendMessage(msg.from, 'Sorry, an error occurred.');
  }
}

/**
 * Loads the bot flow from Firebase
 */
async function loadBotFlow(companyId) {
  try {
    const firestore = admin.firestore();
    const flowDoc = await firestore
      .collection('botFlows')
      .doc(companyId)
      .get();
    
    if (!flowDoc.exists) {
      return null;
    }
    
    return flowDoc.data();
  } catch (error) {
    console.error('Error loading bot flow:', error);
    return null;
  }
}

/**
 * Executes a single node in the flow
 */
async function executeNode(client, msg, botFlow, nodeId, context) {
  // Prevent infinite loops
  if (context.visitedNodes.has(nodeId)) {
    console.log(`🤖 [BOT_FLOW] Circular reference detected at node ${nodeId}, stopping`);
    return;
  }
  
  const node = botFlow.nodes.find(n => n.id === nodeId);
  
  if (!node) {
    console.log(`🤖 [BOT_FLOW] Node ${nodeId} not found`);
    return;
  }
  
  context.visitedNodes.add(nodeId);
  console.log(`🤖 [BOT_FLOW] Executing node: ${node.type} (${nodeId})`);
  
  switch (node.type) {
    case 'sendMessage':
      await executeSendMessage(client, msg, node, context);
      const nextEdge = botFlow.edges.find(edge => edge.source === nodeId);
      if (nextEdge) {
        await executeNode(client, msg, botFlow, nextEdge.target, context);
      }
      break;
      
    case 'ifElse':
      const conditionMet = await executeIfElse(node, context);
      const branchEdge = botFlow.edges.find(
        edge => edge.source === nodeId && 
        edge.sourceHandle === (conditionMet ? 'true' : 'false')
      );
      if (branchEdge) {
        await executeNode(client, msg, botFlow, branchEdge.target, context);
      }
      break;
      
    case 'delay':
      await executeDelay(node);
      const delayNextEdge = botFlow.edges.find(edge => edge.source === nodeId);
      if (delayNextEdge) {
        await executeNode(client, msg, botFlow, delayNextEdge.target, context);
      }
      break;
      
    case 'loop':
      await executeLoop(client, msg, botFlow, node, context);
      break;
      
    case 'setVariable':
      executeSetVariable(node, context);
      const varNextEdge = botFlow.edges.find(edge => edge.source === nodeId);
      if (varNextEdge) {
        await executeNode(client, msg, botFlow, varNextEdge.target, context);
      }
      break;
      
    default:
      console.log(`🤖 [BOT_FLOW] Unknown node type: ${node.type}`);
  }
}

/**
 * Executes a Send Message node
 */
async function executeSendMessage(client, msg, node, context) {
  let message = node.data.message || 'Hello!';
  
  // Replace variables in message
  message = replaceVariables(message, context);
  
  console.log(`🤖 [BOT_FLOW] Sending message: ${message}`);
  await client.sendMessage(msg.from, message);
  
  // Add delay to avoid rate limiting
  await sleep(1000);
}

/**
 * Executes an If/Else node
 */
async function executeIfElse(node, context) {
  const condition = node.data.condition || '';
  console.log(`🤖 [BOT_FLOW] Evaluating condition: ${condition}`);
  
  // Check for 'contains' conditions
  if (condition.toLowerCase().includes('contains')) {
    const match = condition.match(/'([^']+)'/);
    if (match) {
      const keyword = match[1].toLowerCase();
      const result = context.userMessage.toLowerCase().includes(keyword);
      console.log(`🤖 [BOT_FLOW] Condition result: ${result}`);
      return result;
    }
  }
  
  // Check for 'equals' conditions
  if (condition.toLowerCase().includes('equals')) {
    const match = condition.match(/'([^']+)'/);
    if (match) {
      const value = match[1].toLowerCase();
      const result = context.userMessage.toLowerCase() === value;
      console.log(`🤖 [BOT_FLOW] Condition result: ${result}`);
      return result;
    }
  }
  
  // Check variable conditions
  if (condition.includes('{') && condition.includes('}')) {
    const varMatch = condition.match(/\{([^}]+)\}/);
    if (varMatch) {
      const varName = varMatch[1];
      const varValue = context.variables[varName];
      
      if (condition.includes('equals')) {
        const valueMatch = condition.match(/'([^']+)'/);
        if (valueMatch) {
          const result = varValue === valueMatch[1];
          console.log(`🤖 [BOT_FLOW] Variable condition result: ${result}`);
          return result;
        }
      }
    }
  }
  
  console.log(`🤖 [BOT_FLOW] Condition defaulting to false`);
  return false;
}

/**
 * Executes a Delay node
 */
async function executeDelay(node) {
  const delay = node.data.delay || 1;
  const unit = node.data.unit || 'seconds';
  
  let milliseconds = delay * 1000;
  if (unit === 'minutes') milliseconds = delay * 60 * 1000;
  if (unit === 'hours') milliseconds = delay * 60 * 60 * 1000;
  
  console.log(`🤖 [BOT_FLOW] Delaying for ${delay} ${unit}`);
  await sleep(milliseconds);
}

/**
 * Executes a Loop node
 */
async function executeLoop(client, msg, botFlow, node, context) {
  const loopType = node.data.loopType || 'repeat';
  const iterations = node.data.iterations || 1;
  
  console.log(`🤖 [BOT_FLOW] Starting loop: ${loopType}, ${iterations} times`);
  
  // Find loop body edge
  const loopBodyEdge = botFlow.edges.find(
    edge => edge.source === node.id && edge.sourceHandle === 'loop'
  );
  
  if (loopBodyEdge) {
    for (let i = 0; i < iterations; i++) {
      console.log(`🤖 [BOT_FLOW] Loop iteration ${i + 1}/${iterations}`);
      
      // Create a new visited nodes set for each iteration
      const loopContext = {
        ...context,
        visitedNodes: new Set(),
        variables: { ...context.variables, loopIndex: i },
      };
      
      await executeNode(client, msg, botFlow, loopBodyEdge.target, loopContext);
      
      // Copy any new variables back to main context
      Object.assign(context.variables, loopContext.variables);
    }
  }
  
  // Find exit edge
  const exitEdge = botFlow.edges.find(
    edge => edge.source === node.id && edge.sourceHandle === 'exit'
  );
  
  if (exitEdge) {
    await executeNode(client, msg, botFlow, exitEdge.target, context);
  }
}

/**
 * Executes a Set Variable node
 */
function executeSetVariable(node, context) {
  const varName = node.data.variableName || '';
  let varValue = node.data.variableValue || '';
  
  // Replace variables in value
  varValue = replaceVariables(varValue, context);
  
  console.log(`🤖 [BOT_FLOW] Setting variable: ${varName} = ${varValue}`);
  context.variables[varName] = varValue;
}

/**
 * Replaces variables in a string
 * Format: {variableName}
 */
function replaceVariables(text, context) {
  let result = text;
  
  // Replace {userMessage}
  result = result.replace(/\{userMessage\}/g, context.userMessage);
  
  // Replace custom variables
  for (const [key, value] of Object.entries(context.variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  handleBotFlowMessage,
  loadBotFlow,
};
```

### 4. API Endpoints

Add these to your Express server:

```javascript
// GET /api/bot-flow?companyId=xxx
app.get('/api/bot-flow', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    
    const firestore = admin.firestore();
    const flowDoc = await firestore
      .collection('botFlows')
      .doc(companyId)
      .get();
    
    if (!flowDoc.exists) {
      return res.json({ flow: null });
    }
    
    res.json({ flow: flowDoc.data() });
  } catch (error) {
    console.error('Error loading bot flow:', error);
    res.status(500).json({ error: 'Failed to load bot flow' });
  }
});

// POST /api/bot-flow
app.post('/api/bot-flow', async (req, res) => {
  try {
    const { companyId, name, nodes, edges } = req.body;
    
    if (!companyId || !name || !nodes || !edges) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const firestore = admin.firestore();
    const flowData = {
      companyId,
      name,
      nodes,
      edges,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Add createdAt only if new
    const flowDoc = await firestore.collection('botFlows').doc(companyId).get();
    if (!flowDoc.exists) {
      flowData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await firestore
      .collection('botFlows')
      .doc(companyId)
      .set(flowData, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving bot flow:', error);
    res.status(500).json({ error: 'Failed to save bot flow' });
  }
});

// POST /api/company-mode
app.post('/api/company-mode', async (req, res) => {
  try {
    const { companyId, mode } = req.body;
    
    if (!companyId || !['ai', 'bot'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    
    const firestore = admin.firestore();
    await firestore
      .collection('companies')
      .doc(companyId)
      .set({ botMode: mode }, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating company mode:', error);
    res.status(500).json({ error: 'Failed to update mode' });
  }
});
```

---

## Flow Examples

### Example 1: Simple Welcome Bot
```
[WhatsApp Trigger]
    ↓
[Send: "Welcome {{name}}! 👋"]
    ↓
[Delay: 2 seconds]
    ↓
[Send: "You said: {{message}}"]
```

### Example 2: AI-Powered Support Bot
```
[WhatsApp Trigger]
    ↓
[AI Assistant]
    - Instruction: "Analyze customer sentiment and determine if urgent"
    - Variables: {{message}}, {{name}}
    - Save as: urgency
    ↓
[If/Else: {{urgency}} == 'urgent']
    ├─ True → [Send: "I'll connect you with support immediately!"]
    └─ False → [Send: "Thanks {{name}}! How else can I help?"]
```

### Example 3: FAQ Bot with Multiple Conditions
```
[WhatsApp Trigger]
    ↓
[If/Else: {{message}} contains 'price']
    ├─ True → [Send: "Our prices start at $99"]
    └─ False → [If/Else: {{message}} contains 'hours']
                  ├─ True → [Send: "We're open 9AM-5PM Mon-Fri"]
                  └─ False → [AI Assistant]
                              - Instruction: "Answer customer question helpfully"
                              - Variables: {{message}}
                              - Save as: answer
                              ↓
                            [Send: "{{answer}}"]
```

### Example 4: Lead Qualification Bot
```
[WhatsApp Trigger]
    ↓
[Send: "Hi {{name}}! What product are you interested in?"]
    ↓
[Set Variable: product = {{message}}]
    ↓
[AI Assistant]
    - Instruction: "Generate personalized product recommendation"
    - Variables: {{product}}, {{name}}
    - Save as: recommendation
    ↓
[Send: "{{recommendation}}"]
    ↓
[Delay: 3 seconds]
    ↓
[Send: "Would you like to order? Reply YES or NO"]
    ↓
[If/Else: {{message}} == 'YES']
    ├─ True → [Set Variable: notes = "Ready to order {{product}}"]
    │           ↓
    │         [Send: "Great! Our team will contact you at {{phone}} within 24 hours."]
    └─ False → [Send: "No problem! We're here when you're ready 😊"]
```

### Example 5: Appointment Booking
```
[WhatsApp Trigger]
    ↓
[Send: "Hi {{name}}! Would you like to book an appointment? Reply YES"]
    ↓
[If/Else: {{message}} == 'YES']
    ├─ True → [Send: "Great! What day works for you? (e.g., Monday, Tuesday)"]
    │           ↓
    │         [Set Variable: day = {{message}}]
    │           ↓
    │         [Send: "Perfect! What time? (e.g., 10AM, 2PM)"]
    │           ↓
    │         [Set Variable: time = {{message}}]
    │           ↓
    │         [AI Assistant]
    │           - Instruction: "Confirm appointment details professionally"
    │           - Variables: {{name}}, {{day}}, {{time}}
    │           - Save as: confirmation
    │           ↓
    │         [Send: "{{confirmation}}"]
    └─ False → [Send: "No problem! Contact us anytime."]
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# Database
DATABASE_URL=your_neon_postgresql_connection_string

# OpenAI (for AI Assistant blocks)
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3000
```

---

## Testing Checklist

### Before Deployment
- [ ] Database tables created (bot_flows, companies with bot_mode column)
- [ ] Database connection working
- [ ] All API endpoints responding
- [ ] Bot flow can be saved and loaded
- [ ] Company mode can be switched between 'ai' and 'bot'

### Flow Testing
- [ ] Create a simple flow in UI
- [ ] Save flow successfully
- [ ] Test flow with simulator
- [ ] Switch company to bot mode
- [ ] Send real WhatsApp message
- [ ] Verify bot responds correctly
- [ ] Test each block type:
  - [ ] Send Message (with variables)
  - [ ] AI Assistant (with real API)
  - [ ] If/Else (true and false paths)
  - [ ] Delay (with different units)
  - [ ] Loop (multiple iterations)
  - [ ] Set Variable (and use in messages)

### Error Handling
- [ ] Test with missing flow
- [ ] Test with invalid node types
- [ ] Test with circular references
- [ ] Test AI Assistant with no API key
- [ ] Monitor logs for errors

---

## Monitoring & Debugging

### Log Patterns to Watch
```bash
# Successful flow execution
🤖 [BOT_FLOW] Starting bot flow execution for CompanyXYZ
🤖 [BOT_FLOW] Executing node: sendMessage (node-123)
� [BOT_FLOW] Sending message: Hello User!
🤖 [BOT_FLOW] ✅ Flow execution completed

# AI Assistant execution
🤖 [BOT_FLOW] AI Assistant - Instruction: Analyze sentiment
🤖 [BOT_FLOW] AI Response: The customer seems satisfied
🤖 [BOT_FLOW] Setting variable: sentiment = satisfied

# Condition evaluation
🤖 [BOT_FLOW] Evaluating condition: {{message}} == 'yes'
🤖 [BOT_FLOW] Condition after variable replacement: hello == yes
🤖 [BOT_FLOW] Condition result: false
```

### Common Issues

1. **Flow not executing**
   - Check company mode is set to 'bot'
   - Verify flow exists in database
   - Ensure trigger node exists and is connected

2. **Variables not replacing**
   - Use correct syntax: `{{variableName}}`
   - Check variable is set before use
   - Verify variable name matches exactly

3. **AI Assistant not working**
   - Check OPENAI_API_KEY is set
   - Verify API key has credits
   - Check error logs for API issues

4. **Infinite loops**
   - visitedNodes set prevents circular references
   - Check flow design for unintended loops
   - Monitor iteration counts in loops

---

## Performance Tips

1. **Database Queries**
   - Index on company_id for fast lookups
   - Use connection pooling (already in setup)
   - Cache flows in memory for active companies

2. **WhatsApp Rate Limiting**
   - 1 second delay between messages
   - Increase delays if getting rate limited
   - Monitor message queue

3. **AI API Calls**
   - Set max_tokens to limit costs
   - Use GPT-3.5-turbo for faster/cheaper responses
   - Cache common AI responses
   - Add timeout to AI calls (30s recommended)

4. **Loop Limits**
   - Max 100 iterations recommended
   - Add timeout for long-running loops
   - Log warnings for large iteration counts

---

## Security Considerations

1. **Input Validation**
   - Sanitize all user inputs
   - Validate condition strings
   - Limit variable name lengths
   - Check for SQL injection in variable values

2. **API Keys**
   - Never expose OpenAI key in frontend
   - Use environment variables
   - Rotate keys regularly
   - Monitor API usage

3. **Rate Limiting**
   - Limit flow executions per user
   - Implement cooldown periods
   - Block suspicious patterns

---

## Deployment Steps

### 1. Database Migration
```bash
# Run SQL from "Database Setup" section
psql $DATABASE_URL -f migrations/bot_mode.sql
```

### 2. Install Dependencies
```bash
npm install pg openai
```

### 3. Update Server Files
- Add `db.js` (database connection)
- Add `botFlowHandler.js` (flow execution)
- Update message handler to check mode
- Add API endpoints

### 4. Configure Environment
```bash
# .env
DATABASE_URL=your_connection_string
OPENAI_API_KEY=your_api_key
```

### 5. Test Before Going Live
```bash
# Start server
npm start

# Test endpoints
curl http://localhost:3000/api/bot-flow?companyId=test
curl -X POST http://localhost:3000/api/company-mode \
  -H "Content-Type: application/json" \
  -d '{"companyId":"test","mode":"bot"}'
```

### 6. Monitor After Deployment
- Watch server logs
- Check database connections
- Monitor WhatsApp message flow
- Track AI API usage and costs

---

## Support & Troubleshooting

### Quick Diagnostics
```javascript
// Add to your server for debugging
app.get('/api/debug/bot-flow/:companyId', async (req, res) => {
  const { companyId } = req.params;
  
  const mode = await getCompanyMode(companyId);
  const flow = await loadBotFlow(companyId);
  
  res.json({
    companyId,
    mode,
    flowExists: !!flow,
    nodeCount: flow?.nodes?.length || 0,
    edgeCount: flow?.edges?.length || 0,
  });
});
```

### Contact Support
For issues or questions:
1. Check logs for error messages
2. Verify database connection
3. Test API endpoints individually
4. Review flow structure in database
5. Test with simple flow first

---

## Appendix: Complete File Structure

```
server/
├── server.js                 # Main server file
├── db.js                     # Database connection
├── botFlowHandler.js         # Bot flow execution logic
├── .env                      # Environment variables
└── migrations/
    └── bot_mode.sql          # Database setup SQL

Required packages:
- pg (PostgreSQL client)
- openai (OpenAI API)
- express (Web server)
- whatsapp-web.js (WhatsApp integration)
```

---

Made with ❤️ for production use! 🚀

