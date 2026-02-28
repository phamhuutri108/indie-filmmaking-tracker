import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { inputStyle, labelStyle, formRowStyle } from './Modal';
import type { Monitor } from '../types';

const API_BASE = '/api';

const WATCH_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'results', label: 'Results' },
  { value: 'announcement', label: 'Announcement' },
];

export function MonitorList({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    target_url: '',
    target_name: '',
    watch_for: 'deadline',
    alert_days_before: 7,
  });

  const load = () => {
    fetch(`${API_BASE}/monitors`)
      .then((r) => r.json() as Promise<{ data: Monitor[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.target_url.trim()) return;
    await fetch(`${API_BASE}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monitor_type: 'custom' }),
    });
    setForm({ target_url: '', target_name: '', watch_for: 'deadline', alert_days_before: 7 });
    load();
  };

  const deactivate = async (id: number) => {
    await fetch(`${API_BASE}/monitors/${id}`, { method: 'DELETE' });
    load();
  };

  const active = items.filter((m) => m.is_active);
  const inactive = items.filter((m) => !m.is_active);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>{t.common.loading}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>{t.monitors.title}</h2>
        <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>{t.monitors.subtitle}</p>
      </div>

      {/* Add form card */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 28,
          background: '#f7fafc',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', marginBottom: 14 }}>
          + {t.monitors.addMonitor}
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{t.monitors.url} *</label>
          <input
            style={inputStyle}
            type="url"
            placeholder="https://festival.com/submissions"
            value={form.target_url}
            onChange={(e) => setForm({ ...form, target_url: e.target.value })}
          />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{t.monitors.name}</label>
          <input
            style={inputStyle}
            placeholder="e.g. Sundance 2027"
            value={form.target_name}
            onChange={(e) => setForm({ ...form, target_name: e.target.value })}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>{t.monitors.watchFor}</label>
            <select
              style={inputStyle}
              value={form.watch_for}
              onChange={(e) => setForm({ ...form, watch_for: e.target.value })}
            >
              {WATCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t.monitors.alertDays}</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={90}
              value={form.alert_days_before}
              onChange={(e) => setForm({ ...form, alert_days_before: Number(e.target.value) })}
            />
          </div>
        </div>
        <button
          onClick={add}
          style={{
            padding: '8px 20px',
            background: '#2d3748',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t.monitors.addMonitor}
        </button>
      </div>

      {/* Active monitors */}
      {active.length === 0 && inactive.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: '#718096',
            border: '1px dashed #e2e8f0',
            borderRadius: 8,
          }}
        >
          {t.monitors.noMonitors}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={sectionLabel}>● Active ({active.length})</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {active.map((m) => (
                  <MonitorCard key={m.id} monitor={m} t={t} onDeactivate={deactivate} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <div style={{ ...sectionLabel, color: '#a0aec0' }}>○ Inactive ({inactive.length})</div>
              <div style={{ display: 'grid', gap: 8, opacity: 0.6 }}>
                {inactive.map((m) => (
                  <MonitorCard key={m.id} monitor={m} t={t} onDeactivate={deactivate} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MonitorCard({
  monitor: m,
  t,
  onDeactivate,
}: {
  monitor: Monitor;
  t: ReturnType<typeof useI18n>;
  onDeactivate: (id: number) => void;
}) {
  const watchLabel = WATCH_OPTIONS.find((o) => o.value === m.watch_for)?.label ?? m.watch_for;
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderLeft: `3px solid ${m.is_active ? '#dd6b20' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        background: '#fff',
      }}
    >
      <div>
        <strong style={{ fontSize: 14, color: '#1a202c' }}>
          {m.target_name || new URL(m.target_url).hostname}
        </strong>
        <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
          <span style={tagStyle}>{watchLabel}</span>
          <span style={{ marginLeft: 8 }}>
            Alert {m.alert_days_before} {t.monitors.alertDays}
          </span>
        </div>
        {m.target_name && (
          <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
            <a href={m.target_url} target="_blank" rel="noreferrer" style={{ color: '#a0aec0' }}>
              {m.target_url}
            </a>
          </div>
        )}
        {m.last_triggered && (
          <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
            Last alert: {new Date(m.last_triggered).toLocaleDateString()}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {m.is_active ? (
          <span style={{ fontSize: 12, color: '#38a169', fontWeight: 700 }}>● {t.monitors.active}</span>
        ) : null}
        {m.is_active && (
          <button
            onClick={() => onDeactivate(m.id)}
            style={{
              padding: '4px 12px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              color: '#e53e3e',
              fontWeight: 600,
            }}
          >
            {t.monitors.deactivate}
          </button>
        )}
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#718096',
  letterSpacing: '0.05em',
  marginBottom: 8,
};

const tagStyle: React.CSSProperties = {
  background: '#fef3c7',
  color: '#92400e',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 11,
  fontWeight: 600,
};
