import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: number;
  action?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 620, action }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 200,
        overflowY: 'auto',
        padding: '24px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          maxWidth,
          margin: '0 auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#1a202c' }}>{title}</h3>
            {action}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#718096',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
        {/* Modal body */}
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// Shared form input style
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  background: '#fff',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#4a5568',
  marginBottom: 4,
};

export const formRowStyle: React.CSSProperties = {
  marginBottom: 14,
};

export const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};
