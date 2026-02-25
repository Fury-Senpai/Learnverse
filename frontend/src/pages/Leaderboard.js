import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const medals = ['🥇', '🥈', '🥉'];

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/users/leaderboard`)
      .then(res => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80, maxWidth: 800 }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>🏆 Leaderboard <span className="gradient-text">✦</span></h1>
        <p>Top contributors ranked by karma</p>
      </div>

      {loading ? <div className="spinner" /> : (
        <div>
          {users.map((u, i) => (
            <Link to={`/profile/${u.username}`} key={u._id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                marginBottom: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
                background: i === 0 ? 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))' : i === 1 ? 'linear-gradient(135deg, rgba(192,192,192,0.1), rgba(192,192,192,0.05))' : i === 2 ? 'linear-gradient(135deg, rgba(205,127,50,0.1), rgba(205,127,50,0.05))' : 'var(--card)',
                border: i < 3 ? '1px solid rgba(255,215,0,0.2)' : '1px solid var(--border)',
                transition: 'transform 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                {/* Rank */}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: i < 3 ? 24 : 18, flexShrink: 0 }}>
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </div>

                {/* Avatar */}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                  {u.avatar ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : u.name[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{u.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                    @{u.username} · <span className={`badge ${u.role === 'teacher' ? 'badge-pink' : 'badge-cyan'}`} style={{ fontSize: 11 }}>{u.role}</span>
                  </div>
                </div>

                {/* Karma */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--accent)' }}>⚡{u.karma}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>karma</div>
                </div>
              </div>
            </Link>
          ))}

          {users.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 80 }}>No users yet. Be the first to earn karma!</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;