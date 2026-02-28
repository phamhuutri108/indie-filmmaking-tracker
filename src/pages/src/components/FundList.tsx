import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../apiFetch';
import { DeadlineBadge } from './DeadlineBadge';
import { Modal, inputStyle, labelStyle, formRowStyle, formGridStyle } from './Modal';
import type { Fund } from '../types';

const API_BASE = '/api';

const FUND_TYPES = ['development', 'production', 'post-production', 'distribution'];
const FOCUS_OPTIONS = ['documentary', 'narrative', 'animation', 'experimental'];
const REGION_OPTIONS = ['global', 'asia', 'southeast-asia', 'europe', 'africa', 'latin-america'];

function formatAmount(usd?: number, currency?: string): string {
  if (!usd) return '—';
  return `$${usd.toLocaleString()} ${currency ?? 'USD'}`;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function FundDetail({
  fund,
  t,
  onClose,
}: {
  fund: Fund;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
}) {
  const tf = t.funds;
  const tc = t.common;
  return (
    <Modal isOpen title={fund.name} onClose={onClose} maxWidth={600}>
      {fund.organization && (
        <p style={{ margin: '0 0 14px', color: '#718096', fontSize: 14 }}>🏛 {fund.organization}</p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {fund.type && <span style={badgeStyle('#004aad')}>{fund.type}</span>}
        {fund.focus && <span style={badgeStyle('#805ad5')}>{fund.focus}</span>}
        {fund.region_focus && <span style={badgeStyle('#38a169')}>{fund.region_focus}</span>}
      </div>

      <section style={{ marginBottom: 16 }}>
        <div style={sectionLabel}>💰 Funding</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {fund.max_amount && (
            <Row label={tf.maxAmount}>{formatAmount(fund.max_amount, fund.currency)}</Row>
          )}
          {fund.open_date && (
            <Row label="Open Date">{formatDate(fund.open_date)}</Row>
          )}
          {fund.deadline && (
            <Row label={tf.deadline}>
              <DeadlineBadge deadline={fund.deadline} t={t} />
              <span style={{ fontSize: 13, color: '#4a5568', marginLeft: 8 }}>{formatDate(fund.deadline)}</span>
            </Row>
          )}
        </div>
      </section>

      {fund.eligibility && (
        <section style={{ marginBottom: 16 }}>
          <div style={sectionLabel}>✅ {tf.eligibility}</div>
          <p style={{ margin: 0, fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{fund.eligibility}</p>
        </section>
      )}

      {fund.description && (
        <section style={{ marginBottom: 16 }}>
          <div style={sectionLabel}>📝 Description</div>
          <p style={{ margin: 0, fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{fund.description}</p>
        </section>
      )}

      {fund.website && (
        <a href={fund.website} target="_blank" rel="noreferrer" style={linkBtn('#004aad')}>
          🌐 {tc.website}
        </a>
      )}
    </Modal>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────
type AddForm = {
  name: string; name_vi: string; organization: string; country: string;
  website: string; type: string; focus: string; region_focus: string;
  max_amount: string; deadline: string; eligibility: string; description: string;
};

const emptyForm = (): AddForm => ({
  name: '', name_vi: '', organization: '', country: '',
  website: '', type: '', focus: '', region_focus: '',
  max_amount: '', deadline: '', eligibility: '', description: '',
});

function AddFundModal({
  t,
  onClose,
  onSaved,
}: {
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AddForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const tf = t.funds.form;

  const set = (k: keyof AddForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { ...form };
      if (form.max_amount) body.max_amount = Number(form.max_amount);
      const res = await fetch(`${API_BASE}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen title={tf.title} onClose={onClose} maxWidth={620}>
      <div style={formGridStyle}>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.name}</label>
          <input style={inputStyle} value={form.name} onChange={set('name')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.nameVi}</label>
          <input style={inputStyle} value={form.name_vi} onChange={set('name_vi')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.organization}</label>
          <input style={inputStyle} value={form.organization} onChange={set('organization')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.country}</label>
          <input style={inputStyle} value={form.country} onChange={set('country')} />
        </div>
      </div>

      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.website}</label>
        <input style={inputStyle} type="url" value={form.website} onChange={set('website')} placeholder="https://" />
      </div>

      <div style={formGridStyle}>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.type}</label>
          <select style={inputStyle} value={form.type} onChange={set('type')}>
            <option value="">—</option>
            {FUND_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.focus}</label>
          <select style={inputStyle} value={form.focus} onChange={set('focus')}>
            <option value="">—</option>
            {FOCUS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.region}</label>
          <select style={inputStyle} value={form.region_focus} onChange={set('region_focus')}>
            <option value="">—</option>
            {REGION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.maxAmount}</label>
          <input style={inputStyle} type="number" min={0} value={form.max_amount} onChange={set('max_amount')} placeholder="0" />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.deadline}</label>
          <input style={inputStyle} type="date" value={form.deadline} onChange={set('deadline')} />
        </div>
      </div>

      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.eligibility}</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.eligibility} onChange={set('eligibility')} />
      </div>
      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.description}</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={set('description')} />
      </div>

      {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>
          {saving ? '...' : t.common.save}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main FundList ────────────────────────────────────────────────────────────
export function FundList({ t, isOwner, isLoggedIn }: { t: ReturnType<typeof useI18n>; isOwner: boolean; isLoggedIn: boolean }) {
  const [items, setItems] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Fund | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/funds`)
      .then((r) => r.json() as Promise<{ data: Fund[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const loadWatchlist = () => {
    apiFetch(`${API_BASE}/watchlist`)
      .then((r) => r.json() as Promise<{ data: Array<{ ref_table: string; ref_id: number }> }>)
      .then((d) => {
        const ids = new Set(
          (d.data ?? []).filter((w) => w.ref_table === 'funds_grants').map((w) => w.ref_id)
        );
        setWatchlistIds(ids);
      })
      .catch(() => {});
  };

  const toggleStar = async (e: React.MouseEvent, fundId: number) => {
    e.stopPropagation();
    if (watchlistIds.has(fundId)) {
      await apiFetch(`${API_BASE}/watchlist/ref/funds_grants/${fundId}`, { method: 'DELETE' });
      setWatchlistIds((prev) => { const s = new Set(prev); s.delete(fundId); return s; });
    } else {
      await apiFetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        body: JSON.stringify({ ref_table: 'funds_grants', ref_id: fundId }),
      });
      setWatchlistIds((prev) => new Set([...prev, fundId]));
    }
  };

  const refresh = () => {
    setRefreshing(true);
    fetch(`${API_BASE}/funds/scrape`)
      .then(() => load())
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { load(); loadWatchlist(); }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter) list = list.filter((f) => f.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.organization?.toLowerCase().includes(q) ||
          f.country?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, typeFilter, search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>{t.funds.title}</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>{t.funds.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} disabled={refreshing} style={btnSecondary}>
            🔄 {refreshing ? t.funds.refreshing : t.funds.refresh}
          </button>
          {isOwner && (
            <button onClick={() => setShowAdd(true)} style={btnPrimary}>
              + {t.funds.addFund}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder={t.funds.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterPill label={t.common.all} active={!typeFilter} onClick={() => setTypeFilter('')} />
          {FUND_TYPES.map((c) => (
            <FilterPill key={c} label={c} active={typeFilter === c} onClick={() => setTypeFilter(c)} />
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>{t.common.loading}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
          {t.funds.noResults}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((f) => (
            <div
              key={f.id}
              onClick={() => setSelected(f)}
              style={{
                border: '1px solid #e2e8f0',
                borderLeft: '3px solid #38a169',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                background: '#fff',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 15, color: '#1a202c' }}>{f.name}</strong>
                  {f.organization && (
                    <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>{f.organization}</div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {f.type && <span style={badgeStyle('#004aad')}>{f.type}</span>}
                    {f.focus && <span style={badgeStyle('#805ad5')}>{f.focus}</span>}
                    {f.region_focus && <span style={badgeStyle('#38a169')}>{f.region_focus}</span>}
                    {f.max_amount && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#d69e2e' }}>
                        up to {formatAmount(f.max_amount, f.currency)}
                      </span>
                    )}
                  </div>
                  {f.last_checked && (
                    <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
                      {t.funds.lastChecked}: {new Date(f.last_checked).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {isLoggedIn && (
                    <button
                      onClick={(e) => toggleStar(e, f.id)}
                      title={watchlistIds.has(f.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                      style={starBtnStyle(watchlistIds.has(f.id))}
                    >
                      {watchlistIds.has(f.id) ? '⭐' : '☆'}
                    </button>
                  )}
                  {f.deadline && <DeadlineBadge deadline={f.deadline} t={t} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <FundDetail fund={selected} t={t} onClose={() => setSelected(null)} />}
      {showAdd && <AddFundModal t={t} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: active ? '#38a169' : '#e2e8f0',
        background: active ? '#38a169' : '#fff',
        color: active ? '#fff' : '#4a5568',
        fontSize: 13,
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        textTransform: 'capitalize',
      }}
    >
      {label}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#718096', minWidth: 110 }}>{label}</span>
      <span>{children}</span>
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

function badgeStyle(color: string): React.CSSProperties {
  return {
    background: color + '18',
    color,
    border: `1px solid ${color}33`,
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
  };
}

function linkBtn(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '6px 14px',
    background: color,
    color: '#fff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  };
}

function starBtnStyle(active: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    padding: '2px 4px',
    color: active ? '#d69e2e' : '#cbd5e0',
    lineHeight: 1,
  };
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#2d3748',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff',
  color: '#4a5568',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};
