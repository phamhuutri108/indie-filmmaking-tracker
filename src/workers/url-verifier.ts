// IFT URL Verifier
// Checks all website URLs in D1, auto-fixes redirects, flags broken links.
// Cloudflare Workers runtime only.

export interface UrlCheckResult {
  ok: boolean;
  finalUrl: string;       // URL after following all redirects
  status: number;         // HTTP status code
  redirected: boolean;    // true if final URL differs from input
}

export interface BrokenUrl {
  id: number;
  name: string;
  table: 'festivals' | 'funds_grants' | 'education_residency';
  url: string;
  status: number;
}

export interface VerifyBatchResult {
  checked: number;
  fixed: number;          // redirect auto-corrected
  broken: BrokenUrl[];    // 4xx / unreachable
}

// ─── Low-level URL check ─────────────────────────────────────────────────────

/**
 * Check a single URL.
 * 1. HEAD → follow redirects → if 2xx, done.
 * 2. If HEAD returns non-2xx or fails, retry with GET.
 * 3. If domain is unreachable (network error), return ok=false, status=0.
 */
export async function checkUrl(rawUrl: string): Promise<UrlCheckResult> {
  let url = rawUrl.trim();
  if (!url.startsWith('http')) url = `https://${url}`;

  // Normalise: strip trailing spaces
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    // Try HEAD first (faster)
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'IFT-UrlChecker/1.0 (indiefilmmakingtracker.com)' },
    });

    // Some servers reject HEAD (405) — retry with GET but only read headers
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'IFT-UrlChecker/1.0 (indiefilmmakingtracker.com)' },
      });
    }

    clearTimeout(timer);
    const finalUrl = res.url || url;
    return {
      ok: res.status >= 200 && res.status < 400,
      finalUrl,
      status: res.status,
      redirected: normalise(finalUrl) !== normalise(url),
    };
  } catch {
    clearTimeout(timer);
    return { ok: false, finalUrl: url, status: 0, redirected: false };
  }
}

/** Strip trailing slash, lowercase scheme+host for comparison */
function normalise(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

// ─── Batch verifier ──────────────────────────────────────────────────────────

type TableName = 'festivals' | 'funds_grants' | 'education_residency';

interface RowWithUrl {
  id: number;
  name: string;
  website: string | null;
}

/**
 * Check all URLs across all three tables.
 * - Auto-updates `website` when a permanent redirect is detected.
 * - Sets `website_ok = 0` for 4xx / unreachable.
 * - Sets `website_ok = 1` and `website_checked_at` when healthy.
 * Processes in small concurrent batches to stay within CF CPU limits.
 */
export async function verifyAllUrls(db: D1Database, batchSize = 15): Promise<VerifyBatchResult> {
  const tables: TableName[] = ['festivals', 'funds_grants', 'education_residency'];
  const result: VerifyBatchResult = { checked: 0, fixed: 0, broken: [] };

  for (const table of tables) {
    // Only check records that haven't been checked in the last 6 days
    const rows = await db
      .prepare(
        `SELECT id, name, website FROM ${table}
         WHERE website IS NOT NULL AND website != ''
           AND (website_checked_at IS NULL OR website_checked_at < datetime('now', '-6 days'))
         ORDER BY website_checked_at ASC
         LIMIT 60`
      )
      .all<RowWithUrl>();

    const items = rows.results;
    if (items.length === 0) continue;

    // Process in concurrent batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const checks = await Promise.all(
        batch.map(async (row) => ({ row, check: await checkUrl(row.website!) }))
      );

      for (const { row, check } of checks) {
        result.checked++;

        if (check.ok) {
          // Auto-fix redirect: if final URL is materially different, update DB
          if (check.redirected) {
            await db
              .prepare(
                `UPDATE ${table}
                 SET website = ?, website_ok = 1, website_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`
              )
              .bind(check.finalUrl, row.id)
              .run();
            result.fixed++;
            console.log(`[URLVerifier] Fixed redirect: ${row.website} → ${check.finalUrl} (${table}/${row.id})`);
          } else {
            await db
              .prepare(
                `UPDATE ${table}
                 SET website_ok = 1, website_checked_at = CURRENT_TIMESTAMP
                 WHERE id = ?`
              )
              .bind(row.id)
              .run();
          }
        } else {
          // Mark as broken
          await db
            .prepare(
              `UPDATE ${table}
               SET website_ok = 0, website_checked_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            )
            .bind(row.id)
            .run();

          result.broken.push({
            id: row.id,
            name: row.name,
            table,
            url: row.website!,
            status: check.status,
          });
          console.warn(`[URLVerifier] Broken: ${row.website} (HTTP ${check.status}) — ${table}/${row.id}`);
        }
      }
    }
  }

  return result;
}

/**
 * Verify a single URL immediately (used when inserting a new record).
 * Returns the canonical URL to store (following any redirect) and ok status.
 */
export async function verifySingleUrl(url: string): Promise<{ ok: boolean; canonicalUrl: string; status: number }> {
  if (!url || !url.startsWith('http')) return { ok: false, canonicalUrl: url, status: 0 };
  const check = await checkUrl(url);
  return { ok: check.ok, canonicalUrl: check.finalUrl, status: check.status };
}

/** Build HTML email section for broken URLs */
export function buildBrokenUrlReport(broken: BrokenUrl[]): string {
  if (broken.length === 0) return '';

  const tableLabel: Record<TableName, string> = {
    festivals: 'Festival',
    funds_grants: 'Fund / Grant',
    education_residency: 'Education / Residency',
  };

  const rows = broken
    .map(
      (b) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${tableLabel[b.table]}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0"><strong>${b.name}</strong></td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:#e53e3e">${b.status === 0 ? 'Unreachable' : `HTTP ${b.status}`}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;word-break:break-all">
            <a href="${b.url}" style="color:#004aad">${b.url}</a>
          </td>
        </tr>`
    )
    .join('');

  return `
    <h3 style="color:#c53030;margin:24px 0 8px">⚠️ Broken URLs detected (${broken.length})</h3>
    <p style="color:#718096;font-size:13px;margin:0 0 12px">
      These website URLs returned errors. Please fix them manually in the IFT dashboard.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f7fafc">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Type</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Name</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Status</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">URL</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
