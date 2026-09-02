import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Search,
  Pin,
  MoreVertical,
  Flag,
  CheckCircle2,
  Users,
  Sparkles,
  ShieldCheck,
  Mic,
  Trash2,
  StopCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import VoiceNoteBubble from '../components/VoiceNoteBubble';
import { COMMUNITIES, COMMUNITY_MESSAGES, COPILOT_RESPONSES } from '../data/mockData';
import { classifyMessage } from '../data/moderation';
import { sounds } from '../utils/audio';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeMessageRow(row, currentUserId) {
  const author = row.profiles || {};
  return {
    id: row.id,
    userId: row.author_id,
    name: author.name || 'Unknown',
    avatar: { image: author.avatar_image, initials: author.avatar_initials },
    university: author.university,
    role: author.role === 'moderator' ? 'Moderator' : undefined,
    time: formatTime(row.created_at),
    createdAt: row.created_at,
    text: row.body,
    isOwn: row.author_id === currentUserId,
    isPinned: row.is_pinned,
    reactions: [],
  };
}

function aggregateReactions(reactionRows, messageId) {
  const rows = reactionRows.filter(r => r.message_id === messageId);
  const counts = {};
  rows.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
  return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
}

export default function CommunitiesPage() {
  const { user, recordActivity, addModerationReport } = useApp();

  const [communities, setCommunities] = useState(() => {
    if (isSupabaseConfigured) return [];
    return COMMUNITIES.filter(c => !c.university || c.university === user.university);
  });
  const [communityStats, setCommunityStats] = useState({}); // { [universityOrAll]: memberCount }
  const [loadingCommunities, setLoadingCommunities] = useState(isSupabaseConfigured);
  const [activeCommunity, setActiveCommunity] = useState(() => {
    if (isSupabaseConfigured) return null;
    const userCommunities = COMMUNITIES.filter(c => !c.university || c.university === user.university);
    return userCommunities[0] || COMMUNITIES[0];
  });

  const [dbMessages, setDbMessages] = useState([]); // real, persisted messages for the active community
  const [reactionRows, setReactionRows] = useState([]); // raw reaction rows for loaded messages
  const [ephemeralByCommunity, setEphemeralByCommunity] = useState(isSupabaseConfigured ? {} : COMMUNITY_MESSAGES); // voice notes + AI Copilot replies — local-only demo features, not persisted yet
  const [loadedMessagesFor, setLoadedMessagesFor] = useState(null); // id of the community whose messages are currently loaded
  const loadingMessages = isSupabaseConfigured && !!activeCommunity && loadedMessagesFor !== activeCommunity.id;

  const [inputVal, setInputVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportedMessageIds, setReportedMessageIds] = useState(new Set());
  const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set());
  const [moderationNotice, setModerationNotice] = useState('');

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);

  const messagesEndRef = useRef(null);

  // ── Load communities (real only — mock mode is set via initial state above) ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    (async () => {
      const [{ data: communityRows }, { data: profileRows }] = await Promise.all([
        supabase.from('communities').select('*').order('name'),
        supabase.from('profiles').select('university, last_active_date'),
      ]);
      if (cancelled) return;

      const today = new Date().toISOString().slice(0, 10);
      const stats = {};
      (profileRows || []).forEach(p => {
        const key = p.university;
        if (!stats[key]) stats[key] = { members: 0, activeToday: 0 };
        stats[key].members += 1;
        if (p.last_active_date === today) stats[key].activeToday += 1;
      });
      const totalMembers = (profileRows || []).length;
      const totalActiveToday = (profileRows || []).filter(p => p.last_active_date === today).length;
      stats.__all__ = { members: totalMembers, activeToday: totalActiveToday };

      setCommunityStats(stats);
      setCommunities(communityRows || []);
      setActiveCommunity((communityRows || [])[0] || null);
      setLoadingCommunities(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Load messages + reactions for the active community, and subscribe live ──
  useEffect(() => {
    if (!isSupabaseConfigured || !activeCommunity) return;

    let cancelled = false;

    (async () => {
      const { data: messageRows } = await supabase
        .from('messages')
        .select('*, profiles(name, avatar_image, avatar_initials, university, role)')
        .eq('community_id', activeCommunity.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;

      const ids = (messageRows || []).map(m => m.id);
      const { data: reactions } = ids.length
        ? await supabase.from('message_reactions').select('*').in('message_id', ids)
        : { data: [] };
      if (cancelled) return;

      setDbMessages(messageRows || []);
      setReactionRows(reactions || []);
      setLoadedMessagesFor(activeCommunity.id);
    })();

    const channel = supabase
      .channel(`messages-${activeCommunity.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `community_id=eq.${activeCommunity.id}` }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_image, avatar_initials, university, role')
          .eq('id', payload.new.author_id)
          .single();
        setDbMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, { ...payload.new, profiles: profile }]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
        const row = payload.new || payload.old;
        setDbMessages(current => {
          if (!current.some(m => m.id === row.message_id)) return current; // not a message in this channel
          if (payload.eventType === 'DELETE') {
            setReactionRows(prev => prev.filter(r => !(r.message_id === row.message_id && r.user_id === row.user_id && r.emoji === row.emoji)));
          } else {
            setReactionRows(prev => [...prev, row]);
          }
          return current;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on the stable id, not the object reference, to avoid refetch loops
  }, [activeCommunity?.id]);

  // Combine real (persisted) messages with local-only ephemeral ones (voice notes, AI Copilot replies)
  const messages = useMemo(() => {
    if (!activeCommunity) return [];
    const real = isSupabaseConfigured
      ? dbMessages.map(row => ({ ...normalizeMessageRow(row, user.id), reactions: aggregateReactions(reactionRows, row.id) }))
      : (ephemeralByCommunity[activeCommunity.id] || []);
    const ephemeral = isSupabaseConfigured ? (ephemeralByCommunity[activeCommunity.id] || []) : [];
    return [...real, ...ephemeral].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [dbMessages, reactionRows, ephemeralByCommunity, activeCommunity, user.id]);

  const pinnedMessage = messages.find(m => m.isPinned);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  const addEphemeralMessage = (msg) => {
    setEphemeralByCommunity(prev => ({
      ...prev,
      [activeCommunity.id]: [...(prev[activeCommunity.id] || []), msg],
    }));
  };

  const startVoiceRecording = () => {
    sounds.init();
    setRecordSeconds(0);
    setIsRecording(true);
  };

  const cancelVoiceRecording = () => {
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const sendVoiceNote = () => {
    if (!isRecording) return;
    const durationStr = `0:0${Math.max(1, recordSeconds)}`;
    setIsRecording(false);
    recordActivity('community_post');
    sounds.playSend();

    // Voice notes aren't uploaded/persisted yet — this is still a local-only
    // demo of the interaction (no real audio is recorded or stored).
    addEphemeralMessage({
      id: `vm${Date.now()}`,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      university: user.university,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      isVoice: true,
      duration: durationStr,
      isOwn: true,
      reactions: [],
    });
    setRecordSeconds(0);
  };

  const sendMessage = async () => {
    const text = inputVal.trim();
    if (!text || !activeCommunity) return;

    const classification = classifyMessage(text);
    if (classification.action === 'hide') {
      addModerationReport({
        communityName: activeCommunity.name,
        messageAuthor: user.name,
        messageText: text,
        source: 'automatic safety filter',
        severity: classification.severity,
        reason: classification.reason,
      });
      setInputVal('');
      setModerationNotice('Message hidden by safety filter for moderator review.');
      return;
    }

    recordActivity();
    sounds.playSend();
    setInputVal('');
    setModerationNotice('');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('messages')
        .insert({ community_id: activeCommunity.id, author_id: user.id, body: text })
        .select('*, profiles(name, avatar_image, avatar_initials, university, role)')
        .single();
      if (!error && data) {
        setDbMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
      }
    } else {
      addEphemeralMessage({
        id: `m${Date.now()}`,
        userId: user.id || 'u1',
        name: user.name,
        avatar: user.avatar,
        university: user.university,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        text,
        isOwn: true,
        reactions: [],
      });
    }

    // AI Copilot is still a scripted local demo, not a real model call, and
    // its replies aren't persisted — flagged here rather than in the UI.
    if (text.toLowerCase().includes('@copilot') || text.toLowerCase().includes('@ai')) {
      setTimeout(() => {
        sounds.playReceive();
        addEphemeralMessage({
          id: `ai${Date.now()}`,
          userId: 'ai',
          name: 'UniCopilot (Academic AI)',
          avatar: { initials: 'AI', gradient: 'linear-gradient(135deg, #4f46e5, #0ea5e9)' },
          isAI: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
          text: COPILOT_RESPONSES[Math.floor(Math.random() * COPILOT_RESPONSES.length)],
          reactions: [{ emoji: '🧠', count: 1 }],
        });
      }, 900);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleReaction = async (msgId, emoji) => {
    recordActivity();

    if (!isSupabaseConfigured) {
      setEphemeralByCommunity(prev => {
        const msgs = (prev[activeCommunity.id] || []).map(m => {
          if (m.id !== msgId) return m;
          const existing = m.reactions?.find(r => r.emoji === emoji);
          if (existing) {
            return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r) };
          }
          return { ...m, reactions: [...(m.reactions || []), { emoji, count: 1 }] };
        });
        return { ...prev, [activeCommunity.id]: msgs };
      });
      return;
    }

    const mine = reactionRows.find(r => r.message_id === msgId && r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      setReactionRows(prev => prev.filter(r => r !== mine));
      await supabase.from('message_reactions').delete().eq('message_id', msgId).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      const optimistic = { message_id: msgId, user_id: user.id, emoji };
      setReactionRows(prev => [...prev, optimistic]);
      await supabase.from('message_reactions').insert(optimistic);
    }
  };

  const reportMessage = (msg) => {
    if (reportedMessageIds.has(msg.id)) return;
    const classification = classifyMessage(msg.text || 'Voice Message');
    addModerationReport({
      messageId: typeof msg.id === 'string' && msg.id.includes('-') ? msg.id : undefined, // only real DB messages have UUIDs
      communityName: activeCommunity.name,
      messageAuthor: msg.name,
      messageText: msg.text || 'Voice Message',
      source: 'student report',
      severity: classification.severity,
      reason: classification.reason,
    });
    setReportedMessageIds(prev => new Set([...prev, msg.id]));
    if (classification.action === 'hide') {
      setHiddenMessageIds(prev => new Set([...prev, msg.id]));
      setModerationNotice('Message hidden and forwarded to moderation queue.');
    } else {
      setModerationNotice('Report submitted to channel admin.');
    }
  };

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.desc || c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsFor = (community) => {
    if (!isSupabaseConfigured) return { members: community.members, activeToday: community.online };
    const key = community.university || '__all__';
    return communityStats[key] || { members: 0, activeToday: 0 };
  };

  if (isSupabaseConfigured && (loadingCommunities || !activeCommunity)) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
        Loading communities…
      </div>
    );
  }

  return (
    <div className="chat-workspace fade-in">
      {/* Left Chat List */}
      <div className="channels-sidebar">
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              style={{ borderRadius: 'var(--radius-full)', paddingLeft: 32, fontSize: 12.5, padding: '7px 12px 7px 32px' }}
              placeholder="Search channels & rooms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: 11, top: 9, color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredCommunities.map(c => {
            const isSelected = activeCommunity.id === c.id;
            const channelMsgs = isSupabaseConfigured
              ? (c.id === activeCommunity.id ? messages : [])
              : (ephemeralByCommunity[c.id] || []);
            const lastMsg = channelMsgs[channelMsgs.length - 1];

            return (
              <div
                key={c.id}
                className={`channel-nav-item ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveCommunity(c)}
              >
                <div className="channel-item-avatar">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="channel-item-details">
                  <div className="channel-item-top-row">
                    <span className="channel-item-name">{c.name}</span>
                    <span className="channel-item-time">{lastMsg?.time || ''}</span>
                  </div>

                  <div className="channel-item-sub-row">
                    <span className="channel-item-preview">
                      {lastMsg ? (lastMsg.isVoice ? '🎤 Voice Message' : `${lastMsg.name.split(' ')[0]}: ${lastMsg.text}`) : (c.desc || c.description)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Modern Chat Stream */}
      <div className="chat-main-panel">
        {/* Chat Header */}
        <div className="chat-stream-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="channel-item-avatar" style={{ width: 38, height: 38, fontSize: 13 }}>
              {activeCommunity.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="chat-channel-title-row">
                <span className="chat-channel-title">{activeCommunity.name}</span>
                {activeCommunity.verified && <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />}
              </div>
              <div className="chat-channel-desc">
                {statsFor(activeCommunity).members} members, <span style={{ color: 'var(--tg-online)', fontWeight: 600 }}>{statsFor(activeCommunity).activeToday} active today</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn-icon-subtle" title="Search messages">
              <Search size={16} />
            </button>
            <button className="btn-icon-subtle" title="Channel members">
              <Users size={16} />
            </button>
            <button className="btn-icon-subtle" title="More options">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Pinned Announcement Bar */}
        {pinnedMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 18px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            fontSize: 12,
            cursor: 'pointer',
          }}>
            <Pin size={13} style={{ color: 'var(--accent)', transform: 'rotate(45deg)' }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Pinned Notice: </span>
              <span style={{ color: 'var(--text-secondary)' }}>{pinnedMessage.text?.slice(0, 80)}...</span>
            </div>
          </div>
        )}

        {/* Message Bubbles Stream */}
        <div className="chat-messages-container">
          {moderationNotice && (
            <div className="badge badge-amber" style={{ padding: '8px 12px', justifyContent: 'center', alignSelf: 'center' }}>
              <ShieldCheck size={14} /> {moderationNotice}
            </div>
          )}

          {loadingMessages && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12.5 }}>
              Loading messages…
            </div>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12.5 }}>
              No messages yet — be the first to say something here.
            </div>
          )}

          {messages.filter(msg => !hiddenMessageIds.has(msg.id)).map(msg => {
            const isOwn = msg.isOwn || msg.userId === user.id;

            return (
              <div
                key={msg.id}
                className={`chat-message-row ${isOwn ? 'is-own' : ''} ${msg.isAI ? 'is-ai' : ''}`}
              >
                {!isOwn && (
                  <Avatar avatar={msg.avatar} name={msg.name} size="sm" />
                )}

                <div className="tg-bubble">
                  {!isOwn && (
                    <div className="chat-msg-author">
                      {msg.name}
                      {msg.role && <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 6, fontWeight: 500 }}>({msg.role})</span>}
                      {msg.isAI && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>COPILOT</span>}
                    </div>
                  )}

                  {msg.isVoice ? (
                    <VoiceNoteBubble duration={msg.duration} isOwn={isOwn} />
                  ) : (
                    <div className="chat-msg-body">{msg.text}</div>
                  )}

                  {/* Bubble Footer */}
                  <div className="tg-msg-footer">
                    <span className="chat-msg-time">{msg.time}</span>
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="chat-msg-reactions">
                      {msg.reactions.map((r) => (
                        <button key={r.emoji} className="reaction-pill" onClick={() => toggleReaction(msg.id, r.emoji)}>
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isOwn && !msg.isAI && (
                  <button
                    className="btn-icon-subtle"
                    style={{ width: 22, height: 22, opacity: 0.4 }}
                    onClick={() => reportMessage(msg)}
                    title="Report"
                  >
                    <Flag size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Telegram-style Input Area with Voice Recorder Bar */}
        <div className="chat-input-wrapper">
          <div className="chat-input-box">
            {isRecording ? (
              /* Live Voice Recording Bar */
              <div className="voice-record-bar fade-in">
                <div className="voice-record-pulse" />
                <span className="voice-record-timer">
                  0:0{recordSeconds}
                </span>

                <div className="voice-record-wave-live">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="live-wave-bar"
                      style={{ animationDelay: `${(i % 5) * 0.12}s` }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="tg-input-btn"
                  onClick={cancelVoiceRecording}
                  title="Cancel recording"
                  style={{ color: 'var(--rose)' }}
                >
                  <Trash2 size={16} />
                </button>

                <button
                  type="button"
                  className="tg-send-btn"
                  onClick={sendVoiceNote}
                  title="Send voice message"
                >
                  <Send size={15} />
                </button>
              </div>
            ) : (
              /* Standard Text Input */
              <>
                <button className="tg-input-btn" title="Attach study material or image">
                  <Paperclip size={17} />
                </button>

                <textarea
                  className="chat-textarea"
                  rows={1}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message... (mention @Copilot for study help)"
                />

                <button
                  className="tg-input-btn"
                  title="Add reaction emoji"
                  onClick={() => setInputVal(prev => `${prev} 👍 `)}
                >
                  <Smile size={17} />
                </button>

                {inputVal.trim() ? (
                  <button
                    className="tg-send-btn"
                    onClick={sendMessage}
                    title="Send message"
                  >
                    <Send size={15} style={{ transform: 'translate(1px, 0)' }} />
                  </button>
                ) : (
                  <button
                    className="tg-send-btn"
                    style={{ background: 'var(--accent)' }}
                    onClick={startVoiceRecording}
                    title="Record voice note"
                  >
                    <Mic size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
