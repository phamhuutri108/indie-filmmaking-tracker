import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { DeadlineBadge } from './DeadlineBadge';
import { apiFetch } from '../apiFetch';
import { Modal } from './Modal';
import type { DashboardItem, Stats, Festival, Fund, Education } from '../types';

const API_BASE = '/api';

type AnyItem = Festival | Fund | Education;

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function refTable(type: DashboardItem['type']): string {
  return type === 'festival' ? 'festivals' : type === 'fund' ? 'funds_grants' : 'education_residency';
}

function apiPath(type: DashboardItem['type'], id: number): string {
  const segment = type === 'festival' ? 'festivals' : type === 'fund' ? 'funds' : 'education';
  return `${API_BASE}/${segment}/${id}`;
}

function deadline(item: AnyItem): string | undefined {
  return (item as Festival).regular_deadline ?? (item as Fund | Education).deadline;
}

function DashboardDetail({
  item,
  type,
  t,
  onClose,
  isLoggedIn,
  inWatchlist,
  onToggleStar,
}: {
  item: AnyItem;
  type: DashboardItem['type'];
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
  isLoggedIn: boolean;
  inWatchlist: boolean;
  onToggleStar: () => void;
}) {
  const tc = t.common;
  const starAction = isLoggedIn ? (
    <button
      onClick={onToggleStar}
      title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '0 2px', color: inWatchlist ? '#d69e2e' : '#cbd5e0', lineHeight: 1 }}
    >
      {inWatchlist ? '⭐' : '☆'}
    </button>
  ) : undefined;

  const f = item as Festival;
  const fu = item as Fund;
  const ed = item as Education;
  const dl = deadline(item);

  return (
    <Modal isOpen title={item.name} onClose={onClose} maxWidth={620} action={starAction}>
      {/* Location / org */}
      {(f.city || f.country) && (
        <p style={{ margin: '0 0 12px', color: '#718096', fontSize: 14 }}>
          📍 {[f.city, f.country].filter(Boolean).join(', ')}
        </p>
      )}
      {(fu.organization || ed.organization) && !(f.city || f.country) && (
        <p style={{ margin: '0 0 12px', color: '#718096', fontSize: 14 }}>
          🏛 {fu.organization ?? ed.organization}
        </p>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(f.category || f.tier) && f.category && (
          <span style={dashBadge('#004aad')}>{f.category}</span>
        )}
        {f.tier && <span style={dashBadge('#805ad5')}>{f.tier}</span>}
        {fu.type && <span style={dashBadge('#004aad')}>{fu.type}</span>}
        {fu.focus && <span style={dashBadge('#805ad5')}>{fu.focus}</span>}
        {ed.type && <span style={dashBadge('#805ad5')}>{ed.type}</span>}
        {f.status && (
          <span style={dashBadge(f.status === 'active' ? '#38a169' : '#718096')}>
            {tc.status[f.status as 'active' | 'closed' | 'cancelled'] ?? f.status}
          </span>
        )}
      </div>

      {/* Deadline */}
      {dl && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#718096', minWidth: 80 }}>{tc.deadline}:</span>
          <DeadlineBadge deadline={dl} t={t} />
          <span style={{ fontSize: 13, color: '#4a5568' }}>{formatDate(dl)}</span>
        </div>
      )}
      {type === 'festival' && f.early_deadline && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#718096', minWidth: 80 }}>{t.festivals.earlyDeadline}:</span>
          <DeadlineBadge deadline={f.early_deadline} t={t} />
          <span style={{ fontSize: 13, color: '#4a5568' }}>{formatDate(f.early_deadline)}</span>
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p style={{ margin: '12px 0', fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{item.description}</p>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        {item.website && (
          <a href={item.website} target="_blank" rel="noreferrer" style={dashLink('#004aad')}>
            🌐 {tc.website}
          </a>
        )}
        {f.filmfreeway_url && (
          <a href={f.filmfreeway_url} target="_blank" rel="noreferrer" style={dashLink('#e53e3e')}>
            🎞 FilmFreeway
          </a>
        )}
      </div>
    </Modal>
  );
}

const dashBadge = (color: string): React.CSSProperties => ({
  background: color + '18', color, border: `1px solid ${color}33`,
  borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
});

const dashLink = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '6px 14px', background: color,
  color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
});

const STAT_CARDS = [
  { key: 'festivals' as const, icon: '🎬', color: '#004aad', bg: '#e8f0fb' },
  { key: 'funds' as const, icon: '💰', color: '#38a169', bg: '#f0fff4' },
  { key: 'education' as const, icon: '🎓', color: '#805ad5', bg: '#faf5ff' },
  { key: 'upcoming7' as const, icon: '⚡', color: '#e53e3e', bg: '#fff5f5' },
  { key: 'upcoming30' as const, icon: '📅', color: '#d69e2e', bg: '#fffff0' },
  { key: 'films' as const, icon: '🎞️', color: '#2C7A7B', bg: '#E6FFFA' },
  { key: 'submissions' as const, icon: '📋', color: '#744210', bg: '#FFFFF0' },
];

const TYPE_COLORS: Record<string, string> = {
  festival: '#004aad',
  fund: '#38a169',
  education: '#805ad5',
};

