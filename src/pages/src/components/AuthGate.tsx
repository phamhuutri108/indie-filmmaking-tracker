import { useState, useEffect } from 'react';

const OWNER_PASSWORD = 'Saclo@gmail2003';
const SESSION_KEY = 'ift_role';

export type Role = 'owner' | 'guest' | null;

export function useAuth() {
  const [role, setRole] = useState<Role>(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return (saved as Role) ?? null;
  });

  const login = (r: 'owner' | 'guest') => {
    sessionStorage.setItem(SESSION_KEY, r);
    setRole(r);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setRole(null);
  };

  return { role, login, logout };
}

export function AuthGate({ onAuth }: { onAuth: (role: 'owner' | 'guest') => void }) {
  const [mode, setMode] = useState<'choose' | 'password'>('choose');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const tryLogin = () => {
    if (pw === OWNER_PASSWORD) {
      onAuth('owner');
    } else {
      setError('Incorrect password. / Mật khẩu không đúng.');
      setPw('');
    }
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
      {/* Logo */}
      <img src="/ift-logo.png" alt="IFT" style={{ height: 80, marginBottom: 28 }} />

      <div style={{
        background: '#fff', borderRadius: 12,
        padding: '32px 36px', maxWidth: 400, width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>
        {mode === 'choose' ? (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, color: '#1a202c', textAlign: 'center' }}>
              Welcome to IFT
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#718096', textAlign: 'center' }}>
              How would you like to continue?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => setMode('password')}
                style={btnOwner}
              >
                🔑 Owner — Full Access
              </button>
              <button
                onClick={() => onAuth('guest')}
                style={btnGuest}
              >
                👁 Guest — View Only
              </button>
            </div>
          </>
        ) : (
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
              onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
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
              <button onClick={() => { setMode('choose'); setError(''); setPw(''); }} style={btnBack}>
                ← Back
              </button>
              <button onClick={tryLogin} style={{ ...btnOwner, flex: 1 }}>
                Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
