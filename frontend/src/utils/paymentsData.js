// Payments & Customer Advances Transaction Ledger Data Store
// Aligned with D&S Furniture System specifications

export const PAYMENTS_STORAGE_KEY = 'dnd_payments_transactions_v1';

export const INITIAL_PAYMENTS = [
  {
    id: 'pay-001',
    receipt_no: 'DS-RCP-2026-001',
    date: '2026-10-12',
    order_id: 'ORD-1001',
    contract_no: 'PN/C001/WD-001',
    customer_id: '197814502391',
    customer_name: 'Sunil Jayawardena',
    customer_nic: '197814502391',
    customer_phone: '0771234567',
    branch_code: 'MHG',
    center_code: 'C001',
    payment_type: 'Order Advance',
    amount: 20000,
    previous_balance: 98500,
    new_balance: 78500,
    payment_method: 'Bank Transfer',
    reference_no: 'BOC-TX-98412',
    collected_by: 'Cashier Anura',
    notes: 'Down payment for Royal Teak 6-Seater Dining Table',
    created_at: '2026-10-12T10:35:00Z',
  },
  {
    id: 'pay-002',
    receipt_no: 'DS-RCP-2026-002',
    date: '2026-10-18',
    order_id: 'ORD-1002',
    contract_no: 'PN-002/C002/WD-002',
    customer_id: '198578901234',
    customer_name: 'Chamari Perera',
    customer_nic: '198578901234',
    customer_phone: '0718899221',
    branch_code: 'MHG',
    center_code: 'C002',
    payment_type: 'Full Settlement',
    amount: 78000,
    previous_balance: 78000,
    new_balance: 0,
    payment_method: 'Cash',
    reference_no: 'CSH-0192',
    collected_by: 'Cashier Anura',
    notes: 'Full cash payment on showroom delivery for Mahogany Wardrobe',
    created_at: '2026-10-18T14:20:00Z',
  },
  {
    id: 'pay-003',
    receipt_no: 'DS-RCP-2026-003',
    date: '2026-10-24',
    order_id: 'ORD-1003',
    contract_no: 'PN-003/C001/MEL-001',
    customer_id: '196923405678',
    customer_name: 'Nimal Karunaratne',
    customer_nic: '196923405678',
    customer_phone: '0763344552',
    branch_code: 'MRT',
    center_code: 'C001',
    payment_type: 'Order Advance',
    amount: 50000,
    previous_balance: 135000,
    new_balance: 85000,
    payment_method: 'Cash',
    reference_no: 'CSH-0210',
    collected_by: 'Officer Kamal',
    notes: 'Advance booking for Modern Melamine Modular Pantry Unit',
    created_at: '2026-10-24T11:05:00Z',
  },
  {
    id: 'pay-004',
    receipt_no: 'DS-RCP-2026-004',
    date: '2026-11-01',
    order_id: 'ORD-1003',
    contract_no: 'PN-003/C001/MEL-001',
    customer_id: '196923405678',
    customer_name: 'Nimal Karunaratne',
    customer_nic: '196923405678',
    customer_phone: '0763344552',
    branch_code: 'MRT',
    center_code: 'C001',
    payment_type: 'Installment Loan',
    amount: 5313,
    previous_balance: 85000,
    new_balance: 79687,
    payment_method: 'Bank Transfer',
    reference_no: 'COMB-DEP-4491',
    collected_by: 'Accounts Team',
    notes: 'Installment #1 of 16 weekly terms received',
    created_at: '2026-11-01T09:15:00Z',
  },
  {
    id: 'pay-005',
    receipt_no: 'DS-RCP-2026-005',
    date: '2026-11-10',
    order_id: 'ORD-1001',
    contract_no: 'PN/C001/WD-001',
    customer_id: '197814502391',
    customer_name: 'Sunil Jayawardena',
    customer_nic: '197814502391',
    customer_phone: '0771234567',
    branch_code: 'MHG',
    center_code: 'C001',
    payment_type: 'Installment Loan',
    amount: 6542,
    previous_balance: 78500,
    new_balance: 71958,
    payment_method: 'Cash',
    reference_no: 'CSH-0248',
    collected_by: 'Cashier Anura',
    notes: 'Monthly installment #1 of 12 terms collected at showroom',
    created_at: '2026-11-10T16:30:00Z',
  },
];

export function loadSavedPayments() {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(INITIAL_PAYMENTS));
      return INITIAL_PAYMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYMENTS;
  } catch (err) {
    console.error('Error loading payments:', err);
    return INITIAL_PAYMENTS;
  }
}

export function savePaymentsToStorage(payments) {
  try {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error saving payments:', err);
  }
}

export function generateNextReceiptNo(existingPayments = []) {
  const currentYear = new Date().getFullYear();
  const prefix = `DS-RCP-${currentYear}-`;
  let maxSeq = 5;
  existingPayments.forEach((p) => {
    if (p.receipt_no && p.receipt_no.startsWith(prefix)) {
      const numPart = parseInt(p.receipt_no.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

