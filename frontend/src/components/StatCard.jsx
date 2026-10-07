import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'var(--accent-gold)', bg = 'var(--accent-gold-glow)' }) {
  return (
    <div className="stat-card">
      <div>
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
        {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px', display: 'block' }}>{subtitle}</span>}
      </div>
      <div className="stat-icon" style={{ background: bg, color: color }}>
        <Icon size={22} />
      </div>
    </div>
  );
}
