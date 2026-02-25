import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      setTimeout(() => {
        axios.get(`${API}/payments/verify/${sessionId}`)
          .then(res => setPurchase(res.data))
          .catch(() => {})
          .finally(() => setLoading(false));
      }, 2000); // wait for webhook
    } else { setLoading(false); }
  }, [sessionId]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at center, rgba(0,230,118,0.1) 0%, transparent 70%)' }}>
      <div className="card fade-in" style={{ maxWidth: 480, width: '100%', margin: 24, textAlign: 'center', padding: 48 }}>
        {loading ? (
          <div>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
            <h2 style={{ fontWeight: 800, marginBottom: 12 }}>Processing Payment...</h2>
            <p style={{ color: 'var(--text2)' }}>Please wait while we confirm your payment.</p>
            <div className="spinner" />
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
            <h2 style={{ fontWeight: 800, fontSize: 32, marginBottom: 12, color: 'var(--success)' }}>Payment Successful!</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 16 }}>
              {purchase?.type === 'session' ? 'Your 1:1 session has been booked! The teacher will send you a meeting link.' : 'You now have full access to your course. Happy learning!'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {purchase?.course && (
                <Link to={`/courses/${purchase.course}`} className="btn btn-primary">Go to Course →</Link>
              )}
              <Link to="/courses" className="btn btn-secondary">Browse Courses</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;