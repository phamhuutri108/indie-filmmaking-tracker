import { useState, useEffect } from 'react';
import { apiFetch } from '../apiFetch';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  status: string;
  avatar: string | null;
  created_at: string;
}

interface Film {
  id: number;
  title: string;
  year: number | null;
  genre: string | null;
  status: string;
  duration_min: number | null;
  director: string | null;
  created_at: string;
}

interface Submission {
  id: number;
  film_title: string | null;
  ref_name: string | null;
  ref_table: string;
  deadline: string | null;
  submitted_at: string | null;
  status: string;
  submission_platform: string | null;
  created_at: string;
}

interface WatchlistItem {
  id: number;
  ref_table: string;
  ref_id: number;
  ref_name: string | null;
  deadline: string | null;
  starred_at: string;
}

interface UserData {
  films: Film[];
  submissions: Submission[];
  watchlist: WatchlistItem[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  approved: { bg: '#F0FFF4', color: '#276749' },
  pending:  { bg: '#FFFFF0', color: '#744210' },
  blocked:  { bg: '#FFF5F5', color: '#C53030' },
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  owner:  { bg: '#e8f0fb', color: '#004aad' },
  member: { bg: '#F7FAFC', color: '#4A5568' },
};

const SUB_STATUS_COLOR: Record<string, string> = {
  accepted: '#276749', submitted: '#004aad', draft: '#718096',
  rejected: '#C53030', waitlisted: '#744210', withdrawn: '#a0aec0',
};

const FILM_STATUS_COLOR: Record<string, string> = {
  completed: '#276749', released: '#004aad', 'in-production': '#744210',
};

function UserDataPanel({ user, onClose }: { user: User; onClose: () => void }) {
  const [tab, setTab] = useState<'films' | 'submissions' | 'watchlist'>('films');
  const [data, setData] = useState<UserData>({ films: [], submissions: [], watchlist: [] });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  const loadTab = (t: 'films' | 'submissions' | 'watchlist') => {
    if (loaded.has(t)) return;
    setLoading(true);
    apiFetch(`/api/admin/users/${user.id}/${t}`)
      .then(r => r.json() as Promise<{ data: unknown[] }>)
      .then(d => {
        setData(prev => ({ ...prev, [t]: d.data ?? [] }));
        setLoaded(prev => new Set([...prev, t]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTab('films'); }, []);

  const switchTab = (t: 'films' | 'submissions' | 'watchlist') => {
    setTab(t);
    loadTab(t);
  };

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '6px 14px',
    border: 'none',
    borderBottom: tab === t ? '2px solid #004aad' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: tab === t ? 700 : 400,
    color: tab === t ? '#004aad' : '#718096',
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 680,
        maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 0', borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1a202c' }}>
                Dữ liệu của {user.name ?? user.email}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#718096' }}>{user.email}</p>
            </div>
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            <button style={tabStyle('films')} onClick={() => switchTab('films')}>
              Phim ({data.films.length})
            </button>
            <button style={tabStyle('submissions')} onClick={() => switchTab('submissions')}>
              Submission ({data.submissions.length})
            </button>
            <button style={tabStyle('watchlist')} onClick={() => switchTab('watchlist')}>
              Watchlist ({data.watchlist.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#718096', fontSize: 13 }}>Đang tải…</div>
          ) : tab === 'films' ? (
            data.films.length === 0
              ? <Empty text="Chưa có phim nào." />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.films.map(f => (
                    <div key={f.id} style={rowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                        <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                          {[f.year, f.genre, f.duration_min ? `${f.duration_min}m` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span style={{ ...pillStyle, color: FILM_STATUS_COLOR[f.status] ?? '#718096', background: '#f7fafc' }}>
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
          ) : tab === 'submissions' ? (
            data.submissions.length === 0
              ? <Empty text="Chưa có submission nào." />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.submissions.map(s => (
                    <div key={s.id} style={rowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.film_title ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                          → {s.ref_name ?? '—'}
                          {s.deadline ? ` · deadline ${s.deadline}` : ''}
                          {s.submission_platform ? ` · ${s.submission_platform}` : ''}
                        </div>
                      </div>
                      <span style={{ ...pillStyle, color: SUB_STATUS_COLOR[s.status] ?? '#718096', background: '#f7fafc' }}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
          ) : (
            data.watchlist.length === 0
              ? <Empty text="Watchlist trống." />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.watchlist.map(w => (
                    <div key={w.id} style={rowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{w.ref_name ?? `#${w.ref_id}`}</div>
                        <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                          {w.ref_table.replace('_', ' ')}
                          {w.deadline ? ` · deadline ${w.deadline}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0', fontSize: 13 }}>{text}</div>;
}

export function UserManager({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch('/api/auth/users')
      .then(r => r.json() as Promise<{ data: User[] }>)
      .then(d => setUsers(d.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    setBusy(id);
    await apiFetch(`/api/auth/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    });
    load();
    setBusy(null);
  };

  const block = async (id: number) => {
    setBusy(id);
    await apiFetch(`/api/auth/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'blocked' }),
    });
    load();
    setBusy(null);
  };

  const remove = async (user: User) => {
    if (!confirm(`Xóa user "${user.name ?? user.email}"? Thao tác này không thể hoàn tác.`)) return;
    setBusy(user.id);
    await apiFetch(`/api/auth/users/${user.id}`, { method: 'DELETE' });
    load();
    setBusy(null);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background: '#fff', borderRadius: 12,
          width: '100%', maxWidth: 680,
          maxHeight: '85vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}>
          {/* Header */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a202c' }}>👥 Quản lý User</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#718096' }}>
                {users.length} user · {users.filter(u => u.status === 'pending').length} đang chờ duyệt
              </p>
            </div>
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 24px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>Đang tải…</div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>Không có user nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {users.map(user => {
                  const statusStyle = STATUS_STYLE[user.status] ?? STATUS_STYLE.blocked;
                  const roleStyle = ROLE_STYLE[user.role] ?? ROLE_STYLE.member;
                  const isOwnerAccount = user.id === 1;
                  const isBusy = busy === user.id;

                  return (
                    <div key={user.id} style={{
                      border: '1px solid #e2e8f0',
                      borderLeft: `3px solid ${statusStyle.color}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#fff',
                      flexWrap: 'wrap',
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#e8f0fb',
                        overflow: 'hidden', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: '#004aad',
                      }}>
                        {user.avatar
                          ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (user.name?.[0] ?? user.email[0]).toUpperCase()
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c' }}>
                          {user.name ?? '—'}
                          {isOwnerAccount && <span style={{ fontSize: 11, color: '#718096', fontWeight: 400, marginLeft: 6 }}>(bạn)</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#718096' }}>{user.email}</div>
                        <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
                          Joined: {new Date(user.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </div>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ ...badge, background: roleStyle.bg, color: roleStyle.color }}>
                          {user.role}
                        </span>
                        <span style={{ ...badge, background: statusStyle.bg, color: statusStyle.color }}>
                          {user.status}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setViewingUser(user)}
                          style={{ ...actionBtn, background: '#ebf8ff', color: '#2b6cb0', borderColor: '#bee3f8' }}
                        >
                          Xem dữ liệu
                        </button>
                        {!isOwnerAccount && (
                          <>
                            {user.status === 'pending' && (
                              <button
                                onClick={() => approve(user.id)}
                                disabled={isBusy}
                                style={{ ...actionBtn, background: '#F0FFF4', color: '#276749', borderColor: '#C6F6D5' }}
                              >
                                {isBusy ? '…' : '✓ Duyệt'}
                              </button>
                            )}
                            {user.status === 'approved' && (
                              <button
                                onClick={() => block(user.id)}
                                disabled={isBusy}
                                style={{ ...actionBtn, background: '#FFFFF0', color: '#744210', borderColor: '#FEFCBF' }}
                              >
                                {isBusy ? '…' : 'Khóa'}
                              </button>
                            )}
                            {user.status === 'blocked' && (
                              <button
                                onClick={() => approve(user.id)}
                                disabled={isBusy}
                                style={{ ...actionBtn, background: '#F0FFF4', color: '#276749', borderColor: '#C6F6D5' }}
                              >
                                {isBusy ? '…' : 'Mở khóa'}
                              </button>
                            )}
                            <button
                              onClick={() => remove(user)}
                              disabled={isBusy}
                              style={{ ...actionBtn, background: '#FFF5F5', color: '#C53030', borderColor: '#FED7D7' }}
                            >
                              {isBusy ? '…' : 'Xóa'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewingUser && (
        <UserDataPanel user={viewingUser} onClose={() => setViewingUser(null)} />
      )}
    </>
  );
}

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, color: '#718096', padding: 4,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const badge: React.CSSProperties = {
  fontSize: 11, fontWeight: 700,
  borderRadius: 4, padding: '2px 8px',
  border: '1px solid transparent',
};

const actionBtn: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  border: '1px solid',
  borderRadius: 6, padding: '4px 10px',
  cursor: 'pointer',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px',
  background: '#fafafa',
};

const pillStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700,
  borderRadius: 20, padding: '2px 10px',
  border: '1px solid #e2e8f0',
  flexShrink: 0,
};
