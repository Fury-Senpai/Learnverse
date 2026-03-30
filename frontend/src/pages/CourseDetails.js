import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

/* ─── Helpers ─── */
const Stars = ({ value, onRate }) => (
  <div className="stars">
    {[1,2,3,4,5].map(s => (
      <span key={s} className={`star ${s <= value ? 'filled' : 'empty'}`}
        onClick={() => onRate && onRate(s)} style={{ cursor: onRate ? 'pointer' : 'default' }}>★</span>
    ))}
  </div>
);

const getEmbedUrl = (url) => {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (ytMatch) return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0` };
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  // Cloudinary / direct video
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: 'direct', src: url };
  // Fallback iframe
  return { type: 'iframe', src: url };
};

/* ─── Video Player ─── */
const VideoPlayer = ({ video }) => {
  const embed = getEmbedUrl(video?.url);
  if (!embed) return null;
  if (embed.type === 'direct') {
    return (
      <video
        key={video._id || video.url}
        controls autoPlay
        controlsList="nodownload"
        onContextMenu={e => e.preventDefault()}
        style={{ width: '100%', height: '100%', background: '#000', outline: 'none' }}
      >
        <source src={embed.src} />
        Your browser does not support video playback.
      </video>
    );
  }
  return (
    <iframe
      key={video._id || video.url}
      src={embed.src}
      style={{ width: '100%', height: '100%', border: 'none' }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      title={video.title}
    />
  );
};

/* ─── Video Edit Modal ─── */
const VideoModal = ({ video, onSave, onClose }) => {
  const [form, setForm] = useState({ title: video?.title || '', url: video?.url || '', duration: video?.duration || '' });
  const isNew = !video?._id;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 540, padding: 32 }}>
        <h3 style={{ fontWeight: 800, marginBottom: 24, fontSize: 20 }}>{isNew ? '+ Add Video' : '✏️ Edit Video'}</h3>
        <div className="form-group">
          <label>Video Title *</label>
          <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to React" />
        </div>
        <div className="form-group">
          <label>Video URL *</label>
          <input className="form-control" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="YouTube, Vimeo, Cloudinary, or direct .mp4 URL" />
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Supports YouTube, Vimeo, Cloudinary, and direct MP4/WebM links</div>
        </div>
        <div className="form-group">
          <label>Duration (optional)</label>
          <input className="form-control" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 12:30" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => form.title && form.url && onSave(form)} disabled={!form.title || !form.url}>
            {isNew ? 'Add Video' : 'Save Changes'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const CourseDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Owner management state
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({});
  const [videoModal, setVideoModal] = useState(null); // null | { video } | { isNew: true }
  const [deletingVideo, setDeletingVideo] = useState(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, commentsRes] = await Promise.all([
          axios.get(`${API}/courses/${id}`),
          axios.get(`${API}/courses/${id}/comments`)
        ]);
        setCourse(courseRes.data);
        setComments(commentsRes.data);
        setCourseForm({
          title: courseRes.data.title,
          description: courseRes.data.description,
          thumbnail: courseRes.data.thumbnail || '',
          price: courseRes.data.price,
          category: courseRes.data.category || 'General',
        });
        if (courseRes.data.videos?.length > 0) setActiveVideo(courseRes.data.videos[0]);
        if (user) {
          const accessRes = await axios.get(`${API}/payments/has-access/${id}`);
          setHasAccess(accessRes.data.hasAccess);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, [id, user]);

  const isOwner = user && course?.teacher?._id === user._id;
  const isFree = course?.price === 0;
  const canWatch = hasAccess || isFree || isOwner;

  /* ── Course Actions ── */
  const handleBuy = async () => {
    if (!user) { navigate('/login'); return; }
    setBuying(true);
    try {
      const res = await axios.post(`${API}/payments/checkout/course/${id}`);
      window.location.href = res.data.url;
    } catch (err) { alert(err.response?.data?.message || 'Payment error'); }
    finally { setBuying(false); }
  };

  const handleSaveCourse = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/courses/${id}`, courseForm);
      setCourse(prev => ({ ...prev, ...res.data }));
      setEditingCourse(false);
    } catch (err) { alert(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleDeleteCourse = async () => {
    try {
      await axios.delete(`${API}/courses/${id}`);
      navigate('/courses');
    } catch (err) { alert(err.response?.data?.message || 'Error deleting course'); }
  };

  /* ── Video Actions ── */
  const handleAddVideo = async (form) => {
    try {
      const res = await axios.post(`${API}/courses/${id}/videos`, form);
      setCourse(res.data);
      setActiveVideo(res.data.videos[res.data.videos.length - 1]);
      setVideoModal(null);
    } catch (err) { alert(err.response?.data?.message || 'Error adding video'); }
  };

  const handleUpdateVideo = async (videoId, form) => {
    try {
      const res = await axios.put(`${API}/courses/${id}/videos/${videoId}`, form);
      setCourse(res.data);
      // Update activeVideo if it was the one edited
      if (activeVideo?._id === videoId) {
        setActiveVideo(res.data.videos.find(v => v._id === videoId));
      }
      setVideoModal(null);
    } catch (err) { alert(err.response?.data?.message || 'Error updating video'); }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      const res = await axios.delete(`${API}/courses/${id}/videos/${videoId}`);
      setCourse(res.data);
      if (activeVideo?._id === videoId) {
        setActiveVideo(res.data.videos[0] || null);
      }
      setDeletingVideo(null);
    } catch (err) { alert(err.response?.data?.message || 'Error deleting video'); }
  };

  /* ── Comment ── */
  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/courses/${id}/comments`, { body: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch {}
  };

  const handleRate = async (rating) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/courses/${id}/rate`, { rating });
      setMyRating(rating);
      setCourse(prev => ({ ...prev, averageRating: res.data.averageRating }));
      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 2500);
    } catch (err) { alert(err.response?.data?.message || 'Error rating'); }
  };

  if (loading) return <div className="spinner" />;
  if (!course) return <div className="container" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text2)' }}>Course not found</div>;

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* ─── Modals ─── */}
      {videoModal && (
        <VideoModal
          video={videoModal.isNew ? null : videoModal.video}
          onSave={videoModal.isNew
            ? (form) => handleAddVideo(form)
            : (form) => handleUpdateVideo(videoModal.video._id, form)
          }
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Confirm delete video */}
      {deletingVideo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ maxWidth: 400, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Video?</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
              "<strong>{deletingVideo.title}</strong>" will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={() => handleDeleteVideo(deletingVideo._id)}>Yes, Delete</button>
              <button className="btn btn-secondary" onClick={() => setDeletingVideo(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete course */}
      {confirmDeleteCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Entire Course?</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 6 }}>This will permanently delete:</p>
            <ul style={{ color: 'var(--error)', fontSize: 14, listStyle: 'none', marginBottom: 24, lineHeight: 2 }}>
              <li>🎬 All {course.videos?.length || 0} videos</li>
              <li>💬 All comments</li>
              <li>📚 The course listing</li>
            </ul>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={handleDeleteCourse}>Yes, Delete Course</button>
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteCourse(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '40px 24px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'start' }}>
          <div>
            {editingCourse ? (
              /* ── Edit Course Form ── */
              <div>
                <h2 style={{ fontWeight: 800, marginBottom: 20 }}>Edit Course</h2>
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-control" value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} style={{ minHeight: 100 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input className="form-control" type="number" min="0" step="0.01" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select className="form-control" value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}>
                      {['General','Programming','Design','Business','Marketing','Science','Math','Language','Music','Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Thumbnail URL</label>
                  <input className="form-control" value={courseForm.thumbnail} onChange={e => setCourseForm({ ...courseForm, thumbnail: e.target.value })} placeholder="https://..." />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={handleSaveCourse} disabled={saving}>{saving ? 'Saving...' : '✓ Save Changes'}</button>
                  <button className="btn btn-secondary" onClick={() => setEditingCourse(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              /* ── Normal Header View ── */
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-cyan">{course.category || 'General'}</span>
                  <span className={`badge ${isFree ? 'badge-success' : 'badge-accent'}`}>{isFree ? 'FREE' : `₹${course.price}`}</span>
                  {isOwner && <span className="badge badge-pink">👑 Your Course</span>}
                </div>
                <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>{course.title}</h1>
                <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>{course.description}</p>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14, color: 'var(--text2)' }}>
                  <span>👨‍🏫 by @{course.teacher?.username}</span>
                  <span>⭐ {Number(course.averageRating || 0).toFixed(1)} rating</span>
                  <span>👥 {course.totalStudents || 0} students</span>
                  <span>🎬 {course.videos?.length || 0} videos</span>
                </div>
                {/* Owner action buttons */}
                {isOwner && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingCourse(true)}>✏️ Edit Course Info</button>
                    <button className="btn btn-sm" style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', color: 'var(--error)' }}
                      onClick={() => setConfirmDeleteCourse(true)}>🗑️ Delete Course</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Buy / Access box ── */}
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            {course.thumbnail && (
              <img src={course.thumbnail} alt={course.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />
            )}
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 16, color: isFree ? 'var(--success)' : 'var(--text)' }}>
              {isFree ? 'Free' : `₹${course.price}`}
            </div>
            {isOwner ? (
              <div className="alert alert-success">👑 You own this course</div>
            ) : canWatch ? (
              <div className="alert alert-success">✅ You have access to this course</div>
            ) : (
              <button className="btn btn-primary btn-full btn-lg" onClick={handleBuy} disabled={buying}>
                {buying ? 'Redirecting...' : `Enroll Now — ₹${course.price}`}
              </button>
            )}
            {canWatch && !isOwner && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Rate this course:</div>
                <Stars value={myRating} onRate={handleRate} />
                {ratingSuccess && <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>Rating submitted! ✓</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="container" style={{ paddingTop: 40, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }}>
        <div>
          {/* ── Video Player ── */}
          {activeVideo && canWatch && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000',
                marginBottom: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}>
                <VideoPlayer video={activeVideo} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: 18 }}>{activeVideo.title}</h3>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setVideoModal({ video: activeVideo })}>✏️ Edit</button>
                    <button className="btn btn-sm" style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', color: 'var(--error)' }}
                      onClick={() => setDeletingVideo(activeVideo)}>🗑️ Delete</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Locked preview */}
          {!canWatch && course.videos?.length > 0 && (
            <div style={{ aspectRatio: '16/9', borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 12 }}>
              <div style={{ fontSize: 64 }}>🔒</div>
              <p style={{ color: 'var(--text2)' }}>Purchase this course to unlock all videos</p>
              <button className="btn btn-primary" onClick={handleBuy} disabled={buying}>
                {buying ? 'Redirecting...' : `Enroll for ₹${course.price}`}
              </button>
            </div>
          )}

          {/* ── Video List ── */}
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>Course Content ({course.videos?.length || 0} videos)</h3>
              {isOwner && (
                <button className="btn btn-primary btn-sm" onClick={() => setVideoModal({ isNew: true })}>+ Add Video</button>
              )}
            </div>

            {course.videos?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text2)', fontSize: 14 }}>
                {isOwner ? 'No videos yet. Add your first video!' : 'No videos added yet.'}
              </div>
            )}

            {course.videos?.map((v, i) => {
              const isActive = activeVideo?._id === v._id || activeVideo === v;
              return (
                <div key={v._id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderRadius: 8, marginBottom: 4, cursor: canWatch ? 'pointer' : 'default',
                  background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(108,99,255,0.35)' : '1px solid transparent',
                  transition: 'all 0.15s'
                }}
                  onClick={() => canWatch && setActiveVideo(v)}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Play icon */}
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: isActive ? 'var(--accent)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: isActive ? '#fff' : canWatch ? 'var(--accent)' : 'var(--text3)' }}>
                    {canWatch ? (isActive ? '▶' : `${i + 1}`) : '🔒'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text)' }}>
                      {v.title}
                    </div>
                    {v.duration && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>⏱ {v.duration}</div>}
                  </div>
                  {/* Owner controls per row */}
                  {isOwner && (
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', color: 'var(--accent)' }}
                        onClick={() => setVideoModal({ video: v })}
                      >✏️</button>
                      <button
                        className="btn btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.25)', color: 'var(--error)' }}
                        onClick={() => setDeletingVideo(v)}
                      >🗑️</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Comments ── */}
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>Comments ({comments.length})</h3>
            {user && (
              <form onSubmit={handleComment} style={{ marginBottom: 24 }}>
                <textarea className="form-control" value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this course..." style={{ marginBottom: 12 }} required />
                <button className="btn btn-primary btn-sm" type="submit">Post Comment</button>
              </form>
            )}
            {!user && (
              <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--bg3)', borderRadius: 8, fontSize: 14, color: 'var(--text2)' }}>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: 14, padding: 0 }}>Sign in</button> to leave a comment
              </div>
            )}
            {comments.map(c => (
              <div key={c._id} className="card" style={{ marginBottom: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>@{c.author?.username}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>About the Teacher</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, cursor: 'pointer' }}
              onClick={() => navigate(`/profile/${course.teacher?.username}`)}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                {course.teacher?.name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{course.teacher?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--accent)' }}>@{course.teacher?.username}</div>
              </div>
            </div>
            {course.teacher?.bio && <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>{course.teacher.bio}</p>}
          </div>

          {/* Navigation helpers */}
          {canWatch && course.videos?.length > 1 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Navigation</h4>
              {(() => {
                const idx = course.videos.findIndex(v => v._id === activeVideo?._id);
                const prev = course.videos[idx - 1];
                const next = course.videos[idx + 1];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {prev && (
                      <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => setActiveVideo(prev)}>
                        ← {prev.title}
                      </button>
                    )}
                    {next && (
                      <button className="btn btn-primary btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => setActiveVideo(next)}>
                        → {next.title}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;