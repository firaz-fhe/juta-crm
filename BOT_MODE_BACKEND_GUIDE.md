# Bot Mode Backend Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing the backend functionality to support Bot Mode - a drag-and-drop bot flow builder that allows users to create custom automated responses using visual blocks.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Message Handler Integration](#message-handler-integration)
5. [Bot Flow Execution Engine](#bot-flow-execution-engine)
6. [Testing](#testing)

---

## Architecture Overview

The Bot Mode system consists of three main components:

1. **Bot Flow Storage**: Database tables to store bot flows (nodes and edges)
2. **API Layer**: RESTful endpoints for CRUD operations on bot flows
3. **Execution Engine**: Logic to process incoming messages against saved bot flows

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │◄────────┤   API Layer  │◄────────┤   Database  │
│  (React)    │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  WhatsApp   │────────►│  Execution   │
│  Handler    │         │    Engine    │
└─────────────┘         └──────────────┘
```

---

## Database Schema

### Table: `bot_flows`

Stores the bot flow configurations for each company.

```sql
CREATE TABLE bot_flows (
  id VARCHAR(255) PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  nodes JSON NOT NULL,
  edges JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  
  INDEX idx_company_id (company_id),
  INDEX idx_is_active (is_active),
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

### Table: `bot_flow_logs` (Optional - for analytics)

Tracks bot flow executions for debugging and analytics.

```sql
CREATE TABLE bot_flow_logs (
  id VARCHAR(255) PRIMARY KEY,
  bot_flow_id VARCHAR(255) NOT NULL,
  company_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255),
  message_received TEXT,
  nodes_executed JSON,
  response_sent TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INT,
  
  INDEX idx_bot_flow_id (bot_flow_id),
  INDEX idx_company_id (company_id),
  INDEX idx_executed_at (executed_at),
  
  FOREIGN KEY (bot_flow_id) REFERENCES bot_flows(id) ON DELETE CASCADE
);
```

### Example Data Structure

**Nodes JSON Structure:**
```json
[
  {
    "id": "1",
    "type": "sendMessage",
    "position": { "x": 100, "y": 100 },
    "data": {
      "label": "Send Message",
      "condition": "hello, hi, hey",
      "message": "Hello! Welcome to our service. How can I help you today?"
    }
  },
  {
    "id": "2",
    "type": "sendMessage",
    "position": { "x": 100, "y": 300 },
    "data": {
      "label": "Send Message",
      "condition": "help, support, assist",
      "message": "I'm here to help! Please describe your issue."
    }
  }
]
```

**Edges JSON Structure:**
```json
[
  {
    "id": "e1-2",
    "source": "1",
    "target": "2",
    "type": "smoothstep",
    "animated": true
  }
]
```

---

## API Endpoints

### 1. Save Bot Flow

**Endpoint:** `POST /api/bot-flow`

**Request Body:**
```json
{
  "companyId": "company123",
  "name": "Customer Support Bot",
  "nodes": [...],
  "edges": [...]
}
```

**Response:**
```json
{
  "success": true,
  "flowId": "flow_abc123",
  "message": "Bot flow saved successfully"
}
```

**Implementation Example (Node.js/Express):**
```javascript
app.post('/api/bot-flow', async (req, res) => {
  try {
    const { companyId, name, nodes, edges } = req.body;
    
    // Validate required fields
    if (!companyId || !name || !nodes || !edges) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Generate unique ID
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert into database
    const query = `
      INSERT INTO bot_flows (id, company_id, name, nodes, edges, is_active)
      VALUES (?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        nodes = VALUES(nodes),
        edges = VALUES(edges),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await db.execute(query, [
      flowId,
      companyId,
      name,
      JSON.stringify(nodes),
      JSON.stringify(edges)
    ]);
    
    res.json({
      success: true,
      flowId,
      message: 'Bot flow saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving bot flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save bot flow'
    });
  }
});
```

---

### 2. Get Bot Flow

**Endpoint:** `GET /api/bot-flow?companyId=company123`

**Response:**
```json
{
  "success": true,
  "flow": {
    "id": "flow_abc123",
    "companyId": "company123",
    "name": "Customer Support Bot",
    "nodes": [...],
    "edges": [...],
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Implementation Example:**
```javascript
app.get('/api/bot-flow', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'companyId is required'
      });
    }
    
    const query = `
      SELECT * FROM bot_flows
      WHERE company_id = ? AND is_active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const [rows] = await db.execute(query, [companyId]);
    
    if (rows.length === 0) {
      return res.json({
        success: true,
        flow: null
      });
    }
    
    const flow = {
      id: rows[0].id,
      companyId: rows[0].company_id,
      name: rows[0].name,
      nodes: JSON.parse(rows[0].nodes),
      edges: JSON.parse(rows[0].edges),
      isActive: rows[0].is_active,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at
    };
    
    res.json({
      success: true,
      flow
    });
    
  } catch (error) {
    console.error('Error fetching bot flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bot flow'
    });
  }
});
```

---

### 3. Delete Bot Flow

**Endpoint:** `DELETE /api/bot-flow/:flowId`

**Response:**
```json
{
  "success": true,
  "message": "Bot flow deleted successfully"
}
```

---

### 4. Update Bot Flow Status

**Endpoint:** `PATCH /api/bot-flow/:flowId/status`

**Request Body:**
```json
{
  "isActive": false
}
```

---

## Message Handler Integration

### Modifying `setupMessageHandler`

Update your existing message handler to check if the company is using Bot Mode:

```javascript
function setupMessageHandler(client, botName, phoneIndex) {
  client.on("message", async (msg) => {
    try {
      console.log(`🔔 [MESSAGE_HANDLER] ===== INCOMING MESSAGE =====`);
      console.log(`🔔 [MESSAGE_HANDLER] Bot: ${botName}`);
      console.log(`🔔 [MESSAGE_HANDLER] From: ${msg.from}`);
      console.log(`🔔 [MESSAGE_HANDLER] Body: ${msg.body}`);

      // Filter out status messages
      const chatId = msg.from;
      if (
        chatId.includes("status") ||
        chatId.includes("newsletter") ||
        chatId.includes("status@broadcast")
      ) {
        console.log(`🔔 [MESSAGE_HANDLER] ❌ Status message filtered out`);
        return;
      }

      // ==========================================
      // NEW: Check if company is using Bot Mode
      // ==========================================
      const companyMode = await getCompanyMode(botName);
      
      if (companyMode === 'bot') {
        // Use Bot Mode handler
        console.log(`🔔 [MESSAGE_HANDLER] Using BOT MODE`);
        await handleBotModeMessage(client, msg, botName, phoneIndex);
      } else {
        // Use AI Mode handler (existing)
        console.log(`🔔 [MESSAGE_HANDLER] Using AI MODE`);
        await handleNewMessagesTemplateWweb(client, msg, botName, phoneIndex);
      }

      // Broadcast message
      const extractedNumber = await safeExtractPhoneNumber(msg, client);
      if (!extractedNumber) {
        console.log(`🔔 [MESSAGE_HANDLER] ❌ Could not extract phone number`);
        return;
      }

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
      console.log(`🔔 [MESSAGE_HANDLER] ✅ Message processed successfully`);

    } catch (error) {
      console.error(`🔔 [MESSAGE_HANDLER] ❌ Error:`, error);
    }
  });
}
```

---

## Bot Flow Execution Engine

Create a new file: `botFlowExecutor.js`

```javascript
/**
 * Bot Flow Execution Engine
 * Processes incoming messages against saved bot flows
 */

