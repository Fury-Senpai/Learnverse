import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import CreateCourse from './pages/CreateCourse';
import Profile from './pages/Profile';
import QA from './pages/QA';
import QuestionDetail from './pages/QuestionDetail';
import Chatbot from './pages/Chatbot';
import Leaderboard from './pages/Leaderboard';
import PaymentSuccess from './pages/PaymentSuccess';
import MySessions from './pages/MySessions';
import Community from './pages/Community';
import ModPanel from './pages/ModPanel';
import BotpressChat from './components/BotPressChat';
import PrivacyPolicy from './pages/PrivacyPolicy';

const ProtectedRoute = ({ children, teacherOnly }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" />;
  if (teacherOnly && user.role !== 'teacher') return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Navbar />
    <main style={{ flex: 1 }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/create-course" element={<ProtectedRoute teacherOnly><CreateCourse /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/qa" element={<QA />} />
        <Route path="/qa/:id" element={<QuestionDetail />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/my-sessions" element={<ProtectedRoute><MySessions /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
        <Route path="/mod" element={<ProtectedRoute><ModPanel /></ProtectedRoute>} />
        <Route path="/privacyPolicy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </main>
    <BotpressChat />
    <Footer />
  </div>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;