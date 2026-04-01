import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import CourseCard from '../components/CourseCard';
import useScrollReveal from '../hooks/useScrollReveal';

/* ── Tiny helpers ── */
const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtD = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtD(d);
};

/* ── Stat card ── */
const Stat = ({ label, value, sub, color = 'var(--accent)', icon }) => (
  <div className="card reveal" style={{ padding: '20px 18px', textAlign: 'center' }}>
    {icon && <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>}
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.05em', color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
    <div className="section-label" style={{ fontSize: 10 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
  </div>
);

/* ── Session row ── */
const SessionRow = ({ s, viewAs }) => {
  const isTeacher = viewAs === 'teacher';
  const other = isTeacher ? s.student : s.teacher;
  const statusCfg = {
    pending:   { color: 'var(--warning)',  bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  label: 'Pending' },
    confirmed: { color: 'var(--success)',  bg: 'rgba(15,212,124,0.1)',  border: 'rgba(15,212,124,0.3)',  label: 'Confirmed' },
    completed: { color: 'var(--text3)',    bg: 'rgba(255,255,255,0.04)', border: 'var(--border)',         label: 'Completed' },
  }[s.status] || {};

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', marginBottom: 8, transition: 'border-color 0.18s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Avatar */}
      <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff' }}>
        {other?.name?.[0] || '?'}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', marginBottom: 2 }}>
          {isTeacher ? `Session with @${other?.username}` : `Session with @${other?.username}`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtD(s.createdAt)}{s.endedAt ? ` · ended ${fmtD(s.endedAt)}` : ''}</div>
      </div>
      {/* Price */}
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em', flexShrink: 0 }}>{fmt(s.price)}</div>
      {/* Status pill */}
      <div style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, flexShrink: 0 }}>
        {statusCfg.label}
      </div>
      {/* Meet link */}
      {s.meetLink && s.status === 'confirmed' && (
        <a href={s.meetLink} target="_blank" rel="noreferrer"
          style={{ flexShrink: 0, padding: '5px 12px', background: 'rgba(15,212,124,0.1)', border: '1px solid rgba(15,212,124,0.3)', color: 'var(--success)', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          🎥 Join
        </a>
      )}
    </div>
  );
};

/* ── Tab button ── */
const Tab = ({ active, onClick, children, count }) => (
  <button onClick={onClick} style={{
    padding: '8px 16px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text2)',
    boxShadow: active ? '0 2px 12px rgba(111,95,232,0.35)' : 'none',
    transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 7,
  }}>
    {children}
    {count !== undefined && (
      <span style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg3)', borderRadius: 100, padding: '1px 7px', fontSize: 11 }}>{count}</span>
    )}
  </button>
);

