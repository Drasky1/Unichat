import React, { useState } from 'react';
import {
  GraduationCap,
  TrendingUp,
  Plus,
  Target,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { SUBJECTS } from '../data/mockData';
import { sounds } from '../utils/audio';

function calcCurrentGrade(components) {
  let earnedWeight = 0;
  let totalWeight = 0;
  for (const c of components) {
    if (c.scored !== null) {
      earnedWeight += (c.scored / c.total) * c.weight;
      totalWeight += c.weight;
    }
  }
  if (totalWeight === 0) return null;
  return (earnedWeight / totalWeight) * 100;
}

function scoreNeeded(components, targetGrade) {
  let earnedSoFar = 0;
  let remainingWeight = 0;
  for (const c of components) {
    if (c.scored !== null) {
      earnedSoFar += (c.scored / c.total) * c.weight;
    } else {
      remainingWeight += c.weight;
    }
  }
  if (remainingWeight === 0) return null;
  const needed = ((targetGrade - earnedSoFar) / remainingWeight) * 100;
  return Math.max(0, needed);
}

function gradeLabel(pct) {
  if (pct === null) return { letter: 'N/A', gpa: '0.0', color: 'badge-muted' };
  if (pct >= 90) return { letter: 'A', gpa: '4.0', color: 'badge-emerald' };
  if (pct >= 85) return { letter: 'A-', gpa: '3.7', color: 'badge-emerald' };
  if (pct >= 80) return { letter: 'B+', gpa: '3.3', color: 'badge-indigo' };
  if (pct >= 75) return { letter: 'B', gpa: '3.0', color: 'badge-indigo' };
  if (pct >= 70) return { letter: 'B-', gpa: '2.7', color: 'badge-amber' };
  if (pct >= 65) return { letter: 'C+', gpa: '2.3', color: 'badge-amber' };
  if (pct >= 60) return { letter: 'C', gpa: '2.0', color: 'badge-rose' };
  return { letter: 'F', gpa: '0.0', color: 'badge-rose' };
}

export default function GradesPage() {
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [activeSubjectId, setActiveSubjectId] = useState(SUBJECTS[0]?.id || 's1');
  const [targetGrade, setTargetGrade] = useState(85);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', credits: 3 });

  const currentSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];
  const currentPct = calcCurrentGrade(currentSubject.components);
  const currentGradeObj = gradeLabel(currentPct);
  const needed = scoreNeeded(currentSubject.components, targetGrade);

  const updateScore = (subjectId, compIdx, value) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      const components = s.components.map((c, i) =>
        i === compIdx ? { ...c, scored: value === '' ? null : Math.min(c.total, Math.max(0, Number(value))) } : c
      );
      return { ...s, components };
    }));
  };

  const addSubject = (e) => {
    e.preventDefault();
    if (!newSubject.name.trim()) return;
    const s = {
      id: `s${Date.now()}`,
      code: newSubject.code || 'COURSE',
      name: newSubject.name,
      credits: Number(newSubject.credits) || 3,
      components: [
        { name: 'Midterm Examination', weight: 40, scored: null, total: 100 },
        { name: 'Coursework & Projects', weight: 20, scored: null, total: 100 },
        { name: 'Final Comprehensive Exam', weight: 40, scored: null, total: 100 },
      ],
    };
    setSubjects(prev => [...prev, s]);
    setActiveSubjectId(s.id);
    setShowAddModal(false);
    setNewSubject({ name: '', code: '', credits: 3 });
  };

  return (
    <div className="fade-in">
      {/* Course Selection Tab Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {subjects.map(s => {
            const isSelected = s.id === currentSubject.id;
            return (
              <button
                key={s.id}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveSubjectId(s.id)}
              >
                <span style={{ fontWeight: 800 }}>{s.code}</span> · {s.name.length > 18 ? s.name.slice(0, 18) + '...' : s.name}
              </button>
            );
          })}
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add Course
        </button>
      </div>

      <div className="grades-dashboard-layout">
        {/* Left Assessment Breakdown Table */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800 }}>{currentSubject.name}</h2>
                <span className="badge badge-indigo">{currentSubject.code}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                {currentSubject.credits} Credits · {currentSubject.instructor || 'Faculty Department'}
              </div>
            </div>
            <span className={`badge ${currentGradeObj.color}`} style={{ fontSize: 12, padding: '4px 10px' }}>
              Current: {currentGradeObj.letter} ({currentPct ? currentPct.toFixed(1) : 0}%)
            </span>
          </div>

          {/* Assessment Table */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div className="assessment-row assessment-header">
              <span>Assessment Item</span>
              <span style={{ textAlign: 'center' }}>Weight</span>
              <span style={{ textAlign: 'center' }}>Score</span>
              <span style={{ textAlign: 'right' }}>Contribution</span>
            </div>

            {currentSubject.components.map((c, i) => {
              const contribution = c.scored !== null ? ((c.scored / c.total) * c.weight).toFixed(1) : '—';
              return (
                <div key={i} className="assessment-row">
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{c.weight}%</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <input
                      type="number"
                      min={0}
                      max={c.total}
                      className="input"
                      style={{ width: 60, padding: '4px 6px', textAlign: 'center', fontSize: 13 }}
                      value={c.scored ?? ''}
                      placeholder="—"
                      onChange={e => updateScore(currentSubject.id, i, e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{c.total}</span>
                  </div>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-light)' }}>
                    {contribution !== '—' ? `${contribution}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Target Simulator Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* GPA Simulator Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Target size={16} style={{ color: 'var(--accent-light)' }} />
              <span style={{ fontSize: 14, fontWeight: 800 }}>Target Grade Simulator</span>
            </div>

            {/* Target Selector Buttons */}
            <div className="input-label">Select Goal for this Course</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { label: 'A (90%)', val: 90 },
                { label: 'A- (85%)', val: 85 },
                { label: 'B+ (80%)', val: 80 },
                { label: 'B (75%)', val: 75 },
                { label: 'C+ (65%)', val: 65 },
              ].map(g => (
                <button
                  key={g.val}
                  className={`btn btn-xs ${targetGrade === g.val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setTargetGrade(g.val);
                    if (g.val >= 85) sounds.playCelebration();
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Simulation Result */}
            {needed !== null ? (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Required Score on Remaining Finals
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: needed > 100 ? 'var(--rose)' : needed <= 70 ? 'var(--emerald)' : 'var(--accent-light)', margin: '8px 0' }}>
                  {needed.toFixed(1)}%
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  to guarantee a final grade of <strong>{gradeLabel(targetGrade).letter}</strong>
                </div>

                {needed > 100 && (
                  <div className="badge badge-rose" style={{ marginTop: 10 }}>
                    <AlertTriangle size={12} /> Target mathematically unreachable with current weights
                  </div>
                )}
                {needed <= 70 && (
                  <div className="badge badge-emerald" style={{ marginTop: 10 }}>
                    <CheckCircle2 size={12} /> Well on track! Maintain study pace
                  </div>
                )}
              </div>
            ) : (
              <div className="badge badge-emerald" style={{ padding: 12, width: '100%', justifyContent: 'center' }}>
                ✓ All assessments entered! Final grade locked in.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="command-palette-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="card fade-in" style={{ width: '90%', maxWidth: 440, background: 'var(--bg-modal)', zIndex: 110 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Add Enrolled Course</h3>
              <button className="btn-icon-subtle" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addSubject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Course Title</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Distributed Operating Systems"
                  value={newSubject.name}
                  onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Course Code</label>
                <input
                  className="input"
                  placeholder="e.g. CSC402"
                  value={newSubject.code}
                  onChange={e => setNewSubject({ ...newSubject, code: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Credit Units</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={6}
                  value={newSubject.credits}
                  onChange={e => setNewSubject({ ...newSubject, credits: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
