import { useState, useEffect } from 'react';
import { useI18n, type Lang } from './i18n';

type Tab = 'dashboard' | 'festivals' | 'funds' | 'education' | 'monitors';

const API_BASE = '/api';

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline, t }: { deadline: string; t: ReturnType<typeof useI18n> }) {
  const days = daysUntil(deadline);
  const color =
    days <= 0 ? '#e53e3e' : days <= 7 ? '#dd6b20' : days <= 30 ? '#d69e2e' : '#38a169';
  const label =
    days <= 0
      ? t.common.today
      : days === 1
      ? t.common.tomorrow
      : `${days} ${t.common.daysLeft}`;

  return (
    <span
      style={{
        background: color,
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

function Dashboard({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/dashboard`)
      .then((r) => r.json() as Promise<{ upcoming: any[] }>)
      .then((d) => setItems(d.upcoming ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t.common.loading}</p>;

  return (
    <div>
      <h2>{t.dashboard.title}</h2>
      <p style={{ color: '#718096' }}>{t.dashboard.subtitle}</p>
      {items.length === 0 ? (
        <p>{t.dashboard.noItems}</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#718096',
                    marginRight: 8,
                  }}
                >
                  {t.dashboard.type[item.type as 'festival' | 'fund' | 'education']}
                </span>
                <strong>{item.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {item.deadline && <DeadlineBadge deadline={item.deadline} t={t} />}
                {item.website && (
                  <a
                    href={item.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12 }}
                  >
                    {t.common.website} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FestivalList({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/festivals`)
      .then((r) => r.json() as Promise<{ data: any[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t.common.loading}</p>;

  return (
    <div>
      <h2>{t.festivals.title}</h2>
      <p style={{ color: '#718096' }}>{t.festivals.subtitle}</p>
      {items.map((f) => (
        <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{f.name}</strong>
              {f.country && <span style={{ color: '#718096', marginLeft: 8 }}>{f.city}, {f.country}</span>}
              <div style={{ marginTop: 4, fontSize: 13, color: '#4a5568' }}>
                {f.category && <span style={{ marginRight: 12 }}>{t.festivals.category}: {f.category}</span>}
                {f.tier && <span>{t.festivals.tier}: {f.tier}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              {f.early_deadline && (
                <div style={{ fontSize: 12 }}>
                  {t.festivals.earlyDeadline}: <DeadlineBadge deadline={f.early_deadline} t={t} />
                </div>
              )}
              {f.regular_deadline && (
                <div style={{ fontSize: 12 }}>
                  {t.festivals.regularDeadline}: <DeadlineBadge deadline={f.regular_deadline} t={t} />
                </div>
              )}
            </div>
          </div>
          {f.website && (
            <a href={f.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, marginTop: 8, display: 'inline-block' }}>
              {t.common.website} →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function FundList({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/funds`)
      .then((r) => r.json() as Promise<{ data: any[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t.common.loading}</p>;

  return (
    <div>
      <h2>{t.funds.title}</h2>
      <p style={{ color: '#718096' }}>{t.funds.subtitle}</p>
      {items.map((f) => (
        <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{f.name}</strong>
              {f.organization && <div style={{ color: '#718096', fontSize: 13 }}>{f.organization}</div>}
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {f.max_amount && <span>{t.funds.maxAmount}: ${(f.max_amount / 100).toLocaleString()} </span>}
                {f.focus && <span>· {f.focus}</span>}
              </div>
            </div>
            {f.deadline && <DeadlineBadge deadline={f.deadline} t={t} />}
          </div>
          {f.website && (
            <a href={f.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, marginTop: 8, display: 'inline-block' }}>
              {t.common.website} →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function EducationList({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/education`)
      .then((r) => r.json() as Promise<{ data: any[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t.common.loading}</p>;

  return (
    <div>
      <h2>{t.education.title}</h2>
      <p style={{ color: '#718096' }}>{t.education.subtitle}</p>
      {items.map((e) => (
        <div key={e.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{e.name}</strong>
              {e.organization && <div style={{ color: '#718096', fontSize: 13 }}>{e.organization}</div>}
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {e.type && <span>{t.education.type}: {e.type} </span>}
                {e.duration && <span>· {t.education.duration}: {e.duration}</span>}
              </div>
            </div>
            {e.deadline && <DeadlineBadge deadline={e.deadline} t={t} />}
          </div>
          {e.website && (
            <a href={e.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, marginTop: 8, display: 'inline-block' }}>
              {t.common.website} →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function MonitorList({ t }: { t: ReturnType<typeof useI18n> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ target_url: '', target_name: '', watch_for: 'deadline', alert_days_before: 7 });

  const load = () => {
    fetch(`${API_BASE}/monitors`)
      .then((r) => r.json() as Promise<{ data: any[] }>)
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.target_url) return;
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

  if (loading) return <p>{t.common.loading}</p>;

  return (
    <div>
      <h2>{t.monitors.title}</h2>
      <p style={{ color: '#718096' }}>{t.monitors.subtitle}</p>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 24, background: '#f7fafc' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            placeholder={t.monitors.url}
            value={form.target_url}
            onChange={(e) => setForm({ ...form, target_url: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 14 }}
          />
          <input
            placeholder={t.monitors.name}
            value={form.target_name}
            onChange={(e) => setForm({ ...form, target_name: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 14 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={form.watch_for}
              onChange={(e) => setForm({ ...form, watch_for: e.target.value })}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 14, flex: 1 }}
            >
              <option value="deadline">Deadline</option>
              <option value="early_bird">Early Bird</option>
              <option value="results">Results</option>
              <option value="announcement">Announcement</option>
            </select>
            <input
              type="number"
              min={1}
              max={90}
              value={form.alert_days_before}
              onChange={(e) => setForm({ ...form, alert_days_before: Number(e.target.value) })}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 14, width: 80 }}
            />
          </div>
          <button
            onClick={add}
            style={{ padding: '8px 16px', background: '#2d3748', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
          >
            {t.monitors.addMonitor}
          </button>
        </div>
      </div>

      {items.map((m) => (
        <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>{m.target_name || m.target_url}</strong>
            <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>
              {m.watch_for} · Alert {m.alert_days_before} {t.monitors.alertDays}
            </div>
            {m.target_name && <div style={{ fontSize: 11, color: '#a0aec0' }}>{m.target_url}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {m.is_active ? (
              <span style={{ fontSize: 12, color: '#38a169', fontWeight: 700 }}>{t.monitors.active}</span>
            ) : null}
            <button
              onClick={() => deactivate(m.id)}
              style={{ padding: '4px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#e53e3e' }}
            >
              {t.monitors.deactivate}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<Tab>('dashboard');
  const t = useI18n(lang);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t.nav.dashboard },
    { key: 'festivals', label: t.nav.festivals },
    { key: 'funds', label: t.nav.funds },
    { key: 'education', label: t.nav.education },
    { key: 'monitors', label: t.nav.monitors },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#1a202c', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>🎬 IFT</span>
          <span style={{ marginLeft: 8, fontSize: 13, color: '#a0aec0' }}>Indie Filmmaking Tracker</span>
        </div>
        <button
          onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
          style={{ background: '#2d3748', color: '#fff', border: '1px solid #4a5568', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}
        >
          {lang === 'en' ? 'VI' : 'EN'}
        </button>
      </header>

      {/* Nav */}
      <nav style={{ background: '#2d3748', padding: '0 20px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: 'transparent',
              color: tab === key ? '#fff' : '#a0aec0',
              border: 'none',
              borderBottom: tab === key ? '2px solid #63b3ed' : '2px solid transparent',
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              fontWeight: tab === key ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'dashboard'  && <Dashboard    t={t} />}
        {tab === 'festivals'  && <FestivalList t={t} />}
        {tab === 'funds'      && <FundList     t={t} />}
        {tab === 'education'  && <EducationList t={t} />}
        {tab === 'monitors'   && <MonitorList  t={t} />}
      </main>
    </div>
  );
}
