import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CourseCard from '../components/CourseCard';
import { API } from '../context/AuthContext';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/courses`)
      .then(res => setCourses(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'free' ? courses.filter(c => c.price === 0)
    : filter === 'paid' ? courses.filter(c => c.price > 0)
    : courses;

  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="page-header">
        <h1>All Courses <span className="gradient-text">✦</span></h1>
        <p>Expand your knowledge with expert-led courses</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['all', 'free', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
            {f === 'all' ? 'All Courses' : f === 'free' ? '🆓 Free' : '💎 Paid'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text2)', fontSize: 14, alignSelf: 'center' }}>
          {filtered.length} courses
        </span>
      </div>

      {loading ? <div className="spinner" /> : (
        filtered.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 80 }}>No courses yet. Be the first to create one!</div>
          : <div className="grid grid-3">{filtered.map(c => <CourseCard key={c._id} course={c} />)}</div>
      )}
    </div>
  );
};

export default Courses;