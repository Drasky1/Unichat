import React, { useState, useRef, useEffect } from 'react';
import {
  FolderKanban,
  CheckSquare,
  MessagesSquare,
  Info,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  X,
  ExternalLink,
  Users,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { PROJECTS, STUDENTS } from '../data/mockData';
import { sounds } from '../utils/audio';

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return d > 0 ? `${d} days remaining` : 'Overdue!';
}

export default function ProjectsPage() {
  const { user, recordActivity } = useApp();
  const [projects, setProjects] = useState(PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState(PROJECTS[0]?.id || 'p1');
  const [activeTab, setActiveTab] = useState('tasks');
  const [chatInput, setChatInput] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', code: '', subject: '', deadline: '' });
  const [memberToAdd, setMemberToAdd] = useState('');
  const messagesEndRef = useRef(null);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeProject, activeTab]);

  const toggleTask = (taskId) => {
    recordActivity('project_update');
    sounds.playTaskCheck();
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProject.id) return p;
      const tasks = p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
      const doneCount = tasks.filter(t => t.done).length;
      return { ...p, tasks, progress: Math.round((doneCount / tasks.length) * 100) };
    }));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    recordActivity('project_update');
    const createdTask = {
      id: `t${Date.now()}`,
      title: newTaskTitle.trim(),
      assignee: user.name,
      priority: 'Medium',
      done: false,
      due: 'Sep 12',
    };
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProject.id) return p;
      const nextTasks = [...p.tasks, createdTask];
      const doneCount = nextTasks.filter(t => t.done).length;
      return { ...p, tasks: nextTasks, progress: Math.round((doneCount / nextTasks.length) * 100) };
    }));
    setNewTaskTitle('');
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    recordActivity('project_update');
    const newMsg = {
      id: `pm${Date.now()}`,
      userId: user.id || 'u1',
      name: user.name.split(' ')[0],
      avatar: user.avatar,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setProjects(prev => prev.map(p =>
      p.id === activeProject.id ? { ...p, messages: [...p.messages, newMsg] } : p
    ));
    setChatInput('');
  };

  const createProject = (e) => {
    e.preventDefault();
    recordActivity('project_update');
    const created = {
      id: `p${Date.now()}`,
      name: newProject.name,
      code: newProject.code || 'CS-CAPSTONE',
      subject: newProject.subject || 'Computer Science',
      deadline: newProject.deadline || '2026-10-01',
      progress: 0,
      priority: 'High',
      status: 'In Progress',
      members: [{ id: user.id || 'u1', name: user.name, role: 'Lead Architect', avatar: user.avatar }],
      tasks: [],
      messages: [],
      description: newProject.name,
    };
    setProjects(prev => [...prev, created]);
    setActiveProjectId(created.id);
    setShowNewProjectModal(false);
    setNewProject({ name: '', code: '', subject: '', deadline: '' });
  };

  const addMember = () => {
    if (!memberToAdd || activeProject.members.some(m => m.id === memberToAdd)) return;
    const member = STUDENTS.find(s => s.id === memberToAdd);
    if (!member) return;
    recordActivity('project_update');
    const nextMembers = [...activeProject.members, { id: member.id, name: member.name, role: 'Contributor', avatar: member.avatar }];
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, members: nextMembers } : p));
    setMemberToAdd('');
  };

  return (
    <div className="fade-in">
      <div className="projects-layout-grid">
        {/* Left Project Selector Column */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Project Workspaces
            </span>
            <button className="btn btn-primary btn-xs" onClick={() => setShowNewProjectModal(true)}>
              <Plus size={12} /> New
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map(p => {
              const isSelected = p.id === activeProject.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  style={{
                    padding: '12px 14px',
                    background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                    <span className="badge badge-indigo" style={{ fontSize: 10 }}>{p.code}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.subject}</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 11 }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{daysUntil(p.deadline)}</span>
                    <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{p.progress}%</span>
                  </div>

                  <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--sky))' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Project Workspace */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Project Header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800 }}>{activeProject.name}</h2>
                  <span className="badge badge-indigo">{activeProject.code}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  {activeProject.subject} · Deadline: {activeProject.deadline}
                </div>
              </div>

              {/* Members Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {activeProject.members?.map(m => (
                  <Avatar key={m.id} avatar={m.avatar} name={m.name} size="sm" />
                ))}
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('tasks')}
              >
                <CheckSquare size={14} /> Deliverables ({activeProject.tasks.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'chat' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessagesSquare size={14} /> Workspace Chat
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'info' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('info')}
              >
                <Info size={14} /> Architecture & Team
              </button>
            </div>
          </div>

          {/* Sub-tab Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {activeTab === 'tasks' && (
              <div>
                {/* Inline Add Task Form */}
                <form onSubmit={addTask} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                  <input
                    className="input"
                    placeholder="Add a new deliverable or milestone task..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newTaskTitle.trim()}>
                    <Plus size={14} /> Add Task
                  </button>
                </form>

                {/* Tasks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeProject.tasks.map(task => (
                    <div key={task.id} className={`project-task-item ${task.done ? 'completed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id)}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{task.title}</span>
                      <span className={`badge ${task.priority === 'High' ? 'badge-rose' : 'badge-muted'}`} style={{ fontSize: 10 }}>
                        {task.priority}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{task.assignee}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingBottom: 14 }}>
                  {activeProject.messages?.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Avatar avatar={msg.avatar} name={msg.name} size="sm" />
                      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{msg.name}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{msg.time}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <input
                    className="input"
                    placeholder="Message the team workspace..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendChat} disabled={!chatInput.trim()}>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div className="input-label">Project Scope & Abstract</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {activeProject.description}
                  </div>
                </div>

                <div>
                  <div className="input-label">Invite Peer to Workspace</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select className="input" value={memberToAdd} onChange={e => setMemberToAdd(e.target.value)}>
                      <option value="">Select student from directory</option>
                      {STUDENTS.filter(s => !activeProject.members.some(m => m.id === s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.major})</option>
                      ))}
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={addMember} disabled={!memberToAdd}>
                      Invite
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="command-palette-backdrop" onClick={() => setShowNewProjectModal(false)}>
          <div className="card fade-in" style={{ width: '90%', maxWidth: 480, background: 'var(--bg-modal)', zIndex: 110 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Create New Group Workspace</h3>
              <button className="btn-icon-subtle" onClick={() => setShowNewProjectModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Project Title</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Distributed Database Engine"
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Course Code</label>
                <input
                  className="input"
                  placeholder="e.g. CSC301"
                  value={newProject.code}
                  onChange={e => setNewProject({ ...newProject, code: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Subject / Faculty</label>
                <input
                  className="input"
                  placeholder="e.g. Computer Science"
                  value={newProject.subject}
                  onChange={e => setNewProject({ ...newProject, subject: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Milestone Deadline</label>
                <input
                  className="input"
                  type="date"
                  value={newProject.deadline}
                  onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowNewProjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
