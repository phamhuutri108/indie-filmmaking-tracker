// JWT utilities for Cloudflare Workers (Web Crypto API, no Node.js)

export interface JWTPayload {
  sub: number;    // user_id
  role: string;   // 'owner' | 'member' | 'system'
  email: string;
  name: string;
  iat: number;
  exp: number;
}

const ALG = { name: 'HMAC', hash: 'SHA-256' } as const;
const JWT_EXPIRY_DAYS = 30;

function toB64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - s.length % 4) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), ALG, false, [usage]);
}

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: JWTPayload = { ...payload, iat: now, exp: now + JWT_EXPIRY_DAYS * 86400 };
  const header = toB64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toB64Url(JSON.stringify(full));
  const key = await importKey(secret, 'sign');
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const key = await importKey(secret, 'verify');
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      fromB64Url(sig),
      new TextEncoder().encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload: JWTPayload = JSON.parse(new TextDecoder().decode(fromB64Url(body)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: Request, secret: string): Promise<JWTPayload | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7), secret);
}
