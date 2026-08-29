import React, { useState, useRef, useEffect } from 'react';
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

export default function CommunitiesPage() {
  const { user, recordActivity, addModerationReport } = useApp();
  
  // Get communities for user's university on first load
  const userCommunities = COMMUNITIES.filter(c => !c.university || c.university === user.university);
  const defaultCommunity = userCommunities.length > 0 ? userCommunities[0] : COMMUNITIES[0];
  
  const [activeCommunity, setActiveCommunity] = useState(defaultCommunity);
  const [messagesMap, setMessagesMap] = useState(COMMUNITY_MESSAGES);
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
  const messages = messagesMap[activeCommunity.id] || [];
  const pinnedMessage = messages.find(m => m.isPinned);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordSeconds(0);
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

  const startVoiceRecording = () => {
    sounds.init();
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
    recordActivity();
    sounds.playSend();

    const newVoiceMsg = {
      id: `vm${Date.now()}`,
      userId: user.id || 'u1',
      name: user.name,
      avatar: user.avatar,
      university: user.university,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoice: true,
      duration: durationStr,
      isOwn: true,
      reactions: [],
    };

    const updated = [...(messagesMap[activeCommunity.id] || []), newVoiceMsg];
    setMessagesMap({ ...messagesMap, [activeCommunity.id]: updated });
    setRecordSeconds(0);
  };

  const sendMessage = () => {
    const text = inputVal.trim();
    if (!text) return;

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

    const newMsg = {
      id: `m${Date.now()}`,
      userId: user.id || 'u1',
      name: user.name,
      avatar: user.avatar,
      university: user.university,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      isOwn: true,
      reactions: [],
    };

    const updated = [...(messagesMap[activeCommunity.id] || []), newMsg];
    setMessagesMap({ ...messagesMap, [activeCommunity.id]: updated });
    setInputVal('');
    setModerationNotice('');

    // Trigger AI Copilot response if @Copilot or @AI mentioned
    if (text.toLowerCase().includes('@copilot') || text.toLowerCase().includes('@ai')) {
      setTimeout(() => {
        sounds.playReceive();
        const aiMsg = {
          id: `ai${Date.now()}`,
          userId: 'ai',
          name: 'UniCopilot (Academic AI)',
          avatar: { initials: 'AI', gradient: 'linear-gradient(135deg, #4f46e5, #0ea5e9)' },
          isAI: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: COPILOT_RESPONSES[Math.floor(Math.random() * COPILOT_RESPONSES.length)],
          reactions: [{ emoji: '🧠', count: 1 }],
        };
        setMessagesMap(prev => ({
          ...prev,
          [activeCommunity.id]: [...(prev[activeCommunity.id] || []), aiMsg],
        }));
      }, 900);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleReaction = (msgId, emoji) => {
    recordActivity();
    setMessagesMap(prev => {
      const msgs = (prev[activeCommunity.id] || []).map(m => {
        if (m.id !== msgId) return m;
        const existing = m.reactions?.find(r => r.emoji === emoji);
        if (existing) {
          return {
            ...m,
            reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r),
          };
        }
        return {
          ...m,
          reactions: [...(m.reactions || []), { emoji, count: 1 }],
        };
      });
      return { ...prev, [activeCommunity.id]: msgs };
    });
  };

  const reportMessage = (msg) => {
    if (reportedMessageIds.has(msg.id)) return;
    const classification = classifyMessage(msg.text || 'Voice Message');
    addModerationReport({
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

  const filteredCommunities = userCommunities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            const channelMsgs = messagesMap[c.id] || [];
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
                    <span className="channel-item-time">{lastMsg?.time || '10:00 AM'}</span>
                  </div>

                  <div className="channel-item-sub-row">
                    <span className="channel-item-preview">
                      {lastMsg ? (lastMsg.isVoice ? '🎤 Voice Message' : `${lastMsg.name.split(' ')[0]}: ${lastMsg.text}`) : c.desc}
                    </span>
                    {c.unread > 0 && <span className="channel-item-badge">{c.unread}</span>}
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
                {activeCommunity.members} members, <span style={{ color: 'var(--tg-online)', fontWeight: 600 }}>{activeCommunity.online} online</span>
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

          {messages.filter(msg => !hiddenMessageIds.has(msg.id)).map(msg => {
            const isOwn = msg.isOwn || msg.userId === user.id || msg.userId === 'u1';

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
                      {msg.reactions.map((r, i) => (
                        <button key={i} className="reaction-pill" onClick={() => toggleReaction(msg.id, r.emoji)}>
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
