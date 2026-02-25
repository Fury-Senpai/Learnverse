import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

/* ─── Avatar ─── */
const Avatar = ({ name, size = 32 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.4, color: '#fff'
  }}>
    {name?.[0]?.toUpperCase() || '?'}
  </div>
);

/* ─── Karma badge ─── */
const KarmaBadge = ({ karma }) => (
  <span style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 100, padding: '1px 7px', fontWeight: 600 }}>
    ⚡{karma}
  </span>
);

/* ─── Vote buttons ─── */
const VoteBar = ({ upvotes = [], downvotes = [], onVote, userId }) => {
  const score = upvotes.length - downvotes.length;
  const voted = userId
    ? upvotes.includes(userId) ? 'up' : downvotes.includes(userId) ? 'down' : null
    : null;

  const btnStyle = (type) => ({
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4,
    fontSize: 15, transition: 'all 0.15s',
    color: voted === type ? (type === 'up' ? 'var(--success)' : 'var(--error)') : 'var(--text3)'
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <button style={btnStyle('up')} onClick={() => onVote('up')} title="Upvote">▲</button>
      <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center', color: score > 0 ? 'var(--success)' : score < 0 ? 'var(--error)' : 'var(--text2)' }}>
        {score}
      </span>
      <button style={btnStyle('down')} onClick={() => onVote('down')} title="Downvote">▼</button>
    </div>
  );
};

/* ─── Reply Box ─── */
const ReplyBox = ({ placeholder, onSubmit, onCancel, autoFocus = false }) => {
  const [body, setBody] = useState('');
  const ref = useRef();
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        ref={ref}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder || 'Write a reply...'}
        className="form-control"
        style={{ minHeight: 80, fontSize: 14, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          disabled={!body.trim()}
          onClick={() => { if (body.trim()) { onSubmit(body); setBody(''); } }}
        >
          Post Reply
        </button>
        {onCancel && (
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
};

/* ─── Single Thread Node (recursive) ─── */
const ThreadNode = ({ node, depth = 0, questionId, onDataChange, user, navigate, isLast }) => {
  const [showReply, setShowReply] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [localVotes, setLocalVotes] = useState({ upvotes: node.upvotes || [], downvotes: node.downvotes || [] });

  const maxDepth = 6; // after this, stop indenting further
  const indent = Math.min(depth, maxDepth) * 20;
  const hasReplies = node.replies?.length > 0;
  const isTopLevel = depth === 0;

  const handleVote = async (type) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/qa/answers/${node._id}/vote`, { type });
      // Optimistic-ish: update locally
      setLocalVotes(prev => {
        const uid = user._id;
        let ups = [...prev.upvotes];
        let downs = [...prev.downvotes];
        if (type === 'up') {
          if (ups.includes(uid)) { ups = ups.filter(i => i !== uid); }
          else { ups.push(uid); downs = downs.filter(i => i !== uid); }
        } else {
          if (downs.includes(uid)) { downs = downs.filter(i => i !== uid); }
          else { downs.push(uid); ups = ups.filter(i => i !== uid); }
        }
        return { upvotes: ups, downvotes: downs };
      });
    } catch {}
  };

  const handleReply = async (body) => {
    if (!user) { navigate('/login'); return; }
    try {
      await axios.post(`${API}/qa/answers/${node._id}/reply`, { body });
      setShowReply(false);
      onDataChange();
    } catch {}
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this reply and all its sub-replies?')) return;
    try {
      await axios.delete(`${API}/qa/answers/${node._id}`);
      onDataChange();
    } catch {}
  };

  const timeAgo = (date) => {
    const secs = Math.floor((Date.now() - new Date(date)) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
    return `${Math.floor(secs/86400)}d ago`;
  };

  return (
    <div style={{ marginLeft: isTopLevel ? 0 : 0, position: 'relative' }}>
      {/* Thread line for nested replies */}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: -13, top: 0, bottom: showReply ? 0 : 20,
          width: 2, background: isLast ? 'transparent' : 'var(--border)',
          borderRadius: 2
        }} />
      )}

      <div style={{
        background: isTopLevel ? 'var(--card)' : 'transparent',
        border: isTopLevel ? '1px solid var(--border)' : 'none',
        borderRadius: isTopLevel ? 14 : 0,
        padding: isTopLevel ? '20px 20px 16px' : '12px 0 4px',
        marginBottom: isTopLevel ? 16 : 0,
        transition: 'border-color 0.2s'
      }}>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar name={node.author?.name} size={isTopLevel ? 36 : 28} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            <Link to={`/profile/${node.author?.username}`} style={{ fontWeight: 600, fontSize: isTopLevel ? 14 : 13, color: 'var(--text)' }}>
              @{node.author?.username}
            </Link>
            <KarmaBadge karma={node.author?.karma || 0} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{timeAgo(node.createdAt)}</span>
          </div>
          {/* Vote bar */}
          <VoteBar
            upvotes={localVotes.upvotes}
            downvotes={localVotes.downvotes}
            onVote={handleVote}
            userId={user?._id}
          />
        </div>

        {/* Body */}
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
            [+] show reply
          </button>
        ) : (
          <div style={{ fontSize: isTopLevel ? 15 : 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: 12, paddingLeft: isTopLevel ? 0 : 38 }}>
            {node.body}
          </div>
        )}

        {/* Actions */}
        {!collapsed && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingLeft: isTopLevel ? 0 : 38 }}>
            <button
              onClick={() => { if (!user) { navigate('/login'); return; } setShowReply(!showReply); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)', padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              💬 Reply
            </button>
            {hasReplies && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)', padding: 0 }}
              >
                {collapsed ? `▶ Show ${node.replies.length} repl${node.replies.length === 1 ? 'y' : 'ies'}` : `▼ Hide replies`}
              </button>
            )}
            {user?._id === node.author?._id && (
              <button
                onClick={handleDelete}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)', padding: 0, marginLeft: 'auto', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >
                🗑 Delete
              </button>
            )}
          </div>
        )}

        {/* Inline reply box */}
        {showReply && (
          <div style={{ paddingLeft: isTopLevel ? 0 : 38, marginTop: 12 }}>
            <ReplyBox
              autoFocus
              placeholder={`Replying to @${node.author?.username}...`}
              onSubmit={handleReply}
              onCancel={() => setShowReply(false)}
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {hasReplies && !collapsed && (
        <div style={{ paddingLeft: 20, marginTop: depth === 0 ? -4 : 0, borderLeft: '2px solid var(--border)', marginLeft: 18, marginBottom: depth === 0 ? 8 : 0 }}>
          {node.replies.map((reply, i) => (
            <ThreadNode
              key={reply._id}
              node={reply}
              depth={depth + 1}
              questionId={questionId}
              onDataChange={onDataChange}
              user={user}
              navigate={navigate}
              isLast={i === node.replies.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
const QuestionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [questionVotes, setQuestionVotes] = useState({ upvotes: [], downvotes: [] });
  const [posting, setPosting] = useState(false);
  const answerRef = useRef();

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/qa/questions/${id}`);
      setData(res.data);
      setQuestionVotes({ upvotes: res.data.question.upvotes, downvotes: res.data.question.downvotes });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleQuestionVote = async (type) => {
    if (!user) { navigate('/login'); return; }
    try {
      await axios.post(`${API}/qa/questions/${id}/vote`, { type });
      setQuestionVotes(prev => {
        const uid = user._id;
        let ups = [...prev.upvotes], downs = [...prev.downvotes];
        if (type === 'up') {
          if (ups.includes(uid)) ups = ups.filter(i => i !== uid);
          else { ups.push(uid); downs = downs.filter(i => i !== uid); }
        } else {
          if (downs.includes(uid)) downs = downs.filter(i => i !== uid);
          else { downs.push(uid); ups = ups.filter(i => i !== uid); }
        }
        return { upvotes: ups, downvotes: downs };
      });
    } catch {}
  };

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setPosting(true);
    try {
      await axios.post(`${API}/qa/questions/${id}/answers`, { body: answerBody });
      setAnswerBody('');
      fetchData();
    } catch {} finally { setPosting(false); }
  };

  if (loading) return <div className="spinner" />;
  if (!data) return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text2)' }}>
      Question not found
    </div>
  );

  const { question, answers } = data;
  const totalAnswers = answers.reduce((acc, a) => acc + 1 + countReplies(a), 0);

  function countReplies(node) {
    if (!node.replies?.length) return 0;
    return node.replies.reduce((acc, r) => acc + 1 + countReplies(r), 0);
  }

  const questionScore = questionVotes.upvotes.length - questionVotes.downvotes.length;
  const questionVoted = user?._id
    ? questionVotes.upvotes.includes(user._id) ? 'up' : questionVotes.downvotes.includes(user._id) ? 'down' : null
    : null;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 860 }}>

      {/* ── Back ── */}
      <button onClick={() => navigate('/qa')} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Q&A
      </button>

      {/* ── Question ── */}
      <div className="card" style={{ marginBottom: 40, padding: 28 }}>
        <div style={{ display: 'flex', gap: 20 }}>

          {/* Vote column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44 }}>
            <button
              onClick={() => handleQuestionVote('up')}
              style={{ background: questionVoted === 'up' ? 'rgba(0,230,118,0.15)' : 'var(--bg3)', border: `1px solid ${questionVoted === 'up' ? 'rgba(0,230,118,0.5)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: questionVoted === 'up' ? 'var(--success)' : 'var(--text2)', fontSize: 16, transition: 'all 0.15s' }}
            >▲</button>
            <span style={{ fontWeight: 800, fontSize: 22, color: questionScore > 0 ? 'var(--success)' : questionScore < 0 ? 'var(--error)' : 'var(--text)' }}>
              {questionScore}
            </span>
            <button
              onClick={() => handleQuestionVote('down')}
              style={{ background: questionVoted === 'down' ? 'rgba(255,82,82,0.12)' : 'var(--bg3)', border: `1px solid ${questionVoted === 'down' ? 'rgba(255,82,82,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: questionVoted === 'down' ? 'var(--error)' : 'var(--text2)', fontSize: 16, transition: 'all 0.15s' }}
            >▼</button>
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3, marginBottom: 14 }}>{question.title}</h1>
            <p style={{ color: 'var(--text2)', lineHeight: 1.75, fontSize: 15, marginBottom: 20 }}>{question.body}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {question.tags?.map(t => (
                <span key={t} className="badge badge-cyan" style={{ fontSize: 12 }}>{t}</span>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={question.author?.name} size={28} />
                <div>
                  <Link to={`/profile/${question.author?.username}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                    @{question.author?.username}
                  </Link>
                  <KarmaBadge karma={question.author?.karma || 0} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Answers header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>
          {totalAnswers} {totalAnswers === 1 ? 'Answer' : 'Answers'}
        </h2>
        {user && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => answerRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            + Write Answer
          </button>
        )}
      </div>

      {/* ── Threaded answers ── */}
      {answers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: 15 }}>
          No answers yet. Be the first to answer!
        </div>
      ) : (
        answers.map((node, i) => (
          <ThreadNode
            key={node._id}
            node={node}
            depth={0}
            questionId={id}
            onDataChange={fetchData}
            user={user}
            navigate={navigate}
            isLast={i === answers.length - 1}
          />
        ))
      )}

      {/* ── Post top-level answer ── */}
      <div ref={answerRef} className="card" style={{ marginTop: 40, padding: 28 }}>
        <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Your Answer</h3>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
          Provide a clear, helpful answer. Use the reply button on individual answers to start a thread.
        </p>

        {user ? (
          <form onSubmit={handleAnswer}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={user.name} size={36} />
              <div style={{ flex: 1 }}>
                <textarea
                  className="form-control"
                  value={answerBody}
                  onChange={e => setAnswerBody(e.target.value)}
                  placeholder="Write a thorough answer..."
                  style={{ minHeight: 140, resize: 'vertical' }}
                  required
                />
                <button className="btn btn-primary" type="submit" disabled={posting || !answerBody.trim()} style={{ marginTop: 12 }}>
                  {posting ? 'Posting...' : '📤 Post Answer'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20, background: 'var(--bg3)', borderRadius: 10 }}>
            <span style={{ fontSize: 24 }}>💬</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Join the conversation</div>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: 14, padding: 0 }}>Sign in</button>
                {' '}to post an answer or reply to others
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDetail;