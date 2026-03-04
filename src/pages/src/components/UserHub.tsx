import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { MonitorList } from './MonitorList';
import { MyFilms } from './MyFilms';
import { Submissions } from './Submissions';
import { Watchlist } from './Watchlist';

type SubTab = 'monitors' | 'your-films' | 'submissions' | 'watchlist';

const SUB_TABS: SubTab[] = ['monitors', 'your-films', 'submissions', 'watchlist'];

function subTabFromPath(): SubTab {
  const parts = window.location.pathname.replace(/^\//, '').split('/');
  if (parts[0] === 'user' && parts[1] && (SUB_TABS as string[]).includes(parts[1])) {
    return parts[1] as SubTab;
  }
  // legacy paths
  if (parts[0] === 'monitors') return 'monitors';
  if (parts[0] === 'films' || parts[0] === 'your-films') return 'your-films';
  if (parts[0] === 'submissions') return 'submissions';
  if (parts[0] === 'watchlist') return 'watchlist';
  return 'monitors';
}

// ─── Guest Wall ───────────────────────────────────────────────────────────────
function GuestWall({ lang, onSignIn }: { lang: string; onSignIn?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2d3748', marginBottom: 10 }}>
        {lang === 'vi' ? 'Đăng nhập để sử dụng tính năng này' : 'Sign in to use this feature'}
      </h2>
      <p style={{ fontSize: 14, color: '#718096', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
        {lang === 'vi'
          ? 'Đăng nhập để thiết lập monitor, quản lý phim, theo dõi nộp phim và nhận cảnh báo deadline.'
          : 'Sign in to set up monitors, manage your films, track submissions, and receive deadline alerts.'}
      </p>
      {onSignIn && (
        <button
          onClick={onSignIn}
          style={{
            background: '#004aad', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 28px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {lang === 'vi' ? 'Đăng nhập' : 'Sign in'}
        </button>
      )}
    </div>
  );
}

// ─── UserHub ──────────────────────────────────────────────────────────────────
export function UserHub({
  t,
  lang,
  isLoggedIn,
  isOwner,
  onSignIn,
}: {
  t: ReturnType<typeof useI18n>;
  lang: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  onSignIn?: () => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>(subTabFromPath);

  // Sync sub-tab on browser back/forward
  useEffect(() => {
    const onPop = () => setSubTab(subTabFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (st: SubTab) => {
    window.history.pushState({}, '', `/user/${st}`);
    setSubTab(st);
  };

  const subTabLabel = (st: SubTab): string => {
    const n = t.nav as any;
    if (st === 'monitors')    return n.monitors    ?? 'Monitors';
    if (st === 'your-films')  return n.yourFilms   ?? 'Your Films';
    if (st === 'submissions') return n.submissions ?? 'Submissions';
    if (st === 'watchlist')   return n.watchlist   ?? 'Watchlist';
    return st;
  };

  if (!isLoggedIn) return <GuestWall lang={lang} onSignIn={onSignIn} />;

  return (
    <div style={{ minHeight: '60vh' }}>
      {/* Sub-tab bar */}
      <div style={{
        background: '#f0f4ff',
        borderBottom: '2px solid #dbe4ff',
        padding: '0 20px',
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {SUB_TABS.map(st => (
          <button
            key={st}
            onClick={() => navigate(st)}
            style={{
              background: 'transparent',
              color: subTab === st ? '#004aad' : '#718096',
              border: 'none',
              borderBottom: `3px solid ${subTab === st ? '#004aad' : 'transparent'}`,
              padding: '12px 18px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: subTab === st ? 700 : 500,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {subTabLabel(st)}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px' }}>
        {subTab === 'monitors'    && <MonitorList t={t} isOwner={isLoggedIn} />}
        {subTab === 'your-films'  && <MyFilms t={t} isOwner={isLoggedIn} />}
        {subTab === 'submissions' && <Submissions t={t} isOwner={isLoggedIn} />}
        {subTab === 'watchlist'   && <Watchlist t={t} isOwner={isLoggedIn} />}
      </div>
    </div>
  );
}
