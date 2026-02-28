import { useState, useEffect } from 'react';
import { useI18n, type Lang } from './i18n';
import { Dashboard } from './components/Dashboard';
import { FestivalList } from './components/FestivalList';
import { FundList } from './components/FundList';
import { EducationList } from './components/EducationList';
import { MonitorList } from './components/MonitorList';
import { MyFilms } from './components/MyFilms';
import { Submissions } from './components/Submissions';
import { Watchlist } from './components/Watchlist';
import { AuthGate, useAuth, getAuthUserName } from './components/AuthGate';
import { UserManager } from './components/UserManager';
import { decodeJWT } from './apiFetch';

type Tab = 'dashboard' | 'festivals' | 'funds' | 'education' | 'monitors' | 'films' | 'submissions' | 'watchlist';

const VALID_TABS: Tab[] = ['dashboard', 'festivals', 'funds', 'education', 'monitors', 'films', 'submissions', 'watchlist'];

function tabFromPath(): Tab {
  const seg = window.location.pathname.replace(/^\//, '').split('/')[0] as Tab;
  return VALID_TABS.includes(seg) ? seg : 'dashboard';
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<Tab>(tabFromPath);
  const [showUsers, setShowUsers] = useState(false);
  const t = useI18n(lang);
  const { role, login, logout } = useAuth();
  const isOwner = role === 'owner';
  // Members and owners can edit their own per-user data
  const isLoggedIn = role === 'owner' || role === 'member';

  // Sync URL → tab on browser back/forward
  useEffect(() => {
    const onPop = () => setTab(tabFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Handle Google OAuth callback — URL contains ?token=<jwt>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      const payload = decodeJWT(token);
      if (payload) {
        login(payload.role as 'owner' | 'member', token);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!role) return <AuthGate onAuth={login} />;

  const userName = getAuthUserName();

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: t.nav.dashboard, icon: '📊' },
    { key: 'festivals', label: t.nav.festivals, icon: '🎬' },
    { key: 'funds', label: t.nav.funds, icon: '💰' },
    { key: 'education', label: t.nav.education, icon: '🎓' },
    { key: 'monitors', label: t.nav.monitors, icon: '🔔' },
    { key: 'films', label: t.nav.films, icon: '🎞️' },
    { key: 'submissions', label: t.nav.submissions, icon: '📋' },
    { key: 'watchlist', label: t.watchlist.title, icon: '⭐' },
  ];

  const roleBadge =
    isOwner ? '🔑 Owner'
    : role === 'member' ? `👤 ${userName ?? 'Member'}`
    : '👁 Guest';

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Montserrat', system-ui, -apple-system, sans-serif" }}>
      {/* Sticky header + nav wrapper */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Header */}
      <header
        style={{
          background: '#004aad',
          color: '#fff',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 72,
          boxShadow: '0 2px 8px rgba(0,74,173,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/ift-logo_landscape.png" alt="Indie Filmmaking Tracker" style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            padding: '3px 10px', borderRadius: 20,
            background: isOwner ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            color: isOwner ? '#fff' : 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.25)',
            maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {roleBadge}
          </span>
          <button
            onClick={logout}
            title="Sign out / Switch role"
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer', fontSize: 12,
            }}
          >
            ⇄
          </button>
          {isOwner && (
            <button
              onClick={() => setShowUsers(true)}
              title="Quản lý user"
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', fontSize: 14,
              }}
            >
              👥
            </button>
          )}
          <button
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {lang === 'en' ? '🇻🇳 VI' : '🇬🇧 EN'}
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav
        style={{
          background: '#003a8c',
          padding: '0 20px',
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); window.history.pushState({}, '', `/${key}`); }}
            style={{
              background: 'transparent',
              color: tab === key ? '#fff' : 'rgba(255,255,255,0.6)',
              border: 'none',
              borderBottom: `2px solid ${tab === key ? '#fff' : 'transparent'}`,
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: 13,
              whiteSpace: 'nowrap',
              fontWeight: tab === key ? 700 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s',
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      </div>{/* end sticky wrapper */}

      {showUsers && <UserManager onClose={() => setShowUsers(false)} />}

      {/* Content */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px' }}>
        {tab === 'dashboard'   && <Dashboard t={t} />}
        {tab === 'festivals'   && <FestivalList t={t} isOwner={isOwner} isLoggedIn={isLoggedIn} />}
        {tab === 'funds'       && <FundList t={t} isOwner={isOwner} isLoggedIn={isLoggedIn} />}
        {tab === 'education'   && <EducationList t={t} isOwner={isOwner} isLoggedIn={isLoggedIn} />}
        {tab === 'monitors'    && <MonitorList t={t} isOwner={isLoggedIn} />}
        {tab === 'films'       && <MyFilms t={t} isOwner={isLoggedIn} />}
        {tab === 'submissions' && <Submissions t={t} isOwner={isLoggedIn} />}
        {tab === 'watchlist'   && <Watchlist t={t} isOwner={isLoggedIn} />}
      </main>
    </div>
  );
}
