import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  X,
  Plus,
  Download,
  RotateCcw,
  Phone,
  MessageSquare,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Eye,
  Trash2,
  DollarSign,
  Hammer,
  Store,
  Briefcase,
  FileText,
  List,
  LayoutGrid,
  Edit2,
  FileSpreadsheet,
  Printer,
  ChevronDown,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { apiRequest } from '../services/api';

// Realistic initial Sri Lankan furniture client records
const INITIAL_CUSTOMERS = [
  {
    id: 'cust-1',
    customer_id: 'MHG/C001/1/DT001',
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
    customer_id: 'MHG/C002/1/WR003',
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
    customer_id: 'MRT/C001/2/BS002',
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
    customer_id: 'NGB/C001/5/CT010',
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
    customer_id: 'DHW/C001/1/OD004',
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
    customer_id: 'CMB/C003/2/TV002',
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

// =========================================================
// Customer ID format: BRANCH CODE / CENTER CODE / CONTRACT NO / ITEM CODE
//   - Contract No = the customer's nth item count
//   e.g. MHG/C001/2/DT001
// =========================================================
const CUSTOMER_ID_FIELDS = [
  { key: 'branch_code', label: 'Branch Code', si: 'Branch', placeholder: 'e.g. MHG' },
  { key: 'center_code', label: 'Center Code', si: 'Center', placeholder: 'e.g. C001' },
  { key: 'contract_no', label: 'Contract No', si: 'Item #', placeholder: 'e.g. 1', numeric: true },
  { key: 'item_code', label: 'Item Code', si: 'SKU / Item', placeholder: 'e.g. DT001' },
];

const LAST_ID_PREFIX_KEY = 'dnd_last_customer_id_prefix';

// Normalizes and formats center codes into 'C001' style (C followed by 3 digits)
const formatCenterCode = (val) => {
  const clean = String(val || '').trim().toUpperCase();
  if (!clean) return '';
  const numMatch = clean.match(/^(?:C)?(\d+)$/i);
  if (numMatch) {
    return `C${numMatch[1].padStart(3, '0')}`;
  }
  return clean.startsWith('C') ? clean : `C${clean}`;
};

const normalizeIdPart = (key, value) => {
  if (key === 'center_code') {
    return formatCenterCode(value);
  }
  return String(value ?? '').replace(/\//g, '').trim().toUpperCase();
};

const normalizeDigits = (str) => String(str || '').replace(/\D/g, '');
const normalizeNic = (str) => String(str || '').trim().toUpperCase();

const buildCustomerId = (parts) =>
  CUSTOMER_ID_FIELDS.map((f) => normalizeIdPart(f.key, parts?.[f.key])).join('/');

const isCustomerIdComplete = (parts) =>
  CUSTOMER_ID_FIELDS.every((f) => normalizeIdPart(f.key, parts?.[f.key]) !== '');

// Splits an existing customer_id into its 4 parts (empty parts if it is in an older format)
const parseCustomerId = (customer) => {
  if (customer && CUSTOMER_ID_FIELDS.some((f) => customer[f.key])) {
    return CUSTOMER_ID_FIELDS.reduce(
      (acc, f) => ({
        ...acc,
        [f.key]: f.key === 'center_code' ? formatCenterCode(customer[f.key]) : (customer[f.key] || ''),
      }),
      {}
    );
  }
  const segments = String(customer?.customer_id || '').split('/');
  return CUSTOMER_ID_FIELDS.reduce(
    (acc, f, idx) => ({
      ...acc,
      [f.key]: segments.length === CUSTOMER_ID_FIELDS.length
        ? (f.key === 'center_code' ? formatCenterCode(segments[idx]) : segments[idx])
        : '',
    }),
    {}
  );
};

// Seed migration map for default mock customers
const SAMPLE_MIGRATION_MAP = {
  'cust-1': { customer_id: 'MHG/C001/1/DT001', branch_code: 'MHG', center_code: 'C001', contract_no: '1', item_code: 'DT001' },
  'cust-2': { customer_id: 'MHG/C002/1/WR003', branch_code: 'MHG', center_code: 'C002', contract_no: '1', item_code: 'WR003' },
  'cust-3': { customer_id: 'MRT/C001/2/BS002', branch_code: 'MRT', center_code: 'C001', contract_no: '2', item_code: 'BS002' },
  'cust-4': { customer_id: 'NGB/C001/5/CT010', branch_code: 'NGB', center_code: 'C001', contract_no: '5', item_code: 'CT010' },
  'cust-5': { customer_id: 'DHW/C001/1/OD004', branch_code: 'DHW', center_code: 'C001', contract_no: '1', item_code: 'OD004' },
  'cust-6': { customer_id: 'CMB/C003/2/TV002', branch_code: 'CMB', center_code: 'C003', contract_no: '2', item_code: 'TV002' },
};

const CITY_BRANCH_CODES = {
  maharagama: 'MHG',
  kottawa: 'MHG',
  moratuwa: 'MRT',
  negombo: 'NGB',
  dehiwala: 'DHW',
  colombo: 'CMB',
  kandy: 'KDY',
  galle: 'GAL',
  kurunegala: 'KRN',
  gampaha: 'GMP',
};

// Converts any legacy CUST-XXXX or incomplete ID to standard BRANCH/CENTER/CONTRACT/ITEM
const migrateCustomerRecord = (c, idx = 0) => {
  if (SAMPLE_MIGRATION_MAP[c.id]) {
    const seed = SAMPLE_MIGRATION_MAP[c.id];
    return {
      ...c,
      ...seed,
      first_name: c.first_name || (c.name ? c.name.split(' ')[0] : ''),
      last_name: c.last_name || (c.name ? c.name.split(' ').slice(1).join(' ') : ''),
      civil_status: c.civil_status || 'Single',
      dob: c.dob || '',
    };
  }

  const parts = String(c.customer_id || '').split('/');
  if (parts.length === 4 && parts.every((p) => p.trim() !== '')) {
    const normCenter = formatCenterCode(c.center_code || parts[1]);
    const updatedId = `${parts[0].toUpperCase()}/${normCenter}/${parts[2]}/${parts[3].toUpperCase()}`;
    return {
      ...c,
      customer_id: updatedId,
      branch_code: c.branch_code || parts[0].toUpperCase(),
      center_code: normCenter,
      contract_no: c.contract_no || parts[2],
      item_code: c.item_code || parts[3].toUpperCase(),
      first_name: c.first_name || (c.name ? c.name.split(' ')[0] : ''),
      last_name: c.last_name || (c.name ? c.name.split(' ').slice(1).join(' ') : ''),
      civil_status: c.civil_status || 'Single',
      dob: c.dob || '',
    };
  }

  const cityKey = String(c.city || '').toLowerCase().trim();
  const branch_code = c.branch_code || CITY_BRANCH_CODES[cityKey] || (c.city ? c.city.slice(0, 3).toUpperCase() : 'MHG');
  const center_code = formatCenterCode(c.center_code || 'C001');
  const contract_no = c.contract_no || String(c.total_orders || 1);
  const numOnly = String(c.customer_id || '').replace(/\D/g, '') || String(idx + 1);
  const item_code = c.item_code || `ITM${numOnly.padStart(3, '0').slice(-3)}`;
  const customer_id = `${branch_code}/${center_code}/${contract_no}/${item_code}`;

  return {
    ...c,
    customer_id,
    branch_code,
    center_code,
    contract_no,
    item_code,
    first_name: c.first_name || (c.name ? c.name.split(' ')[0] : ''),
    last_name: c.last_name || (c.name ? c.name.split(' ').slice(1).join(' ') : ''),
    civil_status: c.civil_status || 'Single',
    dob: c.dob || '',
  };
};

// Calculates how many purchases this customer has had and the next Contract No (e.g. 2, 3...)
const getCustomerContractStats = (customersList, customer) => {
  if (!customer) return { count: 0, nextContractNo: 1, matchingRecords: [] };

  const pDigits = normalizeDigits(customer.phone);
  const nNic = normalizeNic(customer.nic);

  const matchingRecords = customersList.filter((c) => {
    if (nNic && nNic.length >= 9 && normalizeNic(c.nic) === nNic) return true;
    if (pDigits && pDigits.length >= 9) {
      const cPhone = normalizeDigits(c.phone);
      const cWa = normalizeDigits(c.whatsapp);
      if (cPhone.endsWith(pDigits.slice(-9)) || cWa.endsWith(pDigits.slice(-9))) return true;
    }
    return false;
  });

  const existingContractNos = matchingRecords
    .map((r) => {
      const parsed = parseCustomerId(r);
      const val = Number(r.contract_no || parsed.contract_no);
      return isNaN(val) ? 0 : val;
    })
    .filter((n) => n > 0);

  const maxContractFromRecords = existingContractNos.length > 0 ? Math.max(...existingContractNos) : 0;
  const count = Math.max(matchingRecords.length, Number(customer.total_orders) || 0, maxContractFromRecords);
  const nextContractNo = (maxContractFromRecords > 0 ? maxContractFromRecords : count) + 1;

  return {
    count,
    nextContractNo,
    matchingRecords,
  };
};

// Composite Customer ID input (Branch / Center / Contract / Item)
function CustomerIdBuilder({ values, onChange, legacyId }) {
  const preview = buildCustomerId(values);
  const complete = isCustomerIdComplete(values);

  // Available centers from center management
  const availableCenters = useMemo(() => {
    try {
      const saved = localStorage.getItem('dnd_centers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  }, []);

  const handleSelectCenter = (centerId) => {
    const center = availableCenters.find((c) => c.id === centerId);
    if (center) {
      onChange('branch_code', center.branch_code?.toUpperCase() || '');
      onChange('center_code', center.center_code?.toUpperCase() || '');
    }
  };

  return (
    <div className="form-group full-width">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          Customer ID * — Branch / Center / Contract / Item
        </label>
        {availableCenters.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Choose Center:</span>
            <select
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--ash-300)',
                background: '#fff',
                cursor: 'pointer',
              }}
              value=""
              onChange={(e) => handleSelectCenter(e.target.value)}
            >
              <option value="" disabled>
                -- Select Center Code --
              </option>
              {availableCenters.map((cntr) => (
                <option key={cntr.id} value={cntr.id}>
                  {cntr.branch_code}/{cntr.center_code} — {cntr.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="cust-id-builder">
        {CUSTOMER_ID_FIELDS.map((f, idx) => (
          <React.Fragment key={f.key}>
            {idx > 0 && <span className="cust-id-sep">/</span>}
            <div className="cust-id-part">
              <span className="cust-id-part-label">
                {f.label}
                <small>{f.si}</small>
              </span>
              <input
                type={f.numeric ? 'number' : 'text'}
                min={f.numeric ? 1 : undefined}
                className="form-input"
                required
                placeholder={f.placeholder}
                value={values?.[f.key] ?? ''}
                onChange={(e) => onChange(f.key, f.numeric ? e.target.value : e.target.value.replace(/\//g, '').toUpperCase())}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className={`cust-id-preview ${complete ? 'is-complete' : ''}`}>
        Customer ID: <strong>{complete ? preview : 'BRANCH/CENTER/CONTRACT/ITEM'}</strong>
        {legacyId && !complete && <span className="cust-id-legacy"> (Old ID: {legacyId})</span>}
      </div>
    </div>
  );
}

export default function CustomersPage({ initialDebtFilter = 'all', selectedCenter = 'all' }) {
  // Customers List State (with local storage persistence & auto-migration to BRANCH/CENTER/CONTRACT/ITEM)
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_customers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map((c, idx) => migrateCustomerRecord(c, idx));
          try {
            localStorage.setItem('dnd_customers_list', JSON.stringify(migrated));
          } catch {
            // ignore
          }
          return migrated;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_CUSTOMERS;
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState(initialDebtFilter); // 'all', 'debt', 'settled', 'high_debt'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'custom_order', 'showroom', 'wholesale'
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'debt_desc', 'debt_asc', 'spent_desc', 'name_asc'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Sync initialDebtFilter if prop changes (e.g., clicking Outstanding Balances in sidebar)
  useEffect(() => {
    if (initialDebtFilter) {
      setDebtFilter(initialDebtFilter);
    }
  }, [initialDebtFilter]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [matchedCustomerAlert, setMatchedCustomerAlert] = useState(null);

  // Form State for Add Customer
  const [newCustomer, setNewCustomer] = useState({
    customer_id: '',
    branch_code: '',
    center_code: '',
    contract_no: '1',
    item_code: '',
    first_name: '',
    last_name: '',
    name: '',
    civil_status: 'Single',
    dob: '',
    phone: '',
    whatsapp: '',
    nic: '',
    city: 'Maharagama',
    address: '',
    category: 'custom_order',
    outstanding_balance: '',
    notes: '',
  });

  // Save to localStorage whenever customers change
  useEffect(() => {
    try {
      localStorage.setItem('dnd_customers_list', JSON.stringify(customers));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [customers]);

  // Try fetching from backend API on mount
  useEffect(() => {
    let isMounted = true;
    apiRequest('/customers')
      .then((res) => {
        if (isMounted && res && res.data && res.data.length > 0) {
          // Merge or set with migration if backend has records
          const migrated = res.data.map((c, idx) => migrateCustomerRecord(c, idx));
          setCustomers(migrated);
        }
      })
      .catch(() => {
        // Fallback already loaded
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Format currency helper
  const formatLKR = (amount) => {
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format phone for WhatsApp direct link (94 format)
  const getWhatsAppLink = (number) => {
    if (!number) return null;
    let clean = number.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '94' + clean.slice(1);
    } else if (!clean.startsWith('94')) {
      clean = '94' + clean;
    }
    return `https://wa.me/${clean}`;
  };

  // Get unique cities for filter dropdown
  const availableCities = useMemo(() => {
    const cities = new Set();
    customers.forEach((c) => {
      if (c.city && c.city.trim()) cities.add(c.city.trim());
    });
    return Array.from(cities).sort();
  }, [customers]);

  // KPI Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const withDebt = customers.filter((c) => Number(c.outstanding_balance) > 0);
    const totalOutstanding = withDebt.reduce((sum, c) => sum + Number(c.outstanding_balance), 0);
    const customOrdersCount = customers.filter((c) => c.category === 'custom_order').length;
    const settledCount = customers.filter((c) => Number(c.outstanding_balance) <= 0).length;

    return {
      total,
      withDebtCount: withDebt.length,
      totalOutstanding,
      customOrdersCount,
      settledCount,
    };
  }, [customers]);

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((cust) => {
        // 1. Text Search (Customer ID, Name, Phone, WhatsApp, NIC, City, Address, Notes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            cust.customer_id?.toLowerCase().includes(q) ||
            cust.name?.toLowerCase().includes(q) ||
            cust.first_name?.toLowerCase().includes(q) ||
            cust.last_name?.toLowerCase().includes(q) ||
            cust.civil_status?.toLowerCase().includes(q) ||
            cust.phone?.toLowerCase().includes(q) ||
            cust.whatsapp?.toLowerCase().includes(q) ||
            cust.nic?.toLowerCase().includes(q) ||
            cust.city?.toLowerCase().includes(q) ||
            cust.address?.toLowerCase().includes(q) ||
            cust.notes?.toLowerCase().includes(q);

          if (!matches) return false;
        }

        // 2. Debt / Outstanding Status
        const balance = Number(cust.outstanding_balance) || 0;
        if (debtFilter === 'debt' && balance <= 0) return false;
        if (debtFilter === 'settled' && balance > 0) return false;
        if (debtFilter === 'high_debt' && balance < 50000) return false;

        // 3. Category Filter
        if (categoryFilter !== 'all' && cust.category !== categoryFilter) {
          return false;
        }

        // 4. City Filter
        if (cityFilter !== 'all' && cust.city?.toLowerCase() !== cityFilter.toLowerCase()) {
          return false;
        }

        // 5. Global Center Filter (from Header)
        if (selectedCenter && selectedCenter !== 'all') {
          const parts = String(cust.customer_id || '').split('/');
          const bCode = (cust.branch_code || (parts.length === 4 ? parts[0] : '')).toUpperCase();
          const cCode = formatCenterCode(cust.center_code || (parts.length === 4 ? parts[1] : ''));
          if (selectedCenter.includes('/')) {
            const [selB, selC] = selectedCenter.split('/');
            if (bCode !== selB.toUpperCase() || cCode !== formatCenterCode(selC)) {
              return false;
            }
          } else {
            if (cCode !== formatCenterCode(selectedCenter)) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') {
          return (Number(b.outstanding_balance) || 0) - (Number(a.outstanding_balance) || 0);
        }
        if (sortBy === 'debt_asc') {
          return (Number(a.outstanding_balance) || 0) - (Number(b.outstanding_balance) || 0);
        }
        if (sortBy === 'spent_desc') {
          return (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0);
        }
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        // 'recent' by default
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [customers, searchQuery, debtFilter, categoryFilter, cityFilter, sortBy, selectedCenter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebtFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
    setSortBy('recent');
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    debtFilter !== 'all' ||
    categoryFilter !== 'all' ||
    cityFilter !== 'all' ||
    sortBy !== 'recent';

  // Open Add New Customer Modal (Branch & Center codes pre-filled from the last entry)
  const handleOpenAddModal = () => {
    let lastPrefix = {};
    try {
      lastPrefix = JSON.parse(localStorage.getItem(LAST_ID_PREFIX_KEY) || '{}') || {};
    } catch {
      lastPrefix = {};
    }
    setMatchedCustomerAlert(null);
    setNewCustomer({
      customer_id: '',
      branch_code: lastPrefix.branch_code || '',
      center_code: lastPrefix.center_code || '',
      contract_no: '1',
      item_code: '',
      first_name: '',
      last_name: '',
      name: '',
      civil_status: 'Single',
      dob: '',
      phone: '',
      whatsapp: '',
      nic: '',
      city: 'Maharagama',
      address: '',
      category: 'custom_order',
      outstanding_balance: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // Smart detection of existing customers when typing Phone or NIC
  const handleCheckExistingCustomer = (field, value, currentCustomerState) => {
    const pDigits = field === 'phone' ? normalizeDigits(value) : normalizeDigits(currentCustomerState.phone);
    const nNic = field === 'nic' ? normalizeNic(value) : normalizeNic(currentCustomerState.nic);

    let matched = null;
    if (field === 'nic' && nNic.length >= 9) {
      matched = customers.find((c) => normalizeNic(c.nic) === nNic);
    }
    if (!matched && pDigits.length >= 9) {
      matched = customers.find((c) => {
        const cPhone = normalizeDigits(c.phone);
        const cWa = normalizeDigits(c.whatsapp);
        return (cPhone && cPhone.endsWith(pDigits.slice(-9))) || (cWa && cWa.endsWith(pDigits.slice(-9)));
      });
    }

    if (matched) {
      const contractStats = getCustomerContractStats(customers, matched);
      setMatchedCustomerAlert({
        id: matched.id,
        name: matched.name || `${matched.first_name || ''} ${matched.last_name || ''}`.trim(),
        phone: matched.phone,
        nic: matched.nic,
        city: matched.city,
        previousCount: contractStats.count,
        nextContractNo: contractStats.nextContractNo,
        matchedBy: field,
      });

      const parsedId = parseCustomerId(matched);
      const existingBranch = matched.branch_code || parsedId.branch_code || currentCustomerState.branch_code;
      const existingCenter = matched.center_code || parsedId.center_code || currentCustomerState.center_code;

      setNewCustomer((prev) => ({
        ...prev,
        first_name: prev.first_name || matched.first_name || (matched.name ? matched.name.split(' ')[0] : ''),
        last_name: prev.last_name || matched.last_name || (matched.name ? matched.name.split(' ').slice(1).join(' ') : ''),
        name: prev.name || matched.name,
        civil_status: matched.civil_status || prev.civil_status || 'Single',
        dob: prev.dob || matched.dob || '',
        whatsapp: prev.whatsapp || matched.whatsapp || matched.phone || '',
        nic: prev.nic || matched.nic || '',
        phone: prev.phone || matched.phone || '',
        city: prev.city || matched.city || '',
        address: prev.address || matched.address || '',
        category: prev.category || matched.category || 'custom_order',
        branch_code: existingBranch,
        center_code: existingCenter,
        contract_no: String(contractStats.nextContractNo),
      }));
    } else if (matchedCustomerAlert && matchedCustomerAlert.matchedBy === field) {
      setMatchedCustomerAlert(null);
    }
  };

  const handleClearCustomerMatch = () => {
    setMatchedCustomerAlert(null);
    setNewCustomer((prev) => ({
      ...prev,
      contract_no: '1',
    }));
  };

  // Add new customer handler
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const fullName = `${newCustomer.first_name || ''} ${newCustomer.last_name || ''}`.trim() || newCustomer.name;
    if (!newCustomer.first_name && !newCustomer.name) {
      alert('Please fill in First Name.');
      return;
    }
    if (!newCustomer.phone) {
      alert('Please fill in Phone Number.');
      return;
    }

    if (!isCustomerIdComplete(newCustomer)) {
      alert('Please fill Branch Code, Center Code, Contract No and Item Code for the Customer ID.');
      return;
    }
    const assignedCustomerId = buildCustomerId(newCustomer);
    if (customers.some((c) => (c.customer_id || '').toUpperCase() === assignedCustomerId)) {
      alert(`Customer ID "${assignedCustomerId}" already exists. Please use a different Contract No or Item Code.`);
      return;
    }

    try {
      localStorage.setItem(
        LAST_ID_PREFIX_KEY,
        JSON.stringify({
          branch_code: normalizeIdPart(newCustomer.branch_code),
          center_code: normalizeIdPart(newCustomer.center_code),
        })
      );
    } catch {
      // ignore storage errors
    }

    const totalOrders = matchedCustomerAlert ? matchedCustomerAlert.previousCount + 1 : 1;

    const createdRecord = {
      id: `cust-${Date.now()}`,
      customer_id: assignedCustomerId,
      branch_code: normalizeIdPart(newCustomer.branch_code),
      center_code: normalizeIdPart(newCustomer.center_code),
      contract_no: normalizeIdPart(newCustomer.contract_no),
      item_code: normalizeIdPart(newCustomer.item_code),
      first_name: newCustomer.first_name || '',
      last_name: newCustomer.last_name || '',
      name: fullName,
      civil_status: newCustomer.civil_status || 'Single',
      dob: newCustomer.dob || '',
      phone: newCustomer.phone,
      whatsapp: newCustomer.whatsapp || newCustomer.phone,
      nic: newCustomer.nic || '',
      city: newCustomer.city || 'Maharagama',
      address: newCustomer.address || '',
      category: newCustomer.category || 'custom_order',
      outstanding_balance: Number(newCustomer.outstanding_balance) || 0,
      total_spent: Number(newCustomer.outstanding_balance) || 0,
      total_orders: totalOrders,
      notes: newCustomer.notes || '',
      created_at: new Date().toISOString(),
    };

    // Try sending to backend
    try {
      await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(createdRecord),
      });
    } catch {
      // Local state fallback continues
    }

    setCustomers((prev) => [createdRecord, ...prev]);
    setIsAddModalOpen(false);
    setMatchedCustomerAlert(null);
    setNewCustomer({
      customer_id: '',
      branch_code: '',
      center_code: '',
      contract_no: '1',
      item_code: '',
      first_name: '',
      last_name: '',
      name: '',
      civil_status: 'Single',
      dob: '',
      phone: '',
      whatsapp: '',
      nic: '',
      city: 'Maharagama',
      address: '',
      category: 'custom_order',
      outstanding_balance: '',
      notes: '',
    });
  };

  // Delete customer
  const handleDeleteCustomer = (id, name) => {
    if (window.confirm(`Are you sure you want to remove customer "${name}" from directory?`)) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      if (selectedCustomer?.id === id) {
        setIsViewModalOpen(false);
      }
    }
  };

  // Record payment against customer's outstanding balance
  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    if (!selectedCustomer) return;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === selectedCustomer.id) {
          const newBal = Math.max(0, Number(c.outstanding_balance) - amount);
          return {
            ...c,
            outstanding_balance: newBal,
            total_spent: (Number(c.total_spent) || 0) + amount,
          };
        }
        return c;
      })
    );

    setSelectedCustomer((prev) =>
      prev ? { ...prev, outstanding_balance: Math.max(0, Number(prev.outstanding_balance) - amount) } : null
    );

    setIsPayModalOpen(false);
    setPaymentAmount('');
  };

  // Export filtered customers to CSV
  const handleExportCSV = () => {
    if (!filteredCustomers.length) {
      alert('No customers to export.');
      return;
    }

    const headers = ['Customer ID', 'Full Name', 'Civil Status', 'Date of Birth', 'Phone', 'WhatsApp', 'NIC', 'City', 'Address', 'Category', 'Outstanding Balance (LKR)', 'Notes'];
    const rows = filteredCustomers.map((c) => [
      `"${c.customer_id || ''}"`,
      `"${c.name?.replace(/"/g, '""') || ''}"`,
      `"${c.civil_status || ''}"`,
      `"${c.dob || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.nic || ''}"`,
      `"${c.city || ''}"`,
      `"${c.address?.replace(/"/g, '""') || ''}"`,
      `"${c.category || ''}"`,
      c.outstanding_balance || 0,
      `"${c.notes?.replace(/"/g, '""') || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dd_furniture_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export filtered customers to Printable PDF Report
  const handleExportPDF = () => {
    if (!filteredCustomers.length) {
      alert('No customers to export.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening the print window. Please allow popups.');
      return;
    }

    const totalOutstanding = filteredCustomers.reduce(
      (sum, c) => sum + (Number(c.outstanding_balance) || 0),
      0
    );

    const rowsHtml = filteredCustomers
      .map(
        (c, idx) => `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
          ${c.name}
          ${c.nic ? `<br><span style="color: #64748b; font-size: 10px; font-weight: normal;">NIC: ${c.nic}</span>` : ''}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">
          ${c.phone}
          ${c.whatsapp && c.whatsapp !== c.phone ? `<br><span style="color: #16a34a; font-size: 10px;">WA: ${c.whatsapp}</span>` : ''}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0;">
          <strong>${c.city || 'N/A'}</strong>
          ${c.address ? `<br><span style="color: #64748b; font-size: 10px;">${c.address}</span>` : ''}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-transform: capitalize;">
          ${c.category ? c.category.replace('_', ' ') : 'N/A'}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          ${c.total_orders || 1}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: ${
          Number(c.outstanding_balance) > 0 ? '#dc2626' : '#16a34a'
        };">
          Rs. ${(Number(c.outstanding_balance) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>D&S Furniture - Customer Directory & Credit Ledger Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; border-bottom: 2px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 800; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
            .report-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 6px; }
            .meta-text { font-size: 11px; color: #64748b; text-align: right; line-height: 1.5; }
            .summary-cards { display: flex; gap: 14px; margin-bottom: 18px; }
            .summary-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 16px; background: #f8fafc; flex: 1; }
            .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
            .summary-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            table.data-table th { background: #f1f5f9; color: #1e293b; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
            .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
              button.print-btn { display: none; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${window.location.origin}/logo-icon.png" alt="D&S Furniture" style="height:56px;width:56px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;" /><div class="brand-title">D&S FURNITURE</div>
                <div class="brand-sub">Workshop & Showroom Management</div>
                <div class="report-title">Customer Directory & Credit Ledger Report</div>
              </td>
              <td class="meta-text">
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
                <div><strong>Records:</strong> ${filteredCustomers.length} Client(s)</div>
              </td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Filtered Clients</div>
              <div class="summary-val">${filteredCustomers.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Accounts with Debt</div>
              <div class="summary-val">${filteredCustomers.filter((c) => Number(c.outstanding_balance) > 0).length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Outstanding Credit</div>
              <div class="summary-val" style="color: #dc2626;">Rs. ${totalOutstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Client Name & NIC</th>
                <th>Contact Numbers</th>
                <th>Delivery City & Address</th>
                <th>Category</th>
                <th style="text-align: center;">Orders</th>
                <th style="text-align: right;">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>D&S Furniture System - Confidential Official Ledger</span>
            <span>Printed via Furniture Management System Web Application</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Open Edit Customer Modal
  const handleOpenEdit = (customer) => {
    let firstName = customer.first_name || '';
    let lastName = customer.last_name || '';
    if (!firstName && customer.name) {
      const parts = customer.name.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    setEditingCustomer({
      ...customer,
      ...parseCustomerId(customer),
      legacy_customer_id: customer.customer_id || '',
      customer_id: customer.customer_id || '',
      first_name: firstName,
      last_name: lastName,
      name: customer.name || `${firstName} ${lastName}`.trim(),
      civil_status: customer.civil_status || 'Single',
      dob: customer.dob || '',
    });
    setIsEditModalOpen(true);
  };

  // Save Updated Customer Details
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    const fullName = `${editingCustomer.first_name || ''} ${editingCustomer.last_name || ''}`.trim() || editingCustomer.name;
    if (!editingCustomer?.first_name && !editingCustomer?.name) {
      alert('Please fill in First Name.');
      return;
    }
    if (!editingCustomer?.phone) {
      alert('Please fill in Phone Number.');
      return;
    }

    if (!isCustomerIdComplete(editingCustomer)) {
      alert('Please fill Branch Code, Center Code, Contract No and Item Code for the Customer ID.');
      return;
    }
    const updatedCustomerId = buildCustomerId(editingCustomer);
    if (
      customers.some(
        (c) => c.id !== editingCustomer.id && (c.customer_id || '').toUpperCase() === updatedCustomerId
      )
    ) {
      alert(`Customer ID "${updatedCustomerId}" already exists. Please use a different Contract No or Item Code.`);
      return;
    }

    const { legacy_customer_id: _legacyId, ...editingData } = editingCustomer;
    const updated = {
      ...editingData,
      name: fullName,
      first_name: editingCustomer.first_name || '',
      last_name: editingCustomer.last_name || '',
      customer_id: updatedCustomerId,
      branch_code: normalizeIdPart(editingCustomer.branch_code),
      center_code: normalizeIdPart(editingCustomer.center_code),
      contract_no: normalizeIdPart(editingCustomer.contract_no),
      item_code: normalizeIdPart(editingCustomer.item_code),
      civil_status: editingCustomer.civil_status || 'Single',
      dob: editingCustomer.dob || '',
      outstanding_balance: Number(editingCustomer.outstanding_balance) || 0,
    };

    // Update state immediately
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );

    if (selectedCustomer?.id === updated.id) {
      setSelectedCustomer(updated);
    }

    // Try backend API update
    try {
      await apiRequest(`/customers/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    } catch {
      // Local storage and state persist
    }

    setIsEditModalOpen(false);
    setEditingCustomer(null);
  };

  // Helper for category badge styling
  const renderCategoryBadge = (category) => {
    switch (category) {
      case 'custom_order':
        return (
          <span className="status-badge badge-custom">
            <Hammer size={12} /> Custom Made
          </span>
        );
      case 'showroom':
        return (
          <span className="status-badge badge-showroom">
            <Store size={12} /> Showroom Stock
          </span>
        );
      case 'wholesale':
        return (
          <span className="status-badge badge-wholesale">
            <Briefcase size={12} /> Wholesale / Hotel
          </span>
        );
      default:
        return <span className="status-badge">{category}</span>;
    }
  };

  return (
    <div className="customers-page-container">
      {/* =========================================================
          1. STATS OVERVIEW CARDS
          ========================================================= */}
      <div className="stats-grid">
        <StatCard
          title="Total Clients"
          value={stats.total}
          subtitle="Registered customer base"
          icon={Users}
          color="var(--primary)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Outstanding Balances"
          value={formatLKR(stats.totalOutstanding)}
          subtitle={`${stats.withDebtCount} customer(s) with pending balance`}
          icon={AlertTriangle}
          color="var(--warning)"
          bg="var(--warning-tint)"
        />
        <StatCard
          title="Custom Furniture Clients"
          value={stats.customOrdersCount}
          subtitle="Made-to-order projects"
          icon={Hammer}
          color="var(--primary-light)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Fully Settled Accounts"
          value={stats.settledCount}
          subtitle="Zero pending debt"
          icon={CheckCircle}
          color="var(--success)"
          bg="var(--success-tint)"
        />
      </div>

      {/* =========================================================
          2. ADVANCED FILTER & SEARCH PANEL (The Filter Section)
          ========================================================= */}
      <div className="filter-card">
        {/* Row 1: Search Box + Action Buttons */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={18} />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by Name, Mobile, WhatsApp, NIC, or Town..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="filter-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {/* Reset Filters Button */}
            {isFilterActive && (
              <button
                className="btn btn-secondary"
                onClick={handleResetFilters}
                title="Reset all applied filters"
                style={{ padding: '9px 14px', fontSize: '0.84rem' }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            )}

            {/* Export Dropdown (CSV & PDF) */}
            <div className="export-dropdown-wrapper">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                title="Export or Print Customer Ledger"
                style={{ padding: '9px 14px', fontSize: '0.84rem', gap: '6px' }}
              >
                <Download size={15} /> Export <ChevronDown size={14} />
              </button>
              {isExportMenuOpen && (
                <div className="export-menu">
                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      handleExportCSV();
                      setIsExportMenuOpen(false);
                    }}
                  >
                    <FileSpreadsheet size={16} color="var(--cash-in)" />
                    <span>Export as CSV (Excel)</span>
                  </button>
                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      handleExportPDF();
                      setIsExportMenuOpen(false);
                    }}
                  >
                    <Printer size={16} color="var(--accent-gold)" />
                    <span>Export as PDF / Print</span>
                  </button>
                </div>
              )}
            </div>

            {/* + Add New Customer Button */}
            <button
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{ padding: '9px 16px', fontSize: '0.86rem' }}
            >
              <Plus size={16} /> Add Customer
            </button>
          </div>
        </div>

        {/* Row 2: Filter Dropdowns */}
        <div className="filter-row-secondary">
          {/* Debt / Credit Status Filter */}
          <select
            className="filter-select"
            value={debtFilter}
            onChange={(e) => setDebtFilter(e.target.value)}
            title="Filter by Credit/Outstanding balance"
          >
            <option value="all">💳 All Credit Statuses</option>
            <option value="debt">⚠️ With Debt Only</option>
            <option value="settled">✅ Fully Settled</option>
            <option value="high_debt">🚨 High Debt (&gt; Rs. 50k)</option>
          </select>

          {/* Category / Customer Type Filter */}
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            title="Filter by Customer Category"
          >
            <option value="all">🛋️ All Furniture Types</option>
            <option value="custom_order">🛠️ Custom Made (Made-to-Order)</option>
            <option value="showroom">🏬 Showroom / Ready Stock</option>
            <option value="wholesale">🏢 Wholesale / Commercial</option>
          </select>

          {/* City / Area Filter */}
          <select
            className="filter-select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            title="Filter by City/Location"
          >
            <option value="all">📍 All Cities & Towns</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Sort Order Dropdown */}
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort customer directory"
          >
            <option value="recent">🔃 Recently Added</option>
            <option value="debt_desc">💰 Highest Outstanding Debt</option>
            <option value="debt_asc">📉 Lowest Outstanding Debt</option>
            <option value="spent_desc">⭐ Highest Total Spent</option>
            <option value="name_asc">🔤 Name (A to Z)</option>
          </select>
        </div>

        {/* Quick Filter Chips Row */}
        <div className="filter-row-chips">
          <div className="filter-chips-list">
            <span className="filter-chips-label">Quick Filters:</span>

            <button
              className={`filter-chip-btn ${debtFilter === 'all' && categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setDebtFilter('all');
                setCategoryFilter('all');
              }}
            >
              All Clients
              <span className="filter-count-badge">{customers.length}</span>
            </button>

            <button
              className={`filter-chip-btn ${debtFilter === 'debt' ? 'active' : ''}`}
              onClick={() => setDebtFilter(debtFilter === 'debt' ? 'all' : 'debt')}
            >
              <AlertTriangle size={13} color="#f59e0b" />
              Pending Balances
              <span className="filter-count-badge">{stats.withDebtCount}</span>
            </button>

            <button
              className={`filter-chip-btn ${debtFilter === 'settled' ? 'active' : ''}`}
              onClick={() => setDebtFilter(debtFilter === 'settled' ? 'all' : 'settled')}
            >
              <CheckCircle size={13} color="#10b981" />
              Fully Settled
              <span className="filter-count-badge">{stats.settledCount}</span>
            </button>

            <button
              className={`filter-chip-btn ${categoryFilter === 'custom_order' ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'custom_order' ? 'all' : 'custom_order')}
            >
              <Hammer size={13} color="#38bdf8" />
              Custom Orders
              <span className="filter-count-badge">{stats.customOrdersCount}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing <strong style={{ color: 'var(--text-main)' }}>{filteredCustomers.length}</strong> of{' '}
            {customers.length} customers
          </div>
        </div>
      </div>

      {/* =========================================================
          3. CUSTOMER DATA TABLE
          ========================================================= */}
      <div className="table-wrapper">
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Customer Directory & Ledger</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Toggle: Table (with Side Scroll Bar) vs Cards (Full View) */}
            <div className="view-mode-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View (with luxury side scroll bar)"
              >
                <List size={14} /> Table View
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards View (responsive full view without side scrolling)"
              >
                <LayoutGrid size={14} /> Cards View
              </button>
            </div>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="table-empty-state">
            <Filter size={36} color="var(--text-faint)" />
            <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              No customers matched your filter criteria
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '380px' }}>
              Try clearing search terms or resetting the status and location filters.
            </p>
            <button
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ marginTop: '8px', fontSize: '0.82rem' }}
            >
              <RotateCcw size={14} /> Clear All Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ================= OPTION 1: TABLE VIEW (WITH LUXURY SIDE SCROLL BAR) ================= */
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer Details</th>
                  <th>Phone & WhatsApp</th>
                  <th>Location / City</th>
                  <th>Order Type</th>
                  <th>Orders</th>
                  <th>Outstanding Balance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  const balance = Number(cust.outstanding_balance) || 0;
                  const initials = (cust.name || 'C')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const waLink = getWhatsAppLink(cust.whatsapp || cust.phone);

                  return (
                    <tr key={cust.id}>
                      {/* Customer Info */}
                      <td>
                        <div className="table-user-cell">
                          <div className="user-avatar">{initials}</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="customer-name">{cust.name}</span>
                              {cust.customer_id && (
                                <span style={{
                                  background: 'var(--primary-tint)',
                                  color: 'var(--primary)',
                                  padding: '1px 7px',
                                  borderRadius: '5px',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  fontFamily: 'monospace',
                                  border: '1px solid var(--primary-border)',
                                }}>
                                  {cust.customer_id}
                                </span>
                              )}
                            </div>
                            <div className="customer-meta">
                              {cust.nic && <span className="nic-pill">NIC: {cust.nic}</span>}
                              {cust.civil_status && <span className="nic-pill">{cust.civil_status}</span>}
                              {cust.dob && <span className="nic-pill">DOB: {cust.dob}</span>}
                              <span>
                                Added {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : 'Recently'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Direct Contact */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cust.phone}</span>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="icon-btn-action icon-btn-whatsapp"
                              title={`Chat with ${cust.name} on WhatsApp`}
                            >
                              <MessageSquare size={14} />
                            </a>
                          )}
                          <a
                            href={`tel:${cust.phone}`}
                            className="icon-btn-action"
                            title={`Call ${cust.name}`}
                          >
                            <Phone size={14} />
                          </a>
                        </div>
                      </td>

                      {/* City & Address */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color="var(--accent-gold)" />
                          <span style={{ fontWeight: 600 }}>{cust.city || 'Not specified'}</span>
                        </div>
                        {cust.address && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              color: 'var(--text-faint)',
                              marginTop: '2px',
                              maxWidth: '180px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={cust.address}
                          >
                            {cust.address}
                          </span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td>{renderCategoryBadge(cust.category)}</td>

                      {/* Orders Count */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{cust.total_orders || 1}</span>{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>order(s)</span>
                      </td>

                      {/* Outstanding Balance */}
                      <td>
                        {balance > 0 ? (
                          <div>
                            <span className="status-badge badge-debt">
                              <AlertTriangle size={12} /> {formatLKR(balance)}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.72rem',
                                color: 'var(--cash-out)',
                                marginTop: '3px',
                              }}
                            >
                              Payment pending
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="status-badge badge-settled">
                              <CheckCircle size={12} /> Clear (Rs. 0.00)
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.72rem',
                                color: 'var(--cash-in)',
                                marginTop: '3px',
                              }}
                            >
                              Fully Paid
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          {balance > 0 && (
                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                gap: '4px',
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                                color: 'var(--accent-gold)',
                              }}
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setPaymentAmount(String(cust.outstanding_balance));
                                setIsPayModalOpen(true);
                              }}
                              title="Record debt collection/settlement"
                            >
                              <DollarSign size={13} /> Settle
                            </button>
                          )}

                          {/* Edit Customer */}
                          <button
                            className="icon-btn-action"
                            title="Edit Customer Details"
                            onClick={() => handleOpenEdit(cust)}
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            className="icon-btn-action"
                            title="View Customer Profile & History"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="icon-btn-action icon-btn-delete"
                            title="Delete Customer"
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= OPTION 2: CARDS GRID VIEW (FULL VIEW ON ANY SCREEN) ================= */
          <div className="customer-cards-grid">
            {filteredCustomers.map((cust) => {
              const balance = Number(cust.outstanding_balance) || 0;
              const initials = (cust.name || 'C')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const waLink = getWhatsAppLink(cust.whatsapp || cust.phone);

              return (
                <div key={cust.id} className="customer-card-item">
                  <div className="customer-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="user-avatar">{initials}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="customer-name" style={{ fontSize: '0.95rem' }}>{cust.name}</span>
                          {cust.customer_id && (
                            <span style={{
                              background: 'var(--primary-tint)',
                              color: 'var(--primary)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.66rem',
                              fontWeight: '700',
                              fontFamily: 'monospace',
                              border: '1px solid var(--primary-border)',
                            }}>
                              {cust.customer_id}
                            </span>
                          )}
                        </div>
                        <div className="customer-meta">
                          {cust.nic && <span className="nic-pill">NIC: {cust.nic}</span>}
                          {cust.civil_status && <span className="nic-pill">{cust.civil_status}</span>}
                          <span>{cust.city}</span>
                        </div>
                      </div>
                    </div>
                    {renderCategoryBadge(cust.category)}
                  </div>

                  <div className="customer-card-body">
                    {/* Contact & WhatsApp */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Contact:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cust.phone}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="icon-btn-action icon-btn-whatsapp"
                            title="WhatsApp"
                            style={{ width: '28px', height: '28px' }}
                          >
                            <MessageSquare size={13} />
                          </a>
                        )}
                        <a
                          href={`tel:${cust.phone}`}
                          className="icon-btn-action"
                          title="Call"
                          style={{ width: '28px', height: '28px' }}
                        >
                          <Phone size={13} />
                        </a>
                      </div>
                    </div>

                    {/* Address */}
                    {cust.address && (
                      <div className="customer-card-row" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Address:</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'right', maxWidth: '200px' }}>
                          {cust.address}
                        </span>
                      </div>
                    )}

                    {/* Orders & Total Spent */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Orders:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {cust.total_orders || 1} order(s)
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Outstanding:</span>
                      {balance > 0 ? (
                        <span className="status-badge badge-debt">
                          <AlertTriangle size={12} /> {formatLKR(balance)}
                        </span>
                      ) : (
                        <span className="status-badge badge-settled">
                          <CheckCircle size={12} /> Clear (Rs. 0.00)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="customer-card-footer">
                    <div>
                      {balance > 0 && (
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.75rem',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: 'var(--accent-gold)',
                          }}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setPaymentAmount(String(cust.outstanding_balance));
                            setIsPayModalOpen(true);
                          }}
                        >
                          <DollarSign size={13} /> Settle Debt
                        </button>
                      )}
                    </div>

                    <div className="action-btn-group">
                      {/* Edit Customer */}
                      <button
                        className="icon-btn-action"
                        title="Edit Customer Details"
                        onClick={() => handleOpenEdit(cust)}
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        className="icon-btn-action"
                        title="View Customer Profile"
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="icon-btn-action icon-btn-delete"
                        title="Delete Customer"
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          4. MODAL: ADD NEW CUSTOMER
          ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Furniture Customer"
      >
        <form onSubmit={handleAddCustomer}>
          <div className="form-grid">
            {/* Row 1: Customer ID (Branch / Center / Contract / Item) */}
            <CustomerIdBuilder
              values={newCustomer}
              onChange={(key, val) => setNewCustomer((prev) => ({ ...prev, [key]: val }))}
            />

            {/* Existing Customer Auto-Detection Card */}
            {matchedCustomerAlert && (
              <div className="matched-customer-card full-width">
                <div className="matched-customer-header">
                  <div className="matched-customer-badge">
                    <CheckCircle size={15} /> Existing Customer Recognized
                  </div>
                  <button
                    type="button"
                    className="btn-dismiss-match"
                    onClick={handleClearCustomerMatch}
                    title="Treat as New Customer"
                  >
                    <X size={13} /> Reset / New
                  </button>
                </div>
                <div className="matched-customer-body">
                  <div className="matched-customer-name">
                    {matchedCustomerAlert.name}
                    <span className="matched-customer-tag">
                      Previous Purchases: {matchedCustomerAlert.previousCount}
                    </span>
                  </div>
                  <div className="matched-customer-desc">
                    Existing customer recognized. Automatically assigned Contract No <strong>#{matchedCustomerAlert.nextContractNo}</strong> for this purchase item.
                  </div>
                  <div className="matched-customer-meta">
                    {matchedCustomerAlert.phone && <span>📞 {matchedCustomerAlert.phone}</span>}
                    {matchedCustomerAlert.nic && <span>🆔 NIC: {matchedCustomerAlert.nic}</span>}
                    {matchedCustomerAlert.city && <span>📍 {matchedCustomerAlert.city}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Row 2: First Name & Last Name */}
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Sunil"
                value={newCustomer.first_name || ''}
                onChange={(e) => {
                  const fn = e.target.value;
                  setNewCustomer({
                    ...newCustomer,
                    first_name: fn,
                    name: `${fn} ${newCustomer.last_name || ''}`.trim(),
                  });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Jayawardena"
                value={newCustomer.last_name || ''}
                onChange={(e) => {
                  const ln = e.target.value;
                  setNewCustomer({
                    ...newCustomer,
                    last_name: ln,
                    name: `${newCustomer.first_name || ''} ${ln}`.trim(),
                  });
                }}
              />
            </div>

            {/* Row 3: Date of Birth & NIC */}
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                value={newCustomer.dob || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, dob: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">NIC (National Identity Card)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 198512345678 or 851234567V"
                value={newCustomer.nic || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCustomer((prev) => {
                    const next = { ...prev, nic: val };
                    handleCheckExistingCustomer('nic', val, next);
                    return next;
                  });
                }}
              />
            </div>

            {/* Row 4: Phone & WhatsApp */}
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="077XXXXXXX"
                value={newCustomer.phone || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCustomer((prev) => {
                    const next = {
                      ...prev,
                      phone: val,
                      whatsapp: prev.whatsapp && prev.whatsapp !== prev.phone ? prev.whatsapp : val,
                    };
                    handleCheckExistingCustomer('phone', val, next);
                    return next;
                  });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="077XXXXXXX"
                value={newCustomer.whatsapp || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })}
              />
            </div>

            {/* Row 5: City & Civil Status */}
            <div className="form-group">
              <label className="form-label">City / Town</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Maharagama, Kottawa, Negombo"
                value={newCustomer.city || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Civil Status</label>
              <select
                className="form-select-full"
                value={newCustomer.civil_status || 'Single'}
                onChange={(e) => setNewCustomer({ ...newCustomer, civil_status: e.target.value })}
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Customer Category</label>
              <select
                className="form-select-full"
                value={newCustomer.category || 'custom_order'}
                onChange={(e) => setNewCustomer({ ...newCustomer, category: e.target.value })}
              >
                <option value="custom_order">Custom Made Furniture</option>
                <option value="showroom">Showroom / Ready Stock</option>
                <option value="wholesale">Commercial / Wholesale</option>
              </select>
            </div>

            {/* Row 6: Delivery Address */}
            <div className="form-group full-width">
              <label className="form-label">Full Delivery Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="House No, Street, Road, City"
                value={newCustomer.address || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>

            {/* Row 7: Initial Outstanding Balance */}
            <div className="form-group full-width">
              <label className="form-label">Initial Outstanding Balance (LKR)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                min="0"
                step="500"
                value={newCustomer.outstanding_balance ?? ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, outstanding_balance: e.target.value })}
              />
            </div>

            {/* Row 8: Notes */}
            <div className="form-group full-width">
              <label className="form-label">Wood / Furniture Preferences & Notes</label>
              <textarea
                className="form-textarea"
                placeholder="e.g., Requested Teak wood living room suite, delivery promised for October 25th."
                value={newCustomer.notes || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          5. MODAL: VIEW CUSTOMER PROFILE & ORDER HISTORY
          ========================================================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Customer Profile & Ledger"
      >
        {selectedCustomer && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                paddingBottom: '18px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '18px',
              }}
            >
              <div
                className="user-avatar"
                style={{ width: '56px', height: '56px', fontSize: '1.25rem', borderRadius: '14px' }}
              >
                {(selectedCustomer.name || 'C')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedCustomer.name}</h3>
                  {selectedCustomer.customer_id && (
                    <span style={{
                      background: 'var(--primary-tint)',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      border: '1px solid var(--primary-border)',
                    }}>
                      {selectedCustomer.customer_id}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  {renderCategoryBadge(selectedCustomer.category)}
                  {selectedCustomer.civil_status && <span className="nic-pill">Status: {selectedCustomer.civil_status}</span>}
                  {selectedCustomer.dob && <span className="nic-pill">DOB: {selectedCustomer.dob}</span>}
                  {selectedCustomer.nic && <span className="nic-pill">NIC: {selectedCustomer.nic}</span>}
                </div>
              </div>
            </div>

            {/* Quick Contact & Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  background: 'var(--ash-50)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '4px' }}>
                  CONTACT NUMBERS
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedCustomer.phone}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    <Phone size={12} /> Call
                  </a>
                  {getWhatsAppLink(selectedCustomer.whatsapp || selectedCustomer.phone) && (
                    <a
                      href={getWhatsAppLink(selectedCustomer.whatsapp || selectedCustomer.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-success"
                      style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                    >
                      <MessageSquare size={12} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--ash-50)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '4px' }}>
                  LOCATION & DELIVERY
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedCustomer.city || 'N/A'}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedCustomer.address || 'No street address given'}
                </div>
              </div>
            </div>

            {/* Financial Ledger Summary */}
            <div
              style={{
                background: 'var(--ash-100)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  OUTSTANDING CREDIT BALANCE
                </span>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color:
                      Number(selectedCustomer.outstanding_balance) > 0 ? 'var(--cash-out)' : 'var(--cash-in)',
                  }}
                >
                  {formatLKR(selectedCustomer.outstanding_balance)}
                </span>
              </div>

              {Number(selectedCustomer.outstanding_balance) > 0 && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '6px', fontSize: '0.86rem' }}
                  onClick={() => {
                    setPaymentAmount(String(selectedCustomer.outstanding_balance));
                    setIsPayModalOpen(true);
                  }}
                >
                  <DollarSign size={15} /> Collect / Settle Pending Balance
                </button>
              )}
            </div>

            {/* Customer Notes */}
            {selectedCustomer.notes && (
              <div
                style={{
                  background: 'var(--warning-tint)',
                  border: '1px solid var(--warning-border)',
                  padding: '14px',
                  borderRadius: '10px',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: 'var(--accent-gold)',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  <FileText size={14} /> FURNITURE & WOOD NOTES
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                  {selectedCustomer.notes}
                </p>
              </div>
            )}

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ gap: '6px' }}
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedCustomer);
                }}
              >
                <Edit2 size={14} /> Edit Customer Details
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: RECORD PAYMENT / SETTLEMENT
          ========================================================= */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Debt Settlement"
      >
        {selectedCustomer && (
          <form onSubmit={handleRecordPayment}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Recording customer payment for <strong>{selectedCustomer.name}</strong>. Current outstanding
              balance is <strong style={{ color: 'var(--cash-out)' }}>{formatLKR(selectedCustomer.outstanding_balance)}</strong>.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Payment Amount (LKR) *</label>
              <input
                type="number"
                className="form-input"
                required
                min="1"
                max={Number(selectedCustomer.outstanding_balance)}
                step="100"
                placeholder="Enter paid amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPayModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle size={16} /> Confirm Receipt & Update Balance
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: EDIT CUSTOMER DETAILS
          ========================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingCustomer ? `Edit Customer - ${editingCustomer.name}` : 'Edit Customer'}
      >
        {editingCustomer && (
          <form onSubmit={handleUpdateCustomer}>
            <div className="form-grid">
              {/* Row 1: Customer ID (Branch / Center / Contract / Item) */}
              <CustomerIdBuilder
                values={editingCustomer}
                legacyId={editingCustomer.legacy_customer_id}
                onChange={(key, val) => setEditingCustomer((prev) => ({ ...prev, [key]: val }))}
              />

              {/* Row 2: First Name & Last Name */}
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Sunil"
                  value={editingCustomer.first_name || ''}
                  onChange={(e) => {
                    const fn = e.target.value;
                    setEditingCustomer({
                      ...editingCustomer,
                      first_name: fn,
                      name: `${fn} ${editingCustomer.last_name || ''}`.trim(),
                    });
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jayawardena"
                  value={editingCustomer.last_name || ''}
                  onChange={(e) => {
                    const ln = e.target.value;
                    setEditingCustomer({
                      ...editingCustomer,
                      last_name: ln,
                      name: `${editingCustomer.first_name || ''} ${ln}`.trim(),
                    });
                  }}
                />
              </div>

              {/* Row 3: Date of Birth & NIC */}
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-input"
                  value={editingCustomer.dob || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, dob: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">NIC (National Identity Card)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 198512345678 or 851234567V"
                  value={editingCustomer.nic || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, nic: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="077XXXXXXX"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="077XXXXXXX"
                  value={editingCustomer.whatsapp || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, whatsapp: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Civil Status</label>
                <select
                  className="form-select-full"
                  value={editingCustomer.civil_status || 'Single'}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, civil_status: e.target.value })}
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">City / Town</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maharagama, Kottawa, Negombo"
                  value={editingCustomer.city || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Full Delivery Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="House No, Street, Road, City"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Category</label>
                <select
                  className="form-select-full"
                  value={editingCustomer.category || 'custom_order'}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, category: e.target.value })}
                >
                  <option value="custom_order">Custom Made Furniture</option>
                  <option value="showroom">Showroom / Ready Stock</option>
                  <option value="wholesale">Commercial / Wholesale</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Outstanding Balance (LKR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="500"
                  placeholder="0.00"
                  value={editingCustomer.outstanding_balance ?? ''}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      outstanding_balance: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Wood / Furniture Preferences & Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Special customer preferences, wood type, delivery schedule, etc."
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle size={16} /> Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
