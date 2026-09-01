import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import UnichatLogo from '../components/UnichatLogo';
import { CURRENT_USER, MODERATOR_USER, UNIVERSITIES, UNIVERSITY_MAJOR_MAP, AVATAR_OPTIONS } from '../data/mockData';
import { supabase, isSupabaseConfigured, emailMatchesUniversity, UNIVERSITY_EMAIL_DOMAINS } from '../lib/supabaseClient';

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [loginForm, setLoginForm] = useState({ email: 'alex.riv@rsu.ac.th', password: '' });
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    major: '',
    university: UNIVERSITIES[0] || 'Rangsit University (RSU)',
    year: '3rd Year',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const availableMajors = form.university ? UNIVERSITY_MAJOR_MAP[form.university] || [] : [];
  const requiredDomain = UNIVERSITY_EMAIL_DOMAINS[form.university];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!isSupabaseConfigured) {
      login(CURRENT_USER);
      navigate('/');
      return;
    }

    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });
    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      setError('Signed in, but could not load your profile. Please try again.');
      return;
    }

    login(profile);
    navigate('/');
  };

  const handleModeratorLogin = () => {
    login(MODERATOR_USER);
    navigate('/');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedUniversity = form.university.trim();

    if (!isSupabaseConfigured) {
      const newUser = {
        ...CURRENT_USER,
        name: form.name || 'Alex Rivera',
        email: form.email || 'alex.riv@rsu.ac.th',
        major: form.major || availableMajors[0] || 'Computer Science & AI',
        university: normalizedUniversity,
        year: form.year,
        avatar: AVATAR_OPTIONS[selectedAvatarIdx] || CURRENT_USER.avatar,
      };
      login(newUser);
      navigate('/');
      return;
    }

    if (!emailMatchesUniversity(form.email, normalizedUniversity)) {
      setError(`Please use your ${normalizedUniversity} student email (must end in @${requiredDomain}).`);
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }

    const avatar = AVATAR_OPTIONS[selectedAvatarIdx] || CURRENT_USER.avatar;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name: form.name,
        email: form.email.trim(),
        university: normalizedUniversity,
        major: form.major || availableMajors[0] || '',
        year: form.year,
        avatar_image: avatar.image,
        avatar_initials: avatar.initials,
        avatar_gradient: avatar.gradient,
      })
      .select()
      .single();
    setSubmitting(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    login(profile);
    navigate('/');
  };

  return (
    <div className="auth-split-container fade-in">
      <div className="auth-hero-side" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/branding/Student_focused_on_phone_202608292049.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
            filter: 'grayscale(20%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <UnichatLogo size="lg" />
        </div>

        <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0', padding: '40px 0' }}>
          <div className="badge badge-indigo" style={{ marginBottom: 14 }}>
            <Sparkles size={13} /> THE CAMPUS OPERATING SYSTEM
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.25, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Your campus, connected in real time.
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 480 }}>
            Connect with peers, collaborate on group projects with real-time tasks, predict your final grades with intelligent GPA calculators, and access verified university channels.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Verified .ac.th campus identity verification</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Group workspaces with Linear-grade milestone tracking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Reverse target grade simulation & GPA optimization</span>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, fontSize: 12, color: 'var(--text-muted)' }}>
          Supported across RSU, BU, Chulalongkorn, ABAC, and Mahidol University.
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card-box">
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>
              {tab === 'login' ? 'Sign in to Unichat' : 'Create Student Account'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {tab === 'login' ? 'Enter your credentials or test with one-click demo' : 'Join thousands of students on your campus'}
            </p>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              className={`btn btn-sm flex-1 ${tab === 'login' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-1 ${tab === 'register' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('register')}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">University Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="email"
                    style={{ paddingLeft: 34 }}
                    placeholder="student@university.ac.th"
                    value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  />
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="password"
                    style={{ paddingLeft: 34 }}
                    placeholder="••••••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 4 }} disabled={submitting}>
                {submitting ? 'Signing in...' : 'Continue to Dashboard'} <ArrowRight size={14} />
              </button>

              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

              <button
                type="button"
                className="btn btn-secondary btn-full btn-sm"
                onClick={handleModeratorLogin}
              >
                <ShieldCheck size={14} /> Enter as Faculty Moderator Demo
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">University Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  placeholder="student@university.ac.th"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">University</label>
                <select
                  className="input"
                  value={form.university}
                  onChange={e => {
                    const uni = e.target.value;
                    const majors = UNIVERSITY_MAJOR_MAP[uni] || [];
                    setForm({ ...form, university: uni, major: majors[0] || '' });
                  }}
                >
                  {UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Faculty / Major</label>
                <select
                  className="input"
                  value={form.major}
                  onChange={e => setForm({ ...form, major: e.target.value })}
                >
                  {availableMajors.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create Student Account'} <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
