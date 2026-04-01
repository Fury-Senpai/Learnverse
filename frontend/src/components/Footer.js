import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Icon components (pure SVG, no emoji) ── */
const IconGithub = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const IconTwitter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const IconLinkedin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const IconDiscord = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

/* ── Sections config ── */
const LINKS = [
  {
    heading: 'Learn',
    items: [
      { label: 'Browse Courses', to: '/courses' },
      { label: 'Free Courses',   to: '/courses?filter=free' },
      { label: 'Leaderboard',    to: '/leaderboard' },
      { label: 'AI Assistant',   to: '/chatbot' },
    ],
  },
  {
    heading: 'Community',
    items: [
      { label: 'Q&A Forum',      to: '/qa' },
      { label: 'Community Chat', to: '/community' },
      { label: 'Find a Teacher', to: '/courses' },
    ],
  },
  {
    heading: 'Teach',
    items: [
      { label: 'Become a Teacher', to: '/signup?role=teacher' },
      { label: 'Create a Course',  to: '/create-course' },
      { label: 'My Sessions',      to: '/my-sessions' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Sign Up',  to: '/signup' },
      { label: 'Sign In',  to: '/login' },
      { label: 'Profile',  to: null }, // filled dynamically
    ],
  },
];

const SOCIALS = [
  { icon: <IconGithub />,   href: 'https://github.com/fury-senpai',    label: 'GitHub' },
  { icon: <IconTwitter />,  href: 'https://twitter.com',   label: 'Twitter / X' },
  { icon: <IconLinkedin />, href: 'https://www.linkedin.com/in/nitish-harbola-a795a2189',  label: 'LinkedIn' },
  { icon: <IconDiscord />,  href: 'https://discord.com',   label: 'Discord' },
];

const Footer = () => {
  const { user } = useAuth();
  const location = useLocation();
  const year = new Date().getFullYear();

  // Don't render footer on full-screen pages
  const noFooterRoutes = ['/chatbot', '/community', '/mod'];
  if (noFooterRoutes.some(r => location.pathname.startsWith(r))) return null;

  // Inject dynamic profile link
  const sections = LINKS.map(section => ({
    ...section,
    items: section.items.map(item =>
      item.label === 'Profile' && user
        ? { label: 'My Profile', to: `/profile/${user.username}` }
        : item
    ).filter(item => {
      // Hide auth links if already logged in
      if (user && (item.label === 'Sign Up' || item.label === 'Sign In')) return false;
      // Hide teacher-only links for students
      if (item.label === 'Create a Course' && user?.role === 'student') return false;
      // Hide profile placeholder if not logged in
      if (!user && item.label === 'Profile') return false;
      return true;
    }),
  }));

  return (
    <footer style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
    }}>

      {/* ── Main grid ── */}
      <div className="container" style={{ padding: '64px 28px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.6fr) repeat(4, 1fr)', gap: 40, alignItems: 'start' }}>

          {/* Brand column */}
          <div>
            {/* Logo */}
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16, textDecoration: 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, boxShadow: '0 4px 16px rgba(111,95,232,0.35)',
              }}>⚡</div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.04em', color: 'var(--text)' }}>
                Learn
                <span style={{
                  background: 'linear-gradient(130deg, var(--accent) 10%, var(--accent-mid) 45%, var(--accent2) 90%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>Hub</span>
              </span>
            </Link>

            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text2)', maxWidth: 260, marginBottom: 24 }}>
              A platform where knowledge flows freely, from expert courses to live 1:1 sessions and an AI-powered learning assistant.
            </p>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {SOCIALS.map(({ icon, href, label }) => (
                <a
                  key={label} href={href} target="_blank" rel="noreferrer"
                  aria-label={label}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--r-md)',
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text3)', transition: 'all 0.18s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(111,95,232,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(111,95,232,0.35)';
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg3)';
                    e.currentTarget.style.borderColor = 'var(--border2)';
                    e.currentTarget.style.color = 'var(--text3)';
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {sections.map(section => (
            <div key={section.heading}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text3)',
                marginBottom: 16, fontFamily: 'var(--font-body)',
              }}>
                {section.heading}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.items.map(item => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      style={{
                        fontSize: 14, color: 'var(--text2)', fontWeight: 400,
                        letterSpacing: '-0.01em', textDecoration: 'none',
                        transition: 'color 0.15s',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* ── Bottom bar ── */}
      <div className="container" style={{ padding: '20px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>

          {/* Copyright */}
          <div style={{ fontSize: 13, color: 'var(--text3)', letterSpacing: '-0.01em' }}>
            © {year} LearnHub. All rights reserved.
          </div>

          {/* Legal links */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Privacy Policy',   to: '/' },
              { label: 'Terms of Service', to: '/' },
              { label: 'Cookie Policy',    to: '/' },
              { label: 'Contact Us',       to: '/' },
            ].map(({ label, to }) => (
              <Link key={label} to={to}
                style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '0.01em', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Made with */}
          <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Built with
            <span style={{ color: 'var(--error)', fontSize: 13 }}>♥</span>
            using MERN stack
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;