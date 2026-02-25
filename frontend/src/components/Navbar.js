import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const NavLink = ({ to, children }) => (
    <Link to={to} style={{
      fontSize: 14,
      fontWeight: 500,
      color: isActive(to) ? 'var(--text)' : 'var(--text2)',
      padding: '6px 12px',
      borderRadius: 'var(--r-md)',
      background: isActive(to) ? 'var(--bg3)' : 'transparent',
      transition: 'all 0.15s',
      letterSpacing: '-0.01em',
    }}
      onMouseEnter={e => { if (!isActive(to)) e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { if (!isActive(to)) e.currentTarget.style.color = 'var(--text2)'; }}
    >
      {children}
    </Link>
  );

  return (
    <nav style={{
      background: 'rgba(7,7,13,0.85)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 1000,
      padding: '0 28px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 62, gap: 20 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 4px 12px rgba(124,106,247,0.4)',
          }}>⚡</div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: '-0.04em',
            color: 'var(--text)',
          }}>
            Learn<span className="gradient-text">Hub</span>
          </span>
        </Link>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 380 }}>
          <SearchBar />
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NavLink to="/courses">Courses</NavLink>
          <NavLink to="/qa">Q&amp;A</NavLink>
          <NavLink to="/leaderboard">🏆</NavLink>
          <NavLink to="/chatbot">AI Chat</NavLink>
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          {user ? (
            <>
              {user.role === 'teacher' && (
                <Link to="/create-course" className="btn btn-primary btn-sm">+ Course</Link>
              )}

              {/* Profile dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    background: menuOpen ? 'var(--card2)' : 'var(--bg3)',
                    border: `1px solid ${menuOpen ? 'var(--border3)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '5px 10px 5px 6px',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                  }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <span style={{ color: 'var(--text2)' }}>{user.username}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.5, transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>

                {menuOpen && (
                  <div className="scale-in" style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                    background: 'var(--card)', border: '1px solid var(--border2)',
                    borderRadius: 'var(--r-lg)', padding: '8px',
                    minWidth: 200, zIndex: 100,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  }}>
                    {/* User info */}
                    <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                      <div style={{ fontWeight: 650, fontSize: 14, letterSpacing: '-0.02em', marginBottom: 2 }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>@{user.username} · {user.role}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 100, padding: '2px 8px' }}>
                          ⚡ {user.karma} karma
                        </span>
                      </div>
                    </div>

                    {[
                      { to: `/profile/${user.username}`, label: 'My Profile', icon: '👤' },
                      { to: '/my-sessions', label: 'My Sessions', icon: '📅' },
                    ].map(item => (
                      <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                        borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500,
                        color: 'var(--text2)', transition: 'all 0.12s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
                      >
                        <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
                      </Link>
                    ))}

                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                        textAlign: 'left', padding: '9px 12px', borderRadius: 'var(--r-sm)',
                        background: 'none', border: 'none', color: 'var(--error)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                        transition: 'background 0.12s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,82,82,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span>🚪</span> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;