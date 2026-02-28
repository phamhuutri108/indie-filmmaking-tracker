import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../apiFetch';
import { DeadlineBadge } from './DeadlineBadge';
import { Modal, inputStyle, labelStyle, formRowStyle, formGridStyle } from './Modal';
import type { Education } from '../types';

const API_BASE = '/api';

const EDU_TYPES = ['lab', 'residency', 'workshop', 'scholarship', 'masterclass'];

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function EducationDetail({
  item,
  t,
  onClose,
}: {
  item: Education;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
}) {
  const te = t.education;
  const tc = t.common;
  return (
    <Modal isOpen title={item.name} onClose={onClose} maxWidth={600}>
      {item.organization && (
        <p style={{ margin: '0 0 14px', color: '#718096', fontSize: 14 }}>🏛 {item.organization}</p>
      )}
      {(item.city || item.country) && (
        <p style={{ margin: '0 0 14px', color: '#718096', fontSize: 14 }}>
          📍 {[item.city, item.country].filter(Boolean).join(', ')}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {item.type && <span style={badgeStyle('#805ad5')}>{item.type}</span>}
        {item.duration && <span style={badgeStyle('#d69e2e')}>{item.duration}</span>}
        {item.covers_travel ? <span style={badgeStyle('#38a169')}>✈ {te.coversTravel}</span> : null}
        {item.covers_accommodation ? <span style={badgeStyle('#38a169')}>🏨 {te.coversAccommodation}</span> : null}
      </div>

      <section style={{ marginBottom: 16 }}>
        <div style={sectionLabel}>📋 Details</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {item.deadline && (
            <Row label={te.deadline}>
              <DeadlineBadge deadline={item.deadline} t={t} />
              <span style={{ fontSize: 13, color: '#4a5568', marginLeft: 8 }}>{formatDate(item.deadline)}</span>
            </Row>
          )}
          {item.program_dates && (
            <Row label={te.programDates}>{item.program_dates}</Row>
          )}
          {item.stipend != null && item.stipend > 0 && (
            <Row label={te.stipend}>${item.stipend.toLocaleString()} USD</Row>
          )}
        </div>
      </section>

      {item.eligibility && (
        <section style={{ marginBottom: 16 }}>
          <div style={sectionLabel}>✅ {te.eligibility}</div>
          <p style={{ margin: 0, fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{item.eligibility}</p>
        </section>
      )}

      {item.description && (
        <section style={{ marginBottom: 16 }}>
          <div style={sectionLabel}>📝 Description</div>
          <p style={{ margin: 0, fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{item.description}</p>
        </section>
      )}

      {item.website && (
        <a href={item.website} target="_blank" rel="noreferrer" style={linkBtn('#805ad5')}>
          🌐 {tc.website}
        </a>
      )}
    </Modal>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────
type AddForm = {
  name: string; name_vi: string; organization: string;
  country: string; city: string; website: string;
  type: string; duration: string; deadline: string;
  stipend: string; covers_travel: boolean; covers_accommodation: boolean;
  eligibility: string; description: string;
};

const emptyForm = (): AddForm => ({
  name: '', name_vi: '', organization: '',
  country: '', city: '', website: '',
  type: '', duration: '', deadline: '',
  stipend: '', covers_travel: false, covers_accommodation: false,
  eligibility: '', description: '',
});

function AddEducationModal({
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
  const tf = t.education.form;

  const set = (k: keyof AddForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        ...form,
        stipend: form.stipend ? Number(form.stipend) : null,
        covers_travel: form.covers_travel ? 1 : 0,
        covers_accommodation: form.covers_accommodation ? 1 : 0,
      };
      const res = await fetch(`${API_BASE}/education`, {
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
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.city}</label>
          <input style={inputStyle} value={form.city} onChange={set('city')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.website}</label>
          <input style={inputStyle} type="url" value={form.website} onChange={set('website')} placeholder="https://" />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.type}</label>
          <select style={inputStyle} value={form.type} onChange={set('type')}>
            <option value="">—</option>
            {EDU_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.duration}</label>
          <input style={inputStyle} value={form.duration} onChange={set('duration')} placeholder="e.g. 1 week" />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.deadline}</label>
          <input style={inputStyle} type="date" value={form.deadline} onChange={set('deadline')} />
        </div>
        <div style={formRowStyle}>
          <label style={labelStyle}>{tf.stipend}</label>
          <input style={inputStyle} type="number" min={0} value={form.stipend} onChange={set('stipend')} placeholder="0" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.covers_travel}
            onChange={(e) => setForm((f) => ({ ...f, covers_travel: e.target.checked }))}
          />
          {tf.coversTravel}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.covers_accommodation}
            onChange={(e) => setForm((f) => ({ ...f, covers_accommodation: e.target.checked }))}
          />
          {tf.coversAccommodation}
        </label>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export function EducationList({ t, isOwner, isLoggedIn }: { t: ReturnType<typeof useI18n>; isOwner: boolean; isLoggedIn: boolean }) {
  const [items, setItems] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Education | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/education`)
      .then((r) => r.json() as Promise<{ data: Education[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const loadWatchlist = () => {
    apiFetch(`${API_BASE}/watchlist`)
      .then((r) => r.json() as Promise<{ data: Array<{ ref_table: string; ref_id: number }> }>)
      .then((d) => {
        const ids = new Set(
          (d.data ?? []).filter((w) => w.ref_table === 'education_residency').map((w) => w.ref_id)
        );
        setWatchlistIds(ids);
      })
      .catch(() => {});
  };

  const toggleStar = async (ev: React.MouseEvent, eduId: number) => {
    ev.stopPropagation();
    if (watchlistIds.has(eduId)) {
      await apiFetch(`${API_BASE}/watchlist/ref/education_residency/${eduId}`, { method: 'DELETE' });
      setWatchlistIds((prev) => { const s = new Set(prev); s.delete(eduId); return s; });
    } else {
      await apiFetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        body: JSON.stringify({ ref_table: 'education_residency', ref_id: eduId }),
      });
      setWatchlistIds((prev) => new Set([...prev, eduId]));
    }
  };

  useEffect(() => { load(); loadWatchlist(); }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter) list = list.filter((e) => e.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.organization?.toLowerCase().includes(q) ||
          e.country?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, typeFilter, search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>{t.education.title}</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>{t.education.subtitle}</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowAdd(true)} style={btnPrimary}>
            + {t.education.addEducation}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder={t.education.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterPill label={t.common.all} active={!typeFilter} onClick={() => setTypeFilter('')} />
          {EDU_TYPES.map((c) => (
            <FilterPill key={c} label={c} active={typeFilter === c} onClick={() => setTypeFilter(c)} />
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096' }}>{t.common.loading}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#718096', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
          {t.education.noResults}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((e) => (
            <div
              key={e.id}
              onClick={() => setSelected(e)}
              style={{
                border: '1px solid #e2e8f0',
                borderLeft: '3px solid #805ad5',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                background: '#fff',
              }}
              onMouseEnter={(ev) => ((ev.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={(ev) => ((ev.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 15, color: '#1a202c' }}>{e.name}</strong>
                  {e.organization && (
                    <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>{e.organization}</div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {e.type && <span style={badgeStyle('#805ad5')}>{e.type}</span>}
                    {e.duration && <span style={badgeStyle('#d69e2e')}>{e.duration}</span>}
                    {e.covers_travel ? <span style={badgeStyle('#38a169')}>✈ Travel</span> : null}
                    {e.covers_accommodation ? <span style={badgeStyle('#38a169')}>🏨 Housing</span> : null}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {isLoggedIn && (
                    <button
                      onClick={(ev) => toggleStar(ev, e.id)}
                      title={watchlistIds.has(e.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                      style={starBtnStyle(watchlistIds.has(e.id))}
                    >
                      {watchlistIds.has(e.id) ? '⭐' : '☆'}
                    </button>
                  )}
                  {e.deadline && <DeadlineBadge deadline={e.deadline} t={t} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <EducationDetail item={selected} t={t} onClose={() => setSelected(null)} />}
      {showAdd && <AddEducationModal t={t} onClose={() => setShowAdd(false)} onSaved={load} />}
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
        borderColor: active ? '#805ad5' : '#e2e8f0',
        background: active ? '#805ad5' : '#fff',
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
      <span style={{ fontSize: 12, color: '#718096', minWidth: 120 }}>{label}</span>
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
