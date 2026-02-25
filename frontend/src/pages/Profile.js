import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import CourseCard from '../components/CourseCard';

const Profile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [bookingSession, setBookingSession] = useState(false);

  const isOwner = currentUser?.username === username;

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/users/${username}`);
        setProfile(res.data);
        setEditForm({ name: res.data.name, bio: res.data.bio || '', avatar: res.data.avatar || '', sessionPrice: res.data.sessionPrice || 0 });
        if (res.data.role === 'teacher') {
          const courseRes = await axios.get(`${API}/courses`);
          setCourses(courseRes.data.filter(c => c.teacher?.username === username));
        }
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, [username]);

  const handleSave = async () => {
    try {
      await axios.put(`${API}/users/profile`, editForm);
      setProfile(prev => ({ ...prev, ...editForm }));
      setEditing(false);
    } catch {}
  };

  const handleBookSession = async () => {
    if (!currentUser) { navigate('/login'); return; }
    setBookingSession(true);
    try {
      const res = await axios.post(`${API}/payments/checkout/session/${profile._id}`);
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.message || 'Error booking session');
    } finally { setBookingSession(false); }
  };

  if (loading) return <div className="spinner" />;
  if (!profile) return <div className="container" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text2)' }}>User not found</div>;

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
      {/* Profile header */}
      <div className="card" style={{ marginBottom: 32, padding: 40 }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, flexShrink: 0 }}>
            {profile.avatar ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : profile.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Name</label>
                    <input className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Avatar URL</label>
                    <input className="form-control" value={editForm.avatar} onChange={e => setEditForm({ ...editForm, avatar: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea className="form-control" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} style={{ minHeight: 80 }} />
                </div>
                {profile.role === 'teacher' && (
                  <div className="form-group">
                    <label>1:1 Session Price (USD)</label>
                    <input className="form-control" type="number" min="0" step="0.01" value={editForm.sessionPrice} onChange={e => setEditForm({ ...editForm, sessionPrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>Save Changes</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800 }}>{profile.name}</h1>
                  <span className={`badge ${profile.role === 'teacher' ? 'badge-pink' : 'badge-cyan'}`}>{profile.role}</span>
                </div>
                <div style={{ color: 'var(--text2)', marginBottom: 8 }}>@{profile.username}</div>
                {profile.bio && <p style={{ color: 'var(--text2)', marginBottom: 12 }}>{profile.bio}</p>}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>⚡ {profile.karma} karma</span>
                  {profile.role === 'teacher' && profile.sessionPrice > 0 && (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>💼 ${profile.sessionPrice}/session</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isOwner && !editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>
            )}
            {!isOwner && profile.role === 'teacher' && profile.sessionPrice > 0 && (
              <button className="btn btn-primary" onClick={handleBookSession} disabled={bookingSession}>
                {bookingSession ? 'Redirecting...' : `📅 Book Session - $${profile.sessionPrice}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Teacher courses */}
      {profile.role === 'teacher' && courses.length > 0 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Courses by {profile.name}</h2>
          <div className="grid grid-3">
            {courses.map(c => <CourseCard key={c._id} course={c} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;