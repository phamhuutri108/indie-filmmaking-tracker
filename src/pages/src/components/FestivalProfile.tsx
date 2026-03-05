import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../apiFetch';
import { DeadlineBadge } from './DeadlineBadge';
import type {
  Festival, FestivalSection, FestivalInsights, PastFilm,
  WatchlistItem, Monitor, Submission,
} from '../types';

type Lang = 'vi' | 'en';
type ProfileSubTab = 'overview' | 'sections' | 'my-status' | 'history';

const API_BASE = '/api';

const PRESTIGE_COLORS: Record<string, string> = {
  'a-list': '#d69e2e',
  recognized: '#38a169',
  credible: '#004aad',
  unverified: '#718096',
  'not-recommended': '#e53e3e',
};

function formatFee(cents?: number): string {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function badge(color: string, text: string) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 10,
      fontSize: 11, fontWeight: 700, color: '#fff', background: color,
    }}>
      {text}
    </span>
  );
}

// ─── Festival Avatar ──────────────────────────────────────────────────────────
const AGGREGATOR_DOMAINS_P = new Set([
  'asianfilmfestivals.com', 'filmfreeway.com', 'withoutabox.com',
  'festhome.com', 'filmfestivallife.com', 'shortfilmdepot.com',
]);

function getFestivalDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    return AGGREGATOR_DOMAINS_P.has(host) ? null : host;
  } catch { return null; }
}

function FestivalAvatar({ name, website, size = 48 }: { name: string; website?: string; size?: number }) {
  const [ok, setOk] = useState(false);
  const domain = getFestivalDomain(website);
  const faviconUrl = domain
    ? `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`
    : null;
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, hsl(${hue},55%,80%) 0%, hsl(${hue},45%,65%) 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, position: 'relative',
      border: '2px solid rgba(255,255,255,0.35)',
    }}>
      <span style={{
        fontSize: size * 0.33, fontWeight: 900, color: `hsl(${hue},40%,30%)`,
        position: 'absolute', opacity: ok ? 0 : 1, transition: 'opacity 0.2s',
        userSelect: 'none',
      }}>{initials}</span>
      {faviconUrl && (
        <img src={faviconUrl} alt="" onLoad={() => setOk(true)} onError={() => setOk(false)}
          style={{ width: '80%', height: '80%', objectFit: 'contain', position: 'absolute',
            opacity: ok ? 1 : 0, transition: 'opacity 0.2s' }}
        />
      )}
    </div>
  );
}

