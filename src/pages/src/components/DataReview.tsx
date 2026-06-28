import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../apiFetch';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface ReviewItem {
  id: number;
  review_type: 'new_festival' | 'deadline_update' | 'existing_festival_audit';
  entity_type: string;
  entity_id: number | null;
  source_url: string | null;
  source_title: string | null;
  candidate_json: string;
  ai_model: string | null;
  ai_confidence: number | null;
  reason: string | null;
  status: ReviewStatus;
  created_at: string;
  reviewed_at: string | null;
}

function parseCandidate(item: ReviewItem): any {
  try { return JSON.parse(item.candidate_json); } catch { return {}; }
}

function reviewTitle(item: ReviewItem, data: any): string {
  if (item.review_type === 'new_festival') return data?.festival?.name ?? item.source_title ?? 'Festival mới';
  if (item.review_type === 'deadline_update') return item.source_title ?? `#${item.entity_id}`;
  return data?.festival?.name ?? item.source_title ?? `Festival #${item.entity_id}`;
}

function typeLabel(type: ReviewItem['review_type']): string {
  if (type === 'new_festival') return 'Festival mới / New festival';
  if (type === 'deadline_update') return 'Deadline đề xuất / Proposed deadline';
  return 'Kiểm tra dữ liệu cũ / Existing data audit';
}

