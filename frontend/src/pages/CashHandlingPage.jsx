import React from 'react';
import { WalletCards } from 'lucide-react';

export default function CashHandlingPage() {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <WalletCards size={24} color="var(--accent-gold)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Day-to-Day Cash Handling</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Cash in (sales & advances), cash out (timber, carpenter wages, petty cash), and day-end balancing will be built here.
      </p>
    </div>
  );
}