export function Dashboard({ t, isLoggedIn = false, isOwner = false }: { t: ReturnType<typeof useI18n>; isLoggedIn?: boolean; isOwner?: boolean }) {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<{ item: AnyItem; type: DashboardItem['type'] } | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Map<string, number>>(new Map()); // key: `type:id`
  const [urlCheckResult, setUrlCheckResult] = useState<{ checked: number; fixed: number; broken: number } | null>(null);
  const [urlChecking, setUrlChecking] = useState(false);

  const handleCheckUrls = async () => {
    setUrlChecking(true);
    setUrlCheckResult(null);
    try {
      const res = await apiFetch(`${API_BASE}/admin/check-urls`, { method: 'POST' });
      const json = await res.json() as { checked: number; fixed: number; broken: number };
      setUrlCheckResult(json);
    } catch {
      setUrlCheckResult({ checked: 0, fixed: 0, broken: -1 });
    } finally {
      setUrlChecking(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/dashboard`).then((r) => r.json() as Promise<{ upcoming: DashboardItem[] }>),
      fetch(`${API_BASE}/stats`).then((r) => r.json() as Promise<Stats>),
    ])
      .then(([dash, s]) => {
        setItems(dash.upcoming ?? []);
        setStats(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch(`${API_BASE}/watchlist`)
      .then((r) => r.json() as Promise<{ data: Array<{ ref_table: string; ref_id: number }> }>)
      .then((d) => {
        const map = new Map<string, number>();
        for (const w of d.data ?? []) {
          const type = w.ref_table === 'festivals' ? 'festival' : w.ref_table === 'funds_grants' ? 'fund' : 'education';
          map.set(`${type}:${w.ref_id}`, w.ref_id);
        }
        setWatchlistIds(map);
      })
      .catch(() => {});
  }, [isLoggedIn]);

  const openDetail = async (dashItem: DashboardItem) => {
    setFetchingDetail(true);
    try {
      const res = await fetch(apiPath(dashItem.type, dashItem.id));
      const json = await res.json() as { data: AnyItem };
      setSelectedDetail({ item: json.data, type: dashItem.type });
    } catch {
      // fallback: show basic info from dashboard item
      setSelectedDetail({ item: dashItem as unknown as AnyItem, type: dashItem.type });
    } finally {
      setFetchingDetail(false);
    }
  };

  const toggleStar = async (type: DashboardItem['type'], id: number) => {
    const key = `${type}:${id}`;
    const table = refTable(type);
    if (watchlistIds.has(key)) {
      await apiFetch(`${API_BASE}/watchlist/ref/${table}/${id}`, { method: 'DELETE' });
      setWatchlistIds((prev) => { const m = new Map(prev); m.delete(key); return m; });
    } else {
      await apiFetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        body: JSON.stringify({ ref_table: table, ref_id: id }),
      });
      setWatchlistIds((prev) => new Map([...prev, [key, id]]));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>
        {t.common.loading}
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>{t.dashboard.title}</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>{t.dashboard.subtitle}</p>
        </div>
        <a
          href="/api/calendar/export"
          download="ift-deadlines.ics"
          title={t.calendar.exportHint}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#2d3748',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          📅 {t.calendar.exportIcs}
        </a>
        {isOwner && (
          <button
            onClick={handleCheckUrls}
            disabled={urlChecking}
            title="Check all festival/fund/education website URLs for broken links"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', background: urlChecking ? '#e2e8f0' : '#fff',
              border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 600,
              color: '#2d3748', cursor: urlChecking ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {urlChecking ? '🔄 Checking...' : '🔗 Check URLs'}
          </button>
        )}
      </div>

      {/* URL check result */}
      {urlCheckResult && (
        <div style={{
          background: urlCheckResult.broken > 0 ? '#fff5f5' : '#f0fff4',
          border: `1px solid ${urlCheckResult.broken > 0 ? '#fed7d7' : '#c6f6d5'}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13,
          color: urlCheckResult.broken > 0 ? '#c53030' : '#276749',
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {urlCheckResult.broken === -1
            ? '❌ URL check failed — please try again.'
            : `✅ Checked ${urlCheckResult.checked} URLs \u2014 ${urlCheckResult.fixed} redirect(s) auto-fixed, ${urlCheckResult.broken} broken.`}
          {urlCheckResult.broken > 0 && (
            <span style={{ color: '#718096' }}>Look for ⚠️ badges in Festivals / Funds / Education tabs.</span>
          )}
          <button onClick={() => setUrlCheckResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          {STAT_CARDS.map(({ key, icon, color, bg }) => (
            <div
              key={key}
              style={{
                background: bg,
                border: `1px solid ${color}22`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
                {stats[key]}
              </div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                {t.dashboard.stats[key]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming deadlines */}
      {items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: '#718096',
            border: '1px dashed #e2e8f0',
            borderRadius: 8,
          }}
        >
          {t.dashboard.noItems}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item, i) => {
            const typeColor = TYPE_COLORS[item.type] ?? '#718096';
            return (
              <div
                key={i}
                onClick={() => openDetail(item)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderLeft: `3px solid ${typeColor}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#fff',
                      background: typeColor,
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    {t.dashboard.type[item.type]}
                  </span>
                  <strong style={{ color: '#1a202c' }}>{item.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {item.deadline && <DeadlineBadge deadline={item.deadline} t={t} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fetchingDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '20px 32px', fontSize: 14, color: '#4a5568' }}>{t.common.loading}</div>
        </div>
      )}

      {selectedDetail && (
        <DashboardDetail
          item={selectedDetail.item}
          type={selectedDetail.type}
          t={t}
          onClose={() => setSelectedDetail(null)}
          isLoggedIn={isLoggedIn}
          inWatchlist={watchlistIds.has(`${selectedDetail.type}:${(selectedDetail.item as any).id}`)}
          onToggleStar={() => toggleStar(selectedDetail.type, (selectedDetail.item as any).id)}
        />
      )}
    </div>
  );
}