export function DataReview() {
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | 'audit' | null>(null);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    apiFetch(`/api/admin/data-reviews?status=${status}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json() as { error?: string }).error ?? 'Load failed');
        return r.json() as Promise<{ data: ReviewItem[] }>;
      })
      .then(d => setItems(d.data ?? []))
      .catch(e => setMessage(e instanceof Error ? e.message : 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const pendingCount = useMemo(() => status === 'pending' ? items.length : 0, [items, status]);

  const resolve = async (item: ReviewItem, action: 'approve' | 'reject') => {
    setBusy(item.id);
    setMessage('');
    try {
      const response = await apiFetch(`/api/admin/data-reviews/${item.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(action === 'approve' && editingId === item.id ? { corrections } : {}),
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? 'Request failed');
      }
      setItems(current => current.filter(row => row.id !== item.id));
      setEditingId(null);
      setCorrections({});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật');
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (item: ReviewItem, data: any) => {
    if (editingId === item.id) {
      setEditingId(null);
      setCorrections({});
      return;
    }
    const festival = data?.festival ?? {};
    if (item.review_type === 'deadline_update') {
      setCorrections({
        deadline_early: data?.deadline_early ?? '',
        deadline_regular: data?.deadline_regular ?? '',
        source_url: data?.source_url ?? item.source_url ?? '',
        evidence: data?.evidence ?? '',
      });
    } else {
      setCorrections({
        name: festival.name ?? item.source_title ?? '',
        early_deadline: festival.early_deadline ?? '',
        regular_deadline: festival.regular_deadline ?? '',
        website: festival.website ?? item.source_url ?? '',
        filmfreeway_url: festival.filmfreeway_url ?? '',
      });
    }
    setEditingId(item.id);
  };

  const auditExisting = async () => {
    setBusy('audit');
    setMessage('');
    try {
      const response = await apiFetch('/api/admin/data-reviews/audit-existing', {
        method: 'POST',
        body: JSON.stringify({ limit: 10 }),
      });
      const body = await response.json() as { checked?: number; verified?: number; queued?: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Audit failed');
      setMessage(`Đã kiểm tra ${body.checked ?? 0}: ${body.verified ?? 0} đạt, ${body.queued ?? 0} cần duyệt.`);
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể chạy kiểm tra');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 12, flexWrap: 'wrap', marginBottom: 12,
      }}>
        <div>
          <div style={{ fontWeight: 800, color: '#1a202c' }}>Kiểm duyệt dữ liệu / Data Review</div>
          <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
            {pendingCount} mục đang chờ. AI chỉ đề xuất; bạn quyết định dữ liệu được xuất bản.
          </div>
        </div>
        <button
          onClick={auditExisting}
          disabled={busy !== null}
          style={{ ...buttonStyle, background: '#ebf8ff', color: '#2b6cb0', borderColor: '#bee3f8' }}
        >
          {busy === 'audit' ? 'Đang kiểm tra…' : 'Quét 10 festival cũ / Audit 10'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected'] as ReviewStatus[]).map(value => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            style={{
              ...filterStyle,
              background: status === value ? '#004aad' : '#fff',
              color: status === value ? '#fff' : '#4a5568',
            }}
          >
            {value === 'pending' ? 'Chờ duyệt' : value === 'approved' ? 'Đã duyệt' : 'Đã loại'}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ padding: '9px 12px', borderRadius: 7, background: '#fffff0', color: '#744210', fontSize: 12, marginBottom: 12 }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={emptyStyle}>Đang tải…</div>
      ) : items.length === 0 ? (
        <div style={emptyStyle}>Không có mục nào / Nothing to review.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const data = parseCandidate(item);
            const festival = data?.festival ?? {};
            const analysis = data?.analysis ?? {};
            const deadline = item.review_type === 'deadline_update' ? data : analysis;
            const checks = data?.checks ?? {};
            const isBusy = busy === item.id;
            return (
              <div key={item.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#004aad', fontWeight: 800, textTransform: 'uppercase' }}>
                      {typeLabel(item.review_type)}
                    </div>
                    <div style={{ fontWeight: 800, color: '#1a202c', marginTop: 3 }}>
                      {reviewTitle(item, data)}
                    </div>
                    {item.source_title && item.source_title !== reviewTitle(item, data) && (
                      <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{item.source_title}</div>
                    )}
                  </div>
                  {item.ai_confidence !== null && (
                    <span style={confidenceStyle}>AI {Math.round(item.ai_confidence * 100)}%</span>
                  )}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: '#4a5568', lineHeight: 1.6 }}>
                  {item.reason && <div><strong>Lý do:</strong> {item.reason}</div>}
                  {analysis.kind && <div><strong>Phân loại:</strong> {analysis.kind} · actionable: {String(analysis.actionable)}</div>}
                  {(deadline?.deadline_early || festival?.early_deadline) && (
                    <div><strong>Early:</strong> {deadline?.deadline_early ?? festival?.early_deadline}</div>
                  )}
                  {(deadline?.deadline_regular || festival?.regular_deadline) && (
                    <div><strong>Regular:</strong> {deadline?.deadline_regular ?? festival?.regular_deadline}</div>
                  )}
                  {(deadline?.evidence || analysis?.evidence) && (
                    <div><strong>Bằng chứng:</strong> “{deadline?.evidence ?? analysis?.evidence}”</div>
                  )}
                  {Object.entries(checks).map(([field, check]: [string, any]) => (
                    <div key={field}>
                      <strong>{field}:</strong> {check?.status} · {check?.reason}
                    </div>
                  ))}
                </div>

                {(item.source_url || festival?.website || festival?.filmfreeway_url) && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 9, fontSize: 12 }}>
                    {item.source_url && <SafeLink href={item.source_url} label="Mở nguồn / Source" />}
                    {festival?.website && festival.website !== item.source_url && <SafeLink href={festival.website} label="Website" />}
                    {festival?.filmfreeway_url && <SafeLink href={festival.filmfreeway_url} label="Submission" />}
                  </div>
                )}

                {editingId === item.id && (
                  <div style={editPanelStyle}>
                    {item.review_type === 'deadline_update' ? (
                      <>
                        <EditField label="Early deadline" type="date" value={corrections.deadline_early ?? ''} onChange={value => setCorrections(v => ({ ...v, deadline_early: value }))} />
                        <EditField label="Regular deadline" type="date" value={corrections.deadline_regular ?? ''} onChange={value => setCorrections(v => ({ ...v, deadline_regular: value }))} />
                        <EditField label="Source URL" value={corrections.source_url ?? ''} onChange={value => setCorrections(v => ({ ...v, source_url: value }))} />
                        <EditField label="Bằng chứng / Evidence" value={corrections.evidence ?? ''} onChange={value => setCorrections(v => ({ ...v, evidence: value }))} />
                      </>
                    ) : (
                      <>
                        <EditField label="Tên / Name" value={corrections.name ?? ''} onChange={value => setCorrections(v => ({ ...v, name: value }))} />
                        <EditField label="Early deadline" type="date" value={corrections.early_deadline ?? ''} onChange={value => setCorrections(v => ({ ...v, early_deadline: value }))} />
                        <EditField label="Regular deadline" type="date" value={corrections.regular_deadline ?? ''} onChange={value => setCorrections(v => ({ ...v, regular_deadline: value }))} />
                        <EditField label="Website" value={corrections.website ?? ''} onChange={value => setCorrections(v => ({ ...v, website: value }))} />
                        <EditField label="Submission URL" value={corrections.filmfreeway_url ?? ''} onChange={value => setCorrections(v => ({ ...v, filmfreeway_url: value }))} />
                      </>
                    )}
                  </div>
                )}

                {status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => startEdit(item, data)}
                      disabled={isBusy}
                      style={{ ...buttonStyle, background: '#ebf8ff', color: '#2b6cb0', borderColor: '#bee3f8' }}
                    >
                      {editingId === item.id ? 'Đóng chỉnh sửa / Close' : 'Sửa trước khi duyệt / Edit'}
                    </button>
                    <button
                      onClick={() => resolve(item, 'approve')}
                      disabled={isBusy}
                      style={{ ...buttonStyle, background: '#f0fff4', color: '#276749', borderColor: '#c6f6d5' }}
                    >
                      {isBusy ? '…' : item.review_type === 'new_festival' ? 'Xuất bản / Publish' : 'Giữ hoặc áp dụng / Approve'}
                    </button>
                    <button
                      onClick={() => resolve(item, 'reject')}
                      disabled={isBusy}
                      style={{ ...buttonStyle, background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }}
                    >
                      {item.review_type === 'existing_festival_audit' ? 'Ẩn khỏi app / Hide' : 'Loại bỏ / Reject'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SafeLink({ href, label }: { href: string; label: string }) {
  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return <a href={url.toString()} target="_blank" rel="noopener noreferrer" style={{ color: '#004aad', fontWeight: 700 }}>{label} ↗</a>;
  } catch {
    return null;
  }
}

function EditField({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: '#4a5568' }}>
      <span style={{ fontWeight: 800 }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        style={{ border: '1px solid #cbd5e0', borderRadius: 6, padding: '7px 8px', fontSize: 12, minWidth: 0 }}
      />
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 9, padding: 14,
  background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid', borderRadius: 6, padding: '7px 11px',
  cursor: 'pointer', fontWeight: 700, fontSize: 12,
};

const filterStyle: React.CSSProperties = {
  border: '1px solid #cbd5e0', borderRadius: 20, padding: '5px 11px',
  cursor: 'pointer', fontSize: 12, fontWeight: 700,
};

const confidenceStyle: React.CSSProperties = {
  background: '#faf5ff', color: '#6b46c1', border: '1px solid #e9d8fd',
  borderRadius: 20, padding: '3px 8px', fontSize: 11, fontWeight: 800,
  height: 'fit-content',
};

const editPanelStyle: React.CSSProperties = {
  marginTop: 12, padding: 12, borderRadius: 8, background: '#f7fafc',
  border: '1px solid #e2e8f0', display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 9,
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: 48, color: '#718096', fontSize: 13,
};