function safeParseJson<T>(str?: string | null, fallback: T = [] as unknown as T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function parseInsights(raw: Record<string, unknown>): FestivalInsights {
  return {
    festival_id: raw.festival_id as number,
    confidence: (raw.confidence as 'high' | 'medium' | 'low') ?? 'low',
    summary: raw.summary as string | undefined,
    what_they_look_for: raw.what_they_look_for as string | undefined,
    eligibility: raw.eligibility as string | undefined,
    industry_presence: raw.industry_presence as string | undefined,
    tips: raw.tips as string | undefined,
    summary_vi: raw.summary_vi as string | undefined,
    what_they_look_for_vi: raw.what_they_look_for_vi as string | undefined,
    eligibility_vi: raw.eligibility_vi as string | undefined,
    industry_presence_vi: raw.industry_presence_vi as string | undefined,
    tips_vi: raw.tips_vi as string | undefined,
    past_selections: safeParseJson<PastFilm[]>(raw.past_selections as string | null, []),
    prizes: safeParseJson(raw.prizes as string | null, []),
    useful_links: safeParseJson(raw.useful_links as string | null, []),
    acceptance_stats: safeParseJson(raw.acceptance_stats as string | null, null),
    generated_at: raw.generated_at as string | undefined,
    model_used: raw.model_used as string | undefined,
  };
}

// ─── Section Card (reused from FestivalList logic) ────────────────────────────
function SectionRow({ section, t, isOwner, onDeleted }: {
  section: FestivalSection;
  t: ReturnType<typeof useI18n>;
  isOwner: boolean;
  onDeleted: (id: number) => void;
}) {
  const ts = (t as any).sections ?? {};
  const displayName = section.section_name === 'General' ? (ts.general ?? 'General Submissions') : section.section_name;

  const del = async () => {
    if (!confirm(`Delete section "${section.section_name}"?`)) return;
    await fetch(`${API_BASE}/festival-sections/${section.id}`, { method: 'DELETE' });
    onDeleted(section.id);
  };

  return (
    <div style={{ padding: '12px 14px', background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <strong style={{ fontSize: 14 }}>{displayName}</strong>
          {section.category && (
            <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#fff', background: '#004aad' }}>
              {(t as any).categories?.[section.category] ?? section.category}
            </span>
          )}
        </div>
        {isOwner && (
          <button onClick={del} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 16 }}>×</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#4a5568' }}>
        {section.early_deadline && (
          <span>Early: <strong>{formatDate(section.early_deadline)}</strong> {section.entry_fee_early != null && formatFee(section.entry_fee_early)}</span>
        )}
        {section.regular_deadline && (
          <span>Regular: <DeadlineBadge deadline={section.regular_deadline} t={t} /> <strong>{formatDate(section.regular_deadline)}</strong> {section.entry_fee_regular != null && formatFee(section.entry_fee_regular)}</span>
        )}
        {section.late_deadline && (
          <span>Late: <strong>{formatDate(section.late_deadline)}</strong></span>
        )}
        {section.filmfreeway_url && (
          <a href={section.filmfreeway_url} target="_blank" rel="noreferrer"
            style={{ color: '#e53e3e', textDecoration: 'none', fontWeight: 600 }}>
            FilmFreeway ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Confidence banner ────────────────────────────────────────────────────────
function ConfidenceBanner({ confidence, tp }: { confidence: 'high' | 'medium' | 'low'; tp: Record<string, string> }) {
  if (confidence === 'high') return null;
  const msg = confidence === 'medium' ? tp.confidenceMedium : tp.confidenceLow;
  const bg = confidence === 'medium' ? '#fffff0' : '#fff5f5';
  const border = confidence === 'medium' ? '#ecc94b' : '#fc8181';
  return (
    <div style={{ padding: '10px 14px', background: bg, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: '#4a5568', marginBottom: 16 }}>
      ⚠️ {msg}
    </div>
  );
}

// ─── Narrative block ──────────────────────────────────────────────────────────
function NarrativeBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: '#4a5568', margin: 0 }}>{text}</p>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ festival, insights, insightsLoading, tp, t, lang }: {
  festival: Festival;
  insights: FestivalInsights | null;
  insightsLoading: boolean;
  tp: Record<string, string>;
  t: ReturnType<typeof useI18n>;
  lang: Lang;
}) {
  const vi = lang === 'vi';
  if (insightsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        <p>{tp.loadingInsights ?? 'Generating AI profile...'}</p>
        <p style={{ fontSize: 12 }}>This may take 10–20 seconds on first load.</p>
      </div>
    );
  }

  if (!insights) {
    return <p style={{ color: '#718096' }}>{tp.noInsights ?? 'No profile data yet.'}</p>;
  }

  return (
    <div>
      <ConfidenceBanner confidence={insights.confidence} tp={tp} />

      <NarrativeBlock label={tp.about ?? 'About'} text={vi && insights.summary_vi ? insights.summary_vi : insights.summary} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div>
          <NarrativeBlock label={tp.whatTheyLookFor ?? 'What They Look For'} text={vi && insights.what_they_look_for_vi ? insights.what_they_look_for_vi : insights.what_they_look_for} />
        </div>
        <div>
          <NarrativeBlock label={tp.eligibility ?? 'Eligibility'} text={vi && insights.eligibility_vi ? insights.eligibility_vi : insights.eligibility} />
        </div>
      </div>

      {/* Prizes */}
      {insights.prizes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tp.prizes ?? 'Prizes & Benefits'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {insights.prizes.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#fffff0', borderRadius: 6, border: '1px solid #ecc94b' }}>
                <strong style={{ fontSize: 13, color: '#744210', minWidth: 140 }}>{p.name}</strong>
                <span style={{ fontSize: 13, color: '#4a5568' }}>
                  {p.amount_usd != null && <span style={{ fontWeight: 700, marginRight: 6 }}>${p.amount_usd.toLocaleString()}</span>}
                  {p.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
        <NarrativeBlock label={tp.industryPresence ?? 'Industry Presence'} text={vi && insights.industry_presence_vi ? insights.industry_presence_vi : insights.industry_presence} />
        <NarrativeBlock label={tp.tips ?? 'Tips for Applying'} text={vi && insights.tips_vi ? insights.tips_vi : insights.tips} />
      </div>

      {/* Website links */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        {festival.website && (
          <a href={festival.website} target="_blank" rel="noreferrer"
            style={{ padding: '8px 16px', background: '#004aad', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            {(t as any).festivals?.website ?? 'Website'} ↗
          </a>
        )}
        {festival.filmfreeway_url && (
          <a href={festival.filmfreeway_url} target="_blank" rel="noreferrer"
            style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            FilmFreeway ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Sections Tab ─────────────────────────────────────────────────────────────
function SectionsTab({ festival, t, isOwner, onSectionsChanged }: {
  festival: Festival;
  t: ReturnType<typeof useI18n>;
  isOwner: boolean;
  onSectionsChanged: (sections: FestivalSection[]) => void;
}) {
  const sections = festival.sections ?? [];
  const ts = (t as any).sections ?? {};

  const handleDeleted = (id: number) => {
    onSectionsChanged(sections.filter((s) => s.id !== id));
  };

  if (sections.length === 0) {
    return <p style={{ color: '#718096', padding: '20px 0' }}>{ts.noSections ?? 'No sections yet.'}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sections.map((s) => (
        <SectionRow key={s.id} section={s} t={t} isOwner={isOwner} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}

// ─── My Status Tab ────────────────────────────────────────────────────────────
function MyStatusTab({ festival, tp, t, watchlistItem, monitors, submissions, onToggleStar, lang }: {
  festival: Festival;
  tp: Record<string, string>;
  t: ReturnType<typeof useI18n>;
  watchlistItem: WatchlistItem | null;
  monitors: Monitor[];
  submissions: Submission[];
  onToggleStar: () => void;
  lang: Lang;
}) {
  const statusColors: Record<string, string> = {
    accepted: '#38a169', rejected: '#e53e3e', submitted: '#004aad',
    waitlisted: '#d69e2e', withdrawn: '#718096', draft: '#a0aec0',
  };

  return (
    <div>
      {/* Watchlist */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tp.watchlistStatus ?? 'Watchlist'}
        </h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {watchlistItem ? (
            <>
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ fontSize: 14, color: '#38a169', fontWeight: 600 }}>{tp.inWatchlist ?? 'In your watchlist'}</span>
              <button onClick={onToggleStar}
                style={{ fontSize: 12, color: '#718096', background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                {tp.removeFromWatchlist ?? 'Remove'}
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 14, color: '#718096' }}>{tp.notInWatchlist ?? 'Not in watchlist'}</span>
              <button onClick={onToggleStar}
                style={{ fontSize: 12, color: '#fff', background: '#004aad', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>
                {tp.addToWatchlist ?? '+ Add to Watchlist'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monitors */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tp.myMonitors ?? 'Active Monitors'} ({monitors.length})
        </h3>
        {monitors.length === 0 ? (
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 8px' }}>{tp.noMonitors ?? 'No monitors for this festival.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {monitors.map((m) => (
              <div key={m.id} style={{ padding: '8px 12px', background: '#ebf8ff', borderRadius: 6, border: '1px solid #bee3f8', fontSize: 13 }}>
                <strong style={{ color: '#2b6cb0' }}>{m.watch_for ?? m.monitor_type}</strong>
                {m.alert_days_before && <span style={{ color: '#718096', marginLeft: 8 }}>— alert {m.alert_days_before} days before</span>}
              </div>
            ))}
          </div>
        )}
        <a href="/monitors" style={{ fontSize: 12, color: '#004aad', textDecoration: 'none' }}>
          {tp.addMonitor ?? '+ Set up a monitor'} ↗
        </a>
      </div>

      {/* Submissions */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tp.mySubmissions ?? 'My Submissions'} ({submissions.length})
        </h3>
        {submissions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 8px' }}>{tp.noSubmissions ?? 'No submissions logged.'}</p>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>Film</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>Submitted</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>Fee</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.film_title}</td>
                    <td style={{ padding: '8px 12px', color: '#718096' }}>{s.submitted_at ? formatDate(s.submitted_at) : '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: (statusColors[s.status ?? ''] ?? '#a0aec0') + '22',
                        color: statusColors[s.status ?? ''] ?? '#718096' }}>
                        {s.status ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#718096' }}>{s.entry_fee_paid ? `$${(s.entry_fee_paid / 100).toFixed(0)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <a href="/submissions" style={{ fontSize: 12, color: '#004aad', textDecoration: 'none' }}>
          {tp.logSubmission ?? '+ Log a submission'} ↗
        </a>
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ festival, insights, insightsLoading, tp, isOwner, onRegenerate }: {
  festival: Festival;
  insights: FestivalInsights | null;
  insightsLoading: boolean;
  tp: Record<string, string>;
  isOwner: boolean;
  onRegenerate: () => void;
}) {
  if (insightsLoading) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>⏳ {tp.loadingInsights}</div>;
  }

  const linkTypeIcon: Record<string, string> = {
    official: '🌐', wiki: '📖', imdb: '🎬', letterboxd: '🎞️', press: '📰', other: '🔗',
  };

  return (
    <div>
      {/* Header with regenerate */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#718096' }}>
          {insights ? (
            <span>{tp.generatedBy ?? 'Generated by AI'} · {tp.cached ?? 'cached'} {insights.generated_at ? `(${formatDate(insights.generated_at)})` : ''}</span>
          ) : null}
        </div>
        {isOwner && (
          <button onClick={onRegenerate} disabled={insightsLoading}
            style={{ fontSize: 12, color: '#004aad', background: 'none', border: '1px solid #004aad', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>
            {insightsLoading ? (tp.regenerating ?? 'Generating...') : (tp.regenerate ?? 'Regenerate Profile')}
          </button>
        )}
      </div>

      {insights && <ConfidenceBanner confidence={insights.confidence} tp={tp} />}

      {/* Acceptance stats */}
      {insights?.acceptance_stats && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f0fff4', borderRadius: 8, border: '1px solid #9ae6b4' }}>
          <strong style={{ fontSize: 13, color: '#276749' }}>{tp.acceptanceRate ?? 'Acceptance Rate'}: </strong>
          <span style={{ fontSize: 13, color: '#2d3748' }}>
            {tp.approxRate ?? 'approx.'} {insights.acceptance_stats.rate_pct}%
            {insights.acceptance_stats.submissions && ` (${insights.acceptance_stats.submissions.toLocaleString()} submissions → ${insights.acceptance_stats.selected?.toLocaleString()} selected)`}
            {insights.acceptance_stats.note && <span style={{ color: '#718096', marginLeft: 6 }}>· {insights.acceptance_stats.note}</span>}
          </span>
        </div>
      )}

      {/* Past selections */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tp.pastSelections ?? 'Past Notable Selections'}
        </h3>
        <p style={{ fontSize: 12, color: '#a0aec0', marginBottom: 10 }}>{tp.pastFilmsNotice}</p>
        {!insights || insights.past_selections.length === 0 ? (
          <p style={{ color: '#718096', fontSize: 13 }}>{tp.noPastFilms ?? 'No past selections available.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#718096', fontWeight: 600, whiteSpace: 'nowrap' }}>{tp.year ?? 'Year'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>{tp.filmTitle ?? 'Title'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>{tp.director ?? 'Director'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>{tp.country ?? 'Country'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>{tp.award ?? 'Award'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#718096', fontWeight: 600 }}>{tp.links ?? 'Links'}</th>
                </tr>
              </thead>
              <tbody>
                {insights.past_selections.map((film, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', color: '#718096', whiteSpace: 'nowrap' }}>{film.year}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{film.title}</td>
                    <td style={{ padding: '8px 10px', color: '#4a5568' }}>{film.director}</td>
                    <td style={{ padding: '8px 10px', color: '#718096' }}>{film.country ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {film.award ? (
                        <span style={{ padding: '2px 7px', background: '#fffff0', borderRadius: 10, fontSize: 11, color: '#744210', border: '1px solid #ecc94b' }}>
                          {film.award}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {film.imdb_url && <a href={film.imdb_url} target="_blank" rel="noreferrer" title="IMDb" style={{ fontSize: 15, textDecoration: 'none' }}>🎬</a>}
                        {film.letterboxd_url && <a href={film.letterboxd_url} target="_blank" rel="noreferrer" title="Letterboxd" style={{ fontSize: 15, textDecoration: 'none' }}>🎞️</a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Useful links */}
      {insights && insights.useful_links.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tp.usefulLinks ?? 'Useful Links'}
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {insights.useful_links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#2d3748', textDecoration: 'none' }}>
                {linkTypeIcon[link.type] ?? '🔗'} {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main FestivalProfile Component ──────────────────────────────────────────
export function FestivalProfile({
  festivalId,
  lang,
  t,
  isOwner,
  isLoggedIn,
  onBack,
}: {
  festivalId: number;
  lang: Lang;
  t: ReturnType<typeof useI18n>;
  isOwner: boolean;
  isLoggedIn: boolean;
  onBack: () => void;
}) {
  const [festival, setFestival] = useState<Festival | null>(null);
  const [festivalLoading, setFestivalLoading] = useState(true);
  const [insights, setInsights] = useState<FestivalInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [subTab, setSubTab] = useState<ProfileSubTab>('overview');

  // My status
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const tp = (t as any).festivalProfile ?? {};

  // Load festival + sections
  useEffect(() => {
    fetch(`${API_BASE}/festivals/${festivalId}`)
      .then((r) => r.json() as Promise<{ data: Festival }>)
      .then((d) => setFestival(d.data))
      .catch(() => {})
      .finally(() => setFestivalLoading(false));
  }, [festivalId]);

  // Load AI insights
  const loadInsights = () => {
    setInsightsLoading(true);
    fetch(`${API_BASE}/festivals/${festivalId}/insights`)
      .then((r) => r.json() as Promise<{ data: Record<string, unknown>; cached: boolean }>)
      .then((d) => setInsights(parseInsights(d.data)))
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  };

  useEffect(() => { loadInsights(); }, [festivalId]);

  // Load my status (only if logged in)
  useEffect(() => {
    if (!isLoggedIn) return;
    Promise.all([
      apiFetch(`${API_BASE}/watchlist`).then((r) => r.json() as Promise<{ data: WatchlistItem[] }>),
      apiFetch(`${API_BASE}/monitors`).then((r) => r.json() as Promise<{ data: Monitor[] }>),
      apiFetch(`${API_BASE}/submissions`).then((r) => r.json() as Promise<{ data: Submission[] }>),
    ]).then(([wl, mon, sub]) => {
      setWatchlistItem((wl.data ?? []).find((w) => w.ref_table === 'festivals' && w.ref_id === festivalId) ?? null);
      setMonitors((mon.data ?? []).filter((m) => m.ref_table === 'festivals' && m.ref_id === festivalId));
      setSubmissions((sub.data ?? []).filter((s) => s.ref_table === 'festivals' && s.ref_id === festivalId));
    }).catch(() => {});
  }, [festivalId, isLoggedIn]);

  const toggleStar = async () => {
    if (!isLoggedIn) return;
    if (watchlistItem) {
      await apiFetch(`${API_BASE}/watchlist/ref/festivals/${festivalId}`, { method: 'DELETE' });
      setWatchlistItem(null);
    } else {
      const r = await apiFetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        body: JSON.stringify({ ref_table: 'festivals', ref_id: festivalId, ref_name: festival?.name ?? '', deadline: festival?.regular_deadline, website: festival?.website }),
      });
      const d = await r.json() as { ok: boolean };
      if (d.ok) {
        setWatchlistItem({ id: 0, ref_table: 'festivals', ref_id: festivalId, ref_name: festival?.name ?? '', deadline: festival?.regular_deadline, website: festival?.website, starred_at: new Date().toISOString() });
      }
    }
  };

  const handleRegenerate = async () => {
    await apiFetch(`${API_BASE}/festivals/${festivalId}/insights`, { method: 'DELETE' });
    loadInsights();
  };

  const subTabs: { key: ProfileSubTab; label: string }[] = [
    { key: 'overview', label: tp.tabOverview ?? 'Overview' },
    { key: 'sections', label: tp.tabSections ?? 'Sections & Deadlines' },
    ...(isLoggedIn ? [{ key: 'my-status' as ProfileSubTab, label: tp.tabMyStatus ?? 'My Status' }] : []),
    { key: 'history', label: tp.tabHistory ?? 'History' },
  ];

  if (festivalLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#718096' }}>
        {(t as any).common?.loading ?? 'Loading...'}
      </div>
    );
  }

  if (!festival) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#e53e3e' }}>
        Festival not found.{' '}
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#004aad', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    );
  }

  const prestige = festival.prestige_tier;
  const prestigeColor = prestige ? (PRESTIGE_COLORS[prestige] ?? '#718096') : '#718096';
  const prestigeLabel = prestige ? ((t as any).prestige?.[prestige] ?? prestige) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* ── Header ── */}
      <div style={{ background: '#004aad', color: '#fff', padding: '20px 32px 24px', position: 'relative' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12, display: 'block' }}>
          {tp.backToFestivals ?? '← Back to Festivals'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <FestivalAvatar name={festival.name} website={festival.website} size={56} />
            <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.2 }}>
              {lang === 'vi' && festival.name_vi ? festival.name_vi : festival.name}
            </h1>
            {(festival.city || festival.country) && (
              <p style={{ margin: '0 0 12px', opacity: 0.85, fontSize: 14 }}>
                {[festival.city, festival.country].filter(Boolean).join(', ')}
              </p>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {prestigeLabel && (
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: prestigeColor, color: '#fff' }}>
                  {prestigeLabel}
                </span>
              )}
              {festival.category && (
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  {(t as any).categories?.[festival.category] ?? festival.category}
                </span>
              )}
              {festival.tier && (
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  {(t as any).tiers?.[festival.tier] ?? festival.tier}
                </span>
              )}
              {insights && insights.confidence !== 'high' && (
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                  AI: {insights.confidence} confidence
                </span>
              )}
            </div>
            </div>
          </div>

          {/* Watchlist star */}
          {isLoggedIn && (
            <button onClick={toggleStar}
              title={watchlistItem ? (tp.removeFromWatchlist ?? 'Remove from Watchlist') : (tp.addToWatchlist ?? 'Add to Watchlist')}
              style={{ background: 'none', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 20, color: '#fff', flexShrink: 0, marginLeft: 16 }}>
              {watchlistItem ? '⭐' : '☆'}
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-nav ── */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e2e8f0', display: 'flex', overflowX: 'auto' }}>
        {subTabs.map((tab) => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)}
            style={{
              padding: '14px 20px', background: 'transparent', border: 'none',
              borderBottom: `3px solid ${subTab === tab.key ? '#004aad' : 'transparent'}`,
              color: subTab === tab.key ? '#004aad' : '#718096',
              fontWeight: subTab === tab.key ? 700 : 400,
              cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {subTab === 'overview' && (
          <OverviewTab festival={festival} insights={insights} insightsLoading={insightsLoading} tp={tp} t={t} lang={lang} />
        )}
        {subTab === 'sections' && (
          <SectionsTab
            festival={festival} t={t} isOwner={isOwner}
            onSectionsChanged={(sections) => setFestival((f) => f ? { ...f, sections } : f)}
          />
        )}
        {subTab === 'my-status' && isLoggedIn && (
          <MyStatusTab
            festival={festival} tp={tp} t={t} lang={lang}
            watchlistItem={watchlistItem} monitors={monitors} submissions={submissions}
            onToggleStar={toggleStar}
          />
        )}
        {subTab === 'history' && (
          <HistoryTab
            festival={festival} insights={insights} insightsLoading={insightsLoading}
            tp={tp} isOwner={isOwner} onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
}
