import express from 'express';
import { authenticateHuman, AuthService } from '../middleware/auth';
import { ApiResponse } from '../types';
import { getDatabase } from '../config/database';
import { llmService } from '../services/llm';

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

// Enhanced intent classifier - uses LLM when available, falls back to regex
async function parseIntent(message: string): Promise<{ intent: string; params: any }> {
  // Try LLM-based parsing first if available
  if (llmService.isAvailable()) {
    try {
      const llmResult = await llmService.parseIntent(message);
      
      // Map LLM intents to our internal format
      const intentMapping: Record<string, string> = {
        'query_tasks': 'query_available',
        'claim_task': 'claim_task',
        'release_task': 'release_task',
        'update_status': 'update_status',
        'add_comment': 'add_comment',
        'get_task': 'get_task',
        'create_subtask': 'create_subtask',
        'general_query': 'general_query'
      };
      
      const mappedIntent = intentMapping[llmResult.intent] || llmResult.intent;
      
      // If confidence is high enough, use LLM result
      if (llmResult.confidence > 0.6) {
        return { intent: mappedIntent, params: llmResult.entities };
      }
    } catch (error) {
      console.warn('LLM intent parsing failed, falling back to regex:', error);
    }
  }
  
  // Fallback to regex-based parsing
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
    // Try to match task by UUID first
    const taskIdMatch = message.match(/task[:\s]+([a-f0-9-]+)/i);
    // Try to match task by title (in quotes or after "move/update")
    const taskTitleMatch = message.match(/['"]([^'"]+)['"]/) || 
                          message.match(/(?:move|update)\s+(.+?)\s+to\s+/i);
    
    // Accept status names with spaces, hyphens, or underscores
    const statusMatch = lower.match(/to\s+(backlog|todo|ai[\s\-_]?prep|in[\s\-_]?progress|verify|done)/);
    
    if (statusMatch && statusMatch[1]) {
      // Normalize status to use underscores (database format)
      const normalizedStatus = statusMatch[1].replace(/[\s-]/g, '_');
      
      if (taskIdMatch) {
        // UUID provided
        return { intent: 'update_status', params: { taskId: taskIdMatch[1], status: normalizedStatus } };
      } else if (taskTitleMatch && taskTitleMatch[1]) {
        // Title provided - need to look up task
        const taskTitle = taskTitleMatch[1].trim();
        return { intent: 'update_status', params: { taskTitle, status: normalizedStatus } };
      }
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
  
  return { intent: 'general_query', params: { message } };
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
        let taskId = params.taskId;
        
        // If title provided instead of ID, look up the task
        if (!taskId && params.taskTitle) {
          const db = await getDatabase();
          const task = await db.get<{ id: string }>(
            'SELECT id FROM tasks WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ? LIMIT 1',
            [`%${params.taskTitle.toLowerCase()}%`, `%${params.taskTitle.toLowerCase()}%`]
          );
          
          if (!task) {
            return {
              type: 'update',
              endpoint: '/api/mcp/tasks/lookup',
              method: 'GET',
              error: `Could not find a task matching "${params.taskTitle}". Try:\n• Using the exact task UUID\n• Asking "show available tasks" first\n• Using a more specific title`
            };
          }
          
          taskId = task.id;
        }
        
        const res = await fetch(`${baseUrl}/tasks/${taskId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
          body: JSON.stringify({ status: params.status })
        });
        const data = await res.json() as any;
        return {
          type: 'update',
          endpoint: `/api/mcp/tasks/${taskId}/status`,
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
      const taskIdDisplay = params.taskId || 'task';
      const displayId = typeof taskIdDisplay === 'string' && taskIdDisplay.length > 16 
        ? taskIdDisplay.slice(0, 8) + '...' 
        : taskIdDisplay;
      const titleInfo = params.taskTitle ? ` ("${params.taskTitle}")` : '';
      return `✅ Moved task ${displayId}${titleInfo} to "${params.status}".`;
      
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
    let agent = await db.get<{ id: string; role: string; capabilities: string }>(
      `SELECT id, role, capabilities FROM agents WHERE name = 'Demo Chat Agent' LIMIT 1`
    );
    
    if (!agent) {
      // Create demo agent if doesn't exist
      const agentId = 'agent-demo-chat-001';
      const capabilities = ['query_tasks', 'claim_task', 'release_task', 'move', 'comment', 'create_subtask'];
      
      // We still need to store a token_hash even though we use JWT
      // This is for the database schema requirement
      const bcrypt = await import('bcryptjs');
      const dummyHash = await bcrypt.hash('not-used-jwt-only', 10);
      
      await db.run(
        `INSERT INTO agents (id, name, role, token_hash, capabilities, created_at, updated_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agentId,
          'Demo Chat Agent',
          'prep', // prep role can access todo and ai_prep tasks
          dummyHash,
          JSON.stringify(capabilities),
          new Date().toISOString(),
          new Date().toISOString(),
          1
        ]
      );
      
      agent = { id: agentId, role: 'prep', capabilities: JSON.stringify(capabilities) };
    }
    
    // Generate JWT token for the agent
    const authService = AuthService.getInstance();
    const agentToken = authService.generateAgentToken({
      id: agent.id,
      role: agent.role,
      capabilities: JSON.parse(agent.capabilities)
    });
    
    // Parse intent from natural language (now async with LLM support)
    const { intent, params } = await parseIntent(message);
    
    // Execute action using agent JWT token
    const action = await executeAction(intent, params, agentToken);
    
    // Generate response - use LLM if available, otherwise fallback
    let responseText: string;
    if (llmService.isAvailable() && intent !== 'general_query') {
      try {
        responseText = await llmService.generateResponse(message, [action]);
      } catch {
        responseText = generateResponse(intent, action, params);
      }
    } else if (intent === 'general_query' && llmService.isAvailable()) {
      // Handle general queries with LLM
      try {
        const llmResponse = await llmService.chat([
          { role: 'system', content: 'You are a helpful AI assistant managing a Kanban board. Answer user questions helpfully and concisely.' },
          { role: 'user', content: message }
        ]);
        responseText = llmResponse.content;
      } catch {
        responseText = "I can help you manage tasks on the Kanban board. Try asking me to 'show available tasks' or 'claim task: <id>'.";
      }
    } else {
      responseText = generateResponse(intent, action, params);
    }
    
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