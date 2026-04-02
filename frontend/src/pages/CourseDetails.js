import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

/* ─── Stars ─── */
const Stars = ({ value, onRate }) => (
  <div className="stars">
    {[1,2,3,4,5].map(s => (
      <span key={s} className={`star ${s <= value ? 'filled' : 'empty'}`}
        onClick={() => onRate && onRate(s)} style={{ cursor: onRate ? 'pointer' : 'default' }}>★</span>
    ))}
  </div>
);

/* ─── Video embed helper ─── */
const getEmbedUrl = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt)   return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` };
  const vm  = url.match(/vimeo\.com\/(\d+)/);
  if (vm)   return { type: 'vimeo',   src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: 'direct', src: url };
  return { type: 'iframe', src: url };
};

/* ─── Video Player ─── */
const VideoPlayer = ({ video }) => {
  const embed = getEmbedUrl(video?.url);
  if (!embed) return null;
  if (embed.type === 'direct') {
    return (
      <video key={video._id || video.url} controls autoPlay controlsList="nodownload"
        onContextMenu={e => e.preventDefault()}
        style={{ width:'100%', height:'100%', background:'#000', outline:'none' }}>
        <source src={embed.src} />
      </video>
    );
  }
  return (
    <iframe key={video._id || video.url} src={embed.src}
      style={{ width:'100%', height:'100%', border:'none' }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen title={video.title} />
  );
};

/* ─── Video Edit Modal ─── */
const VideoModal = ({ video, onSave, onClose }) => {
  const [form, setForm] = useState({ title: video?.title||'', url: video?.url||'', duration: video?.duration||'' });
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="card" style={{ width:'100%', maxWidth:520, padding:32 }}>
        <h3 style={{ fontWeight:800, marginBottom:24 }}>{!video?._id ? '+ Add Video' : '✏️ Edit Video'}</h3>
        <div className="form-group">
          <label>Video Title *</label>
          <input className="form-control" value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. Introduction to React" />
        </div>
        <div className="form-group">
          <label>Video URL *</label>
          <input className="form-control" value={form.url} onChange={e => setForm({...form, url:e.target.value})} placeholder="YouTube, Vimeo, or direct .mp4 URL" />
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>Supports YouTube, Vimeo, Cloudinary, direct MP4/WebM</div>
        </div>
        <div className="form-group">
          <label>Duration (optional)</label>
          <input className="form-control" value={form.duration} onChange={e => setForm({...form, duration:e.target.value})} placeholder="e.g. 12:30" />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary" onClick={() => form.title && form.url && onSave(form)} disabled={!form.title||!form.url}>
            {!video?._id ? 'Add Video' : 'Save Changes'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   POLL COMPONENTS
═══════════════════════════════════════ */

/* ─── Create Poll Modal ─── */
const PollModal = ({ onSave, onClose }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const setOption = (i, field, val) => setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  const setCorrect = (i) => setOptions(prev => prev.map((o, idx) => ({ ...o, isCorrect: idx === i })));
  const addOption  = () => options.length < 6 && setOptions(prev => [...prev, { text:'', isCorrect:false }]);
  const removeOpt  = (i) => options.length > 2 && setOptions(prev => prev.filter((_,idx) => idx !== i));

  const valid = question.trim() && options.filter(o => o.text.trim()).length >= 2 && options.some(o => o.isCorrect);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24, overflowY:'auto' }}>
      <div className="card" style={{ width:'100%', maxWidth:560, padding:32, my:24 }}>
        <h3 style={{ fontWeight:800, marginBottom:6 }}>📊 Create Poll</h3>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:24 }}>Students will answer this MCQ. Mark the correct option — it will be hidden until you reveal it.</p>

        <div className="form-group">
          <label>Question *</label>
          <input className="form-control" value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. What is the output of console.log(typeof null)?" />
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text3)' }}>Options (select the correct one)</label>
            {options.length < 6 && (
              <button onClick={addOption} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--accent)', fontWeight:600, fontFamily:'var(--font-body)' }}>+ Add option</button>
            )}
          </div>
          {options.map((opt, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
              {/* Correct radio */}
              <button onClick={() => setCorrect(i)} title="Mark as correct answer"
                style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, border:`2px solid ${opt.isCorrect ? 'var(--success)' : 'var(--border2)'}`, background: opt.isCorrect ? 'rgba(15,212,124,0.15)' : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                {opt.isCorrect && <span style={{ fontSize:14, color:'var(--success)' }}>✓</span>}
              </button>
              <input className="form-control" value={opt.text}
                onChange={e => setOption(i, 'text', e.target.value)}
                placeholder={`Option ${String.fromCharCode(65+i)}`}
                style={{ flex:1, borderColor: opt.isCorrect ? 'rgba(15,212,124,0.4)' : undefined }}
              />
              {options.length > 2 && (
                <button onClick={() => removeOpt(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:16, padding:'0 4px', transition:'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='var(--error)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--text3)'}
                >✕</button>
              )}
            </div>
          ))}
        </div>

        {!options.some(o => o.isCorrect) && (
          <div style={{ fontSize:12, color:'var(--warning)', marginBottom:14 }}>⚠ Please mark the correct answer</div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary" onClick={() => valid && onSave({ question, options: options.filter(o => o.text.trim()) })} disabled={!valid}>
            📊 Create Poll
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Poll Card (student + teacher view) ─── */
const PollCard = ({ poll, userId, isOwner, onVote, onReveal, onClose, onDelete }) => {
  const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
  const myVote     = poll.options.find(o => o.votes?.some(v => (v._id||v).toString() === userId?.toString()));
  const hasVoted   = !!myVote;

  const optColor = (opt) => {
    if (!poll.revealed) return hasVoted && myVote?._id === opt._id ? 'var(--accent)' : 'var(--border2)';
    if (opt.isCorrect)  return 'var(--success)';
    if (myVote?._id === opt._id && !opt.isCorrect) return 'var(--error)';
    return 'var(--border2)';
  };
  const optBg = (opt) => {
    if (!poll.revealed) return hasVoted && myVote?._id === opt._id ? 'rgba(111,95,232,0.08)' : 'var(--bg3)';
    if (opt.isCorrect)  return 'rgba(15,212,124,0.08)';
    if (myVote?._id === opt._id && !opt.isCorrect) return 'rgba(244,63,94,0.08)';
    return 'var(--bg3)';
  };

  return (
    <div className="card" style={{ marginBottom:16, padding:'20px 22px', borderColor: poll.closed ? 'var(--border)' : 'rgba(111,95,232,0.25)' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:16 }}>
        <div>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.06em', color:'var(--accent)', background:'rgba(111,95,232,0.1)', border:'1px solid rgba(111,95,232,0.25)', borderRadius:100, padding:'2px 9px' }}>📊 POLL</span>
            {poll.closed && <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:100, padding:'2px 8px' }}>Closed</span>}
            {poll.revealed && !poll.closed && <span style={{ fontSize:11, fontWeight:600, color:'var(--success)', background:'rgba(15,212,124,0.1)', border:'1px solid rgba(15,212,124,0.25)', borderRadius:100, padding:'2px 8px' }}>Answer revealed</span>}
          </div>
          <h4 style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.4 }}>{poll.question}</h4>
        </div>
        {isOwner && (
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            {!poll.revealed && (
              <button onClick={() => onReveal(poll._id)} className="btn btn-sm"
                style={{ background:'rgba(15,212,124,0.1)', border:'1px solid rgba(15,212,124,0.3)', color:'var(--success)', fontSize:12 }}>
                Show Answer
              </button>
            )}
            {!poll.closed && (
              <button onClick={() => onClose(poll._id)} className="btn btn-secondary btn-sm" style={{ fontSize:12 }}>
                Close Poll
              </button>
            )}
            <button onClick={() => onDelete(poll._id)}
              style={{ padding:'6px 8px', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', borderRadius:6, transition:'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--error)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--text3)'}
            >🗑</button>
          </div>
        )}
      </div>

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {poll.options.map((opt, i) => {
          const pct    = totalVotes > 0 ? Math.round((opt.votes?.length || 0) / totalVotes * 100) : 0;
          const isMyV  = myVote?._id === opt._id || myVote?.text === opt.text;
          const canClick = !hasVoted && !poll.closed && userId;

          return (
            <div key={opt._id || i}
              onClick={() => canClick && onVote(poll._id, opt._id)}
              style={{
                borderRadius:10, border:`1.5px solid ${optColor(opt)}`,
                background: optBg(opt),
                padding:'11px 14px',
                cursor: canClick ? 'pointer' : 'default',
                transition:'all 0.18s',
                position:'relative', overflow:'hidden',
              }}
              onMouseEnter={e => { if (canClick) e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { if (canClick) e.currentTarget.style.borderColor = optColor(opt); }}
            >
              {/* Progress fill */}
              {(hasVoted || isOwner) && (
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background: opt.isCorrect && poll.revealed ? 'rgba(15,212,124,0.12)' : 'rgba(111,95,232,0.08)', transition:'width 0.5s var(--ease-out)', zIndex:0 }} />
              )}

              <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
                {/* Option letter circle */}
                <div style={{
                  width:26, height:26, borderRadius:'50%', flexShrink:0,
                  background: poll.revealed ? (opt.isCorrect ? 'rgba(15,212,124,0.2)' : isMyV ? 'rgba(244,63,94,0.15)' : 'var(--bg3)') : isMyV ? 'rgba(111,95,232,0.2)' : 'var(--bg3)',
                  border:`1px solid ${poll.revealed ? (opt.isCorrect ? 'rgba(15,212,124,0.4)' : isMyV ? 'rgba(244,63,94,0.3)' : 'var(--border)') : isMyV ? 'rgba(111,95,232,0.4)' : 'var(--border)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700,
                  color: poll.revealed ? (opt.isCorrect ? 'var(--success)' : isMyV ? 'var(--error)' : 'var(--text3)') : isMyV ? 'var(--accent)' : 'var(--text3)',
                }}>
                  {poll.revealed
                    ? (opt.isCorrect ? '✓' : isMyV ? '✗' : String.fromCharCode(65+i))
                    : (isMyV ? '●' : String.fromCharCode(65+i))
                  }
                </div>

                <span style={{ flex:1, fontSize:14, fontWeight: isMyV ? 600 : 400, color:'var(--text)' }}>{opt.text}</span>

                {/* Vote count / pct */}
                {(hasVoted || isOwner) && (
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)', flexShrink:0 }}>{pct}%</span>
                )}

                {/* Correct/wrong indicator */}
                {poll.revealed && isMyV && (
                  <span style={{ fontSize:18, flexShrink:0 }}>{opt.isCorrect ? '🎉' : '❌'}</span>
                )}
                {poll.revealed && opt.isCorrect && !isMyV && hasVoted && (
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--success)', flexShrink:0 }}>Correct answer</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{totalVotes} {totalVotes===1?'vote':'votes'}</span>
        {!hasVoted && !poll.closed && userId && !isOwner && (
          <span style={{ fontSize:12, color:'var(--text3)', fontStyle:'italic' }}>Select an option to vote</span>
        )}
        {hasVoted && !poll.revealed && (
          <span style={{ fontSize:12, color:'var(--text2)' }}>Waiting for teacher to reveal answer...</span>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   NOTE/ASSIGNMENT CARD
═══════════════════════════════════════ */
const NoteCard = ({ note, isOwner, onDelete }) => {
  const typeCfg = {
    note:       { icon:'📄', label:'Notes',      color:'var(--accent)',  bg:'rgba(111,95,232,0.1)',  border:'rgba(111,95,232,0.25)' },
    assignment: { icon:'📝', label:'Assignment', color:'var(--accent2)', bg:'rgba(232,95,138,0.1)',  border:'rgba(232,95,138,0.25)' },
    resource:   { icon:'🔗', label:'Resource',   color:'var(--accent3)', bg:'rgba(34,211,238,0.1)',  border:'rgba(34,211,238,0.25)' },
  }[note.type] || {};

  const isOverdue = note.dueDate && new Date(note.dueDate) < new Date() && note.type === 'assignment';

  return (
    <div className="card" style={{ padding:'16px 20px', display:'flex', gap:14, alignItems:'center', marginBottom:10 }}>
      {/* Type icon */}
      <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:typeCfg.bg, border:`1px solid ${typeCfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
        {typeCfg.icon}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
          <span style={{ fontWeight:650, fontSize:14, letterSpacing:'-0.01em', color:'var(--text)' }}>{note.title}</span>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', padding:'1px 7px', borderRadius:100, background:typeCfg.bg, color:typeCfg.color, border:`1px solid ${typeCfg.border}` }}>{typeCfg.label}</span>
          {note.dueDate && (
            <span style={{ fontSize:11, color: isOverdue ? 'var(--error)' : 'var(--warning)', fontWeight:500 }}>
              {isOverdue ? '⚠ Overdue · ' : '📅 Due '}{new Date(note.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
            </span>
          )}
        </div>
        {note.description && <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5, margin:0 }}>{note.description}</p>}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
        <a href={note.driveUrl} target="_blank" rel="noreferrer"
          style={{ padding:'7px 14px', borderRadius:'var(--r-sm)', background:'rgba(111,95,232,0.1)', border:'1px solid rgba(111,95,232,0.3)', color:'var(--accent)', fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:5, transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(111,95,232,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(111,95,232,0.1)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open
        </a>
        {isOwner && (
          <button onClick={() => onDelete(note._id)}
            style={{ padding:'7px 10px', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', borderRadius:6, transition:'color 0.15s', fontSize:14 }}
            onMouseEnter={e => e.currentTarget.style.color='var(--error)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text3)'}
          >🗑</button>
        )}
      </div>
    </div>
  );
};

/* ─── Add Note Modal ─── */
const NoteModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ title:'', type:'note', driveUrl:'', description:'', dueDate:'' });
  const valid = form.title.trim() && form.driveUrl.trim();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="card" style={{ width:'100%', maxWidth:520, padding:32 }}>
        <h3 style={{ fontWeight:800, marginBottom:6 }}>📎 Add Notes / Assignment</h3>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:24 }}>Share a Google Drive link — notes, slides, PDFs, or assignments.</p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group">
            <label>Title *</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Week 1 Notes" />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-control" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
              <option value="note">📄 Notes</option>
              <option value="assignment">📝 Assignment</option>
              <option value="resource">🔗 Resource</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Google Drive / URL *</label>
          <input className="form-control" value={form.driveUrl} onChange={e => setForm({...form,driveUrl:e.target.value})} placeholder="https://drive.google.com/file/d/..." />
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>
            Tip: In Google Drive → Share → "Anyone with the link can view" → Copy link
          </div>
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <input className="form-control" value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Brief description..." />
        </div>

        {form.type === 'assignment' && (
          <div className="form-group">
            <label>Due Date (optional)</label>
            <input className="form-control" type="date" value={form.dueDate} onChange={e => setForm({...form,dueDate:e.target.value})} />
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary" onClick={() => valid && onSave(form)} disabled={!valid}>📎 Add</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
const CourseDetails = () => {
  const { id }      = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [course,        setCourse]        = useState(null);
  const [hasAccess,     setHasAccess]     = useState(false);
  const [comments,      setComments]      = useState([]);
  const [newComment,    setNewComment]    = useState('');
  const [activeVideo,   setActiveVideo]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [buying,        setBuying]        = useState(false);
  const [myRating,      setMyRating]      = useState(0);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [activeTab,     setActiveTab]     = useState('content'); // content | polls | notes

  // Polls
  const [polls,         setPolls]         = useState([]);
  const [showPollModal, setShowPollModal] = useState(false);

  // Notes
  const [notes,         setNotes]         = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Owner editing state
  const [editingCourse,   setEditingCourse]   = useState(false);
  const [courseForm,      setCourseForm]       = useState({});
  const [videoModal,      setVideoModal]       = useState(null);
  const [deletingVideo,   setDeletingVideo]    = useState(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
  const [saving,          setSaving]           = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, commentsRes] = await Promise.all([
          axios.get(`${API}/courses/${id}`),
          axios.get(`${API}/courses/${id}/comments`),
        ]);
        setCourse(courseRes.data);
        setComments(commentsRes.data);
        setCourseForm({ title:courseRes.data.title, description:courseRes.data.description, thumbnail:courseRes.data.thumbnail||'', price:courseRes.data.price, category:courseRes.data.category||'General' });
        if (courseRes.data.videos?.length > 0) setActiveVideo(courseRes.data.videos[0]);
        if (user) {
          const accessRes = await axios.get(`${API}/payments/has-access/${id}`);
          setHasAccess(accessRes.data.hasAccess);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, [id, user]);

  // Load polls & notes when tab opens (or when access granted)
  useEffect(() => {
    if (!user || (!hasAccess && !isOwner)) return;
    if (activeTab === 'polls') {
      axios.get(`${API}/polls/${id}`).then(r => setPolls(r.data)).catch(() => {});
    }
    if (activeTab === 'notes') {
      axios.get(`${API}/polls/${id}/notes`).then(r => setNotes(r.data)).catch(() => {});
    }
  }, [activeTab, id, user, hasAccess]);

  const isOwner  = user && course?.teacher?._id === user._id;
  const isFree   = course?.price === 0;
  const canWatch = hasAccess || isFree || isOwner;

  /* ── Course actions ── */
  const handleBuy = async () => {
    if (!user) { navigate('/login'); return; }
    setBuying(true);
    try { const r = await axios.post(`${API}/payments/checkout/course/${id}`); window.location.href = r.data.url; }
    catch (err) { alert(err.response?.data?.message || 'Payment error'); }
    finally { setBuying(false); }
  };

  const handleSaveCourse = async () => {
    setSaving(true);
    try { const r = await axios.put(`${API}/courses/${id}`, courseForm); setCourse(p => ({...p,...r.data})); setEditingCourse(false); }
    catch (err) { alert(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleDeleteCourse = async () => {
    try { await axios.delete(`${API}/courses/${id}`); navigate('/courses'); }
    catch (err) { alert(err.response?.data?.message || 'Error deleting course'); }
  };

  /* ── Video actions ── */
  const handleAddVideo = async (form) => {
    const r = await axios.post(`${API}/courses/${id}/videos`, form);
    setCourse(r.data); setActiveVideo(r.data.videos.at(-1)); setVideoModal(null);
  };
  const handleUpdateVideo = async (vid, form) => {
    const r = await axios.put(`${API}/courses/${id}/videos/${vid}`, form);
    setCourse(r.data); if (activeVideo?._id === vid) setActiveVideo(r.data.videos.find(v => v._id === vid)); setVideoModal(null);
  };
  const handleDeleteVideo = async (vid) => {
    const r = await axios.delete(`${API}/courses/${id}/videos/${vid}`);
    setCourse(r.data); if (activeVideo?._id === vid) setActiveVideo(r.data.videos[0]||null); setDeletingVideo(null);
  };

  /* ── Comment ── */
  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    const r = await axios.post(`${API}/courses/${id}/comments`, { body: newComment });
    setComments([r.data, ...comments]); setNewComment('');
  };
  const handleRate = async (rating) => {
    if (!user) { navigate('/login'); return; }
    const r = await axios.post(`${API}/courses/${id}/rate`, { rating });
    setMyRating(rating); setCourse(p => ({...p, averageRating:r.data.averageRating}));
    setRatingSuccess(true); setTimeout(() => setRatingSuccess(false), 2500);
  };

  /* ── Poll actions ── */
  const handleCreatePoll = async (form) => {
    const r = await axios.post(`${API}/polls/${id}`, form);
    setPolls(p => [r.data, ...p]); setShowPollModal(false);
  };
  const handleVote = async (pollId, optionId) => {
    const r = await axios.put(`${API}/polls/${pollId}/vote`, { optionId });
    setPolls(p => p.map(poll => poll._id === pollId ? r.data : poll));
  };
  const handleReveal = async (pollId) => {
    const r = await axios.put(`${API}/polls/${pollId}/reveal`);
    setPolls(p => p.map(poll => poll._id === pollId ? r.data : poll));
  };
  const handleClosePoll = async (pollId) => {
    const r = await axios.put(`${API}/polls/${pollId}/close`);
    setPolls(p => p.map(poll => poll._id === pollId ? r.data : poll));
  };
  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    await axios.delete(`${API}/polls/${pollId}`);
    setPolls(p => p.filter(poll => poll._id !== pollId));
  };

  /* ── Note actions ── */
  const handleAddNote = async (form) => {
    const r = await axios.post(`${API}/polls/${id}/notes`, form);
    setNotes(p => [r.data, ...p]); setShowNoteModal(false);
  };
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    await axios.delete(`${API}/polls/${id}/notes/${noteId}`);
    setNotes(p => p.filter(n => n._id !== noteId));
  };

  /* ── Tab style helper ── */
  const tabStyle = (t) => ({
    padding:'8px 18px', borderRadius:'var(--r-md)', border:'none', cursor:'pointer',
    fontFamily:'var(--font-body)', fontWeight:600, fontSize:13, letterSpacing:'-0.01em',
    background: activeTab===t ? 'var(--accent)' : 'transparent',
    color: activeTab===t ? '#fff' : 'var(--text2)',
    boxShadow: activeTab===t ? '0 2px 12px rgba(111,95,232,0.3)' : 'none',
    transition:'all 0.18s',
  });

  if (loading) return <div className="spinner" />;
  if (!course)  return <div className="container" style={{ paddingTop:80, textAlign:'center', color:'var(--text2)' }}>Course not found</div>;

  return (
    <div style={{ paddingBottom:80 }}>

      {/* ── Modals ── */}
      {showPollModal && <PollModal onSave={handleCreatePoll} onClose={() => setShowPollModal(false)} />}
      {showNoteModal && <NoteModal onSave={handleAddNote}   onClose={() => setShowNoteModal(false)} />}

      {videoModal && (
        <VideoModal
          video={videoModal.isNew ? null : videoModal.video}
          onSave={videoModal.isNew ? handleAddVideo : (form) => handleUpdateVideo(videoModal.video._id, form)}
          onClose={() => setVideoModal(null)}
        />
      )}

      {deletingVideo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div className="card" style={{ maxWidth:380, padding:32, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🗑️</div>
            <h3 style={{ fontWeight:700, marginBottom:8 }}>Delete Video?</h3>
            <p style={{ color:'var(--text2)', marginBottom:24 }}>"{deletingVideo.title}" will be permanently removed.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-danger" onClick={() => handleDeleteVideo(deletingVideo._id)}>Yes, Delete</button>
              <button className="btn btn-secondary" onClick={() => setDeletingVideo(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteCourse && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div className="card" style={{ maxWidth:420, padding:32, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
            <h3 style={{ fontWeight:700, marginBottom:8 }}>Delete Entire Course?</h3>
            <p style={{ color:'var(--text2)', marginBottom:24 }}>This will permanently delete all videos, comments, polls and notes.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-danger" onClick={handleDeleteCourse}>Yes, Delete Course</button>
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteCourse(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'40px 24px' }}>
        <div className="container" style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:48, alignItems:'start' }}>
          <div>
            {editingCourse ? (
              <div>
                <h2 style={{ fontWeight:800, marginBottom:20 }}>Edit Course</h2>
                <div className="form-group"><label>Title</label><input className="form-control" value={courseForm.title} onChange={e => setCourseForm({...courseForm,title:e.target.value})} /></div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={courseForm.description} onChange={e => setCourseForm({...courseForm,description:e.target.value})} style={{ minHeight:100 }} /></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group"><label>Price (₹)</label><input className="form-control" type="number" min="0" value={courseForm.price} onChange={e => setCourseForm({...courseForm,price:parseFloat(e.target.value)||0})} /></div>
                  <div className="form-group"><label>Category</label>
                    <select className="form-control" value={courseForm.category} onChange={e => setCourseForm({...courseForm,category:e.target.value})}>
                      {['General','Programming','Design','Business','Marketing','Science','Math','Language','Music','Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Thumbnail URL</label><input className="form-control" value={courseForm.thumbnail} onChange={e => setCourseForm({...courseForm,thumbnail:e.target.value})} placeholder="https://..." /></div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-primary" onClick={handleSaveCourse} disabled={saving}>{saving?'Saving...':'✓ Save Changes'}</button>
                  <button className="btn btn-secondary" onClick={() => setEditingCourse(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                  <span className="badge badge-cyan">{course.category||'General'}</span>
                  <span className={`badge ${isFree?'badge-success':'badge-accent'}`}>{isFree?'FREE':`₹${course.price}`}</span>
                  {isOwner && <span className="badge badge-pink">👑 Your Course</span>}
                </div>
                <h1 style={{ fontSize:34, fontWeight:800, lineHeight:1.2, marginBottom:16 }}>{course.title}</h1>
                <p style={{ color:'var(--text2)', fontSize:16, lineHeight:1.7, marginBottom:24 }}>{course.description}</p>
                <div style={{ display:'flex', gap:24, flexWrap:'wrap', fontSize:14, color:'var(--text2)' }}>
                  <span>👨‍🏫 by @{course.teacher?.username}</span>
                  <span>⭐ {Number(course.averageRating||0).toFixed(1)}</span>
                  <span>👥 {course.totalStudents||0} students</span>
                  <span>🎬 {course.videos?.length||0} videos</span>
                  {polls.length > 0 && <span>📊 {polls.length} polls</span>}
                  {notes.length > 0 && <span>📄 {notes.length} resources</span>}
                </div>
                {isOwner && (
                  <div style={{ display:'flex', gap:10, marginTop:20, flexWrap:'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingCourse(true)}>✏️ Edit Info</button>
                    <button className="btn btn-sm" style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', color:'var(--error)' }} onClick={() => setConfirmDeleteCourse(true)}>🗑️ Delete Course</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buy box */}
          <div className="card" style={{ position:'sticky', top:80 }}>
            {course.thumbnail && <img src={course.thumbnail} alt={course.title} style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
            <div style={{ fontSize:32, fontWeight:800, marginBottom:16, color:isFree?'var(--success)':'var(--text)' }}>{isFree?'Free':`₹${course.price}`}</div>
            {isOwner ? <div className="alert alert-success">👑 You own this course</div>
              : canWatch ? <div className="alert alert-success">✅ You have access</div>
              : <button className="btn btn-primary btn-full btn-lg" onClick={handleBuy} disabled={buying}>{buying?'Redirecting...':`Enroll Now — ₹${course.price}`}</button>
            }
            {canWatch && !isOwner && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>Rate this course:</div>
                <Stars value={myRating} onRate={handleRate} />
                {ratingSuccess && <div style={{ fontSize:12, color:'var(--success)', marginTop:4 }}>Rating submitted ✓</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      {canWatch && (
        <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px' }}>
          <div className="container" style={{ display:'flex', gap:4, paddingTop:8, paddingBottom:8 }}>
            <button style={tabStyle('content')}  onClick={() => setActiveTab('content')}>🎬 Content</button>
            <button style={tabStyle('polls')}    onClick={() => setActiveTab('polls')}>📊 Polls {polls.length > 0 && `(${polls.length})`}</button>
            <button style={tabStyle('notes')}    onClick={() => setActiveTab('notes')}>📎 Notes & Assignments {notes.length > 0 && `(${notes.length})`}</button>
            <button style={tabStyle('comments')} onClick={() => setActiveTab('comments')}>💬 Comments ({comments.length})</button>
          </div>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="container" style={{ paddingTop:32, display:'grid', gridTemplateColumns:'1fr 360px', gap:32, alignItems:'start' }}>
        <div>
          {/* ══ CONTENT TAB ══ */}
          {(!canWatch || activeTab === 'content') && (
            <>
              {/* Video player */}
              {activeVideo && canWatch && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ aspectRatio:'16/9', borderRadius:12, overflow:'hidden', background:'#000', marginBottom:16, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
                    <VideoPlayer video={activeVideo} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 style={{ fontWeight:700, fontSize:18 }}>{activeVideo.title}</h3>
                    {isOwner && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setVideoModal({ video:activeVideo })}>✏️ Edit</button>
                        <button className="btn btn-sm" style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', color:'var(--error)' }} onClick={() => setDeletingVideo(activeVideo)}>🗑️ Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Locked */}
              {!canWatch && course.videos?.length > 0 && (
                <div style={{ aspectRatio:'16/9', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', marginBottom:24, gap:12 }}>
                  <div style={{ fontSize:64 }}>🔒</div>
                  <p style={{ color:'var(--text2)' }}>Purchase this course to unlock all videos</p>
                  <button className="btn btn-primary" onClick={handleBuy} disabled={buying}>{buying?'Redirecting...':`Enroll for ₹${course.price}`}</button>
                </div>
              )}

              {/* Video list */}
              <div className="card" style={{ marginBottom:32 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <h3 style={{ fontWeight:700 }}>Course Content ({course.videos?.length||0} videos)</h3>
                  {isOwner && <button className="btn btn-primary btn-sm" onClick={() => setVideoModal({ isNew:true })}>+ Add Video</button>}
                </div>
                {course.videos?.length === 0 && (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text2)', fontSize:14 }}>
                    {isOwner ? 'No videos yet. Add your first video!' : 'No videos added yet.'}
                  </div>
                )}
                {course.videos?.map((v, i) => {
                  const isActive = activeVideo?._id === v._id;
                  return (
                    <div key={v._id||i} onClick={() => canWatch && setActiveVideo(v)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:8, marginBottom:4, cursor:canWatch?'pointer':'default', background:isActive?'rgba(111,95,232,0.1)':'transparent', border:isActive?'1px solid rgba(111,95,232,0.3)':'1px solid transparent', transition:'all 0.15s' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background='transparent'; }}
                    >
                      <div style={{ width:32, height:32, borderRadius:6, background:isActive?'var(--accent)':'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, color:isActive?'#fff':canWatch?'var(--accent)':'var(--text3)' }}>
                        {canWatch ? (isActive ? '▶' : `${i+1}`) : '🔒'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:isActive?600:400 }}>{v.title}</div>
                        {v.duration && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>⏱ {v.duration}</div>}
                      </div>
                      {isOwner && (
                        <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-sm" style={{ padding:'4px 10px', fontSize:12, background:'rgba(111,95,232,0.1)', border:'1px solid rgba(111,95,232,0.3)', color:'var(--accent)' }} onClick={() => setVideoModal({ video:v })}>✏️</button>
                          <button className="btn btn-sm" style={{ padding:'4px 10px', fontSize:12, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.25)', color:'var(--error)' }} onClick={() => setDeletingVideo(v)}>🗑️</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══ POLLS TAB ══ */}
          {canWatch && activeTab === 'polls' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <h3 style={{ fontWeight:700, fontSize:20, marginBottom:4 }}>📊 Course Polls</h3>
                  <p style={{ fontSize:13, color:'var(--text2)' }}>
                    {isOwner ? 'Create MCQ polls to test your students.' : 'Answer these polls to test your knowledge.'}
                  </p>
                </div>
                {isOwner && (
                  <button className="btn btn-primary" onClick={() => setShowPollModal(true)}>+ Create Poll</button>
                )}
              </div>

              {polls.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:52, color:'var(--text2)' }}>
                  <div style={{ fontSize:48, marginBottom:14 }}>📊</div>
                  <div style={{ fontWeight:650, fontSize:16, marginBottom:8 }}>{isOwner ? 'No polls yet' : 'No polls created yet'}</div>
                  <p style={{ fontSize:14 }}>{isOwner ? 'Create an MCQ poll to make your course interactive.' : 'The teacher hasn\'t created any polls yet.'}</p>
                  {isOwner && <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => setShowPollModal(true)}>Create First Poll</button>}
                </div>
              ) : polls.map(poll => (
                <PollCard
                  key={poll._id}
                  poll={poll}
                  userId={user?._id}
                  isOwner={isOwner}
                  onVote={handleVote}
                  onReveal={handleReveal}
                  onClose={handleClosePoll}
                  onDelete={handleDeletePoll}
                />
              ))}
            </div>
          )}

          {/* ══ NOTES TAB ══ */}
          {canWatch && activeTab === 'notes' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <h3 style={{ fontWeight:700, fontSize:20, marginBottom:4 }}>📎 Notes & Assignments</h3>
                  <p style={{ fontSize:13, color:'var(--text2)' }}>
                    {isOwner ? 'Share Google Drive files — notes, PDFs, assignments.' : 'Course materials shared by your teacher.'}
                  </p>
                </div>
                {isOwner && (
                  <button className="btn btn-primary" onClick={() => setShowNoteModal(true)}>+ Add Resource</button>
                )}
              </div>

              {/* Google Drive info banner */}
              {isOwner && (
                <div style={{ padding:'14px 18px', marginBottom:20, background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.22)', borderRadius:'var(--r-lg)', display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ fontSize:22, flexShrink:0 }}>💡</div>
                  <div>
                    <div style={{ fontWeight:650, fontSize:13, color:'var(--accent3)', marginBottom:3 }}>How to share from Google Drive</div>
                    <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
                      Open your file in Google Drive → Click <strong>Share</strong> → Set access to <strong>"Anyone with the link"</strong> → Copy the link and paste it here.
                    </p>
                  </div>
                </div>
              )}

              {notes.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:52, color:'var(--text2)' }}>
                  <div style={{ fontSize:48, marginBottom:14 }}>📂</div>
                  <div style={{ fontWeight:650, fontSize:16, marginBottom:8 }}>{isOwner ? 'No resources yet' : 'No materials shared yet'}</div>
                  <p style={{ fontSize:14 }}>{isOwner ? 'Add notes, slides, or assignments via Google Drive.' : 'The teacher hasn\'t shared any materials yet.'}</p>
                  {isOwner && <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => setShowNoteModal(true)}>Add First Resource</button>}
                </div>
              ) : (
                <div>
                  {/* Grouped by type */}
                  {['assignment', 'note', 'resource'].map(type => {
                    const group = notes.filter(n => n.type === type);
                    if (!group.length) return null;
                    const label = { assignment:'📝 Assignments', note:'📄 Notes', resource:'🔗 Resources' }[type];
                    return (
                      <div key={type} style={{ marginBottom:24 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text3)', marginBottom:10, fontFamily:'var(--font-body)' }}>{label}</div>
                        {group.map(note => <NoteCard key={note._id} note={note} isOwner={isOwner} onDelete={handleDeleteNote} />)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ COMMENTS TAB ══ */}
          {(!canWatch || activeTab === 'comments') && (
            <div>
              <h3 style={{ fontWeight:700, fontSize:20, marginBottom:20 }}>Comments ({comments.length})</h3>
              {user ? (
                <form onSubmit={handleComment} style={{ marginBottom:24 }}>
                  <textarea className="form-control" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Share your thoughts..." style={{ marginBottom:12 }} required />
                  <button className="btn btn-primary btn-sm" type="submit">Post Comment</button>
                </form>
              ) : (
                <div style={{ marginBottom:24, padding:'14px 16px', background:'var(--bg3)', borderRadius:8, fontSize:14, color:'var(--text2)' }}>
                  <button onClick={() => navigate('/login')} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontWeight:600, fontFamily:'inherit', fontSize:14, padding:0 }}>Sign in</button> to leave a comment
                </div>
              )}
              {comments.map(c => {
                const isAuth     = user && (user._id===c.author?._id || user._id===c.author);
                const canDelete  = isAuth || user?.role==='moderator';
                return (
                  <div key={c._id} className="card" style={{ marginBottom:12, padding:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontWeight:600, fontSize:14 }}>@{c.author?.username}</span>
                        {c.author?.role==='moderator' && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:100, background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }}>MOD</span>}
                        {c.author?.role==='teacher'   && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:100, background:'rgba(111,95,232,0.12)', color:'var(--accent)', border:'1px solid rgba(111,95,232,0.3)' }}>TEACHER</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:'var(--text3)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                        {canDelete && (
                          <button onClick={async () => { if (!window.confirm('Delete this comment?')) return; await axios.delete(`${API}/courses/${id}/comments/${c._id}`); setComments(p => p.filter(x => x._id!==c._id)); }}
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--text3)', padding:'2px 4px', borderRadius:4, transition:'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color='var(--error)'}
                            onMouseLeave={e => e.currentTarget.style.color='var(--text3)'}
                          >{user?.role==='moderator'&&!isAuth?'🛡️🗑':'🗑'}</button>
                        )}
                      </div>
                    </div>
                    <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.6 }}>{c.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ position:'sticky', top:80, display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <h4 style={{ fontWeight:700, marginBottom:16 }}>About the Teacher</h4>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, cursor:'pointer' }} onClick={() => navigate(`/profile/${course.teacher?.username}`)}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:22, flexShrink:0 }}>
                {course.teacher?.name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight:600 }}>{course.teacher?.name}</div>
                <div style={{ fontSize:13, color:'var(--accent)' }}>@{course.teacher?.username}</div>
              </div>
            </div>
            {course.teacher?.bio && <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.6 }}>{course.teacher.bio}</p>}
          </div>

          {/* Prev / Next */}
          {canWatch && course.videos?.length > 1 && (
            <div className="card">
              <h4 style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>Navigation</h4>
              {(() => {
                const idx  = course.videos.findIndex(v => v._id===activeVideo?._id);
                const prev = course.videos[idx-1];
                const next = course.videos[idx+1];
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {prev && <button className="btn btn-secondary btn-sm" style={{ justifyContent:'flex-start', textAlign:'left' }} onClick={() => setActiveVideo(prev)}>← {prev.title}</button>}
                    {next && <button className="btn btn-primary btn-sm"   style={{ justifyContent:'flex-start', textAlign:'left' }} onClick={() => setActiveVideo(next)}>→ {next.title}</button>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Quick stats for enrolled students */}
          {canWatch && !isOwner && (
            <div className="card">
              <h4 style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>Course Stats</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Videos',    value:`${course.videos?.length||0}` },
                  { label:'Students',  value:`${course.totalStudents||0}` },
                  { label:'Rating',    value:`⭐ ${Number(course.averageRating||0).toFixed(1)}` },
                  { label:'Polls',     value:`${polls.length}` },
                  { label:'Resources', value:`${notes.length}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--text2)' }}>{label}</span>
                    <span style={{ fontWeight:600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;