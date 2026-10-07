import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <ShoppingCart size={24} color="var(--accent-gold)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Orders & Invoicing</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Ready stock sales, custom made-to-order projects, and printable bills will be built here.
      </p>
    </div>
  );
}
