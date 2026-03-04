// Wrapper around fetch that auto-injects JWT token from localStorage

const TOKEN_KEY = 'ift_token';
const GUEST_KEY = 'ift_guest';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(GUEST_KEY);
}

export function setGuest(): void {
  localStorage.setItem(GUEST_KEY, 'true');
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GUEST_KEY);
}

export function isGuest(): boolean {
  return localStorage.getItem(GUEST_KEY) === 'true';
}

export interface StoredAuth {
  role: 'owner' | 'member' | 'guest' | null;
  token: string | null;
}

/** Decode JWT payload without verifying signature (verification happens server-side) */
export function decodeJWT(token: string): { sub: number; role: string; email: string; name: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - parts[1].length % 4) % 4);
    // Use TextDecoder to correctly handle UTF-8 multibyte characters (e.g. Vietnamese)
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Read auth state from localStorage */
export function readStoredAuth(): StoredAuth {
  const token = getToken();
  if (token) {
    const payload = decodeJWT(token);
    if (payload) return { role: payload.role as 'owner' | 'member', token };
  }
  // Default to guest when no auth stored
  return { role: 'guest', token: null };
}

/** Fetch wrapper that adds Authorization header when a token is present.
 *  Auto-clears auth and redirects to / if server returns 401 (token expired). */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token) {
    // Token expired or invalid — clear auth and redirect to login
    clearAuth();
    window.location.href = '/';
  }
  return res;
}
