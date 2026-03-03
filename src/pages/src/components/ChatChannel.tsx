import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../apiFetch';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  channel: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
}

type Channel = 'announcements' | 'feedback';

interface Props {
  isLoggedIn: boolean;
  isOwner: boolean;
  lang: 'vi' | 'en';
  userName?: string;
}

// ─── Sound (Web Audio API — no external file) ─────────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* ignore — not supported */ }
}

// ─── Local storage helpers ────────────────────────────────────────────────────
const LS_KEY = 'ift-chat-lastseen';
function getLastSeen(): { announcements: number; feedback: number } {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch { return { announcements: 0, feedback: 0 }; }
}
function setLastSeen(channel: Channel, id: number) {
  const cur = getLastSeen();
  localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, [channel]: id }));
}

// ─── i18n labels ─────────────────────────────────────────────────────────────
const T = {
  vi: {
    announcements: 'Thông báo',
    feedback: 'Góp ý',
    placeholder_ann: 'Viết thông báo cho members...',
    placeholder_fb: 'Góp ý của bạn...',
    send: 'Gửi',
    empty: 'Chưa có tin nhắn nào.',
    toastTitle: 'Thông báo mới từ IFT!',
    ownerOnly: 'Chỉ owner mới có thể gửi thông báo.',
    loginRequired: 'Đăng nhập để gửi góp ý.',
    emailSent: (n: number) => `✓ Đã gửi email đến ${n} member(s)`,
    channel: 'Kênh',
    edit: 'Sửa',
    delete: 'Xóa',
    save: 'Lưu',
    cancel: 'Hủy',
    deleteConfirm: 'Xóa tin nhắn này?',
  },
  en: {
    announcements: 'Announcements',
    feedback: 'Feedback',
    placeholder_ann: 'Write an announcement for members...',
    placeholder_fb: 'Your feedback...',
    send: 'Send',
    empty: 'No messages yet.',
    toastTitle: 'New IFT Announcement!',
    ownerOnly: 'Only owner can post announcements.',
    loginRequired: 'Sign in to send feedback.',
    emailSent: (n: number) => `✓ Emailed ${n} member(s)`,
    channel: 'Channel',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    deleteConfirm: 'Delete this message?',
  },
};

