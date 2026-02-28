import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { DeadlineBadge } from './DeadlineBadge';
import { Modal, inputStyle, labelStyle, formRowStyle, formGridStyle } from './Modal';
import type { Film, Submission } from '../types';

const API_BASE = '/api';

type RefTable = 'festivals' | 'funds_grants' | 'education_residency';
type SubStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'withdrawn';

const STATUS_ORDER: SubStatus[] = ['draft', 'submitted', 'accepted', 'rejected', 'waitlisted', 'withdrawn'];
const PLATFORMS = ['filmfreeway', 'direct', 'email', 'other'];

function fmtDate(d?: string): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtFee(cents?: number): string {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(0)}`;
}

function getStatusStyle(status: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    draft:      { bg: '#F7FAFC', color: '#718096' },
    submitted:  { bg: '#EBF8FF', color: '#2B6CB0' },
    accepted:   { bg: '#F0FFF4', color: '#276749' },
    rejected:   { bg: '#FFF5F5', color: '#C53030' },
    waitlisted: { bg: '#FFFFF0', color: '#744210' },
    withdrawn:  { bg: '#F7FAFC', color: '#A0AEC0' },
  };
  return map[status] ?? { bg: '#F7FAFC', color: '#718096' };
}

// ─── Submission Row ────────────────────────────────────────────────────────────
function SubmissionRow({
  sub,
  t,
  onEdit,
  onDelete,
}: {
  sub: Submission;
  t: ReturnType<typeof useI18n>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ts = t.submissions;
  const { bg, color } = getStatusStyle(sub.status);
  const statusLabel = ts.status[sub.status as SubStatus] ?? sub.status;
  const refLabel = ts.refTable[sub.ref_table as RefTable] ?? sub.ref_table;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '14px 18px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 12,
        alignItems: 'center',
      }}
    >
      {/* Film + Target */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          🎬 {sub.film_title ?? `Film #${sub.film_id}`}
        </div>
        <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ fontSize: 11, background: '#EDF2F7', color: '#718096', borderRadius: 3, padding: '1px 5px', marginRight: 4 }}>{refLabel}</span>
          {sub.ref_name ?? `#${sub.ref_id}`}
        </div>
        {sub.submitted_at && (
          <div style={{ fontSize: 12, color: '#A0AEC0' }}>{ts.submittedAt}: {fmtDate(sub.submitted_at)}</div>
        )}
      </div>

      {/* Deadline + Fee */}
      <div>
        {sub.deadline && (
          <div style={{ marginBottom: 4 }}>
            <DeadlineBadge deadline={sub.deadline} t={t.common} small />
          </div>
        )}
        {sub.entry_fee_paid ? (
          <div style={{ fontSize: 12, color: '#718096' }}>{ts.entryFee}: {fmtFee(sub.entry_fee_paid)}</div>
        ) : null}
        {sub.notes && (
          <div style={{ fontSize: 12, color: '#A0AEC0', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub.notes}
          </div>
        )}
      </div>

      {/* Status + Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, background: bg, color, borderRadius: 6, padding: '3px 10px', whiteSpace: 'nowrap' }}>
          {statusLabel}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onEdit}
            style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}
          >
            {t.common.edit}
          </button>
          <button
            onClick={onDelete}
            style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Submission Form ───────────────────────────────────────────────────────────
function SubmissionForm({
  t,
  films,
  initial,
  onSave,
  onClose,
}: {
  t: ReturnType<typeof useI18n>;
  films: Film[];
  initial?: Submission;
  onSave: () => void;
  onClose: () => void;
}) {
  const ts = t.submissions;
  const tc = t.common;

  const [saving, setSaving] = useState(false);
  const [refTable, setRefTable] = useState<RefTable>((initial?.ref_table as RefTable) ?? 'festivals');
  const [targets, setTargets] = useState<{ id: number; name: string; deadline?: string }[]>([]);
  const [form, setForm] = useState({
    film_id: initial?.film_id ? String(initial.film_id) : '',
    ref_id: initial?.ref_id ? String(initial.ref_id) : '',
    submitted_at: initial?.submitted_at ?? '',
    submission_platform: initial?.submission_platform ?? 'direct',
    submission_url: initial?.submission_url ?? '',
    entry_fee_paid: initial?.entry_fee_paid ? String(initial.entry_fee_paid / 100) : '',
    status: initial?.status ?? 'submitted',
    result_date: initial?.result_date ?? '',
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Load targets when ref_table changes
  useEffect(() => {
    const endpoints: Record<RefTable, string> = {
      festivals: '/api/festivals?status=active&limit=100',
      funds_grants: '/api/funds?status=active',
      education_residency: '/api/education?status=active',
    };
    fetch(endpoints[refTable])
      .then(r => r.json<{ data: { id: number; name: string; regular_deadline?: string; deadline?: string }[] }>())
      .then(json => {
        setTargets((json.data ?? []).map(x => ({
          id: x.id,
          name: x.name,
          deadline: x.regular_deadline ?? x.deadline,
        })));
      })
      .catch(() => setTargets([]));
  }, [refTable]);

  const selectedTarget = targets.find(x => x.id === Number(form.ref_id));
  const selectedFilm = films.find(f => f.id === Number(form.film_id));

  const handleSave = async () => {
    if (!form.film_id || !form.ref_id) return;
    setSaving(true);

    const payload = {
      film_id: Number(form.film_id),
      film_title: selectedFilm?.title,
      ref_table: refTable,
      ref_id: Number(form.ref_id),
      ref_name: selectedTarget?.name,
      deadline: selectedTarget?.deadline,
      submitted_at: form.submitted_at || null,
      submission_platform: form.submission_platform,
      submission_url: form.submission_url || null,
      entry_fee_paid: form.entry_fee_paid ? Math.round(Number(form.entry_fee_paid) * 100) : null,
      status: form.status,
      result_date: form.result_date || null,
      notes: form.notes || null,
    };

    if (initial?.id) {
      await fetch(`${API_BASE}/submissions/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    onSave();
  };

  return (
    <Modal isOpen title={ts.form.title} onClose={onClose} maxWidth={620}>
      <div style={formGridStyle}>
        {/* Film selector */}
        <div>
          <label style={labelStyle}>{ts.form.film}</label>
          <select style={inputStyle} value={form.film_id} onChange={e => set('film_id', e.target.value)}>
            <option value="">— select film —</option>
            {films.map(f => <option key={f.id} value={f.id}>{f.title}{f.year ? ` (${f.year})` : ''}</option>)}
          </select>
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>{ts.form.refTable}</label>
          <select style={inputStyle} value={refTable} onChange={e => { setRefTable(e.target.value as RefTable); set('ref_id', ''); }}>
            <option value="festivals">{ts.refTable.festivals}</option>
            <option value="funds_grants">{ts.refTable.funds_grants}</option>
            <option value="education_residency">{ts.refTable.education_residency}</option>
          </select>
        </div>

        {/* Target */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>{ts.form.refId}</label>
          <select style={inputStyle} value={form.ref_id} onChange={e => set('ref_id', e.target.value)}>
            <option value="">— select target —</option>
            {targets.map(x => (
              <option key={x.id} value={x.id}>
                {x.name}{x.deadline ? ` · ${fmtDate(x.deadline)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>{ts.form.status}</label>
          <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{ts.status[s]}</option>)}
          </select>
        </div>

        {/* Platform */}
        <div>
          <label style={labelStyle}>{ts.form.platform}</label>
          <select style={inputStyle} value={form.submission_platform} onChange={e => set('submission_platform', e.target.value)}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Submitted at */}
        <div>
          <label style={labelStyle}>{ts.form.submittedAt}</label>
          <input style={inputStyle} type="date" value={form.submitted_at} onChange={e => set('submitted_at', e.target.value)} />
        </div>

        {/* Entry fee */}
        <div>
          <label style={labelStyle}>{ts.form.entryFee}</label>
          <input style={inputStyle} type="number" placeholder="0" value={form.entry_fee_paid} onChange={e => set('entry_fee_paid', e.target.value)} />
        </div>

        {/* Result date */}
        <div>
          <label style={labelStyle}>{ts.form.resultDate}</label>
          <input style={inputStyle} type="date" value={form.result_date} onChange={e => set('result_date', e.target.value)} />
        </div>
      </div>

      {/* Submission URL */}
      <div style={formRowStyle}>
        <label style={labelStyle}>{ts.form.url}</label>
        <input style={inputStyle} type="url" placeholder="https://" value={form.submission_url} onChange={e => set('submission_url', e.target.value)} />
      </div>

      {/* Notes */}
      <div style={formRowStyle}>
        <label style={labelStyle}>{ts.form.notes}</label>
        <textarea style={{ ...inputStyle, height: 56, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={{ background: '#EDF2F7', color: '#4A5568', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          {tc.cancel}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.film_id || !form.ref_id}
          style={{ background: '#3182CE', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.film_id || !form.ref_id ? 0.6 : 1 }}
        >
          {saving ? '…' : tc.save}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function Submissions({ t }: { t: ReturnType<typeof useI18n> }) {
  const ts = t.submissions;
  const tc = t.common;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRefTable, setFilterRefTable] = useState('');
  const [editing, setEditing] = useState<Submission | 'new' | null>(null);

  const load = async () => {
    setLoading(true);
    const [subsRes, filmsRes] = await Promise.all([
      fetch(`${API_BASE}/submissions`),
      fetch(`${API_BASE}/films`),
    ]);
    const [subsJson, filmsJson] = await Promise.all([
      subsRes.json<{ data: Submission[] }>(),
      filmsRes.json<{ data: Film[] }>(),
    ]);
    setSubmissions(subsJson.data ?? []);
    setFilms(filmsJson.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (s.film_title ?? '').toLowerCase().includes(q)
      || (s.ref_name ?? '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchTable = !filterRefTable || s.ref_table === filterRefTable;
    return matchSearch && matchStatus && matchTable;
  });

  // Group by status for a kanban-style summary
  const summary = STATUS_ORDER.map(s => ({
    status: s,
    count: submissions.filter(x => x.status === s).length,
  })).filter(x => x.count > 0);

  const handleDelete = async (sub: Submission) => {
    if (!confirm(`Delete this submission?`)) return;
    await fetch(`${API_BASE}/submissions/${sub.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>{ts.title}</h1>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: 14 }}>{ts.subtitle}</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          style={{ background: '#3182CE', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          + {ts.addSubmission}
        </button>
      </div>

      {/* Status summary bar */}
      {summary.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {summary.map(({ status, count }) => {
            const { bg, color } = getStatusStyle(status);
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
                style={{
                  background: filterStatus === status ? color : bg,
                  color: filterStatus === status ? '#fff' : color,
                  border: `1px solid ${color}44`,
                  borderRadius: 20,
                  padding: '4px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {ts.status[status as SubStatus]} · {count}
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, flex: '1 1 180px', margin: 0 }}
          placeholder={ts.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, flex: '0 0 170px', margin: 0 }} value={filterRefTable} onChange={e => setFilterRefTable(e.target.value)}>
          <option value="">{tc.all} categories</option>
          <option value="festivals">{ts.refTable.festivals}</option>
          <option value="funds_grants">{ts.refTable.funds_grants}</option>
          <option value="education_residency">{ts.refTable.education_residency}</option>
        </select>
      </div>

      {/* Submissions list */}
      {loading ? (
        <p style={{ color: '#718096' }}>{tc.loading}</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#718096' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ margin: 0 }}>{submissions.length === 0 ? ts.noSubmissions : tc.noData}</p>
          {submissions.length === 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              Add your films first, then log submissions here.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(sub => (
            <SubmissionRow
              key={sub.id}
              sub={sub}
              t={t}
              onEdit={() => setEditing(sub)}
              onDelete={() => handleDelete(sub)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {editing !== null && (
        <SubmissionForm
          t={t}
          films={films}
          initial={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); load(); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
