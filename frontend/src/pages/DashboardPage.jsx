import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <LayoutDashboard size={24} color="var(--accent-gold)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dashboard Overview</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Dashboard metrics and real-time summaries will be implemented here step by step.
      </p>
    </div>
  );
}
