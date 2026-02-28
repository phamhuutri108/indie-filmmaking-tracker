import { useState } from 'react';
import { setToken, setGuest, clearAuth, readStoredAuth, decodeJWT } from '../apiFetch';

export type Role = 'owner' | 'member' | 'guest' | null;

export function useAuth() {
  const stored = readStoredAuth();
  const [role, setRole] = useState<Role>(stored.role);

  const login = (newRole: Role, token?: string) => {
    if (token) {
      setToken(token);
    } else if (newRole === 'guest') {
      setGuest();
    }
    setRole(newRole);
  };

  const logout = () => {
    clearAuth();
    setRole(null);
  };

  return { role, login, logout };
}

/** Decode JWT and return user name */
export function getAuthUserName(): string | null {
  const stored = readStoredAuth();
  if (stored.token) {
    const payload = decodeJWT(stored.token);
    return payload?.name ?? null;
  }
  return null;
}

export function AuthGate({ onAuth }: { onAuth: (role: Role, token?: string) => void }) {
  const [mode, setMode] = useState<'choose' | 'owner_password' | 'pending'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_status') === 'pending') return 'pending';
    // Secret owner login URL: /owner
    if (window.location.pathname === '/owner') return 'owner_password';
    return 'choose';
  });
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tryOwnerLogin = async () => {
    if (!pw.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        const { token } = await res.json() as { token: string };
        window.history.replaceState({}, '', '/');
        onAuth('owner', token);
      } else {
        setError('Incorrect password. / Mật khẩu không đúng.');
        setPw('');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#004aad',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Montserrat', system-ui, sans-serif",
      padding: 24,
    }}>
      <img src="/ift-logo_landscape.png" alt="IFT" style={{ width: 300, maxWidth: '80vw', marginBottom: 28 }} />

      <div style={{
        background: '#fff', borderRadius: 12,
        padding: '32px 36px', maxWidth: 400, width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>

        {mode === 'choose' && (
          <>
            <h2 style={{ margin: '0 0 6px', textAlign: 'center', lineHeight: 1.3 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#718096', marginBottom: 2 }}>Welcome to</span>
              <span style={{ display: 'block', fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Indie Filmmaking Tracker</span>
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#718096', textAlign: 'center' }}>
              How would you like to continue?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={loginWithGoogle} style={btnGoogle}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 18, height: 18 }} />
                Continue with Google
              </button>
              <button onClick={() => onAuth('guest')} style={btnGuest}>
                👁 Guest — View Only
              </button>
            </div>
          </>
        )}

        {mode === 'owner_password' && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, color: '#1a202c', textAlign: 'center' }}>
              Owner Login
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#718096', textAlign: 'center' }}>
              Enter your password to access all features.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && tryOwnerLogin()}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px',
                border: error ? '1px solid #e53e3e' : '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 14, marginBottom: 8,
                boxSizing: 'border-box', outline: 'none',
                fontFamily: "'Montserrat', sans-serif",
              }}
            />
            {error && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#e53e3e' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setMode('choose'); setError(''); setPw(''); window.history.replaceState({}, '', '/'); }} style={btnBack}>
                ← Back
              </button>
              <button onClick={tryOwnerLogin} disabled={loading} style={{ ...btnOwner, flex: 1, opacity: loading ? 0.7 : 1 }}>
                {loading ? '…' : 'Login'}
              </button>
            </div>
          </>
        )}

        {mode === 'pending' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#1a202c' }}>
                Request Sent!
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#718096', lineHeight: 1.6 }}>
                Your access request has been sent to the admin. You'll be able to log in once approved.
              </p>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#a0aec0', lineHeight: 1.6 }}>
                Yêu cầu của bạn đã được gửi đi. Admin sẽ duyệt trong thời gian sớm nhất.
              </p>
              <button onClick={() => { setMode('choose'); window.history.replaceState({}, '', '/'); }} style={btnGuest}>
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnGoogle: React.CSSProperties = {
  padding: '12px 20px', background: '#fff', color: '#3c4043',
  border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
};

const btnOwner: React.CSSProperties = {
  padding: '12px 20px', background: '#004aad', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
  cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
};

const btnGuest: React.CSSProperties = {
  padding: '12px 20px', background: '#f7fafc', color: '#4a5568',
  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
};

const btnBack: React.CSSProperties = {
  padding: '10px 16px', background: '#fff', color: '#718096',
  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
  cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
};
