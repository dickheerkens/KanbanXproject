export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  actions?: AgentAction[];
  timestamp: string;
}

export interface AgentAction {
  type: 'query' | 'claim' | 'release' | 'update' | 'comment' | 'subtask' | 'get';
  endpoint: string;
  method: string;
  params?: any;
  result?: any;
  error?: string;
}

export async function sendChatMessage(token: string, message: string): Promise<ChatMessage> {
  const res = await fetch('http://localhost:3001/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Chat failed');
  return body.data;
}
