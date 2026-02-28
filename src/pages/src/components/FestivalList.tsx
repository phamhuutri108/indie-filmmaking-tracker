import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import { DeadlineBadge } from './DeadlineBadge';
import { Modal, inputStyle, labelStyle, formRowStyle, formGridStyle } from './Modal';
import type { Festival } from '../types';

const API_BASE = '/api';

const CATEGORIES = ['documentary', 'narrative', 'short', 'animation', 'experimental'];
const TIERS = ['A-list', 'regional', 'emerging'];

function formatFee(cents?: number): string {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function FestivalDetail({
  festival,
  t,
  onClose,
}: {
  festival: Festival;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
}) {
  const tf = t.festivals;
  const tc = t.common;
  return (
    <Modal isOpen title={festival.name} onClose={onClose} maxWidth={660}>
      {/* Country / city */}
      {(festival.country || festival.city) && (
        <p style={{ margin: '0 0 16px', color: '#718096', fontSize: 14 }}>
          📍 {[festival.city, festival.country].filter(Boolean).join(', ')}
        </p>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {festival.category && (
          <span style={badgeStyle('#3182CE')}>{festival.category}</span>
        )}
        {festival.tier && (
          <span style={badgeStyle('#805ad5')}>{festival.tier}</span>
        )}
        {festival.status && (
          <span style={badgeStyle(festival.status === 'active' ? '#38a169' : '#718096')}>
            {tc.status[festival.status as 'active' | 'closed' | 'cancelled'] ?? festival.status}
          </span>
        )}
      </div>

      {/* Deadlines */}
      <section style={{ marginBottom: 18 }}>
        <div style={sectionLabel}>⏰ Deadlines</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {festival.early_deadline && (
            <Row label={tf.earlyDeadline}>
              <DeadlineBadge deadline={festival.early_deadline} t={t} />
              <span style={{ fontSize: 13, color: '#4a5568', marginLeft: 8 }}>
                {formatDate(festival.early_deadline)}
              </span>
            </Row>
          )}
          {festival.regular_deadline && (
            <Row label={tf.regularDeadline}>
              <DeadlineBadge deadline={festival.regular_deadline} t={t} />
              <span style={{ fontSize: 13, color: '#4a5568', marginLeft: 8 }}>
                {formatDate(festival.regular_deadline)}
              </span>
            </Row>
          )}
          {festival.late_deadline && (
            <Row label={tf.lateDeadline}>
              <span style={{ fontSize: 13, color: '#4a5568' }}>{formatDate(festival.late_deadline)}</span>
            </Row>
          )}
          {festival.notification_date && (
            <Row label={tf.notification}>
              <span style={{ fontSize: 13, color: '#4a5568' }}>{formatDate(festival.notification_date)}</span>
            </Row>
          )}
          {festival.festival_dates && (
            <Row label={tf.festivalDates}>
              <span style={{ fontSize: 13, color: '#4a5568' }}>{festival.festival_dates}</span>
            </Row>
          )}
        </div>
      </section>

      {/* Entry fees */}
      {(festival.entry_fee_early || festival.entry_fee_regular) && (
        <section style={{ marginBottom: 18 }}>
          <div style={sectionLabel}>💳 {tf.entryFee}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {festival.entry_fee_early != null && (
              <Row label={tf.earlyDeadline}>{formatFee(festival.entry_fee_early)}</Row>
            )}
            {festival.entry_fee_regular != null && (
              <Row label={tf.regularDeadline}>{formatFee(festival.entry_fee_regular)}</Row>
            )}
          </div>
        </section>
      )}

      {/* Description */}
      {festival.description && (
        <section style={{ marginBottom: 18 }}>
          <div style={sectionLabel}>📝 Description</div>
          <p style={{ margin: 0, fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{festival.description}</p>
        </section>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        {festival.website && (
          <a href={festival.website} target="_blank" rel="noreferrer" style={linkBtn('#3182CE')}>
            🌐 {tc.website}
          </a>
        )}
        {festival.filmfreeway_url && (
          <a href={festival.filmfreeway_url} target="_blank" rel="noreferrer" style={linkBtn('#e53e3e')}>
            🎞 FilmFreeway
          </a>
        )}
      </div>

      {festival.source && (
        <p style={{ margin: '14px 0 0', fontSize: 11, color: '#a0aec0' }}>
          {t.festivals.source}: {festival.source}
        </p>
      )}
    </Modal>
  );
}

// ─── Add Form Modal ───────────────────────────────────────────────────────────
type AddForm = {
  name: string; name_vi: string; country: string; city: string;
  website: string; filmfreeway_url: string; category: string; tier: string;
  early_deadline: string; regular_deadline: string; late_deadline: string;
  entry_fee_early: string; entry_fee_regular: string; description: string;
};

const emptyForm = (): AddForm => ({
  name: '', name_vi: '', country: '', city: '',
  website: '', filmfreeway_url: '', category: '', tier: '',
  early_deadline: '', regular_deadline: '', late_deadline: '',
  entry_fee_early: '', entry_fee_regular: '', description: '',
});

function AddFestivalModal({
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
  const tf = t.festivals.form;

  const set = (k: keyof AddForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.regular_deadline) { setError('Regular deadline is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { ...form, source: 'manual' };
      if (form.entry_fee_early) body.entry_fee_early = Math.round(Number(form.entry_fee_early) * 100);
      if (form.entry_fee_regular) body.entry_fee_regular = Math.round(Number(form.entry_fee_regular) * 100);
      const res = await fetch(`${API_BASE}/festivals`, {
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
    <Modal isOpen title={tf.title} onClose={onClose} maxWidth={660}>
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
          <label style={labelStyle}>{tf.country}</label>
          <input style={inputStyle} value={form.country} onChange={set('country')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.city}</label>
          <input style={inputStyle} value={form.city} onChange={set('city')} />
        </div>
      </div>

      <div style={formGridStyle}>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.website}</label>
          <input style={inputStyle} type="url" value={form.website} onChange={set('website')} placeholder="https://" />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.filmfreeway}</label>
          <input style={inputStyle} type="url" value={form.filmfreeway_url} onChange={set('filmfreeway_url')} placeholder="https://filmfreeway.com/..." />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.category}</label>
          <select style={inputStyle} value={form.category} onChange={set('category')}>
            <option value="">—</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.tier}</label>
          <select style={inputStyle} value={form.tier} onChange={set('tier')}>
            <option value="">—</option>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={formGridStyle}>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.earlyDeadline}</label>
          <input style={inputStyle} type="date" value={form.early_deadline} onChange={set('early_deadline')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.regularDeadline}</label>
          <input style={inputStyle} type="date" value={form.regular_deadline} onChange={set('regular_deadline')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.lateDeadline}</label>
          <input style={inputStyle} type="date" value={form.late_deadline} onChange={set('late_deadline')} />
        </div>
        <div />
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.entryFeeEarly}</label>
          <input style={inputStyle} type="number" min={0} value={form.entry_fee_early} onChange={set('entry_fee_early')} placeholder="0" />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.entryFeeRegular}</label>
          <input style={inputStyle} type="number" min={0} value={form.entry_fee_regular} onChange={set('entry_fee_regular')} placeholder="0" />
        </div>
      </div>

      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.description}</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={form.description}
          onChange={set('description')}
        />
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

// ─── Main FestivalList ────────────────────────────────────────────────────────
export function FestivalList({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selected, setSelected] = useState<Festival | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/festivals?limit=100`)
      .then((r) => r.json() as Promise<{ data: Festival[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const loadWatchlist = () => {
    fetch(`${API_BASE}/watchlist`)
      .then((r) => r.json() as Promise<{ data: Array<{ ref_table: string; ref_id: number }> }>)
      .then((d) => {
        const ids = new Set(
          (d.data ?? []).filter((w) => w.ref_table === 'festivals').map((w) => w.ref_id)
        );
        setWatchlistIds(ids);
      })
      .catch(() => {});
  };

  const toggleStar = async (e: React.MouseEvent, festivalId: number) => {
    e.stopPropagation();
    if (watchlistIds.has(festivalId)) {
      await fetch(`${API_BASE}/watchlist/ref/festivals/${festivalId}`, { method: 'DELETE' });
      setWatchlistIds((prev) => { const s = new Set(prev); s.delete(festivalId); return s; });
    } else {
      await fetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_table: 'festivals', ref_id: festivalId }),
      });
      setWatchlistIds((prev) => new Set([...prev, festivalId]));
    }
  };

  useEffect(() => { load(); loadWatchlist(); }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (catFilter) list = list.filter((f) => f.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.country?.toLowerCase().includes(q) ||
          f.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, catFilter, search]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>{t.festivals.title}</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>{t.festivals.subtitle}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={btnPrimary}>
          + {t.festivals.addFestival}
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder={t.festivals.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterPill label={t.common.all} active={!catFilter} onClick={() => setCatFilter('')} />
          {CATEGORIES.map((c) => (
            <FilterPill key={c} label={c} active={catFilter === c} onClick={() => setCatFilter(c)} />
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>{t.common.loading}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
          {t.festivals.noResults}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((f) => (
            <div
              key={f.id}
              onClick={() => setSelected(f)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                background: '#fff',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 15, color: '#1a202c' }}>{f.name}</strong>
                  {(f.city || f.country) && (
                    <span style={{ fontSize: 13, color: '#718096', marginLeft: 8 }}>
                      {[f.city, f.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {f.category && <span style={badgeStyle('#3182CE')}>{f.category}</span>}
                    {f.tier && <span style={badgeStyle('#805ad5')}>{f.tier}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <button
                    onClick={(e) => toggleStar(e, f.id)}
                    title={watchlistIds.has(f.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                    style={starBtn(watchlistIds.has(f.id))}
                  >
                    {watchlistIds.has(f.id) ? '⭐' : '☆'}
                  </button>
                  {f.early_deadline && (
                    <div style={{ fontSize: 12, color: '#718096' }}>
                      {t.festivals.earlyDeadline}: <DeadlineBadge deadline={f.early_deadline} t={t} />
                    </div>
                  )}
                  {f.regular_deadline && (
                    <div style={{ fontSize: 12, color: '#718096' }}>
                      {t.festivals.regularDeadline}: <DeadlineBadge deadline={f.regular_deadline} t={t} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <FestivalDetail festival={selected} t={t} onClose={() => setSelected(null)} />
      )}
      {showAdd && (
        <AddFestivalModal t={t} onClose={() => setShowAdd(false)} onSaved={load} />
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: active ? '#3182CE' : '#e2e8f0',
        background: active ? '#3182CE' : '#fff',
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
      <span style={{ fontSize: 12, color: '#718096', minWidth: 130 }}>{label}</span>
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

function starBtn(active: boolean): React.CSSProperties {
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

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff',
  color: '#4a5568',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};
