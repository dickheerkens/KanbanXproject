import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, sendChatMessage } from '../services/agent';

interface Props {
  token: string;
  onClose: () => void;
}

const AgentChat: React.FC<Props> = ({ token, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content: "Hi! I'm your AI assistant. I can help you manage tasks. Try:\n• 'show available tasks'\n• 'claim task: <id>'\n• 'move task: <id> to done'\n• 'get task: <id>'",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const agentMsg = await sendChatMessage(token, input);
      setMessages(prev => [...prev, agentMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: `❌ Error: ${e.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="agent-chat">
      <div className="chat-header">
        <div className="chat-title">
          <span className="bot-icon">🤖</span>
          <h3>AI Assistant</h3>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-bubble">
              <div className="message-content">{msg.content}</div>
              {msg.actions && msg.actions.length > 0 && (
                <div className="message-actions">
                  {msg.actions.map((action, i) => (
                    <div key={i} className={`action-card ${action.error ? 'error' : 'success'}`}>
                      <div className="action-header">
                        <span className="action-method">{action.method}</span>
                        <span className="action-endpoint">{action.endpoint}</span>
                      </div>
                      {action.params && (
                        <div className="action-params">
                          {JSON.stringify(action.params, null, 2)}
                        </div>
                      )}
                      {action.error && (
                        <div className="action-error">{action.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message agent">
            <div className="message-bubble loading">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me to query or manage tasks..."
          rows={2}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}>
          Send
        </button>
      </div>
    </div>
  );
};

export default AgentChat;
