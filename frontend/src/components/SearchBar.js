import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const ref = useRef();

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length < 2) { setResults(null); return; }
      setLoading(true);
      try {
        const res = await axios.get(`${API}/search?q=${query}`);
        setResults(res.data);
      } catch {} finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setResults(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search courses, users..."
        style={{
          width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 16px', color: 'var(--text)', fontFamily: 'inherit',
          fontSize: 14, outline: 'none'
        }}
        onFocus={() => query.length >= 2 && setResults(results)}
      />
      {(results || loading) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 8, zIndex: 200, maxHeight: 360, overflowY: 'auto'
        }}>
          {loading && <div style={{ padding: '12px', color: 'var(--text2)', fontSize: 14 }}>Searching...</div>}
          {results && (
            <>
              {results.courses.length > 0 && (
                <div>
                  <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Courses</div>
                  {results.courses.map(c => (
                    <button key={c._id} onClick={() => { navigate(`/courses/${c._id}`); setResults(null); setQuery(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}>
                      <span style={{ fontSize: 16 }}>📚</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{c.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>by {c.teacher?.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Users</div>
                  {results.users.map(u => (
                    <button key={u._id} onClick={() => { navigate(`/profile/${u.username}`); setResults(null); setQuery(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}>
                      <span style={{ fontSize: 16 }}>👤</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>@{u.username}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{u.role} · ⚡{u.karma}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.courses.length === 0 && results.users.length === 0 && (
                <div style={{ padding: '12px', color: 'var(--text2)', fontSize: 14 }}>No results found</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;