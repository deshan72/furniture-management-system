// Sri Lankan Furniture Customers Data Store
import { formatCenterCode } from './centersData';

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-1',
    customer_id: '197814502391',
    branch_code: 'MHG',
    center_code: 'C001',
    contract_no: '1',
    item_code: 'DT001',
    first_name: 'Sunil',
    last_name: 'Jayawardena',
    name: 'Sunil Jayawardena',
    civil_status: 'Married',
    dob: '1978-05-14',
    phone: '0771234567',
    whatsapp: '0771234567',
    nic: '197814502391',
    city: 'Maharagama',
    address: 'No. 45/2, High Level Road, Maharagama',
    category: 'custom_order',
    outstanding_balance: 45000,
    total_spent: 185000,
    total_orders: 3,
    notes: 'Custom Teak 6-Seater Dining Table & Chairs. Balance due upon delivery.',
    created_at: '2026-09-12T10:30:00Z',
  },
  {
    id: 'cust-2',
    customer_id: '198578901234',
    branch_code: 'MHG',
    center_code: 'C002',
    contract_no: '1',
    item_code: 'WR003',
    first_name: 'Chamari',
    last_name: 'Perera',
    name: 'Chamari Perera',
    civil_status: 'Married',
    dob: '1985-09-22',
    phone: '0718899221',
    whatsapp: '0718899221',
    nic: '198578901234',
    city: 'Kottawa',
    address: '12, Temple Road, Kottawa',
    category: 'showroom',
    outstanding_balance: 0,
    total_spent: 98000,
    total_orders: 1,
    notes: 'Purchased Ready-made Mahogany 3-Door Wardrobe. Paid in full via card.',
    created_at: '2026-10-02T14:15:00Z',
  },
  {
    id: 'cust-3',
    customer_id: '196923405678',
    branch_code: 'MRT',
    center_code: 'C001',
    contract_no: '2',
    item_code: 'BS002',
    first_name: 'Nimal',
    last_name: 'Karunaratne',
    name: 'Nimal Karunaratne',
    civil_status: 'Married',
    dob: '1969-11-03',
    phone: '0763344552',
    whatsapp: '0763344552',
    nic: '196923405678',
    city: 'Moratuwa',
    address: '88, Galle Road, Rawathawatta, Moratuwa',
    category: 'custom_order',
    outstanding_balance: 85000,
    total_spent: 310000,
    total_orders: 2,
    notes: 'Full Teak Master Bedroom Suite (King Bed, Dressing Table, 4-door Almirah). Rs. 150,000 advance paid.',
    created_at: '2026-08-20T11:00:00Z',
  },
  {
    id: 'cust-4',
    customer_id: '199412308976',
    branch_code: 'NGB',
    center_code: 'C001',
    contract_no: '5',
    item_code: 'CT010',
    first_name: 'Dilshan',
    last_name: 'Fernando',
    name: 'Dilshan Fernando (Beach Resort)',
    civil_status: 'Single',
    dob: '1994-03-18',
    phone: '0704455667',
    whatsapp: '0704455667',
    nic: '199412308976',
    city: 'Negombo',
    address: '24/B, Lewis Place, Negombo',
    category: 'wholesale',
    outstanding_balance: 120000,
    total_spent: 650000,
    total_orders: 5,
    notes: 'Boutique Hotel project - 8 Teak coffee tables and 16 veranda armchairs.',
    created_at: '2026-07-15T09:45:00Z',
  },
  {
    id: 'cust-5',
    customer_id: '199145607890',
    branch_code: 'DHW',
    center_code: 'C001',
    contract_no: '1',
    item_code: 'OD004',
    first_name: 'Kasun',
    last_name: 'Madushanka',
    name: 'Kasun Madushanka',
    civil_status: 'Single',
    dob: '1991-07-30',
    phone: '0785566778',
    whatsapp: '0785566778',
    nic: '199145607890',
    city: 'Dehiwala',
    address: '104, Hill Street, Dehiwala',
    category: 'showroom',
    outstanding_balance: 0,
    total_spent: 62000,
    total_orders: 1,
    notes: 'Bought Office Executive Desk & Ergonomic Chair in cash.',
    created_at: '2026-10-10T16:20:00Z',
  },
  {
    id: 'cust-6',
    customer_id: '197234509812',
    branch_code: 'CMB',
    center_code: 'C003',
    contract_no: '2',
    item_code: 'TV002',
    first_name: 'Priyantha',
    last_name: 'Wickramasinghe',
    name: 'Priyantha Wickramasinghe',
    civil_status: 'Married',
    dob: '1972-12-10',
    phone: '0751122334',
    whatsapp: '0751122334',
    nic: '197234509812',
    city: 'Colombo',
    address: '56/1, Havelock Road, Colombo 05',
    category: 'custom_order',
    outstanding_balance: 32500,
    total_spent: 145000,
    total_orders: 2,
    notes: 'Custom TV Console & Living Room Display Unit (Kaluwara finish).',
    created_at: '2026-09-28T13:40:00Z',
  },
];

export const DELETED_CUSTOMERS_KEY = 'dnd_deleted_customers';

export const TEST_CUSTOMER_NICS = new Set([
  '197814502391',
  '198578901234',
  '196923405678',
  '199412308976',
  '199145607890',
  '197234509812',
]);

export const TEST_CUSTOMER_IDS = new Set([
  'cust-1',
  'cust-2',
  'cust-3',
  'cust-4',
  'cust-5',
  'cust-6',
]);

export const isTestCustomer = (c) => {
  if (!c) return false;
  const id = String(c.id || '').trim();
  const nic = String(c.nic || '').trim().toUpperCase();
  const custId = String(c.customer_id || '').trim().toUpperCase();
  return (
    TEST_CUSTOMER_IDS.has(id) ||
    TEST_CUSTOMER_NICS.has(nic) ||
    TEST_CUSTOMER_NICS.has(custId) ||
    id.startsWith('cust-')
  );
};

export const getDeletedCustomerIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((x) => String(x).trim().toUpperCase()));
      }
    }
  } catch {}
  return new Set();
};

export const markCustomerAsDeleted = (customer) => {
  try {
    const deletedSet = getDeletedCustomerIds();
    if (customer) {
      if (customer.id) deletedSet.add(String(customer.id).trim().toUpperCase());
      if (customer.customer_id) deletedSet.add(String(customer.customer_id).trim().toUpperCase());
      if (customer.nic) deletedSet.add(String(customer.nic).trim().toUpperCase());
      if (customer.name) deletedSet.add(String(customer.name).trim().toUpperCase());
    }
    localStorage.setItem(DELETED_CUSTOMERS_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (e) {
    console.warn('Failed to mark customer as deleted:', e);
  }
};

export const isCustomerDeleted = (c, deletedSet = null) => {
  if (!c) return false;
  const set = deletedSet || getDeletedCustomerIds();
  const cId = c.id ? String(c.id).trim().toUpperCase() : '';
  const cCustId = c.customer_id ? String(c.customer_id).trim().toUpperCase() : '';
  const cNic = c.nic ? String(c.nic).trim().toUpperCase() : '';
  const cName = c.name ? String(c.name).trim().toUpperCase() : '';

  return (
    (cId && set.has(cId)) ||
    (cCustId && set.has(cCustId)) ||
    (cNic && set.has(cNic)) ||
    (cName && set.has(cName))
  );
};

export const loadSavedCustomers = () => {
  try {
    const deletedSet = getDeletedCustomerIds();
    const saved = localStorage.getItem('dnd_customers_list');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((c) => !isCustomerDeleted(c, deletedSet))
          .map((c) => ({
            ...c,
            customer_id: c.nic || c.customer_id,
            center_code: formatCenterCode(c.center_code || 'C001'),
          }));
      }
    }
    // If dnd_customers_list was never initialized, load initial customers minus deleted ones
    return INITIAL_CUSTOMERS
      .filter((c) => !isCustomerDeleted(c, deletedSet))
      .map((c) => ({
        ...c,
        customer_id: c.nic || c.customer_id,
        center_code: formatCenterCode(c.center_code || 'C001'),
      }));
  } catch {
    // fallback
  }
  return [];
};

export const saveCustomersToStorage = (customersList) => {
  try {
    localStorage.setItem('dnd_customers_list', JSON.stringify(customersList));
    // Dispatch in-tab events so active React views sync immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dnd_customers_updated', { detail: customersList }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn('Failed saving customers to localStorage:', e);
  }
};

