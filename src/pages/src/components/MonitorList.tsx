import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { inputStyle, labelStyle, formRowStyle } from './Modal';
import { DeadlineBadge } from './DeadlineBadge';
import type { Monitor } from '../types';

const API_BASE = '/api';

const WATCH_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'results', label: 'Results' },
  { value: 'announcement', label: 'Announcement' },
];

const REF_TABLES = [
  { value: 'festivals', label: 'Festival' },
  { value: 'funds_grants', label: 'Fund / Grant' },
  { value: 'education_residency', label: 'Education / Residency' },
];

interface RecordOption {
  id: number;
  name: string;
  deadline?: string;
  website?: string;
}

export function MonitorList({ t, isOwner }: { t: ReturnType<typeof useI18n>; isOwner: boolean }) {
  const [items, setItems] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    target_url: '',
    target_name: '',
    watch_for: 'deadline',
    alert_days_before: 7,
    ref_table: '',
    ref_id: 0,
  });
  const [recordOptions, setRecordOptions] = useState<RecordOption[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const load = () => {
    fetch(`${API_BASE}/monitors`)
      .then((r) => r.json() as Promise<{ data: Monitor[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // When ref_table changes, fetch the records for that table
  useEffect(() => {
    if (!form.ref_table) { setRecordOptions([]); return; }
    setLoadingRecords(true);
    const endpoint =
      form.ref_table === 'festivals' ? `${API_BASE}/festivals?limit=100` :
      form.ref_table === 'funds_grants' ? `${API_BASE}/funds` :
      `${API_BASE}/education`;

    fetch(endpoint)
      .then((r) => r.json() as Promise<{ data: any[] }>)
      .then((d) => {
        setRecordOptions(
          (d.data ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            deadline: row.regular_deadline ?? row.deadline,
            website: row.website,
          }))
        );
      })
      .catch(() => setRecordOptions([]))
      .finally(() => setLoadingRecords(false));
  }, [form.ref_table]);

  const handleRecordSelect = (id: number) => {
    const rec = recordOptions.find((r) => r.id === id);
    if (!rec) { setForm((f) => ({ ...f, ref_id: 0 })); return; }
    setForm((f) => ({
      ...f,
      ref_id: rec.id,
      target_name: f.target_name || rec.name,
      target_url: f.target_url || rec.website || '',
    }));
  };

  const add = async () => {
    if (!form.target_url.trim()) return;
    const body: Record<string, unknown> = {
      target_url: form.target_url,
      target_name: form.target_name,
      watch_for: form.watch_for,
      alert_days_before: form.alert_days_before,
      monitor_type: form.ref_table ? form.ref_table.replace('_', '-') : 'custom',
    };
    if (form.ref_table) body.ref_table = form.ref_table;
    if (form.ref_id) body.ref_id = form.ref_id;

    await fetch(`${API_BASE}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setForm({ target_url: '', target_name: '', watch_for: 'deadline', alert_days_before: 7, ref_table: '', ref_id: 0 });
    setRecordOptions([]);
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
      {isOwner && <div
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

        {/* Link to record */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t.monitors.linkRecord}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select
              style={inputStyle}
              value={form.ref_table}
              onChange={(e) => setForm((f) => ({ ...f, ref_table: e.target.value, ref_id: 0 }))}
            >
              <option value="">— {t.monitors.selectCategory} —</option>
              {REF_TABLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {form.ref_table && (
              <select
                style={inputStyle}
                value={form.ref_id || ''}
                onChange={(e) => handleRecordSelect(Number(e.target.value))}
                disabled={loadingRecords}
              >
                <option value="">— {loadingRecords ? t.common.loading : t.monitors.selectRecord} —</option>
                {recordOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>{t.monitors.url} *</label>
          <input
            style={inputStyle}
            type="url"
            placeholder="https://festival.com/submissions"
            value={form.target_url}
            onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
          />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{t.monitors.name}</label>
          <input
            style={inputStyle}
            placeholder="e.g. Sundance 2027"
            value={form.target_name}
            onChange={(e) => setForm((f) => ({ ...f, target_name: e.target.value }))}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>{t.monitors.watchFor}</label>
            <select
              style={inputStyle}
              value={form.watch_for}
              onChange={(e) => setForm((f) => ({ ...f, watch_for: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, alert_days_before: Number(e.target.value) }))}
            />
          </div>
        </div>
        <button
          onClick={add}
          style={btnPrimary}
        >
          {t.monitors.addMonitor}
        </button>
      </div>}

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
                  <MonitorCard key={m.id} monitor={m} t={t} onDeactivate={deactivate} isOwner={isOwner} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <div style={{ ...sectionLabel, color: '#a0aec0' }}>○ Inactive ({inactive.length})</div>
              <div style={{ display: 'grid', gap: 8, opacity: 0.6 }}>
                {inactive.map((m) => (
                  <MonitorCard key={m.id} monitor={m} t={t} onDeactivate={deactivate} isOwner={isOwner} />
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
  isOwner,
}: {
  monitor: Monitor;
  t: ReturnType<typeof useI18n>;
  onDeactivate: (id: number) => void;
  isOwner: boolean;
}) {
  const watchLabel = WATCH_OPTIONS.find((o) => o.value === m.watch_for)?.label ?? m.watch_for;
  const refLabel = REF_TABLES.find((r) => r.value === m.ref_table)?.label;
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
          {m.target_name || (m.target_url ? (() => { try { return new URL(m.target_url).hostname; } catch { return m.target_url; } })() : '')}
        </strong>

        {/* Linked record badge */}
        {m.ref_name && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={linkBadge}>{refLabel}</span>
            <span style={{ fontSize: 13, color: '#2d3748' }}>{m.ref_name}</span>
            {m.deadline && (
              <DeadlineBadge deadline={m.deadline} t={t} />
            )}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
          <span style={tagStyle}>{watchLabel}</span>
          <span style={{ marginLeft: 8 }}>
            Alert {m.alert_days_before} {t.monitors.alertDays}
          </span>
        </div>
        {m.target_url && (
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
        {m.is_active && isOwner && (
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

const linkBadge: React.CSSProperties = {
  background: '#e8f0fb',
  color: '#004aad',
  border: '1px solid #c5d8f5',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 11,
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px',
  background: '#2d3748',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};
