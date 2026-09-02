import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  FolderKanban,
  MessagesSquare,
  Flame,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { COMMUNITIES, PROJECTS, STUDENTS } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

function normalizePeer(row) {
  return {
    ...row,
    major: row.major || 'Student',
    avatar: { image: row.avatar_image, initials: row.avatar_initials, gradient: row.avatar_gradient },
    online: row.last_active_date === new Date().toISOString().slice(0, 10),
  };
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return d > 0 ? `${d}d left` : 'Due today';
}

export default function HomePage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [liveData, setLiveData] = useState({ communities: [], peers: [] });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    Promise.all([
      supabase.from('communities').select('*').order('name'),
      supabase.from('profiles').select('*').neq('id', user.id).limit(3),
    ]).then(([{ data: communities }, { data: peers }]) => {
      if (!cancelled) setLiveData({ communities: communities || [], peers: (peers || []).map(normalizePeer) });
    });

    return () => { cancelled = true; };
  }, [user.id]);

  const activeChannels = isSupabaseConfigured ? liveData.communities : COMMUNITIES.slice(0, 4);
  const recommendedPeers = isSupabaseConfigured ? liveData.peers : STUDENTS.filter(s => s.university === user.university || s.major === user.major).slice(0, 3);
  const myProject = isSupabaseConfigured ? null : PROJECTS[0];
  const activeWorkspaceCount = isSupabaseConfigured ? 0 : PROJECTS.length;

  return (
    <div className="fade-in">
      {/* Top Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-light)' }}>
            <GraduationCap size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{user.gpa ?? 0}</span>
            <span className="metric-label">Cumulative GPA</span>
          </div>
          <span className="badge badge-emerald" style={{ marginLeft: 'auto', fontSize: '10px' }}>
            <TrendingUp size={10} /> Top 5%
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'var(--sky-subtle)', color: 'var(--sky)' }}>
            <FolderKanban size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{activeWorkspaceCount}</span>
            <span className="metric-label">Active Workspaces</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'var(--emerald-subtle)', color: 'var(--emerald)' }}>
            <MessagesSquare size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{isSupabaseConfigured ? liveData.communities.length : COMMUNITIES.length}</span>
            <span className="metric-label">Campus Channels</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'var(--amber-subtle)', color: 'var(--amber)' }}>
            <Flame size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{user.streak ?? 0}</span>
            <span className="metric-label">Day Study Streak</span>
          </div>
        </div>
      </div>

      {/* Hero Pulse Banner */}
      <div className="hero-pulse-card">
        <div className="hero-pulse-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="badge badge-indigo">
              <Sparkles size={11} /> SEMESTER 1 / 2026 PULSE
            </span>
            <span className="badge badge-emerald">● Live Session Active</span>
          </div>
          <h2>Welcome back, {user.name.split(' ')[0]}</h2>
          <p>
            {myProject
              ? <>You have <strong>1 upcoming deadline</strong> this week in {myProject.subject}. Join the Computer Science study pod or coordinate with your project team.</>
              : <>Your live campus space is ready. Join a community, meet other students, and start building your academic network.</>}
          </p>
        </div>
        <div className="hero-pulse-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/communities')}>
            <MessagesSquare size={14} /> Open Channels
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
            <FolderKanban size={14} /> View Deliverables
          </button>
        </div>
      </div>

      {/* Dashboard Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Priority Deadline Card */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} className="text-accent" style={{ color: 'var(--accent-light)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Upcoming Milestone
                </span>
              </div>
              {myProject && <span className="badge badge-amber">{daysUntil(myProject.deadline)}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{myProject?.name || 'No active projects yet'}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 2 }}>{myProject ? `${myProject.code} · ${myProject.subject}` : 'Create or join a workspace to see project milestones here.'}</div>
              </div>
              <button className="btn btn-secondary btn-xs" onClick={() => navigate('/projects')}>
                Manage <ArrowRight size={12} />
              </button>
            </div>

            {myProject && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${myProject.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--sky))', borderRadius: '9999px' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-light)' }}>{myProject.progress}% complete</span>
            </div>}
          </div>

          {/* Active Campus Channels */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>Active Campus Channels</div>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate('/communities')}>
                View All <ArrowUpRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeChannels.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate('/communities')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--accent-subtle)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessagesSquare size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>{c.desc || c.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-emerald" style={{ fontSize: '10.5px' }}>● live</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Study Pod Widget */}
          <div className="card" style={{ background: 'linear-gradient(180deg, var(--bg-card), var(--bg-surface))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BookOpen size={16} style={{ color: 'var(--emerald)' }} />
              <span style={{ fontSize: '13.5px', fontWeight: 800 }}>Virtual Study Pod</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
              Join 14 students currently in the 50/10 Pomodoro session for silent revision.
            </p>
            <button className="btn btn-primary btn-full btn-sm" onClick={() => navigate('/communities')}>
              Join Study Room
            </button>
          </div>

          {/* Peer Recommendations */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800 }}>Peers in your Faculty</div>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate('/friends')}>
                Friends <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommendedPeers.map(peer => (
                <div key={peer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Avatar avatar={peer.avatar} name={peer.name} size="sm" online={peer.online} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {peer.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {peer.major}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-xs" onClick={() => navigate('/friends')}>
                    <UserPlus size={11} /> Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
