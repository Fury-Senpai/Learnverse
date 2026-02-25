import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

const QA = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', tags: '' });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/qa/questions`)
      .then(res => setQuestions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleVote = async (id, type) => {
    if (!user) { navigate('/login'); return; }
    try {
      await axios.post(`${API}/qa/questions/${id}/vote`, { type });
      const res = await axios.get(`${API}/qa/questions`);
      setQuestions(res.data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/qa/questions`, {
        title: form.title, body: form.body,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setQuestions([res.data, ...questions]);
      setForm({ title: '', body: '', tags: '' });
      setShowForm(false);
    } catch {}
  };

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div className="page-header" style={{ padding: 0, marginBottom: 0 }}>
          <h1>Q&amp;A Community <span className="gradient-text">✦</span></h1>
          <p>Ask questions, share knowledge, earn karma</p>
        </div>
        <button className="btn btn-primary" onClick={() => { if (!user) navigate('/login'); else setShowForm(!showForm); }}>
          + Ask Question
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 32 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Ask a Question</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What's your question?" required />
            </div>
            <div className="form-group">
              <label>Details</label>
              <textarea className="form-control" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Explain your question in detail..." required />
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input className="form-control" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="react, javascript, hooks" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit">Post Question</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner" /> : (
        questions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 80 }}>No questions yet. Be the first to ask!</div>
        ) : (
          questions.map(q => (
            <div key={q._id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                {/* Votes */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                  <button onClick={() => handleVote(q._id, 'up')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--success)', fontSize: 14 }}>▲</button>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{q.upvotes.length - q.downvotes.length}</span>
                  <button onClick={() => handleVote(q._id, 'down')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--error)', fontSize: 14 }}>▼</button>
                </div>
                {/* Content */}
                <div style={{ flex: 1 }}>
                  <Link to={`/qa/${q._id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{q.title}</h3>
                  </Link>
                  <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.body}</p>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    {q.tags?.map(t => <span key={t} className="badge badge-cyan" style={{ fontSize: 11 }}>{t}</span>)}
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text2)' }}>
                      💬 {q.answerCount} answers · @{q.author?.username} · ⚡{q.author?.karma}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
};

export default QA;