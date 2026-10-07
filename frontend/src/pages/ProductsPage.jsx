import React from 'react';
import { Armchair } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Armchair size={24} color="var(--accent-gold)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Products & Inventory Management</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Furniture catalog, wood types, pricing, and stock tracking will be built here.
      </p>
    </div>
  );
}
