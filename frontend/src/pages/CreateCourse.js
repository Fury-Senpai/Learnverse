import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', thumbnail: '', price: 0, category: 'General' });
  const [videos, setVideos] = useState([{ title: '', url: '', duration: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addVideo = () => setVideos([...videos, { title: '', url: '', duration: '' }]);
  const removeVideo = (i) => setVideos(videos.filter((_, idx) => idx !== i));
  const updateVideo = (i, field, value) => {
    const updated = [...videos];
    updated[i][field] = value;
    setVideos(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/courses`, { ...form, videos: videos.filter(v => v.title && v.url) });
      navigate(`/courses/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating course');
    } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80, maxWidth: 800 }}>
      <div className="page-header">
        <h1>Create Course <span className="gradient-text">✦</span></h1>
        <p>Share your knowledge with the world</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Course Info</h3>
          <div className="form-group">
            <label>Course Title *</label>
            <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Complete React Development" required />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will students learn?" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Price (USD) — 0 for free</label>
              <input className="form-control" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['General', 'Programming', 'Design', 'Business', 'Marketing', 'Science', 'Math', 'Language', 'Music', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Thumbnail URL</label>
            <input className="form-control" value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
          </div>
        </div>

        {/* Videos */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>Videos ({videos.length})</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addVideo}>+ Add Video</button>
          </div>

          {videos.map((v, i) => (
            <div key={i} style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)' }}>Video {i + 1}</span>
                {videos.length > 1 && (
                  <button type="button" onClick={() => removeVideo(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18 }}>×</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Title</label>
                  <input className="form-control" value={v.title} onChange={e => updateVideo(i, 'title', e.target.value)} placeholder="Video title" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Duration</label>
                  <input className="form-control" value={v.duration} onChange={e => updateVideo(i, 'duration', e.target.value)} placeholder="e.g. 12:30" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
                <label>YouTube / Cloudinary URL</label>
                <input className="form-control" value={v.url} onChange={e => updateVideo(i, 'url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? 'Creating...' : '🚀 Publish Course'}
        </button>
      </form>
    </div>
  );
};

export default CreateCourse;