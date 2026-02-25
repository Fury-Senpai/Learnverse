import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

const statusConfig = {
  pending:   { label: 'Pending',   color: 'badge-accent',  icon: '⏳' },
  confirmed: { label: 'Confirmed', color: 'badge-success', icon: '✅' },
  completed: { label: 'Completed', color: 'badge-cyan',    icon: '🏁' },
};

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [meetLinks, setMeetLinks] = useState({});
  const [ending, setEnding] = useState({});
  const [confirmEnd, setConfirmEnd] = useState(null);

  useEffect(() => {
    axios.get(`${API}/sessions/my`)
      .then(res => setSessions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddMeetLink = async (sessionId) => {
    const link = meetLinks[sessionId];
    if (!link) return;
    try {
      const res = await axios.put(`${API}/sessions/${sessionId}/meet-link`, { meetLink: link });
      setSessions(sessions.map(s => s._id === sessionId ? { ...s, meetLink: res.data.meetLink, status: 'confirmed' } : s));
      setMeetLinks(prev => ({ ...prev, [sessionId]: '' }));
    } catch {}
  };

  const handleEndSession = async (sessionId) => {
    setEnding(prev => ({ ...prev, [sessionId]: true }));
    try {
      await axios.put(`${API}/sessions/${sessionId}/end`);
      setSessions(sessions.map(s =>
        s._id === sessionId ? { ...s, status: 'completed', endedAt: new Date().toISOString() } : s
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end session');
    } finally {
      setEnding(prev => ({ ...prev, [sessionId]: false }));
      setConfirmEnd(null);
    }
  };

  const isTeacher = user?.role === 'teacher';

  const grouped = isTeacher ? {
    active:    sessions.filter(s => s.status !== 'completed'),
    completed: sessions.filter(s => s.status === 'completed'),
  } : null;

  const renderSession = (s) => {
    const cfg = statusConfig[s.status] || statusConfig.pending;
    const isActive = s.status !== 'completed';

    return (
      <div key={s._id} className="card" style={{
        marginBottom: 16,
        borderColor: s.status === 'confirmed' ? 'rgba(0,230,118,0.25)' : s.status === 'completed' ? 'rgba(0,212,255,0.2)' : 'var(--border)',
        opacity: s.status === 'completed' ? 0.75 : 1
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>

          {/* Left: Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                {isTeacher ? s.student?.name?.[0] : s.teacher?.name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {isTeacher ? s.student?.name : s.teacher?.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  @{isTeacher ? s.student?.username : s.teacher?.username}
                </div>
              </div>
              <span className={`badge ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
            </div>

            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text2)', flexWrap: 'wrap', marginBottom: 12 }}>
              <span>💰 ${s.price}</span>
              <span>📅 Booked {new Date(s.createdAt).toLocaleDateString()}</span>
              {s.endedAt && <span>🏁 Ended {new Date(s.endedAt).toLocaleDateString()}</span>}
            </div>

            {s.meetLink && (
              <a href={s.meetLink} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', color: 'var(--success)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                🎥 Join Meeting
              </a>
            )}
          </div>

          {/* Right: Teacher actions */}
          {isTeacher && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>

              {/* Add meet link */}
              {!s.meetLink && isActive && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-control"
                    placeholder="Paste Google Meet link..."
                    value={meetLinks[s._id] || ''}
                    onChange={e => setMeetLinks(prev => ({ ...prev, [s._id]: e.target.value }))}
                    style={{ width: 240, fontSize: 13 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleAddMeetLink(s._id)}>
                    Add Link
                  </button>
                </div>
              )}

              {/* Update meet link */}
              {s.meetLink && isActive && !meetLinks[s._id + '_edit'] && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMeetLinks(prev => ({ ...prev, [s._id + '_edit']: true, [s._id]: s.meetLink }))}
                >
                  ✏️ Update Link
                </button>
              )}
              {s.meetLink && isActive && meetLinks[s._id + '_edit'] && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-control"
                    value={meetLinks[s._id] || ''}
                    onChange={e => setMeetLinks(prev => ({ ...prev, [s._id]: e.target.value }))}
                    style={{ width: 220, fontSize: 13 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setMeetLinks(prev => { const n = { ...prev }; delete n[s._id + '_edit']; return n; });
                    handleAddMeetLink(s._id);
                  }}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() =>
                    setMeetLinks(prev => { const n = { ...prev }; delete n[s._id + '_edit']; delete n[s._id]; return n; })
                  }>✕</button>
                </div>
              )}

              {/* END SESSION button */}
              {isActive && (
                confirmEnd === s._id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>End this session?</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'right', lineHeight: 1.5 }}>
                      Marks session as completed.<br />This cannot be undone.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.4)', color: 'var(--error)' }}
                        disabled={ending[s._id]}
                        onClick={() => handleEndSession(s._id)}
                      >
                        {ending[s._id] ? 'Ending...' : '🏁 Yes, End Session'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setConfirmEnd(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', color: 'var(--error)' }}
                    onClick={() => setConfirmEnd(s._id)}
                  >
                    🏁 End Session
                  </button>
                )
              )}

              {s.status === 'completed' && (
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Session ended</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80, maxWidth: 860 }}>
      <div className="page-header">
        <h1>My Sessions <span className="gradient-text">✦</span></h1>
        <p>{isTeacher ? 'Manage your 1:1 sessions with students' : 'Your booked 1:1 sessions'}</p>
      </div>

      {/* Stats bar for teachers */}
      {isTeacher && sessions.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',     value: sessions.length,                                                                               color: 'var(--text)' },
            { label: 'Active',    value: grouped.active.length,                                                                         color: 'var(--success)' },
            { label: 'Completed', value: grouped.completed.length,                                                                      color: 'var(--accent3)' },
            { label: 'Earned',    value: `$${sessions.filter(s => s.status === 'completed').reduce((a, s) => a + s.price * 0.7, 0).toFixed(2)}`, color: 'var(--accent2)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'Syne' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No sessions yet</div>
          <div style={{ fontSize: 14 }}>
            {isTeacher
              ? 'Sessions will appear here once students book with you.'
              : 'Book a 1:1 session with a teacher to get started.'}
          </div>
        </div>
      ) : isTeacher ? (
        <>
          {grouped.active.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                Active Sessions ({grouped.active.length})
              </h3>
              {grouped.active.map(renderSession)}
            </div>
          )}
          {grouped.completed.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent3)', display: 'inline-block' }} />
                Completed Sessions ({grouped.completed.length})
              </h3>
              {grouped.completed.map(renderSession)}
            </div>
          )}
        </>
      ) : (
        sessions.map(renderSession)
      )}
    </div>
  );
};

export default MySessions;