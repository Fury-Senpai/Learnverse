import React from 'react';
import { Link } from 'react-router-dom';

const CourseCard = ({ course }) => {
  const isFree = course.price === 0;

  return (
    <Link to={`/courses/${course._id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
        {/* Thumbnail */}
        <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg3)', overflow: 'hidden' }}>
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, var(--bg3), var(--bg2))`, fontSize: 48 }}>
              📚
            </div>
          )}
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <span className={`badge ${isFree ? 'badge-success' : 'badge-accent'}`}>
              {isFree ? 'FREE' : `$${course.price}`}
            </span>
          </div>
        </div>
        {/* Content */}
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{course.title}</h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{course.description}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>by @{course.teacher?.username}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#ffd700' }}>★ {Number(course.averageRating || 0).toFixed(1)}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>({course.totalStudents || 0})</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;