const db = require('./database'); // Your database connection

/**
 * Get company's bot mode setting
 */
async function getCompanyMode(companyId) {
  try {
    const query = `
      SELECT bot_mode FROM companies 
      WHERE id = ? OR name = ?
    `;
    const [rows] = await db.execute(query, [companyId, companyId]);
    
    if (rows.length === 0) {
      return 'ai'; // Default to AI mode
    }
    
    return rows[0].bot_mode || 'ai';
  } catch (error) {
    console.error('Error getting company mode:', error);
    return 'ai'; // Fallback to AI mode on error
  }
}

/**
 * Main handler for Bot Mode messages
 */
async function handleBotModeMessage(client, msg, botName, phoneIndex) {
  try {
    const startTime = Date.now();
    
    // Get bot flow for company
    const botFlow = await getBotFlow(botName);
    
    if (!botFlow || !botFlow.nodes || botFlow.nodes.length === 0) {
      console.log(`🤖 [BOT_MODE] No bot flow configured for ${botName}`);
      return;
    }
    
    console.log(`🤖 [BOT_MODE] Processing message with bot flow: ${botFlow.name}`);
    
    // Execute bot flow
    const result = await executeBotFlow(client, msg, botFlow);
    
    // Log execution
    const executionTime = Date.now() - startTime;
    await logBotFlowExecution(botFlow.id, botName, msg, result, executionTime);
    
    console.log(`🤖 [BOT_MODE] Execution completed in ${executionTime}ms`);
    
  } catch (error) {
    console.error('🤖 [BOT_MODE] Error handling bot mode message:', error);
  }
}

