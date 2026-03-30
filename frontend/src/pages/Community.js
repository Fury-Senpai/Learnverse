import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

/* ── Avatar ── */
const Avatar = ({ name, size = 34, role }) => {
  const colors = {
    moderator: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    teacher:   'linear-gradient(135deg, #6f5fe8, #e85f8a)',
    student:   'linear-gradient(135deg, #22d3ee, #6f5fe8)',
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: colors[role] || colors.student,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#fff',
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
};

/* ── Role badge ── */
const RoleBadge = ({ role }) => {
  if (!role || role === 'student') return null;
  const config = {
    moderator: { label: 'MOD', style: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' } },
    teacher:   { label: 'TEACHER', style: { background: 'rgba(111,95,232,0.12)', color: '#7b6cf6', border: '1px solid rgba(111,95,232,0.3)' } },
  };
  const c = config[role];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '1px 6px', borderRadius: 100, ...c.style }}>
      {c.label}
    </span>
  );
};

/* ── Time ago ── */
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400)return `${Math.floor(s/3600)}h`;
  return new Date(d).toLocaleDateString();
};

/* ─────────────────────────────────────────────
   COMMUNITY CHAT PAGE
───────────────────────────────────────────── */
const Community = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // message id

  const bottomRef   = useRef();
  const inputRef    = useRef();
  const pollRef     = useRef();

  const isMod = user?.role === 'moderator';

  /* ── Fetch messages ── */
  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const res = await axios.get(`${API}/community/messages`);
      setMessages(res.data);
      if (!silent) setLoading(false);
    } catch {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    // Poll every 4 seconds for new messages
    pollRef.current = setInterval(() => fetchMessages(true), 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /* ── Send message ── */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!input.trim()) return;
    setSending(true); setError('');
    try {
      const res = await axios.post(`${API}/community/messages`, { body: input.trim() });
      setMessages(prev => [...prev, res.data]);
      setInput('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  /* ── Delete message ── */
  const handleDelete = async (msgId) => {
    setDeletingId(msgId);
    try {
      await axios.delete(`${API}/community/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  /* ── Can this user delete this message? ── */
  const canDelete = (msg) => {
    if (!user) return false;
    if (user._id === msg.author?._id || user._id === msg.author) return true;
    if (isMod) return true;
    return false;
  };

  /* ── Group messages by date ── */
  const grouped = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 62px)', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '14px 28px', flexShrink: 0 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>Community Chat</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                General · {messages.length} messages
              </div>
            </div>
          </div>

          {/* Mod badge */}
          {isMod && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 100 }}>
              <span style={{ fontSize: 14 }}>🛡️</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.03em' }}>MODERATOR VIEW</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>

          {loading ? (
            <div className="spinner" />
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>👋</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                Be the first to say hello!
              </div>
              <p style={{ fontSize: 14 }}>Start the conversation in the community chat.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, msgs]) => (
              <div key={date}>
                {/* Date divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 12px', background: 'var(--bg3)', borderRadius: 100, border: '1px solid var(--border)' }}>
                    {date}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                {/* Messages */}
                {msgs.map((msg, i) => {
                  const isOwn      = user && (user._id === msg.author?._id || user._id === msg.author);
                  const isMsgMod   = msg.author?.role === 'moderator';
                  const showAvatar = i === 0 || msgs[i-1]?.author?._id !== msg.author?._id;

                  return (
                    <div
                      key={msg._id}
                      style={{
                        display: 'flex', gap: 10, marginBottom: 3,
                        alignItems: 'flex-start',
                        flexDirection: isOwn ? 'row-reverse' : 'row',
                      }}
                    >
                      {/* Avatar (show only on first of consecutive group) */}
                      <div style={{ width: 34, flexShrink: 0 }}>
                        {showAvatar && !isOwn && (
                          <Link to={`/profile/${msg.author?.username}`}>
                            <Avatar name={msg.author?.name} size={34} role={msg.author?.role} />
                          </Link>
                        )}
                      </div>

                      {/* Bubble */}
                      <div style={{ maxWidth: '72%', position: 'relative' }}>
                        {/* Author + time (show only on first of group) */}
                        {showAvatar && !isOwn && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 2 }}>
                            <Link to={`/profile/${msg.author?.username}`} style={{ fontSize: 13, fontWeight: 650, letterSpacing: '-0.015em', color: isMsgMod ? '#f59e0b' : 'var(--text)' }}>
                              @{msg.author?.username}
                            </Link>
                            <RoleBadge role={msg.author?.role} />
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(msg.createdAt)}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                          {/* Message bubble */}
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: isOwn ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                              background: isOwn
                                ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
                                : isMsgMod
                                  ? 'rgba(245,158,11,0.1)'
                                  : 'var(--card)',
                              border: isOwn
                                ? 'none'
                                : isMsgMod
                                  ? '1px solid rgba(245,158,11,0.25)'
                                  : '1px solid var(--border)',
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: 'var(--text)',
                              letterSpacing: '-0.01em',
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.body}
                          </div>

                          {/* Timestamp (own messages) */}
                          {isOwn && (
                            <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, marginBottom: 2 }}>{timeAgo(msg.createdAt)}</span>
                          )}

                          {/* Delete button */}
                          {canDelete(msg) && (
                            confirmDelete === msg._id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  disabled={deletingId === msg._id}
                                  onClick={() => handleDelete(msg._id)}
                                  style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600, background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.35)', color: 'var(--error)', borderRadius: 6, cursor: 'pointer' }}
                                >
                                  {deletingId === msg._id ? '...' : 'Delete'}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  style={{ padding: '3px 8px', fontSize: 11, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(msg._id)}
                                title={isMod && !isOwn ? 'Delete as moderator' : 'Delete message'}
                                style={{ padding: '3px 6px', fontSize: 12, background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', borderRadius: 6, transition: 'color 0.15s', opacity: 0.6 }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.opacity = '1'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text4)'; e.currentTarget.style.opacity = '0.6'; }}
                              >
                                {isMod && !isOwn ? '🛡️🗑' : '🗑'}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '14px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 8, padding: '6px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {user ? (
            <form onSubmit={handleSend} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <Avatar name={user.name} size={34} role={user.role} />
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  placeholder="Message the community... (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  maxLength={1000}
                  style={{
                    width: '100%', background: 'var(--bg3)',
                    border: '1px solid var(--border2)', borderRadius: 'var(--r-lg)',
                    padding: '10px 50px 10px 16px',
                    color: 'var(--text)', fontFamily: 'var(--font-body)',
                    fontSize: 14, letterSpacing: '-0.01em',
                    outline: 'none', resize: 'none', lineHeight: 1.5,
                    transition: 'border-color 0.18s',
                    maxHeight: 120, overflowY: 'auto',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
                {/* Char count */}
                {input.length > 800 && (
                  <span style={{ position: 'absolute', bottom: 8, right: 48, fontSize: 10, color: input.length > 950 ? 'var(--error)' : 'var(--text3)' }}>
                    {1000 - input.length}
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary btn-sm"
                type="submit"
                disabled={sending || !input.trim()}
                style={{ flexShrink: 0, height: 40 }}
              >
                {sending ? '...' : '→'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, padding: 0 }}>
                  Sign in
                </button>{' '}
                to join the community chat
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;