import { useState, useEffect, useRef } from 'react';
import { useI18n, type Lang } from './i18n';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { FestivalList } from './components/FestivalList';
import { FundList } from './components/FundList';
import { EducationList } from './components/EducationList';
import { AuthGate, useAuth, getAuthUserName } from './components/AuthGate';
import { UserManager } from './components/UserManager';
import { ChatChannel } from './components/ChatChannel';
import { FestivalProfile } from './components/FestivalProfile';
import { FestivalInformation } from './components/FestivalInformation';
import { UserHub } from './components/UserHub';
import { decodeJWT } from './apiFetch';

type Tab = 'home' | 'dashboard' | 'festivals' | 'funds' | 'education' | 'festival-information' | 'user';

const VALID_TABS: Tab[] = ['home', 'dashboard', 'festivals', 'funds', 'education', 'festival-information', 'user'];

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function tabFromPath(): Tab {
  const seg = window.location.pathname.replace(/^\//, '').split('/')[0];
  if (seg === '' || seg === 'home') return 'home';
  if (seg === 'sign-in') return 'home';
  if (seg === 'festival') return 'festival-information'; // legacy route
  if (seg === 'festivals-information') return 'festival-information';
  if (seg === 'user') return 'user';
  // legacy sub-tabs now live under /user
  if (['monitors', 'films', 'your-films', 'submissions', 'watchlist'].includes(seg)) return 'user';
  return (VALID_TABS as string[]).includes(seg) ? seg as Tab : 'home';
}

function festivalIdFromPath(): number | null {
  const parts = window.location.pathname.replace(/^\//, '').split('/');
  // legacy: /festival/{id}
  if (parts[0] === 'festival' && parts[1] && !isNaN(Number(parts[1]))) return Number(parts[1]);
  // new: /festivals-information/{id}/{slug}
  if (parts[0] === 'festivals-information' && parts[1] && !isNaN(Number(parts[1]))) return Number(parts[1]);
  return null;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem('ift-lang') as Lang) ?? 'vi'
  );
  const [tab, setTab] = useState<Tab>(tabFromPath);
  const [selectedFestivalId, setSelectedFestivalId] = useState<number | null>(festivalIdFromPath);
  const [returnFestivalId, setReturnFestivalId] = useState<number | null>(null);
  const profileSourceRef = useRef<Tab>('festivals');
  const [showUsers, setShowUsers] = useState(false);
  const [showSignIn, setShowSignIn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    return path === '/sign-in' || path === '/owner' || params.get('auth_status') === 'pending';
  });
  const t = useI18n(lang);
  const { role, login, logout } = useAuth();
  const isOwner = role === 'owner';
  const isLoggedIn = role === 'owner' || role === 'member';

  // Persist language preference
  useEffect(() => { localStorage.setItem('ift-lang', lang); }, [lang]);

  // Sync URL → tab + sign-in overlay on browser back/forward
  useEffect(() => {
    const onPop = () => {
      setShowSignIn(window.location.pathname === '/sign-in');
      setTab(tabFromPath());
      setSelectedFestivalId(festivalIdFromPath());
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

  const handleOpenFestivalProfile = (id: number, name?: string) => {
    profileSourceRef.current = tab;
    // Save scroll position for the source tab
    if (tab === 'festivals') sessionStorage.setItem('fl-scrollY', String(window.scrollY));
    // FestivalInformation saves its own scrollY before calling this
    const slug = name ? slugify(name) : String(id);
    window.history.pushState({}, '', `/festivals-information/${id}/${slug}`);
    setTab('festival-information');
    setSelectedFestivalId(id);
  };

  const handleCloseFestivalProfile = () => {
    const source = profileSourceRef.current;
    setSelectedFestivalId(null);
    if (source === 'festival-information') {
      window.history.pushState({}, '', '/festivals-information');
      setTab('festival-information');
    } else {
      // Return to festivals tab and reopen the detail panel
      setReturnFestivalId(selectedFestivalId);
      window.history.pushState({}, '', '/festivals');
      setTab('festivals');
    }
  };

  const handleAuthClose = () => {
    setShowSignIn(false);
    if (tab === 'home') window.history.replaceState({}, '', '/');
    else if (tab === 'festival-information') window.history.replaceState({}, '', '/festivals-information');
    else if (tab === 'user') window.history.replaceState({}, '', window.location.pathname);
    else window.history.replaceState({}, '', `/${tab}`);
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
    { key: 'education',          label: t.nav.education },
    { key: 'festival-information', label: t.nav.festivalInformation },
    { key: 'user',                 label: (t.nav as any).user ?? 'User' },
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
            <span
              className={!isLoggedIn ? 'header-role-guest' : undefined}
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                padding: '3px 10px', borderRadius: 20,
                background: isOwner ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                color: isOwner ? '#fff' : 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.25)',
                maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
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
              onClick={() => {
                setTab(key);
                if (key === 'home') window.history.pushState({}, '', '/');
                else if (key === 'festival-information') window.history.pushState({}, '', '/festivals-information');
                else if (key === 'user') window.history.pushState({}, '', '/user/monitors');
                else window.history.pushState({}, '', `/${key}`);
              }}
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

      {/* Floating chat channel — only for logged-in users */}
      {isLoggedIn && <ChatChannel isLoggedIn={isLoggedIn} isOwner={isOwner} lang={lang} userName={getAuthUserName() ?? ''} />}

      {/* Content */}
      <main style={{
        maxWidth: (tab === 'festival-information' && selectedFestivalId) || tab === 'user' ? 'none' : tab === 'home' ? 'none' : 960,
        margin: '0 auto',
        padding: (tab === 'festival-information' && selectedFestivalId) || tab === 'user' || tab === 'home' ? '0' : '28px 16px',
      }}>
        {tab === 'home'               && <Home lang={lang} />}
        {tab === 'dashboard'          && <Dashboard t={t} isLoggedIn={isLoggedIn} />}
        {tab === 'festivals'          && <FestivalList t={t} isOwner={isOwner} isLoggedIn={isLoggedIn} onOpenProfile={handleOpenFestivalProfile} defaultOpenId={returnFestivalId} onDefaultOpened={() => setReturnFestivalId(null)} />}
        {tab === 'funds'              && <FundList t={t} isOwner={isOwner} isLoggedIn={isLoggedIn} />}
        {tab === 'education'          && <EducationList t={t} isOwner={isOwner} isLoggedIn={isLoggedIn} />}
        {tab === 'festival-information' && (
          selectedFestivalId ? (
            <FestivalProfile
              festivalId={selectedFestivalId}
              lang={lang}
              t={t}
              isOwner={isOwner}
              isLoggedIn={isLoggedIn}
              onBack={handleCloseFestivalProfile}
            />
          ) : (
            <FestivalInformation
              t={t}
              lang={lang}
              isLoggedIn={isLoggedIn}
              onOpenProfile={handleOpenFestivalProfile}
              onSignIn={handleSignIn}
            />
          )
        )}
        {tab === 'user' && (
          <UserHub
            t={t}
            lang={lang}
            isLoggedIn={isLoggedIn}
            isOwner={isOwner}
            onSignIn={handleSignIn}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 48, paddingBottom: 32, fontSize: 13, color: '#a0aec0', textAlign: 'center' }}>
        © 2026{' '}
        <a href="https://www.phamhuutri.com" target="_blank" rel="noopener noreferrer" style={{ color: '#718096' }}>
          Pham Huu Tri
        </a>.
      </footer>
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
