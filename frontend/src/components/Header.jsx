import React from 'react';
import { Calendar, ShieldCheck } from 'lucide-react';

export default function Header({ title, subtitle, onQuickAction, quickActionLabel }) {
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="top-header">
      <div className="page-headline">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <Calendar size={15} color="var(--accent-gold)" />
          <span>{todayFormatted}</span>
        </div>

        {quickActionLabel && onQuickAction && (
          <button className="btn btn-primary" onClick={onQuickAction}>
            {quickActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}
