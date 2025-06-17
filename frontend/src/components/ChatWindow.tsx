import React, { useState } from 'react';
import { sendAgentTask } from './agentApi';
import '../chatwindow-error.css';

interface ChatWindowProps {
  onClose: () => void;
  agentName?: string;
  agentCard?: any;
}

function ChatWindow({ onClose, agentName, agentCard }: ChatWindowProps) {
  // Generate a unique sessionId for this ChatWindow instance
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  const [sessionId] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uuidv4()));
  const [messages, setMessages] = useState<{ sender: 'user' | 'system'; text: string; time: string }[]>([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: input, time };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    try {
      const data = await sendAgentTask({
        prompt: input,
        sessionId,
        usePushNotifications: false,
        agentName,
        agentCard,
      });
      // Extract text and timestamp from agent response
      let agentText = '';
      let agentTime = '';
      if (data?.result?.artifacts?.[0]?.parts?.[0]?.text) {
        agentText = data.result.artifacts[0].parts[0].text;
      }
      if (data?.result?.status?.timestamp) {
        const date = new Date(data.result.status.timestamp);
        agentTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      setMessages((msgs) => [
        ...msgs,
        { sender: 'system' as const, text: agentText, time: agentTime },
      ]);
    } catch (err: any) {
      // Show error as a system message in chat
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((msgs) => [
        ...msgs,
        {
          sender: 'system',
          text: `Error: ${err.message || 'Failed to send message to backend.'}`,
          time,
        },
      ]);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="card flex flex-col h-full">
      <div className="flex justify-between items-center rounded-t-xl p-4 border-b chat-header-bar">
        <div className="flex flex-col">
          <span className="chat-header-title">Chat</span>
          {agentName && (
            <span className="text-textSecondary text-sm mt-1">
              Interacting with{' '}
              <span className="text-accent font-semibold">{agentName}</span>
            </span>
          )}
        </div>
        <button onClick={onClose} className="chat-header-close px-3 py-1">
          Close
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-textSecondary text-center">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  msg.sender === 'user'
                    ? 'chat-msg-human'
                    : msg.sender === 'system' && msg.text.startsWith('Error:')
                    ? 'chat-msg-ai chat-msg-error'
                    : 'chat-msg-ai'
                }
              >
                {msg.text}
                <div className={`chat-msg-meta ${msg.sender === 'user' ? 'text-right' : ''}`}>{msg.sender === 'user' ? 'You' : 'Agent'} • {msg.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-chat-divider bg-surface rounded-b-xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 p-3 border border-chat-input-border rounded-xl bg-chat-input text-chat-text focus:outline-none focus:ring-2 focus:ring-primary"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button className="btn-primary px-5 py-3 rounded-xl" onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;