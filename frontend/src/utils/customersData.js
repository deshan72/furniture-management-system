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

export const loadSavedCustomers = () => {
  try {
    const saved = localStorage.getItem('dnd_customers_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c) => ({
          ...c,
          customer_id: c.nic || c.customer_id,
          center_code: formatCenterCode(c.center_code || 'C001'),
        }));
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_CUSTOMERS;
};

export const saveCustomersToStorage = (customersList) => {
  try {
    localStorage.setItem('dnd_customers_list', JSON.stringify(customersList));
  } catch (e) {
    console.warn('Failed saving customers to localStorage:', e);
  }
};
