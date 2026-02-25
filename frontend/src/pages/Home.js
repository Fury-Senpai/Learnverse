import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CourseCard from '../components/CourseCard';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    axios.get(`${API}/courses`).then(res => setCourses(res.data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '110px 28px 100px',
        background: [
          'radial-gradient(ellipse 80% 60% at 15% 40%, rgba(124,106,247,0.14) 0%, transparent 70%)',
          'radial-gradient(ellipse 60% 50% at 85% 10%, rgba(240,98,146,0.1) 0%, transparent 65%)',
          'radial-gradient(ellipse 40% 40% at 50% 90%, rgba(38,208,206,0.06) 0%, transparent 60%)',
        ].join(', '),
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 80% at center, black 30%, transparent 100%)',
        }} />

        <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
          {/* Pill badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32, padding: '6px 14px', background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 100 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 8px var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.01em' }}>The future of learning is here</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.05em',
            marginBottom: 28,
            maxWidth: 800,
            margin: '0 auto 28px',
          }}>
            Learn anything.<br />
            <span className="gradient-text">Teach everything.</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 19px)',
            color: 'var(--text2)',
            maxWidth: 560,
            margin: '0 auto 44px',
            lineHeight: 1.7,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
            A platform where knowledge flows freely — from expert courses to live 1:1 sessions and an AI-powered learning assistant.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/courses" className="btn btn-primary btn-xl">Explore Courses →</Link>
            {!user && <Link to="/signup" className="btn btn-secondary btn-xl">Join for free</Link>}
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 60, flexWrap: 'wrap' }}>
            {[
              { icon: '🎓', label: 'Expert Courses' },
              { icon: '⚡', label: 'Q&A + Karma' },
              { icon: '📅', label: '1:1 Sessions' },
              { icon: '🤖', label: 'AI Chatbot' },
              { icon: '🏆', label: 'Leaderboard' },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 100,
                background: 'var(--card)', border: '1px solid var(--border)',
                fontSize: 13, fontWeight: 500, color: 'var(--text2)',
                letterSpacing: '-0.01em',
              }}>
                <span>{icon}</span> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Courses ── */}
      {courses.length > 0 && (
        <section style={{ padding: '80px 28px' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Featured</div>
                <h2>Latest Courses</h2>
              </div>
              <Link to="/courses" className="btn btn-ghost btn-sm" style={{ color: 'var(--text2)' }}>View all →</Link>
            </div>
            <div className="grid grid-3 stagger">
              {courses.map(c => <CourseCard key={c._id} course={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      {!user && (
        <section style={{ padding: '60px 28px 100px' }}>
          <div className="container">
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,106,247,0.12) 0%, rgba(240,98,146,0.08) 100%)',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--r-2xl)',
              padding: 'clamp(40px, 6vw, 72px)',
              textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* bg blur shape */}
              <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,106,247,0.12), transparent 70%)', pointerEvents: 'none' }} />
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', marginBottom: 14 }}>Ready to start learning?</h2>
              <p style={{ color: 'var(--text2)', marginBottom: 36, fontSize: 16 }}>
                Join thousands of learners and educators building skills together.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/signup?role=student" className="btn btn-primary btn-lg">Join as Student</Link>
                <Link to="/signup?role=teacher" className="btn btn-secondary btn-lg">Teach on LearnHub</Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;