import { useState, useEffect } from 'react';
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

// Hue from festival name for consistent avatar color
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

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function FestivalThumb({ name, website }: { name: string; website?: string }) {
  const [imgOk, setImgOk] = useState<boolean | null>(null);
  const domain = getDomain(website);
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;
  const hue = nameToHue(name);
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  return (
    <div style={{
      width: '100%', aspectRatio: '16/9',
      background: `hsl(${hue},55%,90%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      borderRadius: '8px 8px 0 0',
    }}>
      {logoUrl && imgOk !== false ? (
        <img
          src={logoUrl}
          alt={name}
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
          style={{
            maxWidth: '70%', maxHeight: '70%',
            objectFit: 'contain',
            display: imgOk === null ? 'none' : 'block',
          }}
        />
      ) : null}
      {(!logoUrl || imgOk === false) && (
        <span style={{ fontSize: 32, fontWeight: 800, color: `hsl(${hue},45%,40%)`, letterSpacing: 2 }}>
          {initials}
        </span>
      )}
      {logoUrl && imgOk === null && (
        <span style={{ fontSize: 32, fontWeight: 800, color: `hsl(${hue},45%,40%)`, letterSpacing: 2 }}>
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── Festival Card ─────────────────────────────────────────────────────────────
function FestivalCard({
  festival,
  lang,
  onOpen,
}: {
  festival: Festival;
  lang: string;
  onOpen: (id: number, name: string) => void;
}) {
  const deadline = formatDeadline(festival);
  const prestige = festival.prestige_tier ? PRESTIGE_COLORS[festival.prestige_tier] : null;

  let deadlineBg = '#e2e8f0'; let deadlineColor = '#4a5568';
  if (deadline) {
    const d = daysUntil(deadline.date);
    if (d <= 7) { deadlineBg = '#fed7d7'; deadlineColor = '#c53030'; }
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
        display: 'flex',
        flexDirection: 'column',
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
      <FestivalThumb name={festival.name} website={festival.website} />

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Name */}
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a202c', lineHeight: 1.35 }}>
          {lang === 'vi' && festival.name_vi ? festival.name_vi : festival.name}
        </div>

        {/* Country + city */}
        {(festival.country || festival.city) && (
          <div style={{ fontSize: 11, color: '#718096' }}>
            {[festival.city, festival.country].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Prestige badge */}
        {prestige && (
          <span style={{
            alignSelf: 'flex-start',
            fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 10,
            background: prestige.bg, color: prestige.color,
          }}>
            {prestige.label}
          </span>
        )}

        {/* Deadline */}
        <div style={{ marginTop: 'auto', paddingTop: 6 }}>
          {deadline ? (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: deadlineBg, color: deadlineColor,
              padding: '3px 8px', borderRadius: 6,
            }}>
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

// ─── Main Component ────────────────────────────────────────────────────────────
export function FestivalInformation({
  t,
  lang,
  isLoggedIn,
  onOpenProfile,
  onSignIn,
}: {
  t: ReturnType<typeof useI18n>;
  lang: string;
  isLoggedIn: boolean;
  onOpenProfile: (id: number, name: string) => void;
  onSignIn?: () => void;
}) {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    apiFetch('/api/festivals?limit=200')
      .then(r => r.json())
      .then((data: any) => setFestivals(Array.isArray(data) ? data : (data.data ?? data.festivals ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  // Guest wall
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

  const filtered = festivals.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.name_vi ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (f.country ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '28px 16px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 4 }}>
          {lang === 'vi' ? 'Thông tin Liên hoan phim' : 'Festival Information'}
        </h2>
        <p style={{ fontSize: 13, color: '#718096' }}>
          {lang === 'vi'
            ? `${festivals.length} liên hoan phim trong cơ sở dữ liệu`
            : `${festivals.length} festivals in the database`}
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={lang === 'vi' ? 'Tìm kiếm liên hoan phim...' : 'Search festivals...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', maxWidth: 420, boxSizing: 'border-box',
          padding: '8px 14px', borderRadius: 8,
          border: '1px solid #e2e8f0', fontSize: 13,
          marginBottom: 24, outline: 'none',
        }}
      />

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0', fontSize: 14 }}>
          {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0', fontSize: 14 }}>
          {lang === 'vi' ? 'Không tìm thấy liên hoan phim.' : 'No festivals found.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(f => (
            <FestivalCard key={f.id} festival={f} lang={lang} onOpen={onOpenProfile} />
          ))}
        </div>
      )}
    </div>
  );
}
