import React from 'react';
import { Link } from 'react-router-dom';

const CourseCard = ({ course }) => {
  const isFree = course.price === 0;
  return (
    <Link to={`/courses/${course._id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
        transition: 'transform 0.28s var(--ease-out), border-color 0.28s, box-shadow 0.28s',
        height: '100%',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'var(--border3)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg3)', overflow: 'hidden' }}>
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s var(--ease-out)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--bg3), var(--card2))', fontSize: 44 }}>📚</div>
          )}
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span className={`badge ${isFree ? 'badge-success' : 'badge-accent'}`}>{isFree ? 'Free' : `₹${course.price}`}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 18px 16px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, marginBottom: 7, letterSpacing: '-0.02em' }} className="truncate-2">
            {course.title}
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14 }} className="truncate-2">{course.description}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, letterSpacing: '-0.01em' }}>@{course.teacher?.username}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#fbbf24', fontSize: 13 }}>★</span>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.025em' }}>{Number(course.averageRating||0).toFixed(1)}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>({course.totalStudents||0})</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;