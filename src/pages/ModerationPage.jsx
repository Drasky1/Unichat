import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  XCircle,
  Flag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ModerationPage() {
  const { moderationReports, resolveModerationReport } = useApp();
  const openReports = moderationReports.filter(report => report.status === 'open');

  return (
    <div className="fade-in" style={{ maxWidth: 840, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} style={{ color: 'var(--sky)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Campus Moderation & Safety Queue</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Review flagged messages and automated content filter escalations
          </p>
        </div>
        <span className={`badge ${openReports.length > 0 ? 'badge-amber' : 'badge-emerald'}`}>
          {openReports.length} Open Escalations
        </span>
      </div>

      {moderationReports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <ShieldCheck size={40} style={{ color: 'var(--emerald)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 800 }}>Moderation Queue Clean</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            All campus channels are compliant. New reports and safety flags will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {moderationReports.map(report => (
            <div key={report.id} className="card" style={{ opacity: report.status === 'resolved' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{report.reason}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    Channel: <strong>{report.communityName}</strong> · Author: {report.messageAuthor} · Trigger: {report.source}
                  </div>
                </div>
                <span className={`badge ${report.severity === 'high' ? 'badge-rose' : 'badge-amber'}`}>
                  {report.severity} Priority
                </span>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {report.messageText}
              </div>

              {report.status === 'open' ? (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => resolveModerationReport(report.id, 'dismissed')}
                  >
                    <XCircle size={14} /> Dismiss Report
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => resolveModerationReport(report.id, 'removed')}
                  >
                    <Trash2 size={14} /> Confirm Removal
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} />
                  Resolution: <strong>{report.resolution}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}