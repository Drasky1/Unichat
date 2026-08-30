import React, { useState } from 'react';
import {
  User,
  CheckCircle2,
  Flame,
  GraduationCap,
  Building2,
  Edit3,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Save,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { AVATAR_OPTIONS, UNIVERSITIES, UNIVERSITY_MAJOR_MAP } from '../data/mockData';

const ALL_SKILLS = [
  'TypeScript', 'React', 'Python', 'Golang', 'Next.js', 'PostgreSQL', 'Docker',
  'Figma', 'UI/UX', 'Machine Learning', 'Data Structures', 'Financial Modeling',
  'Distributed Systems', 'Cloud Architecture', 'Bioinformatics',
];

export default function ProfilePage() {
  const { user, setUser, restoreStreak } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...user });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleSave = () => {
    setUser(form);
    setEditing(false);
    setShowAvatarPicker(false);
  };

  const toggleSkill = (skill) => {
    const skills = form.skills || [];
    const has = skills.includes(skill);
    setForm({
      ...form,
      skills: has ? skills.filter(s => s !== skill) : [...skills, skill],
    });
  };

  const restoreMonth = new Date().toISOString().slice(0, 7);
  const restoresUsed = user.restoreMonth === restoreMonth ? user.restoresUsed || 0 : 0;
  const restoresRemaining = 5 - restoresUsed;

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Avatar avatar={editing ? form.avatar : user.avatar} name={user.name} size="xxl" online />
              {editing && (
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: '50%', width: 28, height: 28, padding: 0 }}
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                >
                  <Edit3 size={12} />
                </button>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editing ? (
                  <input
                    className="input"
                    style={{ fontSize: 18, fontWeight: 800, padding: '4px 8px', maxWidth: 220 }}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                ) : (
                  <h1 style={{ fontSize: 22, fontWeight: 800 }}>{user.name}</h1>
                )}
                {user.verified && (
                  <span className="badge badge-sky" style={{ fontSize: 11 }}>
                    <CheckCircle2 size={12} /> Verified Student
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                @{user.username} · ID: {user.studentId || '65012489'}
              </div>

              <div style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 600, marginTop: 4 }}>
                {user.major} · {user.year}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {user.university}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!editing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...user }); setEditing(true); }}>
                <Edit3 size={14} /> Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                  <Save size={14} /> Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Avatar Picker Modal Row */}
        {editing && showAvatarPicker && (
          <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div className="input-label" style={{ marginBottom: 8 }}>Select Curated Student Portrait</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_OPTIONS.map((av) => (
                <div
                  key={av.image}
                  style={{ cursor: 'pointer', border: form.avatar?.image === av.image ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: '50%', padding: 2 }}
                  onClick={() => setForm({ ...form, avatar: av })}
                >
                  <Avatar avatar={av} size="lg" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Bio */}
        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div className="input-label">Student Bio</div>
          {editing ? (
            <textarea
              className="input"
              rows={3}
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
            />
          ) : (
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Grid: Academic Info & Skills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Skills Card */}
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Skills & Focus Areas</div>
          {editing ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_SKILLS.map(skill => {
                const isSelected = form.skills?.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    className={`badge ${isSelected ? 'badge-indigo' : 'badge-muted'}`}
                    style={{ cursor: 'pointer', padding: '4px 10px' }}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.skills?.map(skill => (
                <span key={skill} className="badge badge-indigo">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Streak Protection Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(79, 70, 229, 0.04))', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Flame size={18} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>Study Streak Protection</span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            You receive 5 free streak restores every calendar month to protect your daily study record.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>Restore Missed Day</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{restoresRemaining} free restores remaining this month</div>
            </div>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => restoreStreak()}
              disabled={restoresRemaining === 0}
            >
              🔥 Restore Streak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