/**
 * Get active bot flow for company
 */
async function getBotFlow(companyId) {
  try {
    const query = `
      SELECT * FROM bot_flows
      WHERE company_id = ? AND is_active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const [rows] = await db.execute(query, [companyId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return {
      id: rows[0].id,
      companyId: rows[0].company_id,
      name: rows[0].name,
      nodes: JSON.parse(rows[0].nodes),
      edges: JSON.parse(rows[0].edges)
    };
    
  } catch (error) {
    console.error('Error fetching bot flow:', error);
    return null;
  }
}

/**
 * Execute bot flow against incoming message
 */
async function executeBotFlow(client, msg, botFlow) {
  const messageText = msg.body.toLowerCase().trim();
  const executedNodes = [];
  
  console.log(`🤖 [BOT_FLOW] Checking ${botFlow.nodes.length} nodes`);
  
  // Process all nodes
  for (const node of botFlow.nodes) {
    if (node.type === 'sendMessage') {
      const result = await processSendMessageNode(client, msg, node, messageText);
      
      if (result.matched) {
        executedNodes.push({
          nodeId: node.id,
          type: node.type,
          matched: true,
          response: result.response
        });
        
        console.log(`🤖 [BOT_FLOW] ✅ Node ${node.id} matched and executed`);
      }
    }
    
    // Add more node type handlers here as you expand
    // if (node.type === 'delay') { ... }
    // if (node.type === 'condition') { ... }
  }
  
  return {
    executedNodes,
    totalNodes: botFlow.nodes.length,
    matchedNodes: executedNodes.length
  };
}

/**
 * Process a Send Message node
 */
async function processSendMessageNode(client, msg, node, messageText) {
  try {
    const { condition, message } = node.data;
    
    if (!condition || !message) {
      console.log(`🤖 [SEND_MESSAGE] Node ${node.id} missing condition or message`);
      return { matched: false };
    }
    
    // Parse keywords from condition (comma-separated)
    const keywords = condition
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    
    // Check if message matches any keyword
    const matched = keywords.some(keyword => {
      // Exact match or word boundary match
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(messageText);
    });
    
    if (matched) {
      console.log(`🤖 [SEND_MESSAGE] Matched keyword in node ${node.id}`);
      
      // Send the configured message
      await client.sendMessage(msg.from, message);
      
      return {
        matched: true,
        response: message,
        keywords: keywords,
        triggeredBy: keywords.find(k => messageText.includes(k))
      };
    }
    
    return { matched: false };
    
  } catch (error) {
    console.error(`🤖 [SEND_MESSAGE] Error processing node:`, error);
    return { matched: false, error: error.message };
  }
}

/**
 * Log bot flow execution for analytics
 */
async function logBotFlowExecution(flowId, companyId, msg, result, executionTime) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const query = `
      INSERT INTO bot_flow_logs 
      (id, bot_flow_id, company_id, contact_id, message_received, nodes_executed, execution_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.execute(query, [
      logId,
      flowId,
      companyId,
      msg.from,
      msg.body,
      JSON.stringify(result.executedNodes),
      executionTime
    ]);
    
  } catch (error) {
    console.error('Error logging bot flow execution:', error);
  }
}

module.exports = {
  getCompanyMode,
  handleBotModeMessage,
  getBotFlow,
  executeBotFlow
};
```

---

## Additional Database Migration

Add a column to the `companies` table to store the mode preference:

```sql
ALTER TABLE companies 
ADD COLUMN bot_mode ENUM('ai', 'bot') DEFAULT 'ai';
```

Update the mode via API:

```javascript
app.patch('/api/company/:companyId/mode', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { mode } = req.body;
    
    if (!['ai', 'bot'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mode. Must be "ai" or "bot"'
      });
    }
    
    const query = `UPDATE companies SET bot_mode = ? WHERE id = ?`;
    await db.execute(query, [mode, companyId]);
    
    res.json({
      success: true,
      message: `Company mode updated to ${mode}`
    });
    
  } catch (error) {
    console.error('Error updating company mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company mode'
    });
  }
});
```

---

## Testing

### 1. Test Bot Flow Creation

```bash
curl -X POST http://localhost:3000/api/bot-flow \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "test_company",
    "name": "Test Flow",
    "nodes": [
      {
        "id": "1",
        "type": "sendMessage",
        "data": {
          "condition": "hello, hi",
          "message": "Hello! How can I help you?"
        }
      }
    ],
    "edges": []
  }'
