import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

/* ── Stat card ── */
const StatCard = ({ icon, label, value, color = 'var(--accent)' }) => (
  <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color, marginBottom: 4 }}>{value}</div>
    <div className="section-label">{label}</div>
  </div>
);

/* ── Role badge ── */
const RolePill = ({ role }) => {
  const cfg = {
    moderator: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    teacher:   { bg: 'rgba(111,95,232,0.12)', color: 'var(--accent)',  border: 'rgba(111,95,232,0.3)' },
    student:   { bg: 'rgba(34,211,238,0.1)',  color: 'var(--accent3)', border: 'rgba(34,211,238,0.3)' },
  }[role] || {};
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {role}
    </span>
  );
};

const TABS = ['Overview', 'Users', 'Courses', 'Community', 'Deleted Msgs'];

const ModPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,      setTab]      = useState('Overview');
  const [users,    setUsers]    = useState([]);
  const [courses,  setCourses]  = useState([]);
  const [msgs,     setMsgs]     = useState([]);
  const [deleted,  setDeleted]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null); // { type, target }
  const [actionMsg, setActionMsg] = useState('');

  // Redirect non-mods
  useEffect(() => {
    if (user && user.role !== 'moderator') navigate('/', { replace: true });
  }, [user, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/users/all`); setUsers(r.data); }
    catch {}
    setLoading(false);
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/courses`); setCourses(r.data); }
    catch {}
    setLoading(false);
  }, []);

  const loadMsgs = useCallback(async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/community/messages`); setMsgs(r.data); }
    catch {}
    setLoading(false);
  }, []);

  const loadDeleted = useCallback(async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/community/messages/deleted`); setDeleted(r.data); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'Users')        loadUsers();
    if (tab === 'Courses')      loadCourses();
    if (tab === 'Community')    loadMsgs();
    if (tab === 'Deleted Msgs') loadDeleted();
    if (tab === 'Overview') { loadUsers(); loadCourses(); loadMsgs(); }
  }, [tab]);

  /* ── Actions ── */
  const deleteUser = async (uid) => {
    try {
      await axios.delete(`${API}/users/${uid}`);
      setUsers(prev => prev.filter(u => u._id !== uid));
      setActionMsg('User deleted.');
    } catch (err) { setActionMsg(err.response?.data?.message || 'Failed'); }
    setConfirmAction(null);
  };

  const deleteCourse = async (cid) => {
    try {
      await axios.delete(`${API}/courses/${cid}`);
      setCourses(prev => prev.filter(c => c._id !== cid));
      setActionMsg('Course deleted.');
    } catch (err) { setActionMsg(err.response?.data?.message || 'Failed'); }
    setConfirmAction(null);
  };

  const deleteMsg = async (mid) => {
    try {
      await axios.delete(`${API}/community/messages/${mid}`);
      setMsgs(prev => prev.filter(m => m._id !== mid));
      setActionMsg('Message deleted.');
    } catch (err) { setActionMsg(err.response?.data?.message || 'Failed'); }
    setConfirmAction(null);
  };

  const handleConfirm = () => {
    const { type, target } = confirmAction;
    if (type === 'user')    deleteUser(target._id);
    if (type === 'course')  deleteCourse(target._id);
    if (type === 'msg')     deleteMsg(target._id);
  };

  /* ── Filters ── */
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.username.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher?.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user || user.role !== 'moderator') return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>

      {/* ── Confirm modal ── */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card scale-in" style={{ maxWidth: 420, width: '100%', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ marginBottom: 8 }}>
              {confirmAction.type === 'user'   && `Delete @${confirmAction.target.username}?`}
              {confirmAction.type === 'course' && `Delete "${confirmAction.target.title}"?`}
              {confirmAction.type === 'msg'    && 'Delete this message?'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
              {confirmAction.type === 'user'   && 'This will permanently delete the user account.'}
              {confirmAction.type === 'course' && 'This will delete the course and all its comments.'}
              {confirmAction.type === 'msg'    && 'This message will be soft-deleted and logged.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={handleConfirm}>Yes, Delete</button>
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.07))', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '32px 28px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}>🛡️</div>
            <div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>Moderator Panel</h1>
              <p style={{ fontSize: 13, margin: 0 }}>Logged in as <strong>@{user.username}</strong> · Elevated privileges active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32 }}>

        {/* Action feedback */}
        {actionMsg && (
          <div className="alert alert-success" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {actionMsg}</span>
            <button onClick={() => setActionMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* ── Overview stats ── */}
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon="👥" label="Total Users"    value={users.length}                                          color="var(--accent3)" />
            <StatCard icon="🎓" label="Students"       value={users.filter(u => u.role === 'student').length}        color="var(--accent)" />
            <StatCard icon="👨‍🏫" label="Teachers"      value={users.filter(u => u.role === 'teacher').length}        color="var(--accent2)" />
            <StatCard icon="📚" label="Courses"        value={courses.length}                                        color="var(--success)" />
            <StatCard icon="💬" label="Chat Messages"  value={msgs.length}                                           color="#f59e0b" />
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, flexWrap: 'wrap', background: 'var(--bg3)', padding: 4, borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); setRoleFilter('all'); }}
              style={{
                padding: '8px 16px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                background: tab === t ? '#f59e0b' : 'transparent',
                color: tab === t ? '#000' : 'var(--text2)',
                transition: 'all 0.15s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* ── Search + filter bar ── */}
        {(tab === 'Users' || tab === 'Courses') && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              className="form-control"
              placeholder={tab === 'Users' ? 'Search by name, username, email...' : 'Search by title or teacher...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 380 }}
            />
            {tab === 'Users' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {['all','student','teacher','moderator'].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)}
                    style={{ padding: '7px 14px', borderRadius: 'var(--r-sm)', border: `1px solid ${roleFilter === r ? '#f59e0b' : 'var(--border2)'}`, background: roleFilter === r ? 'rgba(245,158,11,0.12)' : 'transparent', color: roleFilter === r ? '#f59e0b' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.15s' }}
                  >{r}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && <div className="spinner" />}

        {/* ═══ USERS TAB ═══ */}
        {(tab === 'Users' || tab === 'Overview') && !loading && (
          <div style={{ marginBottom: tab === 'Overview' ? 40 : 0 }}>
            {tab === 'Overview' && <h3 style={{ marginBottom: 16 }}>Recent Users</h3>}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 120px 80px', gap: 16, padding: '12px 20px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                {['User','Email','Role','Joined','Action'].map(h => (
                  <span key={h} className="section-label" style={{ fontSize: 10 }}>{h}</span>
                ))}
              </div>
              {(tab === 'Overview' ? filteredUsers.slice(0, 8) : filteredUsers).map((u, i) => (
                <div key={u._id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 120px 80px', gap: 16, padding: '14px 20px', borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: u.role === 'moderator' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {u.role === 'moderator' ? '🛡' : u.name[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{u.username}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                  <RolePill role={u.role} />
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</span>
                  <div>
                    {u.role !== 'moderator' && (
                      <button
                        onClick={() => setConfirmAction({ type: 'user', target: u })}
                        style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--error)', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                      >Delete</button>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No users found</div>
              )}
            </div>
          </div>
        )}

        {/* ═══ COURSES TAB ═══ */}
        {(tab === 'Courses' || tab === 'Overview') && !loading && (
          <div style={{ marginBottom: tab === 'Overview' ? 40 : 0 }}>
            {tab === 'Overview' && <h3 style={{ marginBottom: 16, marginTop: 8 }}>Recent Courses</h3>}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 100px 80px', gap: 16, padding: '12px 20px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                {['Course','Teacher','Price','Students','Action'].map(h => (
                  <span key={h} className="section-label" style={{ fontSize: 10 }}>{h}</span>
                ))}
              </div>
              {(tab === 'Overview' ? filteredCourses.slice(0, 6) : filteredCourses).map((c, i) => (
                <div key={c._id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 100px 80px', gap: 16, padding: '14px 20px', borderBottom: i < filteredCourses.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/courses/${c._id}`} style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                    >{c.title}</Link>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{c.category || 'General'}</div>
                  </div>
                  <Link to={`/profile/${c.teacher?.username}`} style={{ fontSize: 12, color: 'var(--accent)' }}>@{c.teacher?.username}</Link>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.price === 0 ? 'var(--success)' : 'var(--text)' }}>
                    {c.price === 0 ? 'Free' : `₹${c.price}`}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{c.totalStudents || 0}</span>
                  <button
                    onClick={() => setConfirmAction({ type: 'course', target: c })}
                    style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--error)', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                  >Delete</button>
                </div>
              ))}
              {filteredCourses.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No courses found</div>
              )}
            </div>
          </div>
        )}

        {/* ═══ COMMUNITY TAB ═══ */}
        {tab === 'Community' && !loading && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text2)' }}>{msgs.length} active messages</span>
              <Link to="/community" className="btn btn-secondary btn-sm">Open Community →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgs.map(m => (
                <div key={m._id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {m.author?.name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <Link to={`/profile/${m.author?.username}`} style={{ fontWeight: 600, fontSize: 13 }}>@{m.author?.username}</Link>
                      <RolePill role={m.author?.role} />
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(m.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, wordBreak: 'break-word' }}>{m.body}</p>
                  </div>
                  <button
                    onClick={() => setConfirmAction({ type: 'msg', target: m })}
                    style={{ flexShrink: 0, padding: '4px 10px', fontSize: 12, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--error)', borderRadius: 6, cursor: 'pointer' }}
                  >🗑 Delete</button>
                </div>
              ))}
              {msgs.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No messages</div>}
            </div>
          </div>
        )}

        {/* ═══ DELETED MESSAGES AUDIT LOG ═══ */}
        {tab === 'Deleted Msgs' && !loading && (
          <div>
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--r-md)' }}>
              <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 500 }}>🛡️ Audit log — only visible to moderators. Shows all soft-deleted messages with who deleted them.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deleted.map(m => (
                <div key={m._id} className="card" style={{ padding: '14px 18px', opacity: 0.85 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>@{m.author?.username}</span>
                    <RolePill role={m.author?.role} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>posted {new Date(m.createdAt).toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(244,63,94,0.1)', color: 'var(--error)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 100 }}>
                      🗑 deleted by @{m.deletedBy?.username} ({m.deletedBy?.role}) · {new Date(m.deletedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.55, fontStyle: 'italic' }}>"{m.body}"</p>
                </div>
              ))}
              {deleted.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No deleted messages yet.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModPanel;