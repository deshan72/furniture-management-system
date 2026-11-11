// Orders & Installment Contracts Data Store
// Aligned with D&S Furniture System specifications

export const ORDERS_STORAGE_KEY = 'dnd_orders_list_v2';

export const INITIAL_ORDERS = [
  {
    id: 'ORD-1001',
    invoice_no: 'DS-INV-1081',
    contract_no: 'PN-001/C001/WD-001',
    passbook_no: 'PN-001',
    date: '2026-10-12',
    customer_id: '197814502391',
    customer_name: 'Sunil Jayawardena',
    customer_phone: '0771234567',
    customer_nic: '197814502391',
    customer_address: 'No. 45/2, High Level Road, Maharagama',
    branch_code: 'MHG',
    center_code: 'C001',
    item_id: 'prod-1',
    item_code: 'WD-001',
    item_name: 'Royal Teak 6-Seater Dining Table',
    category: 'wood',
    quantity: 1,
    unit_price: 98500,
    gross_amount: 98500,
    advance_paid: 20000,
    balance_due: 78500,
    payment_type: 'installment',
    loan_frequency: 'monthly',
    loan_terms: 12,
    installment_value: 6542,
    first_due_date: '2026-11-12',
    installments_paid: 1,
    payment_method: 'Bank Transfer',
    status: 'Active Loan',
    notes: 'Solid Ceylon Teak wood top. Down payment received via commercial bank.',
    created_at: '2026-10-12T10:30:00Z',
  },
  {
    id: 'ORD-1002',
    invoice_no: 'DS-INV-1082',
    contract_no: 'PN-002/C002/WD-002',
    passbook_no: 'PN-002',
    date: '2026-10-18',
    customer_id: '198578901234',
    customer_name: 'Chamari Perera',
    customer_phone: '0718899221',
    customer_nic: '198578901234',
    customer_address: '12, Temple Road, Kottawa',
    branch_code: 'MHG',
    center_code: 'C002',
    item_id: 'prod-2',
    item_code: 'WD-002',
    item_name: 'Mahogany 3-Door Wardrobe (Almirah)',
    category: 'wood',
    quantity: 1,
    unit_price: 78000,
    gross_amount: 78000,
    advance_paid: 78000,
    balance_due: 0,
    payment_type: 'cash',
    loan_frequency: null,
    loan_terms: 1,
    installment_value: 0,
    first_due_date: null,
    installments_paid: 1,
    payment_method: 'Cash',
    status: 'Fully Paid',
    notes: 'Showroom ready stock, paid in full on delivery.',
    created_at: '2026-10-18T14:15:00Z',
  },
  {
    id: 'ORD-1003',
    invoice_no: 'DS-INV-1083',
    contract_no: 'PN-003/C001/MEL-001',
    passbook_no: 'PN-003',
    date: '2026-10-24',
    customer_id: '196923405678',
    customer_name: 'Nimal Karunaratne',
    customer_phone: '0763344552',
    customer_nic: '196923405678',
    customer_address: '88, Galle Road, Rawathawatta, Moratuwa',
    branch_code: 'MRT',
    center_code: 'C001',
    item_id: 'prod-3',
    item_code: 'MEL-001',
    item_name: 'Modern Melamine Modular Kitchen Pantry Unit',
    category: 'melamine',
    quantity: 1,
    unit_price: 135000,
    gross_amount: 135000,
    advance_paid: 50000,
    balance_due: 85000,
    payment_type: 'installment',
    loan_frequency: 'weekly',
    loan_terms: 16,
    installment_value: 5313,
    first_due_date: '2026-11-01',
    installments_paid: 2,
    payment_method: 'Bank Transfer',
    status: 'Active Loan',
    notes: 'Kitchen pantry installation complete. Weekly collection on Mondays.',
    created_at: '2026-10-24T11:00:00Z',
  },
  {
    id: 'ORD-1004',
    invoice_no: 'DS-INV-1084',
    contract_no: 'PN-004/C001/MEL-002',
    passbook_no: 'PN-004',
    date: '2026-10-28',
    customer_id: '199145607890',
    customer_name: 'Kasun Madushanka',
    customer_phone: '0785566778',
    customer_nic: '199145607890',
    customer_address: '104, Hill Street, Dehiwala',
    branch_code: 'DHW',
    center_code: 'C001',
    item_id: 'prod-4',
    item_code: 'MEL-002',
    item_name: 'Executive Melamine Office Desk (L-Shape)',
    category: 'melamine',
    quantity: 1,
    unit_price: 68500,
    gross_amount: 68500,
    advance_paid: 68500,
    balance_due: 0,
    payment_type: 'cash',
    loan_frequency: null,
    loan_terms: 1,
    installment_value: 0,
    first_due_date: null,
    installments_paid: 1,
    payment_method: 'Credit Card',
    status: 'Fully Paid',
    notes: 'Paid via Visa card at Dehiwala showroom.',
    created_at: '2026-10-28T16:20:00Z',
  },
  {
    id: 'ORD-1005',
    invoice_no: 'DS-INV-1085',
    contract_no: 'PN-005/C001/ELC-001',
    passbook_no: 'PN-005',
    date: '2026-11-02',
    customer_id: '199412308976',
    customer_name: 'Dilshan Fernando',
    customer_phone: '0704455667',
    customer_nic: '199412308976',
    customer_address: '24/B, Lewis Place, Negombo',
    branch_code: 'NGB',
    center_code: 'C001',
    item_id: 'prod-5',
    item_code: 'ELC-001',
    item_name: 'Smart LED Mirror Vanity & Concealed Wiring',
    category: 'electrical_item',
    quantity: 2,
    unit_price: 28500,
    gross_amount: 57000,
    advance_paid: 15000,
    balance_due: 42000,
    payment_type: 'installment',
    loan_frequency: 'monthly',
    loan_terms: 6,
    installment_value: 7000,
    first_due_date: '2026-12-02',
    installments_paid: 0,
    payment_method: 'Cash',
    status: 'Active Loan',
    notes: 'Hotel refurbishment order. 6 monthly installments of Rs. 7,000.',
    created_at: '2026-11-02T09:45:00Z',
  },
  {
    id: 'ORD-1006',
    invoice_no: 'DS-INV-1086',
    contract_no: 'PN-006/C003/WD-003',
    passbook_no: 'PN-006',
    date: '2026-11-05',
    customer_id: '197234509812',
    customer_name: 'Priyantha Wickramasinghe',
    customer_phone: '0751122334',
    customer_nic: '197234509812',
    customer_address: '56/1, Havelock Road, Colombo 05',
    branch_code: 'CMB',
    center_code: 'C003',
    item_id: 'prod-6',
    item_code: 'WD-003',
    item_name: 'Teak Veranda Easy Lounge Armchair',
    category: 'wood',
    quantity: 2,
    unit_price: 22500,
    gross_amount: 45000,
    advance_paid: 12500,
    balance_due: 32500,
    payment_type: 'installment',
    loan_frequency: 'weekly',
    loan_terms: 10,
    installment_value: 3250,
    first_due_date: '2026-11-12',
    installments_paid: 0,
    payment_method: 'Bank Transfer',
    status: 'Active Loan',
    notes: 'Two veranda chairs. Rs. 3,250 weekly repayment.',
    created_at: '2026-11-05T13:40:00Z',
  },
];