```

### 2. Test Bot Flow Retrieval

```bash
curl http://localhost:3000/api/bot-flow?companyId=test_company
```

### 3. Test Bot Flow Execution

1. Set company to bot mode
2. Send a WhatsApp message with trigger keyword
3. Verify bot responds with configured message
4. Check logs in `bot_flow_logs` table

### 4. Test Mode Switching

```bash
# Switch to bot mode
curl -X PATCH http://localhost:3000/api/company/test_company/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "bot"}'

# Switch back to AI mode
curl -X PATCH http://localhost:3000/api/company/test_company/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "ai"}'
```

---

## Future Enhancements

### Additional Block Types to Implement

1. **Delay Block**
   - Wait specified time before next action
   - Node data: `{ delay: 5000 }` (milliseconds)

2. **Condition Block**
   - Branch flow based on conditions
   - Node data: `{ conditions: [{field: 'message', operator: 'contains', value: 'urgent'}] }`

3. **API Request Block**
   - Make HTTP requests to external services
   - Node data: `{ url: 'https://api.example.com', method: 'POST', body: {...} }`

4. **Tag Contact Block**
   - Add/remove tags from contacts
   - Node data: `{ action: 'add', tags: ['interested', 'follow-up'] }`

5. **Transfer to Human Block**
   - Hand off conversation to human agent
   - Node data: `{ assignTo: 'support@company.com' }`

---

## Security Considerations

1. **Input Validation**: Always validate and sanitize user inputs
2. **Rate Limiting**: Implement rate limits on API endpoints
3. **Authentication**: Ensure proper authentication for all bot flow endpoints
4. **SQL Injection**: Use parameterized queries (as shown in examples)
5. **XSS Protection**: Sanitize any user-provided text before storing/displaying

---

## Performance Optimization

1. **Caching**: Cache active bot flows in Redis to reduce database queries
2. **Indexing**: Add proper database indexes on frequently queried columns
3. **Async Processing**: Use message queues for heavy processing
4. **Connection Pooling**: Use database connection pooling

---

## Monitoring & Analytics

Track these metrics for bot flows:

1. Execution count per flow
2. Average execution time
3. Match rate (% of messages that trigger a response)
4. Most triggered nodes
5. Error rates

Example analytics query:

```sql
SELECT 
  bf.name,
  COUNT(*) as execution_count,
  AVG(bfl.execution_time_ms) as avg_execution_time,
  COUNT(CASE WHEN JSON_LENGTH(bfl.nodes_executed) > 0 THEN 1 END) as matched_count
FROM bot_flow_logs bfl
JOIN bot_flows bf ON bfl.bot_flow_id = bf.id
WHERE bfl.executed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY bf.id, bf.name;
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Bot not responding
- Check if bot mode is enabled for company
- Verify bot flow exists and is active
- Check keyword matching logic
- Review logs in `bot_flow_logs` table

**Issue**: Slow response times
- Check database query performance
- Review node execution logic
- Consider implementing caching

**Issue**: Messages not matching
- Verify keyword formatting (lowercase, trimmed)
- Check for special characters in keywords
- Test with exact phrase matching

---

## Conclusion

This guide provides the foundation for implementing Bot Mode in your backend. The system is designed to be extensible, allowing you to add more block types and features as needed.

For questions or issues, refer to the troubleshooting section or contact the development team.
