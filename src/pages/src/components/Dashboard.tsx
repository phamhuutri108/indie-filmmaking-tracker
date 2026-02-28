import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { DeadlineBadge } from './DeadlineBadge';
import type { DashboardItem, Stats } from '../types';

const API_BASE = '/api';

const STAT_CARDS = [
  { key: 'festivals' as const, icon: '🎬', color: '#3182CE', bg: '#ebf8ff' },
  { key: 'funds' as const, icon: '💰', color: '#38a169', bg: '#f0fff4' },
  { key: 'education' as const, icon: '🎓', color: '#805ad5', bg: '#faf5ff' },
  { key: 'upcoming7' as const, icon: '⚡', color: '#e53e3e', bg: '#fff5f5' },
  { key: 'upcoming30' as const, icon: '📅', color: '#d69e2e', bg: '#fffff0' },
  { key: 'films' as const, icon: '🎞️', color: '#2C7A7B', bg: '#E6FFFA' },
  { key: 'submissions' as const, icon: '📋', color: '#744210', bg: '#FFFFF0' },
];

const TYPE_COLORS: Record<string, string> = {
  festival: '#3182CE',
  fund: '#38a169',
  education: '#805ad5',
};

export function Dashboard({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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
      </div>

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
                }}
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
                  {item.website && (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#3182CE', textDecoration: 'none' }}
                    >
                      {t.common.website} →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
