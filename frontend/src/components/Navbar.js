import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isMod = user?.role === 'moderator';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => { logout(); navigate('/'); };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks = [
    { to: '/courses',   label: 'Courses' },
    { to: '/qa',        label: 'Q&A' },
    { to: '/community', label: '💬 Community' },
    { to: '/leaderboard', label: '🏆' },
    { to: '/chatbot',   label: 'AI Chat' },
  ];

  return (
    <nav style={{
      background: scrolled ? 'rgba(5,5,9,0.94)' : 'rgba(5,5,9,0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${scrolled ? 'var(--border2)' : 'rgba(22,22,58,0.5)'}`,
      position: 'sticky', top: 0, zIndex: 1000,
      transition: 'background 0.3s, border-color 0.3s',
      // Amber top-bar for moderators
      boxShadow: isMod ? 'inset 0 -2px 0 rgba(245,158,11,0.6)' : 'none',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', height: 62, gap: 20 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: isMod
              ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
              : 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17,
            boxShadow: isMod
              ? '0 4px 16px rgba(245,158,11,0.42)'
              : '0 4px 16px rgba(111,95,232,0.42)',
            transition: 'transform 0.2s var(--ease-spring)',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08) rotate(-4deg)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0)'}
          >
            {isMod ? '🛡️' : '⚡'}
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.04em', color: 'var(--text)' }}>
            Learn<span style={{
              background: isMod
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : 'linear-gradient(130deg, var(--accent) 10%, var(--accent-mid) 45%, var(--accent2) 90%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Hub</span>
          </span>
        </Link>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 360 }}>
          <SearchBar />
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.01em',
              padding: '6px 12px', borderRadius: 'var(--r-md)',
              color: isActive(to) ? 'var(--text)' : 'var(--text2)',
              background: isActive(to) ? 'var(--bg3)' : 'transparent',
              border: `1px solid ${isActive(to) ? 'var(--border)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!isActive(to)) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
              onMouseLeave={e => { if (!isActive(to)) { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {label}
            </Link>
          ))}

          {/* Mod-only: Mod Panel link */}
          {isMod && (
            <Link to="/mod" style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
              padding: '5px 12px', borderRadius: 'var(--r-md)',
              color: isActive('/mod') ? '#f59e0b' : '#f59e0b',
              background: isActive('/mod') ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isActive('/mod') ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)'; }}
            >
              🛡️ Mod Panel
            </Link>
          )}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4, flexShrink: 0 }}>
          {user ? (
            <>
              {user.role === 'teacher' && (
                <Link to="/create-course" className="btn btn-primary btn-sm">+ Course</Link>
              )}

              {/* Avatar dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px 5px 6px',
                    background: menuOpen ? 'var(--card2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${menuOpen
                      ? isMod ? 'rgba(245,158,11,0.5)' : 'var(--border3)'
                      : isMod ? 'rgba(245,158,11,0.3)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: 13, fontWeight: 500, color: 'var(--text)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: isMod
                      ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                      : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                  }}>
                    {isMod ? '🛡' : user.name[0].toUpperCase()}
                  </div>
                  <span style={{ color: 'var(--text2)', letterSpacing: '-0.01em' }}>{user.username}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                    style={{ opacity: 0.4, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {menuOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                    background: 'var(--card)', border: `1px solid ${isMod ? 'rgba(245,158,11,0.3)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r-lg)', padding: 8, minWidth: 220,
                    zIndex: 200, boxShadow: '0 20px 60px rgba(0,0,0,0.65)',
                    animation: 'heroScaleIn 0.22s var(--ease-out) both',
                  }}>

                    {/* Moderator banner inside dropdown */}
                    {isMod && (
                      <div style={{ padding: '8px 12px', marginBottom: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🛡️</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Moderator</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Elevated privileges active</div>
                        </div>
                      </div>
                    )}

                    {/* User info */}
                    <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                      <div style={{ fontWeight: 650, fontSize: 14, letterSpacing: '-0.02em', marginBottom: 3 }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>@{user.username} · {user.role}</div>
                      {!isMod && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(111,95,232,0.12)', border: '1px solid rgba(111,95,232,0.25)', borderRadius: 100, padding: '2px 8px' }}>
                          ⚡ {user.karma} karma
                        </span>
                      )}
                    </div>

                    {/* Menu items — moderators don't see sessions */}
                    {[
                      { to: `/profile/${user.username}`, icon: '👤', label: 'My Profile', show: true },
                      { to: '/my-sessions',              icon: '📅', label: 'My Sessions', show: !isMod },
                      { to: '/mod',                      icon: '🛡️', label: 'Mod Panel',   show: isMod },
                    ].filter(i => i.show).map(item => (
                      <Link key={item.to} to={item.to}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, color: item.to === '/mod' ? '#f59e0b' : 'var(--text2)', transition: 'all 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = item.to === '/mod' ? 'rgba(245,158,11,0.08)' : 'var(--bg3)'; e.currentTarget.style.color = item.to === '/mod' ? '#f59e0b' : 'var(--text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = item.to === '/mod' ? '#f59e0b' : 'var(--text2)'; }}
                      >
                        <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
                      </Link>
                    ))}

                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                      <button onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', borderRadius: 'var(--r-sm)', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.08)'}
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
              <Link to="/login"  className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;