// ─── Format timestamp ─────────────────────────────────────────────────────────
function fmtTime(dt: string) {
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: 'fixed', bottom: 88, right: 20, zIndex: 9999,
        background: '#1a202c', color: '#fff',
        borderLeft: '4px solid #38a169',
        borderRadius: 10, padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        maxWidth: 300, fontSize: 13, lineHeight: 1.5,
        animation: 'ift-slide-in 0.3s ease',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#68d391' }}>📢 {msg.split('\n')[0]}</div>
      <div style={{ color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {msg.slice(msg.indexOf('\n') + 1, 100)}{msg.length > 100 ? '…' : ''}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ChatChannel({ isLoggedIn, isOwner, lang, userName = '' }: Props) {
  const t = T[lang] ?? T.en;
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>('announcements');
  const [messages, setMessages] = useState<Record<Channel, ChatMessage[]>>({
    announcements: [],
    feedback: [],
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [testMode, setTestMode] = useState(false); // owner: preview before blast
  const [testSent, setTestSent] = useState(false);
  const [emailNote, setEmailNote] = useState('');
  const [unread, setUnread] = useState<Record<Channel, boolean>>({ announcements: false, feedback: false });
  const [toast, setToast] = useState<string | null>(null);
  const [blinking, setBlinking] = useState(false);
  const [loadedChannels, setLoadedChannels] = useState<Set<Channel>>(new Set());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [resendId, setResendId] = useState<number | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSending, setResendSending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load messages for a channel ────────────────────────────────────────────
  const loadMessages = useCallback(async (ch: Channel) => {
    try {
      const res = await fetch(`/api/chat/messages?channel=${ch}&since=0`);
      const json = await res.json() as { data: ChatMessage[] };
      setMessages((prev) => ({ ...prev, [ch]: json.data ?? [] }));
      setLoadedChannels((prev) => new Set([...prev, ch]));
    } catch { /* ignore */ }
  }, []);

  // ── Scroll to bottom when messages change ──────────────────────────────────
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, channel]);

  // ── Mark as seen when panel is open on that channel ───────────────────────
  useEffect(() => {
    if (!open) return;
    const msgs = messages[channel];
    if (msgs.length > 0) {
      const lastId = msgs[msgs.length - 1].id;
      setLastSeen(channel, lastId);
      setUnread((prev) => ({ ...prev, [channel]: false }));
    }
  }, [open, channel, messages]);

  // ── Load initial + switch channel ─────────────────────────────────────────
  useEffect(() => {
    if (open && !loadedChannels.has(channel)) {
      loadMessages(channel);
    }
  }, [open, channel, loadedChannels, loadMessages]);

  // ── Polling — check for new messages every 30s ────────────────────────────
  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/latest');
      const latest = await res.json() as { announcements: number; feedback: number };
      const seen = getLastSeen();

      const annNew = latest.announcements > (seen.announcements ?? 0);
      const fbNew = latest.feedback > (seen.feedback ?? 0);

      if (annNew) {
        // Fetch the actual new message(s) for toast content
        const r2 = await fetch(`/api/chat/messages?channel=announcements&since=${seen.announcements ?? 0}`);
        const j2 = await r2.json() as { data: ChatMessage[] };
        if (j2.data?.length) {
          setMessages((prev) => {
            // merge without duplicates
            const existing = new Set(prev.announcements.map((m) => m.id));
            const merged = [...prev.announcements, ...j2.data.filter((m) => !existing.has(m.id))];
            return { ...prev, announcements: merged };
          });
          if (!open || channel !== 'announcements') {
            setUnread((prev) => ({ ...prev, announcements: true }));
            setBlinking(true);
            playNotificationSound();
            setToast(j2.data[j2.data.length - 1].content);
            setTimeout(() => setBlinking(false), 8000);
          } else {
            // Panel open on announcements — mark seen immediately
            const lastId = j2.data[j2.data.length - 1].id;
            setLastSeen('announcements', lastId);
          }
        }
      }
      if (fbNew && isOwner) {
        const r3 = await fetch(`/api/chat/messages?channel=feedback&since=${seen.feedback ?? 0}`);
        const j3 = await r3.json() as { data: ChatMessage[] };
        if (j3.data?.length) {
          setMessages((prev) => {
            const existing = new Set(prev.feedback.map((m) => m.id));
            const merged = [...prev.feedback, ...j3.data.filter((m) => !existing.has(m.id))];
            return { ...prev, feedback: merged };
          });
          if (!open || channel !== 'feedback') {
            setUnread((prev) => ({ ...prev, feedback: true }));
          }
        }
      }
    } catch { /* ignore */ }
  }, [open, channel, isOwner]);

  useEffect(() => {
    poll(); // initial
    pollRef.current = setInterval(poll, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = async (opts?: { testEmail?: string }) => {
    if (!input.trim() || sending) return;
    setSending(true);
    setEmailNote('');
    try {
      const payload: Record<string, string> = { channel, content: input.trim() };
      if (opts?.testEmail) payload.test_email = opts.testEmail;
      const res = await apiFetch('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { data: ChatMessage | null; emailCount?: number; test?: boolean };
      if (json.test) {
        setTestSent(true);
        setEmailNote('✓ Test email sent to phamhuutri108@gmail.com — check your inbox!');
        return;
      }
      if (json.data) {
        setMessages((prev) => ({ ...prev, [channel]: [...prev[channel], json.data!] }));
        if (json.emailCount) setEmailNote(t.emailSent(json.emailCount));
      }
      setInput('');
      setTestSent(false);
      const seen = getLastSeen();
      if (json.data?.id) setLastSeen(channel, json.data.id);
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Reset test state when input changes
  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (testSent) setTestSent(false);
    if (emailNote) setEmailNote('');
  };

  // ── Delete message ─────────────────────────────────────────────────────────
  const deleteMessage = async (id: number) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await apiFetch(`/api/chat/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => ({
        announcements: prev.announcements.filter((m) => m.id !== id),
        feedback: prev.feedback.filter((m) => m.id !== id),
      }));
    } catch { /* ignore */ }
  };

  // ── Save edited message ────────────────────────────────────────────────────
  const saveEdit = async (id: number) => {
    const newContent = editContent.trim();
    if (!newContent) return;
    try {
      await apiFetch(`/api/chat/messages/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent }),
      });
      setMessages((prev) => ({
        announcements: prev.announcements.map((m) => m.id === id ? { ...m, content: newContent } : m),
        feedback: prev.feedback.map((m) => m.id === id ? { ...m, content: newContent } : m),
      }));
      setEditingId(null);
      setEditContent('');
    } catch { /* ignore */ }
  };

  // ── Resend message to one email ─────────────────────────────────────────────
  const resendMessage = async (id: number) => {
    if (!resendEmail.trim() || resendSending) return;
    setResendSending(true);
    try {
      await apiFetch(`/api/chat/messages/${id}/resend`, {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      setResendDone(true);
      setTimeout(() => {
        setResendId(null);
        setResendEmail('');
        setResendDone(false);
      }, 2500);
    } catch { /* ignore */ } finally {
      setResendSending(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalUnread = (unread.announcements ? 1 : 0) + (unread.feedback && isOwner ? 1 : 0);
  const canSend = channel === 'announcements' ? isOwner
    : channel === 'feedback' ? isLoggedIn
    : false;
  const showInput = canSend;

  return (
    <>
      <style>{`
        @keyframes ift-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ift-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(56,161,105,0.7); }
          70%  { box-shadow: 0 0 0 12px rgba(56,161,105,0); }
          100% { box-shadow: 0 0 0 0 rgba(56,161,105,0); }
        }
        @keyframes ift-blink-border {
          0%, 100% { box-shadow: 0 0 0 3px #38a169; }
          50%       { box-shadow: 0 0 0 6px rgba(56,161,105,0.3); }
        }
        .ift-chat-btn-blink {
          animation: ift-blink-border 1s ease-in-out infinite !important;
        }
      `}</style>

      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Floating button */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            // Load current channel if not yet loaded
            if (!loadedChannels.has(channel)) loadMessages(channel);
          }
        }}
        className={blinking ? 'ift-chat-btn-blink' : ''}
        title="IFT Channel"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#003a8c' : '#004aad',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,74,173,0.45)',
          transition: 'background 0.2s, transform 0.15s',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
      >
        <span style={{ fontSize: 22 }}>{open ? '✕' : '💬'}</span>
        {totalUnread > 0 && !open && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#e53e3e', color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
            animation: 'ift-pulse-ring 1.5s ease-in-out infinite',
          }}>{totalUnread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 88, right: 20, zIndex: 999,
            width: 340, height: 480,
            background: '#fff', borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'ift-slide-in 0.25s ease',
            fontFamily: "'Montserrat', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            background: '#004aad', color: '#fff',
            padding: '12px 16px 0',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              🎬 IFT Channel
            </div>
            {/* Channel tabs */}
            <div style={{ display: 'flex', gap: 0 }}>
              {(['announcements', 'feedback'] as Channel[]).map((ch) => {
                const label = ch === 'announcements' ? `📢 ${t.announcements}` : `💬 ${t.feedback}`;
                const active = channel === ch;
                const hasUnread = unread[ch] && (ch === 'announcements' || isOwner);
                return (
                  <button
                    key={ch}
                    onClick={() => {
                      setChannel(ch);
                      if (!loadedChannels.has(ch)) loadMessages(ch);
                    }}
                    style={{
                      flex: 1,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '7px 10px',
                      fontSize: 12, fontWeight: active ? 700 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                      borderBottom: `2px solid ${active ? '#fff' : 'transparent'}`,
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                    {hasUnread && (
                      <span style={{
                        display: 'inline-block', width: 7, height: 7,
                        background: '#68d391', borderRadius: '50%',
                        marginLeft: 5, verticalAlign: 'middle',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            background: '#f7fafc',
          }}>
            {messages[channel].length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a0aec0', fontSize: 13, marginTop: 40 }}>
                {t.empty}
              </div>
            ) : (
              messages[channel].map((m) => {
                const isMe = isOwner && m.author_role === 'owner';
                const isMember = !isOwner && m.author_role !== 'owner';
                const alignRight = isMe || isMember;
                const canAct = isOwner || m.author_name === userName;
                const isEditing = editingId === m.id;
                const isHovered = hoveredId === m.id;
                return (
                  <div
                    key={m.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: alignRight ? 'flex-end' : 'flex-start', position: 'relative' }}
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Action buttons shown on hover */}
                    {canAct && isHovered && !isEditing && resendId !== m.id && (
                      <div style={{
                        display: 'flex', gap: 4, marginBottom: 4,
                        flexDirection: alignRight ? 'row' : 'row-reverse',
                      }}>
                        <button
                          onClick={() => { setEditingId(m.id); setEditContent(m.content); }}
                          title={t.edit}
                          style={{
                            background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0',
                            borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 11,
                            color: '#4a5568', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                        >✏️ {t.edit}</button>
                        <button
                          onClick={() => deleteMessage(m.id)}
                          title={t.delete}
                          style={{
                            background: 'rgba(255,255,255,0.95)', border: '1px solid #fed7d7',
                            borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 11,
                            color: '#e53e3e', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                        >🗑 {t.delete}</button>
                        {/* Resend button — owner only, announcements only */}
                        {isOwner && channel === 'announcements' && (
                          <button
                            onClick={() => { setResendId(m.id); setResendEmail(''); setResendDone(false); }}
                            title="Gửi lại"
                            style={{
                              background: 'rgba(255,255,255,0.95)', border: '1px solid #bee3f8',
                              borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 11,
                              color: '#2b6cb0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                          >📧 Gửi lại</button>
                        )}
                      </div>
                    )}
                    {/* Resend panel — inline email input */}
                    {resendId === m.id && !isEditing && (
                      <div style={{
                        maxWidth: '90%', marginBottom: 6,
                        background: '#ebf8ff', border: '1px solid #bee3f8',
                        borderRadius: 8, padding: '8px 10px', fontSize: 12,
                      }}>
                        {resendDone ? (
                          <span style={{ color: '#2f855a', fontWeight: 600 }}>✓ Đã gửi!</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="email"
                              value={resendEmail}
                              onChange={(e) => setResendEmail(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') resendMessage(m.id); if (e.key === 'Escape') { setResendId(null); setResendEmail(''); } }}
                              placeholder="Email người nhận..."
                              autoFocus
                              style={{
                                flex: 1, border: '1px solid #bee3f8', borderRadius: 6,
                                padding: '4px 8px', fontSize: 12, outline: 'none',
                              }}
                            />
                            <button
                              onClick={() => resendMessage(m.id)}
                              disabled={resendSending || !resendEmail.trim()}
                              style={{
                                padding: '4px 10px', background: '#2b6cb0', color: '#fff',
                                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                opacity: !resendEmail.trim() ? 0.5 : 1,
                              }}
                            >{resendSending ? '…' : 'Gửi'}</button>
                            <button
                              onClick={() => { setResendId(null); setResendEmail(''); }}
                              style={{
                                padding: '4px 8px', background: 'transparent', color: '#718096',
                                border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                              }}
                            >Hủy</button>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Edit mode: inline textarea */}
                    {isEditing ? (
                      <div style={{ maxWidth: '90%', width: '90%' }}>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(m.id); }
                            if (e.key === 'Escape') { setEditingId(null); setEditContent(''); }
                          }}
                          rows={3}
                          autoFocus
                          style={{
                            width: '100%', resize: 'none', border: '2px solid #004aad',
                            borderRadius: 8, padding: '8px 10px', fontSize: 13,
                            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
                          <button
                            onClick={() => saveEdit(m.id)}
                            style={{
                              padding: '4px 12px', background: '#004aad', color: '#fff',
                              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            }}
                          >{t.save}</button>
                          <button
                            onClick={() => { setEditingId(null); setEditContent(''); }}
                            style={{
                              padding: '4px 12px', background: '#f7fafc', color: '#718096',
                              border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                            }}
                          >{t.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        maxWidth: '82%',
                        background: m.author_role === 'owner' ? '#004aad' : '#fff',
                        color: m.author_role === 'owner' ? '#fff' : '#2d3748',
                        borderRadius: m.author_role === 'owner'
                          ? '12px 12px 2px 12px'
                          : '12px 12px 12px 2px',
                        padding: '8px 12px',
                        fontSize: 13, lineHeight: 1.55,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        {m.content}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 2, paddingInline: 4 }}>
                      {m.author_name} · {fmtTime(m.created_at)}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Email sent note */}
          {emailNote && (
            <div style={{ padding: '4px 14px', fontSize: 11, color: '#38a169', background: '#f0fff4', flexShrink: 0 }}>
              {emailNote}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
            {showInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={onKey}
                    placeholder={channel === 'announcements' ? t.placeholder_ann : t.placeholder_fb}
                    rows={2}
                    style={{
                      flex: 1, resize: 'none', border: '1px solid #e2e8f0',
                      borderRadius: 8, padding: '8px 10px', fontSize: 13,
                      fontFamily: 'inherit', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={sending || !input.trim()}
                    style={{
                      padding: '8px 14px', background: '#004aad', color: '#fff',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, flexShrink: 0,
                      opacity: !input.trim() ? 0.5 : 1,
                    }}
                  >
                    {sending ? '…' : t.send}
                  </button>
                </div>
                {/* Owner announcement: test + confirm row */}
                {channel === 'announcements' && isOwner && input.trim() && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => send({ testEmail: 'phamhuutri108@gmail.com' })}
                      disabled={sending}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: testSent ? '#f0fff4' : '#fff',
                        color: testSent ? '#38a169' : '#718096',
                        border: `1px solid ${testSent ? '#68d391' : '#e2e8f0'}`,
                        borderRadius: 7, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      {testSent ? '✓ Test sent' : '🧪 Test email'}
                    </button>
                    {testSent && (
                      <button
                        onClick={() => send()}
                        disabled={sending}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          background: '#38a169', color: '#fff',
                          border: 'none', borderRadius: 7, cursor: 'pointer',
                          fontSize: 12, fontWeight: 700,
                        }}
                      >
                        📨 Send to all members
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#a0aec0', textAlign: 'center' }}>
                {channel === 'announcements' ? t.ownerOnly : t.loginRequired}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
