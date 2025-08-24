import React from 'react';

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', ...(props.style||{}) }} />;
}
