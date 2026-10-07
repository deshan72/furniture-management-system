import React from 'react';
import { Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Users size={24} color="var(--accent-gold)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Customers & Credit Directory</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Customer contact details, addresses, and credit balance tracking will be built here.
      </p>
    </div>
  );
}
