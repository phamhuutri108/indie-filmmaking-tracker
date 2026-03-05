import { useState, useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../apiFetch';
import type { Festival } from '../types';

const PRESTIGE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  'a-list':           { bg: '#fef3c7', color: '#92400e', label: 'A-List' },
  recognized:         { bg: '#d1fae5', color: '#065f46', label: 'Recognized' },
  credible:           { bg: '#dbeafe', color: '#1e40af', label: 'Credible' },
  unverified:         { bg: '#f3f4f6', color: '#374151', label: 'Unverified' },
  'not-recommended':  { bg: '#fee2e2', color: '#991b1b', label: 'Not Recommended' },
};

const CATEGORY_LABELS: Record<string, string> = {
  documentary: 'Documentary', narrative: 'Narrative', short: 'Short Film',
  feature: 'Feature', animation: 'Animation', experimental: 'Experimental', student: 'Student',
};

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function getDomain(url?: string): string | null {
  if (!url) return null;
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
  catch { return null; }
}

function formatDeadline(f: Festival): { label: string; date: string } | null {
  const today = new Date().toISOString().split('T')[0];
  const candidates = [
    { label: 'Early', date: f.early_deadline },
    { label: 'Regular', date: f.regular_deadline },
    { label: 'Late', date: f.late_deadline },
  ].filter(c => c.date && c.date >= today);
  if (!candidates.length) return null;
  return candidates[0] as { label: string; date: string };
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

// ─── Full-height Card with overlay ───────────────────────────────────────────
function FestivalCard({
  festival, lang, onOpen,
}: {
  festival: Festival; lang: string; onOpen: (id: number, name: string) => void;
}) {
  const [faviconOk, setFaviconOk] = useState(false);
  const hue = nameToHue(festival.name);
  const domain = getDomain(festival.website);
  const faviconUrl = domain
    ? `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`
    : null;

  const initials = festival.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  const deadline = formatDeadline(festival);
  const prestige = festival.prestige_tier ? PRESTIGE_COLORS[festival.prestige_tier] : null;

  let deadlineColor = '#86efac';
  if (deadline) {
    const d = daysUntil(deadline.date);
    if (d <= 7) deadlineColor = '#fca5a5';
    else if (d <= 30) deadlineColor = '#fdba74';
  }

  return (
    <div
      onClick={() => onOpen(festival.id, festival.name)}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        background: `linear-gradient(145deg, hsl(${hue},55%,72%) 0%, hsl(${hue + 30},50%,55%) 100%)`,
        aspectRatio: '3 / 4',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px) scale(1.02)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.22)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
      }}
    >
      {/* Letter avatar — always in center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 52, fontWeight: 900,
          color: `rgba(255,255,255,0.35)`,
          letterSpacing: 3, userSelect: 'none',
          opacity: faviconOk ? 0 : 1, transition: 'opacity 0.2s',
        }}>
          {initials}
        </span>
      </div>

      {/* Favicon — centered, fades in */}
      {faviconUrl && (
        <img
          src={faviconUrl}
          alt=""
          onLoad={() => setFaviconOk(true)}
          onError={() => setFaviconOk(false)}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 72, height: 72,
            objectFit: 'contain',
            opacity: faviconOk ? 1 : 0,
            transition: 'opacity 0.2s',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            padding: 8,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Bottom overlay with text */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        padding: '32px 12px 12px',
      }}>
        {/* Prestige badge */}
        {prestige && (
          <span style={{
            display: 'inline-block', fontSize: 9, fontWeight: 700,
            padding: '2px 6px', borderRadius: 8, marginBottom: 5,
            background: prestige.bg, color: prestige.color,
          }}>
            {prestige.label}
          </span>
        )}

        {/* Name */}
        <div style={{
          fontWeight: 700, fontSize: 13, color: '#fff',
          lineHeight: 1.3, marginBottom: 4,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>
          {lang === 'vi' && festival.name_vi ? festival.name_vi : festival.name}
        </div>

        {/* Country */}
        {(festival.country || festival.city) && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 5 }}>
            {[festival.city, festival.country].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Deadline */}
        {deadline ? (
          <div style={{ fontSize: 10, fontWeight: 600, color: deadlineColor }}>
            {deadline.label}: {new Date(deadline.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' '}({daysUntil(deadline.date)}d)
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
            {lang === 'vi' ? 'Đã đóng' : 'Closed'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        background: active ? '#004aad' : '#f0f4ff',
        color: active ? '#fff' : '#4a5568',
        border: active ? '1px solid #004aad' : '1px solid #dbe4ff',
      }}
    >
      {label}
    </button>
  );
}

// ─── Session storage helpers ──────────────────────────────────────────────────
const SS = {
  get: (k: string, fallback = '') => sessionStorage.getItem(`fi-${k}`) ?? fallback,
  getB: (k: string) => sessionStorage.getItem(`fi-${k}`) === '1',
  set: (k: string, v: string | boolean) => sessionStorage.setItem(`fi-${k}`, typeof v === 'boolean' ? (v ? '1' : '0') : v),
};

// ─── Main Component ────────────────────────────────────────────────────────────
export function FestivalInformation({
  t, lang, isLoggedIn, onOpenProfile, onSignIn,
}: {
  t: ReturnType<typeof useI18n>;
  lang: string;
  isLoggedIn: boolean;
  onOpenProfile: (id: number, name: string) => void;
  onSignIn?: () => void;
}) {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]           = useState(() => SS.get('search'));
  const [prestige, setPrestige]       = useState(() => SS.get('prestige'));
  const [category, setCategory]       = useState(() => SS.get('category'));
  const [openOnly, setOpenOnly]       = useState(() => SS.getB('openOnly'));
  const [countryFilter, setCountryFilter] = useState(() => SS.get('country'));
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist filters to sessionStorage
  useEffect(() => { SS.set('search', search); }, [search]);
  useEffect(() => { SS.set('prestige', prestige); }, [prestige]);
  useEffect(() => { SS.set('category', category); }, [category]);
  useEffect(() => { SS.set('openOnly', openOnly); }, [openOnly]);
  useEffect(() => { SS.set('country', countryFilter); }, [countryFilter]);

  // Restore scroll position when returning from a profile
  useEffect(() => {
    const saved = sessionStorage.getItem('fi-scrollY');
    if (saved) {
      sessionStorage.removeItem('fi-scrollY');
      setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' as ScrollBehavior }), 30);
    }
  }, []);

  // Save scroll + navigate to profile
  const handleOpen = (id: number, name: string) => {
    sessionStorage.setItem('fi-scrollY', String(window.scrollY));
    onOpenProfile(id, name);
  };

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    apiFetch('/api/festivals?limit=500')
      .then(r => r.json())
      .then((data: any) => setFestivals(Array.isArray(data) ? data : (data.data ?? data.festivals ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const countries = useMemo(() => {
    const set = new Set(festivals.map(f => f.country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [festivals]);

  const prestigeTiers = ['a-list', 'recognized', 'credible', 'unverified', 'not-recommended'];
  const categories = ['documentary', 'narrative', 'short', 'feature', 'animation', 'experimental', 'student'];

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return festivals.filter(f => {
      if (search) {
        const q = search.toLowerCase();
        if (!f.name.toLowerCase().includes(q) && !(f.name_vi ?? '').toLowerCase().includes(q) && !(f.country ?? '').toLowerCase().includes(q)) return false;
      }
      if (prestige && f.prestige_tier !== prestige) return false;
      if (category && f.category !== category) return false;
      if (countryFilter && f.country !== countryFilter) return false;
      if (openOnly) {
        const hasOpen = [f.early_deadline, f.regular_deadline, f.late_deadline].some(d => d && d >= today);
        if (!hasOpen) return false;
      }
      return true;
    });
  }, [festivals, search, prestige, category, countryFilter, openOnly]);

  // ─── Guest wall ──────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎬</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2d3748', marginBottom: 10 }}>
          {lang === 'vi' ? 'Đăng nhập để sử dụng tính năng này' : 'Sign in to use this feature'}
        </h2>
        <p style={{ fontSize: 14, color: '#718096', marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
          {lang === 'vi'
            ? 'Đăng nhập để xem hồ sơ chi tiết các liên hoan phim, thiết lập monitor và nhận cảnh báo deadline.'
            : 'Sign in to explore detailed festival profiles, set up monitors, and receive deadline alerts.'}
        </p>
        {onSignIn && (
          <button onClick={onSignIn} style={{ background: '#004aad', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {lang === 'vi' ? 'Đăng nhập' : 'Sign in'}
          </button>
        )}
      </div>
    );
  }

  const activeFilters = [prestige, category, countryFilter, openOnly ? 'open' : ''].filter(Boolean).length;

  return (
    <div ref={containerRef} style={{ padding: '28px 16px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 4 }}>
          {lang === 'vi' ? 'Thông tin Liên hoan phim' : 'Festival Information'}
        </h2>
        <p style={{ fontSize: 13, color: '#718096' }}>
          {lang === 'vi' ? `${filtered.length} / ${festivals.length} liên hoan phim` : `${filtered.length} of ${festivals.length} festivals`}
        </p>
      </div>

      {/* Search + country + open toggle */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder={lang === 'vi' ? 'Tìm kiếm tên, quốc gia...' : 'Search name, country...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', maxWidth: 360, boxSizing: 'border-box', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
        />
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: countryFilter ? '#1a202c' : '#a0aec0', background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">{lang === 'vi' ? 'Tất cả quốc gia' : 'All countries'}</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setOpenOnly(v => !v)}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: openOnly ? '#004aad' : '#f0f4ff', color: openOnly ? '#fff' : '#4a5568', border: openOnly ? '1px solid #004aad' : '1px solid #dbe4ff' }}
        >
          {lang === 'vi' ? '⏰ Còn deadline' : '⏰ Open deadlines'}
        </button>
        {activeFilters > 0 && (
          <button
            onClick={() => { setPrestige(''); setCategory(''); setCountryFilter(''); setOpenOnly(false); setSearch(''); }}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fee2e2', color: '#c53030', border: '1px solid #fca5a5' }}
          >
            {lang === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
          </button>
        )}
      </div>

      {/* Prestige chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a0aec0', marginRight: 2 }}>{lang === 'vi' ? 'Uy tín:' : 'Prestige:'}</span>
        {prestigeTiers.map(p => (
          <Chip key={p} label={PRESTIGE_COLORS[p]?.label ?? p} active={prestige === p} onClick={() => setPrestige(prestige === p ? '' : p)} />
        ))}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a0aec0', marginRight: 2 }}>{lang === 'vi' ? 'Thể loại:' : 'Category:'}</span>
        {categories.map(cat => (
          <Chip key={cat} label={CATEGORY_LABELS[cat] ?? cat} active={category === cat} onClick={() => setCategory(category === cat ? '' : cat)} />
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0', fontSize: 14 }}>{lang === 'vi' ? 'Đang tải...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0', fontSize: 14 }}>{lang === 'vi' ? 'Không tìm thấy liên hoan phim.' : 'No festivals found.'}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {filtered.map(f => (
            <FestivalCard key={f.id} festival={f} lang={lang} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
