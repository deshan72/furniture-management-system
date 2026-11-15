import React from 'react';
import PaymentsPage from './PaymentsPage';

/**
 * Center Cash Payments Page
 * Implements the full Center Cash Collection system:
 * - Regional Center Selection & Scheduled Collection Date
 * - Daily Center Targets, Today's Collected, and Pending Shortfall KPIs
 * - Pending Collection Client List with Quick "Collect & Confirm"
 * - Field Sheet Printing and WhatsApp Reminders
 */
export default function CenterCashPaymentsPage({ selectedCenter = 'all', onNavigate }) {
  return (
    <PaymentsPage
      selectedCenter={selectedCenter}
      onNavigate={onNavigate}
      initialSubView="collection_day"
      pageTitle="Center Cash Payments"
    />
  );
}
