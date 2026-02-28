import { useState, useEffect } from 'react';
import { useI18n, type Lang } from './i18n';
import { Home } from './components/Home';
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

type Tab = 'home' | 'dashboard' | 'festivals' | 'funds' | 'education' | 'monitors' | 'films' | 'submissions' | 'watchlist';

const VALID_TABS: Tab[] = ['home', 'dashboard', 'festivals', 'funds', 'education', 'monitors', 'films', 'submissions', 'watchlist'];

function tabFromPath(): Tab {
  const seg = window.location.pathname.replace(/^\//, '').split('/')[0];
  if (seg === '' || seg === 'home') return 'home';
  if (seg === 'sign-in') return 'home'; // sign-in is an overlay, not a tab
  return (VALID_TABS as string[]).includes(seg) ? seg as Tab : 'home';
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<Tab>(tabFromPath);
  const [showUsers, setShowUsers] = useState(false);
  const [showSignIn, setShowSignIn] = useState(() => window.location.pathname === '/sign-in');
  const t = useI18n(lang);
  const { role, login, logout } = useAuth();
  const isOwner = role === 'owner';
  const isLoggedIn = role === 'owner' || role === 'member';

  // Sync URL → tab + sign-in overlay on browser back/forward
  useEffect(() => {
    const onPop = () => {
      setShowSignIn(window.location.pathname === '/sign-in');
      setTab(tabFromPath());
    };
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
      window.history.replaceState({}, '', '/dashboard');
      setTab('dashboard');
    }
  }, []);

  const handleSignIn = () => {
    window.history.pushState({}, '', '/sign-in');
    setShowSignIn(true);
  };

  const handleSignOut = () => {
    logout();
    setTab('home');
    window.history.pushState({}, '', '/');
  };

  const handleAuthClose = () => {
    setShowSignIn(false);
    window.history.replaceState({}, '', tab === 'home' ? '/' : `/${tab}`);
  };

  const handleAuth = (newRole: import('./components/AuthGate').Role, token?: string) => {
    login(newRole, token);
    setShowSignIn(false);
    if (newRole && newRole !== 'guest') {
      setTab('dashboard');
      window.history.replaceState({}, '', '/dashboard');
    } else {
      window.history.replaceState({}, '', '/');
    }
  };

  const userName = getAuthUserName();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home',        label: 'Home' },
    { key: 'dashboard',   label: t.nav.dashboard },
    { key: 'festivals',   label: t.nav.festivals },
    { key: 'funds',       label: t.nav.funds },
    { key: 'education',   label: t.nav.education },
    { key: 'monitors',    label: t.nav.monitors },
    { key: 'films',       label: t.nav.films },
    { key: 'submissions', label: t.nav.submissions },
    { key: 'watchlist',   label: t.watchlist.title },
  ];

  const roleBadge =
    isOwner ? 'Owner'
    : role === 'member' ? (userName ?? 'Member')
    : 'Guest';

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Montserrat', system-ui, -apple-system, sans-serif" }}>

      {/* Sign-in overlay */}
      {showSignIn && <AuthGate onAuth={handleAuth} onClose={handleAuthClose} />}

      {/* Sticky header + nav wrapper */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>

        {/* Header */}
        <header style={{
          background: '#004aad', color: '#fff',
          padding: '0 20px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          height: 64, boxShadow: '0 2px 8px rgba(0,74,173,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src="/ift-logo_landscape.png"
              alt="Indie Filmmaking Tracker"
              style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <a
              href="https://www.phamhuutri.com"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              MY WEBSITE
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Sign in / Sign out — leftmost */}
            {isLoggedIn ? (
              <button
                onClick={handleSignOut}
                style={headerBtn}
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                style={{ ...headerBtn, background: 'rgba(255,255,255,0.2)', fontWeight: 700 }}
              >
                Sign in
              </button>
            )}

            {/* Role badge */}
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: 20,
              background: isOwner ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              color: isOwner ? '#fff' : 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.25)',
              maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {roleBadge}
            </span>

            {/* Manage users (owner only) */}
            {isOwner && (
              <button
                onClick={() => setShowUsers(true)}
                title="Manage users"
                style={headerBtn}
              >
                Users
              </button>
            )}

            {/* Language toggle — no flag */}
            <button
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              style={{ ...headerBtn, background: 'rgba(255,255,255,0.15)', fontWeight: 700 }}
            >
              {lang === 'en' ? 'VI' : 'EN'}
            </button>
          </div>
        </header>

        {/* Nav */}
        <nav style={{
          background: '#003a8c', padding: '0 20px',
          display: 'flex', gap: 2,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); window.history.pushState({}, '', key === 'home' ? '/' : `/${key}`); }}
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
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {showUsers && <UserManager onClose={() => setShowUsers(false)} />}

      {/* Content */}
      <main style={{ maxWidth: tab === 'home' ? 'none' : 960, margin: '0 auto', padding: tab === 'home' ? '0' : '28px 16px' }}>
        {tab === 'home'        && <Home lang={lang} />}
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

const headerBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  padding: '4px 12px',
  cursor: 'pointer',
  fontSize: 13,
};
