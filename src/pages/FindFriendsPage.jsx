import React, { useEffect, useState } from 'react';
import {
  Search,
  Users2,
  Filter,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  Sparkles,
  Send,
  X,
  ExternalLink,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { STUDENTS, UNIVERSITIES, UNIVERSITY_MAJOR_MAP } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

function normalizeProfile(row, following) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: row.id,
    name: row.name,
    username: row.username || row.name?.toLowerCase().replace(/\s+/g, ''),
    major: row.major,
    university: row.university,
    year: row.year,
    bio: row.bio,
    skills: row.skills || [],
    statusText: row.status_text,
    avatar: { image: row.avatar_image, initials: row.avatar_initials },
    online: row.last_active_date === today,
    following,
  };
}

export default function FindFriendsPage() {
  const { user, recordActivity } = useApp();
  const [students, setStudents] = useState(isSupabaseConfigured ? [] : STUDENTS);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [search, setSearch] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('All Universities');
  const [filterMajor, setFilterMajor] = useState('All Majors');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dmInput, setDmInput] = useState('');
  const [dmSent, setDmSent] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    (async () => {
      const [{ data: profiles }, { data: connections }] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', user.id),
        supabase.from('friendships').select('followee_id').eq('follower_id', user.id),
      ]);
      if (cancelled) return;
      const followingIds = new Set((connections || []).map(c => c.followee_id));
      setStudents((profiles || []).map(row => normalizeProfile(row, followingIds.has(row.id))));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user.id]);

  const availableMajors = filterUniversity === 'All Universities'
    ? ['All Majors', ...new Set(Object.values(UNIVERSITY_MAJOR_MAP).flat())]
    : ['All Majors', ...(UNIVERSITY_MAJOR_MAP[filterUniversity] || [])];

  const toggleFollow = async (id) => {
    recordActivity('friend_connect');
    const target = students.find(s => s.id === id);
    const nowFollowing = !target?.following;

    setStudents(prev => prev.map(s => s.id === id ? { ...s, following: nowFollowing } : s));
    if (selectedStudent?.id === id) {
      setSelectedStudent(prev => ({ ...prev, following: nowFollowing }));
    }

    if (!isSupabaseConfigured) return;

    if (nowFollowing) {
      await supabase.from('friendships').insert({ follower_id: user.id, followee_id: id });
    } else {
      await supabase.from('friendships').delete().eq('follower_id', user.id).eq('followee_id', id);
    }
  };

  const sendDM = () => {
    if (!dmInput.trim()) return;
    recordActivity('friend_connect');
    setDmSent(true);
    setDmInput('');
    setTimeout(() => setDmSent(false), 3000);
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.major.toLowerCase().includes(q) ||
      s.university.toLowerCase().includes(q) ||
      s.skills?.some(skill => skill.toLowerCase().includes(q));

    const matchUni = filterUniversity === 'All Universities' || s.university === filterUniversity;
    const matchMajor = filterMajor === 'All Majors' || s.major === filterMajor;

    return matchSearch && matchUni && matchMajor;
  });

  return (
    <div className="fade-in">
      {/* Header & Filter Bar */}
      <div className="card mb-16" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Discover</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Discover research collaborators, project teammates, and campus peers
            </div>
          </div>
          <span className="badge badge-emerald">
            ● {students.filter(s => s.online).length} active today
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div className="input-group">
            <label className="input-label">Search</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                style={{ paddingLeft: 34 }}
                placeholder="Search by name, skill, or course (e.g. TypeScript, RSU)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">University</label>
            <select
              className="input"
              value={filterUniversity}
              onChange={e => {
                setFilterUniversity(e.target.value);
                setFilterMajor('All Majors');
              }}
            >
              <option>All Universities</option>
              {UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Faculty / Major</label>
            <select
              className="input"
              value={filterMajor}
              onChange={e => setFilterMajor(e.target.value)}
            >
              {availableMajors.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Discover Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          Loading students…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          {students.length === 0
            ? "No other students have signed up yet — once more people join, they&apos;ll show up here."
            : 'No students match your search or filters.'}
        </div>
      ) : (
      <div className="directory-grid">
        {filtered.map(student => (
          <div
            key={student.id}
            className={`student-card ${selectedStudent?.id === student.id ? 'selected' : ''}`}
            onClick={() => setSelectedStudent(student)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Avatar avatar={student.avatar} name={student.name} size="lg" online={student.online} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{student.name}</span>
                    <CheckCircle2 size={13} style={{ color: 'var(--sky)' }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>@{student.username}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--accent-light)', fontWeight: 600, marginTop: 2 }}>
                    {student.major}
                  </div>
                </div>
              </div>

              <button
                className={`btn btn-xs ${student.following ? 'btn-secondary' : 'btn-primary'}`}
                onClick={e => { e.stopPropagation(); toggleFollow(student.id); }}
              >
                {student.following ? 'Connected' : '+ Connect'}
              </button>
            </div>

            {student.statusText && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                {student.statusText}
              </div>
            )}

            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {student.bio}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
              {student.skills?.slice(0, 4).map(skill => (
                <span key={skill} className="badge badge-muted" style={{ fontSize: 10.5 }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Selected Student Modal / Dossier */}
      {selectedStudent && (
        <div className="command-palette-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="card fade-in" style={{ width: '90%', maxWidth: 520, background: 'var(--bg-modal)', zIndex: 110 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <Avatar avatar={selectedStudent.avatar} name={selectedStudent.name} size="xl" online={selectedStudent.online} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800 }}>{selectedStudent.name}</h3>
                    <CheckCircle2 size={16} style={{ color: 'var(--sky)' }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{selectedStudent.username}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--accent-light)', fontWeight: 600, marginTop: 4 }}>
                    {selectedStudent.major} · {selectedStudent.year}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedStudent.university}
                  </div>
                </div>
              </div>
              <button className="btn-icon-subtle" onClick={() => setSelectedStudent(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {selectedStudent.bio}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="input-label">Technical Skills & Focus Areas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedStudent.skills?.map(skill => (
                  <span key={skill} className="badge badge-indigo">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Direct Message Form */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div className="input-label">Send Direct Message</div>
              {dmSent ? (
                <div className="badge badge-emerald" style={{ padding: '8px 12px', width: '100%', justifyContent: 'center' }}>
                  ✓ Direct message sent to {selectedStudent.name}!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder={`Hey ${selectedStudent.name.split(' ')[0]}, let's collaborate on...`}
                    value={dmInput}
                    onChange={e => setDmInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendDM(); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendDM} disabled={!dmInput.trim()}>
                    <Send size={13} /> Send
                  </button>
                </div>
              )}
              {!dmSent && (
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>
                  Direct messages aren&apos;t saved yet — this feature is coming soon.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