export const loadSavedOrders = () => {
  try {
    const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error loading orders from localStorage:', e);
  }
  // Initialize storage
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
  } catch {}
  return INITIAL_ORDERS;
};

export const saveOrdersToStorage = (ordersList) => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersList));
  } catch (e) {
    console.warn('Failed saving orders to localStorage:', e);
  }
};

// Generates next Passbook Number (PN-001, PN-002, etc.)
export const generateNextPassbookNo = (existingOrders = []) => {
  const nums = existingOrders
    .map((o) => {
      const contract = o.contract_no || '';
      const match = contract.match(/^PN-?(\d+)/i) || (o.passbook_no && String(o.passbook_no).match(/(\d+)/));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);

  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const next = Math.max(max + 1, existingOrders.length + 1);
  return `PN-${String(next).padStart(3, '0')}`;
};

// Generates Contract Number in format (pn / center code / item code)
export const buildContractNumber = (passbookNo, centerCode, itemCode) => {
  const pn = String(passbookNo || 'PN-001').trim().toUpperCase();
  const center = String(centerCode || 'C001').trim().toUpperCase();
  const item = String(itemCode || 'WD-001').trim().toUpperCase();
  return `${pn}/${center}/${item}`;
};

// Generates repayment installment schedule dates
export const generateInstallmentSchedule = (startDate, frequency, terms, installmentVal, totalLoan) => {
  const schedule = [];
  const start = startDate ? new Date(startDate) : new Date();
  const count = Number(terms) || 1;
  const val = Number(installmentVal) || 0;

  for (let i = 1; i <= count; i++) {
    const dueDate = new Date(start);
    if (frequency === 'weekly') {
      dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
    } else {
      // Monthly
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
    }

    schedule.push({
      term_number: i,
      due_date: dueDate.toISOString().slice(0, 10),
      amount: i === count && totalLoan ? totalLoan - val * (count - 1) : val,
      status: 'pending',
    });
  }
  return schedule;
};
