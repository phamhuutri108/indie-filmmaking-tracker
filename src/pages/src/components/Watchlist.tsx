import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import { DeadlineBadge } from './DeadlineBadge';
import type { WatchlistItem } from '../types';

const API_BASE = '/api';

const REF_LABELS: Record<string, string> = {
  festivals: 'Festival',
  funds_grants: 'Fund',
  education_residency: 'Education',
};

const REF_COLORS: Record<string, string> = {
  festivals: '#3182CE',
  funds_grants: '#38a169',
  education_residency: '#805ad5',
};

export function Watchlist({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/watchlist`)
      .then((r) => r.json() as Promise<{ data: WatchlistItem[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const remove = async (item: WatchlistItem) => {
    await fetch(`${API_BASE}/watchlist/${item.id}`, { method: 'DELETE' });
    load();
  };

  const filtered = useMemo(() => {
    if (!filter) return items;
    return items.filter((i) => i.ref_table === filter);
  }, [items, filter]);

  const counts = useMemo(() => ({
    festivals: items.filter((i) => i.ref_table === 'festivals').length,
    funds_grants: items.filter((i) => i.ref_table === 'funds_grants').length,
    education_residency: items.filter((i) => i.ref_table === 'education_residency').length,
  }), [items]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>{t.watchlist.title}</h2>
        <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>{t.watchlist.subtitle}</p>
      </div>

      {/* Filter pills */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterPill label={`${t.common.all} (${items.length})`} active={!filter} onClick={() => setFilter('')} color="#4a5568" />
          {Object.entries(REF_LABELS).map(([key, label]) => (
            counts[key as keyof typeof counts] > 0 && (
              <FilterPill
                key={key}
                label={`${label} (${counts[key as keyof typeof counts]})`}
                active={filter === key}
                onClick={() => setFilter(filter === key ? '' : key)}
                color={REF_COLORS[key]}
              />
            )
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>{t.common.loading}</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: '#718096',
            border: '1px dashed #e2e8f0',
            borderRadius: 8,
            lineHeight: 1.7,
          }}
        >
          ⭐ {t.watchlist.noItems}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((item) => (
            <WatchlistCard key={item.id} item={item} t={t} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  item,
  t,
  onRemove,
}: {
  item: WatchlistItem;
  t: ReturnType<typeof useI18n>;
  onRemove: (item: WatchlistItem) => void;
}) {
  const color = REF_COLORS[item.ref_table] ?? '#718096';
  const label = REF_LABELS[item.ref_table] ?? item.ref_table;
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '14px 16px',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 10,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={badgeStyle(color)}>⭐ {label}</span>
          <strong style={{ fontSize: 15, color: '#1a202c' }}>{item.ref_name}</strong>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {item.deadline && <DeadlineBadge deadline={item.deadline} t={t} />}
          {item.deadline && (
            <span style={{ fontSize: 13, color: '#718096' }}>
              {new Date(item.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
          {item.country && <span style={{ fontSize: 12, color: '#a0aec0' }}>📍 {item.country}</span>}
        </div>
        {item.notes && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#4a5568', fontStyle: 'italic' }}>{item.notes}</p>
        )}
        <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
          {t.watchlist.addedOn}: {new Date(item.starred_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {item.website && (
          <a
            href={item.website}
            target="_blank"
            rel="noreferrer"
            style={linkBtn}
          >
            🌐
          </a>
        )}
        <button
          onClick={() => onRemove(item)}
          style={removeBtn}
        >
          {t.watchlist.remove}
        </button>
      </div>
    </div>
  );
}

function FilterPill({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: active ? color : '#e2e8f0',
        background: active ? color : '#fff',
        color: active ? '#fff' : '#4a5568',
        fontSize: 13,
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    background: color + '18',
    color,
    border: `1px solid ${color}33`,
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
  };
}

const linkBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  background: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  textDecoration: 'none',
  fontSize: 16,
};

const removeBtn: React.CSSProperties = {
  padding: '4px 12px',
  background: '#fff',
  border: '1px solid #fed7d7',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  color: '#e53e3e',
  fontWeight: 600,
};
