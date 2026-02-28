import { useState } from 'react';
import { useI18n, type Lang } from './i18n';
import { Dashboard } from './components/Dashboard';
import { FestivalList } from './components/FestivalList';
import { FundList } from './components/FundList';
import { EducationList } from './components/EducationList';
import { MonitorList } from './components/MonitorList';
import { MyFilms } from './components/MyFilms';
import { Submissions } from './components/Submissions';
import { Watchlist } from './components/Watchlist';

type Tab = 'dashboard' | 'festivals' | 'funds' | 'education' | 'monitors' | 'films' | 'submissions' | 'watchlist';

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<Tab>('dashboard');
  const t = useI18n(lang);

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

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: '#1a202c',
          color: '#fff',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 52,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>🎬 IFT</span>
          <span style={{ fontSize: 13, color: '#718096', borderLeft: '1px solid #2d3748', paddingLeft: 10 }}>
            Indie Filmmaking Tracker
          </span>
        </div>
        <button
          onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
          style={{
            background: '#2d3748',
            color: '#e2e8f0',
            border: '1px solid #4a5568',
            borderRadius: 6,
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {lang === 'en' ? '🇻🇳 VI' : '🇬🇧 EN'}
        </button>
      </header>

      {/* Nav */}
      <nav
        style={{
          background: '#2d3748',
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
            onClick={() => setTab(key)}
            style={{
              background: 'transparent',
              color: tab === key ? '#fff' : '#a0aec0',
              border: 'none',
              borderBottom: `2px solid ${tab === key ? '#63b3ed' : 'transparent'}`,
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

      {/* Content */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px' }}>
        {tab === 'dashboard' && <Dashboard t={t} />}
        {tab === 'festivals' && <FestivalList t={t} />}
        {tab === 'funds' && <FundList t={t} />}
        {tab === 'education' && <EducationList t={t} />}
        {tab === 'monitors' && <MonitorList t={t} />}
        {tab === 'films' && <MyFilms t={t} />}
        {tab === 'submissions' && <Submissions t={t} />}
        {tab === 'watchlist' && <Watchlist t={t} />}
      </main>
    </div>
  );
}