/* ═══════════════════════════════════════
   MAIN PROFILE COMPONENT
═══════════════════════════════════════ */
const Profile = () => {
  const { username }    = useParams();
  const { user: me }    = useAuth();
  const navigate        = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [publicCourses, setPublicCourses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [editForm, setEditForm] = useState({});
  const [booking,  setBooking]  = useState(false);
  const [tab,      setTab]      = useState('overview');

  const isOwner = me?.username === username;
  useScrollReveal([loading, tab]);

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const profileRes = await axios.get(`${API}/users/${username}`);
        if (cancelled) return;
        setProfile(profileRes.data);
        setEditForm({
          name: profileRes.data.name,
          bio:  profileRes.data.bio  || '',
          avatar: profileRes.data.avatar || '',
          sessionPrice: profileRes.data.sessionPrice || 0,
        });

        if (isOwner && me?._id) {
          const dashRes = await axios.get(`${API}/users/me/dashboard`);
          if (!cancelled) setDashboard(dashRes.data);
        } else if (profileRes.data.role === 'teacher') {
          const cRes = await axios.get(`${API}/courses`);
          if (!cancelled) setPublicCourses(cRes.data.filter(c => c.teacher?.username === username));
        }
      } catch {} finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [username, isOwner]);

  /* ── Save profile ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/profile`, editForm);
      setProfile(prev => ({ ...prev, ...editForm }));
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  /* ── Book session ── */
  const handleBook = async () => {
    if (!me) { navigate('/login'); return; }
    setBooking(true);
    try {
      const res = await axios.post(`${API}/payments/checkout/session/${profile._id}`);
      window.location.href = res.data.url;
    } catch (err) { alert(err.response?.data?.message || 'Error booking session'); setBooking(false); }
  };

  if (loading) return <div className="spinner" />;
  if (!profile) return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text2)' }}>
      User not found
    </div>
  );

  const isTeacher = profile.role === 'teacher';
  const dash      = dashboard;

  // sessions split for owner teacher
  const upcomingSessions  = dash?.sessions?.filter(s => s.status !== 'completed') || [];
  const completedSessions = dash?.sessions?.filter(s => s.status === 'completed')  || [];

  /* ── Role color ── */
  const roleColor = {
    teacher:   { badge: 'badge-pink',  gradient: 'linear-gradient(135deg, #e85f8a, #6f5fe8)' },
    student:   { badge: 'badge-cyan',  gradient: 'linear-gradient(135deg, #22d3ee, #6f5fe8)' },
    moderator: { badge: 'badge-accent', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  }[profile.role] || {};

  return (
    <div style={{ paddingBottom: 80, background: 'var(--bg)' }}>

      {/* ══════════ HERO BANNER ══════════ */}
      <div style={{
        background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
        borderBottom: '1px solid var(--border)',
        paddingTop: 48, paddingBottom: 0,
      }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap', paddingBottom: 32 }}>

            {/* Avatar */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
              background: roleColor.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 800, color: '#fff',
              border: '3px solid var(--bg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}>
              {profile.avatar
                ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profile.name[0]
              }
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.04em', margin: 0 }}>{profile.name}</h1>
                <span className={`badge ${roleColor.badge}`} style={{ fontSize: 11 }}>{profile.role}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 10 }}>@{profile.username}</div>
              {profile.bio && <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 520, margin: 0 }}>{profile.bio}</p>}
              {/* Quick stats row */}
              <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>⚡ {profile.karma} karma</span>
                {isTeacher && isOwner && dash?.revenue && (
                  <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{fmt(dash.revenue.total)} earned</span>
                )}
                {isTeacher && (
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>📚 {isOwner ? dash?.revenue?.totalCourses : publicCourses.length} courses</span>
                )}
                {isTeacher && profile.sessionPrice > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>💼 {fmt(profile.sessionPrice)}/session</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isOwner && !editing && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
              )}
              {!isOwner && isTeacher && profile.sessionPrice > 0 && (
                <button className="btn btn-primary" onClick={handleBook} disabled={booking}>
                  {booking ? 'Redirecting...' : `📅 Book Session — ${fmt(profile.sessionPrice)}`}
                </button>
              )}
            </div>
          </div>

          {/* ── Tab bar (owner only) ── */}
          {isOwner && (
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', padding: 4, borderRadius: 'var(--r-lg) var(--r-lg) 0 0', border: '1px solid var(--border)', borderBottom: 'none', overflowX: 'auto' }}>
              <Tab active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</Tab>
              {isTeacher ? (
                <>
                  <Tab active={tab === 'courses'}   onClick={() => setTab('courses')}   count={dash?.courses?.length}>My Courses</Tab>
                  <Tab active={tab === 'sessions'}  onClick={() => setTab('sessions')}  count={upcomingSessions.length}>Sessions</Tab>
                  <Tab active={tab === 'revenue'}   onClick={() => setTab('revenue')}>Revenue</Tab>
                </>
              ) : (
                <>
                  <Tab active={tab === 'learning'}  onClick={() => setTab('learning')}  count={dash?.purchases?.length}>My Learning</Tab>
                  <Tab active={tab === 'sessions'}  onClick={() => setTab('sessions')}  count={dash?.sessions?.length}>My Sessions</Tab>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="container" style={{ maxWidth: 1100, paddingTop: 32 }}>

        {/* Edit form */}
        {editing && (
          <div className="card scale-in" style={{ marginBottom: 32, padding: 28 }}>
            <h3 style={{ marginBottom: 20 }}>Edit Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Display Name</label>
                <input className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Avatar URL</label>
                <input className="form-control" value={editForm.avatar} onChange={e => setEditForm({ ...editForm, avatar: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea className="form-control" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} style={{ minHeight: 80 }} placeholder="Tell people about yourself..." />
            </div>
            {isTeacher && (
              <div className="form-group" style={{ maxWidth: 280 }}>
                <label>1:1 Session Price (₹)</label>
                <input className="form-control" type="number" min="50" step="50" value={editForm.sessionPrice} onChange={e => setEditForm({ ...editForm, sessionPrice: parseFloat(e.target.value) || 0 })} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Set 0 to disable session bookings · Minimum ₹50</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '✓ Save Changes'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ══ OVERVIEW TAB (or public view) ══ */}
        {(!isOwner || tab === 'overview') && (
          <>
            {/* ── Teacher: public courses ── */}
            {isTeacher && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: '1.4rem' }}>
                    {isOwner ? 'My Courses' : `Courses by ${profile.name}`}
                  </h2>
                  {isOwner && <Link to="/create-course" className="btn btn-primary btn-sm">+ New Course</Link>}
                </div>
                {(isOwner ? dash?.courses : publicCourses)?.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text2)' }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>No courses yet</div>
                    {isOwner && <Link to="/create-course" className="btn btn-primary btn-sm">Create your first course</Link>}
                  </div>
                ) : (
                  <div className="grid grid-3">
                    {(isOwner ? dash?.courses : publicCourses)?.map((c, i) => (
                      <div key={c._id} className={`reveal d${Math.min(i + 1, 6)}`}><CourseCard course={c} /></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Owner student: quick summary ── */}
            {isOwner && !isTeacher && dash && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
                <Stat icon="📚" label="Courses Enrolled" value={dash.purchases?.length || 0} color="var(--accent)" />
                <Stat icon="📅" label="Sessions Booked"  value={dash.sessions?.length || 0}  color="var(--accent2)" />
                <Stat icon="⚡" label="Karma Points"     value={profile.karma || 0}           color="var(--warning)" />
                <Stat icon="🏆" label="Member Since"     value={fmtD(profile.createdAt)}      color="var(--text2)" />
              </div>
            )}

            {/* ── Owner teacher: quick summary ── */}
            {isOwner && isTeacher && dash?.revenue && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 48 }}>
                <Stat icon="💰" label="Total Earned"    value={fmt(dash.revenue.total)}          color="var(--success)" />
                <Stat icon="📅" label="This Month"      value={fmt(dash.revenue.thisMonth)}       color="var(--accent3)" sub="last 30 days" />
                <Stat icon="📚" label="Courses"         value={dash.revenue.totalCourses}          color="var(--accent)" />
                <Stat icon="👥" label="Total Students"  value={dash.revenue.totalStudents}         color="var(--accent2)" />
                <Stat icon="🎯" label="Sessions"        value={dash.revenue.totalSessions}         color="var(--warning)" />
                <Stat icon="⚡" label="Karma"           value={profile.karma}                      color="var(--text2)" />
              </div>
            )}
          </>
        )}

        {/* ══ MY COURSES TAB (teacher owner) ══ */}
        {isOwner && isTeacher && tab === 'courses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.4rem' }}>My Courses ({dash?.courses?.length || 0})</h2>
              <Link to="/create-course" className="btn btn-primary btn-sm">+ New Course</Link>
            </div>
            {!dash?.courses?.length ? (
              <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                <p>You haven't created any courses yet.</p>
                <Link to="/create-course" className="btn btn-primary" style={{ marginTop: 16 }}>Create your first course</Link>
              </div>
            ) : (
              /* Detailed course list for owner */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dash.courses.map((c, i) => (
                  <div key={c._id} className={`reveal d${Math.min(i + 1, 4)}`}>
                    <div className="card" style={{ padding: '18px 22px', display: 'flex', gap: 16, alignItems: 'center' }}>
                      {/* Thumb */}
                      <div style={{ width: 72, height: 48, borderRadius: 8, background: c.thumbnail ? 'transparent' : 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {c.thumbnail ? <img src={c.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📚'}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/courses/${c._id}`} style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em', color: 'var(--text)', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                        >{c.title}</Link>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>📅 {fmtD(c.createdAt)}</span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>🎬 {c.videos?.length || 0} videos</span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>⭐ {Number(c.averageRating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', color: 'var(--text)' }}>{c.totalStudents || 0}</div>
                          <div className="section-label" style={{ fontSize: 9 }}>Students</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', color: c.price === 0 ? 'var(--success)' : 'var(--text)' }}>
                            {c.price === 0 ? 'Free' : fmt(c.price)}
                          </div>
                          <div className="section-label" style={{ fontSize: 9 }}>Price</div>
                        </div>
                      </div>
                      <Link to={`/courses/${c._id}`} className="btn btn-secondary btn-sm">View →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SESSIONS TAB ══ */}
        {isOwner && tab === 'sessions' && (
          <div>
            {isTeacher ? (
              <>
                {/* Upcoming */}
                <div style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    <h3 style={{ fontSize: '1.1rem' }}>Upcoming Sessions ({upcomingSessions.length})</h3>
                  </div>
                  {upcomingSessions.length === 0 ? (
                    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text2)' }}>
                      <p>No upcoming sessions right now.</p>
                    </div>
                  ) : upcomingSessions.map((s, i) => (
                    <div key={s._id} className={`reveal d${Math.min(i + 1, 4)}`}>
                      <SessionRow s={s} viewAs="teacher" />
                    </div>
                  ))}
                </div>

                {/* Completed */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block' }} />
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text2)' }}>Completed Sessions ({completedSessions.length})</h3>
                  </div>
                  {completedSessions.length === 0 ? (
                    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text2)' }}>
                      <p>No completed sessions yet.</p>
                    </div>
                  ) : completedSessions.map((s, i) => (
                    <div key={s._id} className={`reveal d${Math.min(i + 1, 4)}`}>
                      <SessionRow s={s} viewAs="teacher" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Student sessions */
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>My Sessions ({dash?.sessions?.length || 0})</h3>
                {!dash?.sessions?.length ? (
                  <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text2)' }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
                    <p>You haven't booked any sessions yet.</p>
                    <Link to="/courses" className="btn btn-primary" style={{ marginTop: 16 }}>Find a Teacher</Link>
                  </div>
                ) : dash.sessions.map((s, i) => (
                  <div key={s._id} className={`reveal d${Math.min(i + 1, 4)}`}>
                    <SessionRow s={s} viewAs="student" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ REVENUE TAB (teacher owner) ══ */}
        {isOwner && isTeacher && tab === 'revenue' && dash?.revenue && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: 24 }}>Revenue Overview</h2>

            {/* Big stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 36 }}>
              <div className="card reveal" style={{ padding: '24px 20px', borderColor: 'rgba(15,212,124,0.3)' }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Total Earned</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.05em', color: 'var(--success)', lineHeight: 1 }}>{fmt(dash.revenue.total)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>All time (courses + sessions)</div>
              </div>
              <div className="card reveal d1" style={{ padding: '24px 20px' }}>
                <div className="section-label" style={{ marginBottom: 10 }}>This Month</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.05em', color: 'var(--accent3)', lineHeight: 1 }}>{fmt(dash.revenue.thisMonth)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Last 30 days</div>
              </div>
              <div className="card reveal d2" style={{ padding: '24px 20px' }}>
                <div className="section-label" style={{ marginBottom: 10 }}>From Courses</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.05em', color: 'var(--accent)', lineHeight: 1 }}>{fmt(dash.revenue.fromCourses)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>70% of each sale</div>
              </div>
              <div className="card reveal d3" style={{ padding: '24px 20px' }}>
                <div className="section-label" style={{ marginBottom: 10 }}>From Sessions</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.05em', color: 'var(--accent2)', lineHeight: 1 }}>{fmt(dash.revenue.fromSessions)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>70% of each session</div>
              </div>
            </div>

            {/* Revenue split info */}
            <div className="card reveal" style={{ padding: 24, marginBottom: 32 }}>
              <h4 style={{ marginBottom: 16 }}>Revenue Split</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Your share (courses)',  pct: 70, color: 'var(--accent)',  amount: dash.revenue.fromCourses },
                  { label: 'Your share (sessions)', pct: 70, color: 'var(--accent2)', amount: dash.revenue.fromSessions },
                  { label: 'Platform fee',          pct: 30, color: 'var(--text3)',   amount: dash.revenue.total / 0.7 * 0.3 },
                ].map(({ label, pct, color, amount }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color }}>{pct}%</span>
                        <span style={{ fontSize: 13, color: 'var(--text3)' }}>{fmt(amount)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course-by-course breakdown */}
            {dash.courses?.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 16 }}>Per-Course Breakdown</h4>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px', gap: 16, padding: '10px 18px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                    {['Course', 'Students', 'Price', 'Earned'].map(h => (
                      <span key={h} className="section-label" style={{ fontSize: 10 }}>{h}</span>
                    ))}
                  </div>
                  {dash.courses.map((c, i) => {
                    const earned = (c.totalStudents || 0) * (c.price || 0) * 0.7;
                    return (
                      <div key={c._id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px', gap: 16, padding: '13px 18px', borderBottom: i < dash.courses.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Link to={`/courses/${c._id}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                        >{c.title}</Link>
                        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{c.totalStudents || 0}</span>
                        <span style={{ fontSize: 13, color: c.price === 0 ? 'var(--success)' : 'var(--text2)' }}>{c.price === 0 ? 'Free' : fmt(c.price)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{fmt(earned)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MY LEARNING TAB (student owner) ══ */}
        {isOwner && !isTeacher && tab === 'learning' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: 24 }}>
              My Purchased Courses ({dash?.purchases?.length || 0})
            </h2>
            {!dash?.purchases?.length ? (
              <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text2)' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎓</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No courses yet</div>
                <p style={{ fontSize: 14, marginBottom: 20 }}>Browse our catalog and start learning today.</p>
                <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dash.purchases.map((p, i) => {
                  const c = p.course;
                  if (!c) return null;
                  return (
                    <div key={p._id} className={`reveal d${Math.min(i + 1, 4)}`}>
                      <div className="card" style={{ padding: '18px 22px', display: 'flex', gap: 16, alignItems: 'center' }}>
                        {/* Thumbnail */}
                        <div style={{ width: 80, height: 52, borderRadius: 8, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                          {c.thumbnail ? <img src={c.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📚'}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link to={`/courses/${c._id}`} style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em', color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: 3 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                          >{c.title}</Link>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {c.teacher && <span style={{ fontSize: 12, color: 'var(--text3)' }}>by @{c.teacher.username}</span>}
                            <span style={{ fontSize: 12, color: 'var(--text3)' }}>purchased {timeAgo(p.createdAt)}</span>
                            {c.averageRating > 0 && <span style={{ fontSize: 12, color: '#fbbf24' }}>★ {Number(c.averageRating).toFixed(1)}</span>}
                          </div>
                        </div>
                        {/* Paid */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: p.amount === 0 ? 'var(--success)' : 'var(--text)', letterSpacing: '-0.02em' }}>
                            {p.amount === 0 ? 'Free' : fmt(p.amount)}
                          </div>
                          <div className="section-label" style={{ fontSize: 9, marginTop: 2 }}>paid</div>
                        </div>
                        <Link to={`/courses/${c._id}`} className="btn btn-primary btn-sm">Continue →</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;