import express from 'express';
import { authenticateHuman } from '../middleware/auth';
import { ApiResponse } from '../types';
import { getDatabase } from '../config/database';

const router = express.Router();

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  actions?: AgentAction[];
  timestamp: string;
}

interface AgentAction {
  type: 'query' | 'claim' | 'release' | 'update' | 'comment' | 'subtask' | 'get';
  endpoint: string;
  method: string;
  params?: any;
  result?: any;
  error?: string;
}

// Simple intent classifier (can be replaced with LLM later)
function parseIntent(message: string): { intent: string; params: any } {
  const lower = message.toLowerCase();
  
  // Query available tasks
  if (lower.match(/available|query|list|show.*tasks/)) {
    return { intent: 'query_available', params: {} };
  }
  
  // Claim task
  if (lower.match(/claim|take|grab|work on/)) {
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    if (taskIdMatch) {
      return { intent: 'claim_task', params: { taskId: taskIdMatch[1] } };
    }
  }
  
  // Release task
  if (lower.match(/release|unclaim|done with|finish/)) {
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    if (taskIdMatch) {
      return { intent: 'release_task', params: { taskId: taskIdMatch[1] } };
    }
  }
  
  // Update status
  if (lower.match(/move|update|change.*status/)) {
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    const statusMatch = lower.match(/to\s+(backlog|todo|ai_prep|in_progress|verify|done)/);
    if (taskIdMatch && statusMatch) {
      return { intent: 'update_status', params: { taskId: taskIdMatch[1], status: statusMatch[1] } };
    }
  }
  
  // Add comment
  if (lower.match(/comment|note|add.*comment/)) {
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    const commentMatch = message.match(/["']([^"']+)["']|:\s*(.+)$/);
    if (taskIdMatch && commentMatch) {
      return { 
        intent: 'add_comment', 
        params: { 
          taskId: taskIdMatch[1], 
          comment: commentMatch[1] || commentMatch[2] 
        } 
      };
    }
  }
  
  // Get task details
  if (lower.match(/get|show|details|info|about.*task/)) {
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    if (taskIdMatch) {
      return { intent: 'get_task', params: { taskId: taskIdMatch[1] } };
    }
  }
  
  // Create subtask
  if (lower.match(/subtask|create.*task|add.*task/)) {
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    const titleMatch = message.match(/["']([^"']+)["']|:\s*(.+)$/);
    if (taskIdMatch && titleMatch) {
      return { 
        intent: 'create_subtask', 
        params: { 
          taskId: taskIdMatch[1], 
          title: titleMatch[1] || titleMatch[2] 
        } 
      };
    }
  }
  
  return { intent: 'unknown', params: {} };
}

// Execute agent action using MCP endpoints
async function executeAction(intent: string, params: any, agentToken: string): Promise<AgentAction> {
  const baseUrl = 'http://localhost:3001/api/mcp';
  
  try {
    switch (intent) {
      case 'query_available': {
        const res = await fetch(`${baseUrl}/tasks/available`, {
          headers: { Authorization: `Bearer ${agentToken}` }
        });
        const data = await res.json() as any;
        return {
          type: 'query',
          endpoint: '/api/mcp/tasks/available',
          method: 'GET',
          result: data.success ? data.data : null,
          error: data.success ? undefined : data.error
        };
      }
      
      case 'claim_task': {
        const res = await fetch(`${baseUrl}/tasks/${params.taskId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
          body: JSON.stringify({ duration_minutes: 30 })
        });
        const data = await res.json() as any;
        return {
          type: 'claim',
          endpoint: `/api/mcp/tasks/${params.taskId}/claim`,
          method: 'POST',
          params: { duration_minutes: 30 },
          result: data.success ? data.data : null,
          error: data.success ? undefined : data.error
        };
      }
      
      case 'release_task': {
        const res = await fetch(`${baseUrl}/tasks/${params.taskId}/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` }
        });
        const data = await res.json() as any;
        return {
          type: 'release',
          endpoint: `/api/mcp/tasks/${params.taskId}/release`,
          method: 'POST',
          result: data.success ? data.message : null,
          error: data.success ? undefined : data.error
        };
      }
      
      case 'update_status': {
        const res = await fetch(`${baseUrl}/tasks/${params.taskId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
          body: JSON.stringify({ status: params.status })
        });
        const data = await res.json() as any;
        return {
          type: 'update',
          endpoint: `/api/mcp/tasks/${params.taskId}/status`,
          method: 'PATCH',
          params: { status: params.status },
          result: data.success ? data.message : null,
          error: data.success ? undefined : data.error
        };
      }
      
      case 'add_comment': {
        const res = await fetch(`${baseUrl}/tasks/${params.taskId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
          body: JSON.stringify({ comment: params.comment })
        });
        const data = await res.json() as any;
        return {
          type: 'comment',
          endpoint: `/api/mcp/tasks/${params.taskId}/comment`,
          method: 'POST',
          params: { comment: params.comment },
          result: data.success ? data.data : null,
          error: data.success ? undefined : data.error
        };
      }
      
      case 'get_task': {
        const res = await fetch(`${baseUrl}/tasks/${params.taskId}`, {
          headers: { Authorization: `Bearer ${agentToken}` }
        });
        const data = await res.json() as any;
        return {
          type: 'get',
          endpoint: `/api/mcp/tasks/${params.taskId}`,
          method: 'GET',
          result: data.success ? data.data : null,
          error: data.success ? undefined : data.error
        };
      }
      
      case 'create_subtask': {
        const res = await fetch(`${baseUrl}/tasks/${params.taskId}/subtask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
          body: JSON.stringify({ title: params.title, service_class: 'Linear' })
        });
        const data = await res.json() as any;
        return {
          type: 'subtask',
          endpoint: `/api/mcp/tasks/${params.taskId}/subtask`,
          method: 'POST',
          params: { title: params.title },
          result: data.success ? data.data : null,
          error: data.success ? undefined : data.error
        };
      }
      
      default:
        return {
          type: 'query',
          endpoint: 'none',
          method: 'NONE',
          error: 'Unknown intent'
        };
    }
  } catch (error: any) {
    return {
      type: 'query',
      endpoint: 'error',
      method: 'ERROR',
      error: error.message
    };
  }
}

// Generate agent response based on action result
function generateResponse(intent: string, action: AgentAction, params: any): string {
  if (action.error) {
    return `❌ Error: ${action.error}`;
  }
  
  switch (intent) {
    case 'query_available':
      const tasks = action.result || [];
      if (tasks.length === 0) {
        return "I found no available tasks for me to work on right now.";
      }
      return `I found ${tasks.length} available task(s):\n\n${tasks.slice(0, 5).map((t: any) => 
        `• **${t.title}** (${t.id.slice(0, 8)}...) - ${t.status}`
      ).join('\n')}\n\n${tasks.length > 5 ? `...and ${tasks.length - 5} more` : ''}`;
      
    case 'claim_task':
      return `✅ Successfully claimed task ${params.taskId.slice(0, 8)}... for 30 minutes.`;
      
    case 'release_task':
      return `✅ Released task ${params.taskId.slice(0, 8)}...`;
      
    case 'update_status':
      return `✅ Moved task ${params.taskId.slice(0, 8)}... to "${params.status}".`;
      
    case 'add_comment':
      return `✅ Added comment to task ${params.taskId.slice(0, 8)}...`;
      
    case 'get_task':
      const task = action.result?.task;
      if (!task) return "Task not found.";
      return `**${task.title}**\n\nStatus: ${task.status}\nService Class: ${task.service_class}\nAI Eligible: ${task.ai_eligible ? 'Yes' : 'No'}\n\n${task.description || 'No description'}`;
      
    case 'create_subtask':
      return `✅ Created subtask "${params.title}" under task ${params.taskId.slice(0, 8)}...`;
      
    case 'unknown':
      return "I didn't understand that. Try:\n• 'show available tasks'\n• 'claim task: <id>'\n• 'move task: <id> to done'\n• 'comment on task: <id> \"your note\"'";
      
    default:
      return "Action completed.";
  }
}

// POST /api/agent/chat - Natural language chat interface for agent
router.post('/chat', authenticateHuman, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }
    
    const db = getDatabase();
    
    // Get or create default agent for demo
    let agent = await db.get<{ id: string; token_hash: string }>(
      `SELECT id, token_hash FROM agents WHERE name = 'Demo Chat Agent' LIMIT 1`
    );
    
    if (!agent) {
      // Create demo agent if doesn't exist
      const agentId = 'agent-demo-chat-001';
      const demoToken = 'demo-agent-token-12345'; // In production, generate secure token
      const bcrypt = await import('bcryptjs');
      const tokenHash = await bcrypt.hash(demoToken, 12);
      
      await db.run(
        `INSERT INTO agents (id, name, role, token_hash, capabilities, created_at, updated_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agentId,
          'Demo Chat Agent',
          'prep',
          tokenHash,
          JSON.stringify(['query_tasks', 'claim_task', 'release_task', 'update_status', 'add_comment', 'create_subtask']),
          new Date().toISOString(),
          new Date().toISOString(),
          1
        ]
      );
      
      agent = { id: agentId, token_hash: tokenHash };
    }
    
    // Parse intent from natural language
    const { intent, params } = parseIntent(message);
    
    // Execute action using agent token
    const agentToken = 'demo-agent-token-12345'; // In production, decrypt from hash
    const action = await executeAction(intent, params, agentToken);
    
    // Generate response
    const responseText = generateResponse(intent, action, params);
    
    const response: ApiResponse<ChatMessage> = {
      success: true,
      data: {
        role: 'agent',
        content: responseText,
        actions: [action],
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;