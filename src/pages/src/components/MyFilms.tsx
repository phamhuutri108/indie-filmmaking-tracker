import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../apiFetch';
import { Modal, inputStyle, labelStyle, formRowStyle, formGridStyle } from './Modal';
import type { Film } from '../types';

const API_BASE = '/api';

const GENRES = ['documentary', 'narrative', 'short', 'animation', 'experimental'];
const FILM_STATUSES = ['in-production', 'completed', 'released'];

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const statusColors: Record<string, string> = {
  'in-production': '#D69E2E',
  completed: '#004aad',
  released: '#38A169',
};

// ─── Film Card ─────────────────────────────────────────────────────────────────
function FilmCard({
  film,
  t,
  onSelect,
}: {
  film: Film;
  t: ReturnType<typeof useI18n>;
  onSelect: () => void;
}) {
  const tf = t.films;
  const statusLabel = tf.status[film.status as keyof typeof tf.status] ?? film.status ?? '—';
  const color = statusColors[film.status ?? ''] ?? '#718096';

  return (
    <div
      onClick={onSelect}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#c5d8f5';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a202c', marginBottom: 2 }}>
            {film.title}
          </div>
          {film.title_vi && (
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 6 }}>{film.title_vi}</div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {film.genre && (
              <span style={{ fontSize: 12, background: '#e8f0fb', color: '#004aad', borderRadius: 4, padding: '2px 8px' }}>
                {film.genre}
              </span>
            )}
            {film.year && (
              <span style={{ fontSize: 12, background: '#F7FAFC', color: '#4A5568', borderRadius: 4, padding: '2px 8px', border: '1px solid #E2E8F0' }}>
                {film.year}
              </span>
            )}
            {film.duration_min && (
              <span style={{ fontSize: 12, color: '#718096' }}>
                {film.duration_min} {tf.minutes}
              </span>
            )}
          </div>
          {film.logline && (
            <p style={{ margin: 0, fontSize: 13, color: '#4A5568', lineHeight: 1.5 }}>
              {film.logline.length > 120 ? film.logline.slice(0, 120) + '…' : film.logline}
            </p>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: color + '22',
            color,
            borderRadius: 6,
            padding: '3px 10px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function FilmDetail({
  film,
  t,
  onClose,
  onEdit,
  onDelete,
}: {
  film: Film;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const tf = t.films;
  const tc = t.common;
  const statusLabel = tf.status[film.status as keyof typeof tf.status] ?? film.status ?? '—';
  const color = statusColors[film.status ?? ''] ?? '#718096';

  const row = (label: string, value?: string | number | null) =>
    value ? (
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14 }}>
        <span style={{ color: '#718096', minWidth: 120 }}>{label}</span>
        <span style={{ color: '#1a202c', fontWeight: 500 }}>{value}</span>
      </div>
    ) : null;

  return (
    <Modal isOpen title={film.title} onClose={onClose} maxWidth={620}>
      {film.title_vi && <p style={{ margin: '0 0 12px', color: '#718096', fontSize: 14 }}>{film.title_vi}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, background: color + '22', color, borderRadius: 6, padding: '3px 10px' }}>
          {statusLabel}
        </span>
        {film.genre && (
          <span style={{ fontSize: 12, background: '#e8f0fb', color: '#004aad', borderRadius: 4, padding: '2px 8px' }}>
            {film.genre}
          </span>
        )}
        {film.year && (
          <span style={{ fontSize: 12, background: '#F7FAFC', color: '#4A5568', borderRadius: 4, padding: '2px 8px', border: '1px solid #E2E8F0' }}>
            {film.year}
          </span>
        )}
      </div>

      {film.logline && (
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#4A5568', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '3px solid #c5d8f5', paddingLeft: 12 }}>
          {film.logline}
        </p>
      )}

      {row(tf.director, film.director)}
      {row(tf.producer, film.producer)}
      {film.duration_min && row(tf.duration, `${film.duration_min} ${tf.minutes}`)}
      {row('Created', formatDate(film.created_at))}

      {film.trailer_url && (
        <a
          href={film.trailer_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: '#004aad', textDecoration: 'none' }}
        >
          ▶ Trailer
        </a>
      )}

      {film.notes && (
        <div style={{ marginTop: 16, padding: 12, background: '#FFFBEB', borderRadius: 6, fontSize: 13, color: '#744210' }}>
          {film.notes}
        </div>
      )}

      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          {onDelete && (
            <button
              onClick={onDelete}
              style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
            >
              Delete
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              style={{ background: '#004aad', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              {tc.edit}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Add / Edit Form ───────────────────────────────────────────────────────────
function FilmForm({
  t,
  initial,
  onSave,
  onClose,
}: {
  t: ReturnType<typeof useI18n>;
  initial?: Film;
  onSave: () => void;
  onClose: () => void;
}) {
  const tf = t.films;
  const tc = t.common;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    title_vi: initial?.title_vi ?? '',
    year: initial?.year ? String(initial.year) : '',
    genre: initial?.genre ?? '',
    duration_min: initial?.duration_min ? String(initial.duration_min) : '',
    logline: initial?.logline ?? '',
    logline_vi: initial?.logline_vi ?? '',
    director: initial?.director ?? 'Tri Pham',
    producer: initial?.producer ?? '',
    status: initial?.status ?? 'in-production',
    poster_url: initial?.poster_url ?? '',
    trailer_url: initial?.trailer_url ?? '',
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
    };
    if (initial?.id) {
      await apiFetch(`${API_BASE}/films/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await apiFetch(`${API_BASE}/films`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false);
    onSave();
  };

  const inp = (key: string, label: string, type: string = 'text', placeholder?: string) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        type={type}
        value={(form as any)[key]}
        placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <Modal isOpen title={initial ? tf.form.editTitle : tf.form.title} onClose={onClose} maxWidth={620}>
      <div style={formGridStyle}>
        {inp('title', tf.form.name)}
        {inp('title_vi', tf.form.nameVi)}
        {inp('year', tf.form.year, 'number', '2024')}
        <div>
          <label style={labelStyle}>{tf.form.genre}</label>
          <select style={inputStyle} value={form.genre} onChange={e => set('genre', e.target.value)}>
            <option value="">{tc.all}</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {inp('duration_min', tf.form.duration, 'number', '90')}
        <div>
          <label style={labelStyle}>{tf.form.status}</label>
          <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
            {FILM_STATUSES.map(s => (
              <option key={s} value={s}>{tf.status[s as keyof typeof tf.status]}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.form.logline}</label>
        <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={form.logline} onChange={e => set('logline', e.target.value)} />
      </div>
      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.form.logline} (VI)</label>
        <textarea style={{ ...inputStyle, height: 56, resize: 'vertical' }} value={form.logline_vi} onChange={e => set('logline_vi', e.target.value)} />
      </div>
      <div style={formGridStyle}>
        {inp('director', tf.form.director)}
        {inp('producer', tf.form.producer)}
        {inp('poster_url', tf.form.posterUrl, 'url', 'https://')}
        {inp('trailer_url', tf.form.trailerUrl, 'url', 'https://')}
      </div>
      <div style={formRowStyle}>
        <label style={labelStyle}>{tf.form.notes}</label>
        <textarea style={{ ...inputStyle, height: 56, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={{ background: '#EDF2F7', color: '#4A5568', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          {tc.cancel}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          style={{ background: '#004aad', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? '…' : tc.save}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MyFilms({ t, isOwner }: { t: ReturnType<typeof useI18n>; isOwner: boolean }) {
  const tf = t.films;
  const tc = t.common;
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Film | null>(null);
  const [editing, setEditing] = useState<Film | null | 'new'>(null);

  const load = async () => {
    setLoading(true);
    const res = await apiFetch(`${API_BASE}/films`);
    const json = await res.json() as { data: Film[] };
    setFilms(json.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = films.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.title.toLowerCase().includes(q) || (f.title_vi ?? '').toLowerCase().includes(q);
    const matchGenre = !filterGenre || f.genre === filterGenre;
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchGenre && matchStatus;
  });

  const handleDelete = async (film: Film) => {
    if (!confirm(`Delete "${film.title}"?`)) return;
    await apiFetch(`${API_BASE}/films/${film.id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>{tf.title}</h1>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: 14 }}>{tf.subtitle}</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setEditing('new')}
            style={{ background: '#004aad', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            + {tf.addFilm}
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, flex: '1 1 180px', margin: 0 }}
          placeholder={tf.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, flex: '0 0 140px', margin: 0 }} value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
          <option value="">{tc.all} genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={{ ...inputStyle, flex: '0 0 160px', margin: 0 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{tc.all} statuses</option>
          {FILM_STATUSES.map(s => <option key={s} value={s}>{tf.status[s as keyof typeof tf.status]}</option>)}
        </select>
      </div>

      {/* Film list */}
      {loading ? (
        <p style={{ color: '#718096' }}>{tc.loading}</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#718096' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <p style={{ margin: 0 }}>{films.length === 0 ? tf.noFilms : tc.noData}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(film => (
            <FilmCard key={film.id} film={film} t={t} onSelect={() => setSelected(film)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <FilmDetail
          film={selected}
          t={t}
          onClose={() => setSelected(null)}
          onEdit={isOwner ? () => { setEditing(selected); setSelected(null); } : undefined}
          onDelete={isOwner ? () => handleDelete(selected) : undefined}
        />
      )}

      {/* Add / Edit form modal */}
      {editing !== null && (
        <FilmForm
          t={t}
          initial={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); load(); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
