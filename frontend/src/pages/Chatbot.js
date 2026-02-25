import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your LearnHub AI assistant. Ask me anything about learning, programming, or any topic you're curious about! 🤖" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!user) { navigate('/login'); return; }

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${API}/chatbot/message`, { message: input, history: history.slice(0, -1) });
      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
            <div>
              <h2 style={{ fontWeight: 800 }}>AI Learning Assistant</h2>
              <div style={{ fontSize: 13, color: 'var(--success)' }}>● Online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
              {m.role === 'assistant' && (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 12, flexShrink: 0 }}>🤖</div>
              )}
              <div style={{
                maxWidth: '70%', padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--card)',
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                color: 'var(--text)', fontSize: 15, lineHeight: 1.6
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '12px 20px' }}>
                <span style={{ color: 'var(--text2)' }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 12 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={user ? "Ask anything..." : "Login to chat"}
              disabled={!user || loading}
              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }}
            />
            <button className="btn btn-primary" type="submit" disabled={!user || loading || !input.trim()}>
              Send →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;