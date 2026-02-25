import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: searchParams.get('role') || 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at center, rgba(255,107,157,0.08) 0%, transparent 70%)' }}>
      <div style={{ width: '100%', maxWidth: 480 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚀</div>
          <h1 style={{ fontSize: 32, fontWeight: 800 }}>Create account</h1>
          <p style={{ color: 'var(--text2)', marginTop: 8 }}>Join the LearnHub community</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

          {/* Role selector */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {['student', 'teacher'].map(r => (
              <button key={r} type="button"
                onClick={() => setForm({ ...form, role: r })}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
                  background: form.role === r ? 'rgba(108,99,255,0.15)' : 'var(--bg3)',
                  border: form.role === r ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: form.role === r ? 'var(--accent)' : 'var(--text2)'
                }}>
                {r === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Full Name</label>
                <input className="form-control" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input className="form-control" placeholder="johndoe" value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} required />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={6} required />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : `Join as ${form.role} →`}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text2)', fontSize: 14 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;