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

const AGGREGATOR_DOMAINS = new Set([
  'asianfilmfestivals.com', 'filmfreeway.com', 'withoutabox.com',
  'festhome.com', 'filmfestivallife.com', 'shortfilmdepot.com',
]);

function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    return AGGREGATOR_DOMAINS.has(host) ? null : host;
  } catch { return null; }
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

// ─── Card: 16/9 thumbnail + text below ───────────────────────────────────────
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

  let deadlineBg = '#e2e8f0'; let deadlineColor = '#4a5568';
  if (deadline) {
    const d = daysUntil(deadline.date);
    if (d <= 7)  { deadlineBg = '#fed7d7'; deadlineColor = '#c53030'; }
    else if (d <= 30) { deadlineBg = '#feebc8'; deadlineColor = '#c05621'; }
    else { deadlineBg = '#c6f6d5'; deadlineColor = '#276749'; }
  }

  return (
    <div
      onClick={() => onOpen(festival.id, festival.name)}
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,74,173,0.18)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Thumbnail — 16:9, logo fills ~85% of height */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: `linear-gradient(135deg, hsl(${hue},55%,88%) 0%, hsl(${hue},45%,78%) 100%)`,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
        borderRadius: '8px 8px 0 0',
      }}>
        {/* Letter avatar — fallback */}
        <span style={{
          fontSize: 36, fontWeight: 900,
          color: `hsl(${hue},40%,38%)`,
          letterSpacing: 2, userSelect: 'none',
          opacity: faviconOk ? 0 : 1,
          transition: 'opacity 0.2s',
          position: 'absolute',
        }}>
          {initials}
        </span>

        {/* Favicon — sized to fill ~85% of container height */}
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt=""
            onLoad={() => setFaviconOk(true)}
            onError={() => setFaviconOk(false)}
            style={{
              position: 'absolute',
              height: '85%', width: '85%',
              objectFit: 'contain',
              opacity: faviconOk ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          />
        )}
      </div>

      {/* Text section */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a202c', lineHeight: 1.35 }}>
          {lang === 'vi' && festival.name_vi ? festival.name_vi : festival.name}
        </div>

        {(festival.country || festival.city) && (
          <div style={{ fontSize: 11, color: '#718096' }}>
            {[festival.city, festival.country].filter(Boolean).join(', ')}
          </div>
        )}

        {prestige && (
          <span style={{
            alignSelf: 'flex-start', fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 10,
            background: prestige.bg, color: prestige.color,
          }}>
            {prestige.label}
          </span>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 4 }}>
          {deadline ? (
            <span style={{ fontSize: 11, fontWeight: 600, background: deadlineBg, color: deadlineColor, padding: '3px 8px', borderRadius: 6 }}>
              {deadline.label}: {new Date(deadline.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' '}({daysUntil(deadline.date)}d)
            </span>
          ) : (
            <span style={{ fontSize: 11, color: '#a0aec0' }}>
              {lang === 'vi' ? 'Đã đóng' : 'Closed'}
            </span>
          )}
        </div>
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
