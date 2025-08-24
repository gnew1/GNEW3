import React from 'react';

export function Card({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, background: '#fff' }}>
      {title && <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', fontWeight: 600 }}>{title}</div>}
      <div style={{ padding: '10px 14px' }}>
        {children}
      </div>
    </div>
  );
}
