import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Camera,
  Upload,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { apiRequest } from '../services/api';
import { INITIAL_CENTERS } from '../utils/centersData';
import { INITIAL_CUSTOMERS } from '../utils/customersData';
import { addLiveNotification } from '../utils/notificationsData';
import {
  validateNic,
  validatePhone,
  validateName,
  validateAmount,
  sanitizeNicInput,
  sanitizePhoneInput,
} from '../utils/validators';

// Helper to compress and convert customer photo to optimized Base64 Data URL (~30-60 KB)
const compressImageFile = (file, maxDim = 600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
  });
};

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

// Seed migration map for default mock customers (Identified primarily by NIC)
const SAMPLE_MIGRATION_MAP = {
  'cust-1': { customer_id: '197814502391', branch_code: 'MHG', center_code: 'C001', nic: '197814502391' },
  'cust-2': { customer_id: '198578901234', branch_code: 'MHG', center_code: 'C002', nic: '198578901234' },
  'cust-3': { customer_id: '196923405678', branch_code: 'MRT', center_code: 'C001', nic: '196923405678' },
  'cust-4': { customer_id: '199412308976', branch_code: 'NGB', center_code: 'C001', nic: '199412308976' },
  'cust-5': { customer_id: '199145607890', branch_code: 'DHW', center_code: 'C001', nic: '199145607890' },
  'cust-6': { customer_id: '197234509812', branch_code: 'CMB', center_code: 'C003', nic: '197234509812' },
};

// Converts customer record to NIC-first identity
const migrateCustomerRecord = (c) => {
  const seed = SAMPLE_MIGRATION_MAP[c.id];
  const cleanNic = c.nic ? String(c.nic).trim().toUpperCase() : (seed?.nic || '');
  const customerId = cleanNic || c.customer_id || '';
  return {
    ...c,
    ...(seed || {}),
    customer_id: customerId,
    nic: cleanNic || c.nic || '',
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

  const count = Math.max(matchingRecords.length, Number(customer.total_orders) || 0);
  const nextContractNo = count + 1;

  return {
    count,
    nextContractNo,
    matchingRecords,
  };
};

export default function CustomersPage({ initialDebtFilter = 'all', selectedCenter = 'all' }) {
  const isOutstandingPage = initialDebtFilter === 'debt';
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
    return INITIAL_CENTERS;
  }, []);

  // Customers List State (with local storage persistence & auto-migration to NIC-first identity)
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

  // File Input Refs for Photo Uploads
  const addPhotoInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);

  // Form State for Add Customer (NIC is the primary identifier)
  const [newCustomer, setNewCustomer] = useState({
    customer_id: '',
    branch_code: 'MHG',
    center_code: 'C001',
    contract_no: '1',
    item_code: '',
    photo: '',
    image_url: '',
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

  // Handlers for Customer Photo selection and automatic compression
  const handleAddPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        setNewCustomer((prev) => ({ ...prev, photo: compressed, image_url: compressed }));
      } catch (err) {
        alert(err.message || 'Error processing customer photo.');
      }
    }
  };

  const handleEditPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        setEditingCustomer((prev) => ({ ...prev, photo: compressed, image_url: compressed }));
      } catch (err) {
        alert(err.message || 'Error processing customer photo.');
      }
    }
  };

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

  // Open Add New Customer Modal (NIC is the primary customer identifier)
  const handleOpenAddModal = () => {
    setMatchedCustomerAlert(null);
    setNewCustomer({
      customer_id: '',
      branch_code: selectedCenter && selectedCenter.includes('/') ? selectedCenter.split('/')[0] : 'MHG',
      center_code: selectedCenter && selectedCenter.includes('/') ? selectedCenter.split('/')[1] : 'C001',
      contract_no: '1',
      item_code: '',
      photo: '',
      image_url: '',
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

      const existingBranch = matched.branch_code || currentCustomerState.branch_code || 'MHG';
      const existingCenter = matched.center_code || currentCustomerState.center_code || 'C001';

      setNewCustomer((prev) => ({
        ...prev,
        photo: matched.photo || matched.image_url || prev.photo || '',
        image_url: matched.photo || matched.image_url || prev.image_url || '',
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

  // Add new customer handler (Identified by NIC)
  const handleAddCustomer = async (e) => {
    e.preventDefault();

    // 1. Validate First Name
    const fnCheck = validateName(newCustomer.first_name || newCustomer.name, 'First Name', true);
    if (!fnCheck.isValid) {
      alert(fnCheck.message);
      return;
    }
    if (newCustomer.last_name) {
      const lnCheck = validateName(newCustomer.last_name, 'Last Name', false);
      if (!lnCheck.isValid) {
        alert(lnCheck.message);
        return;
      }
    }

    // 2. Validate NIC (Sri Lankan 9 digits + V/X or 12 digits)
    const nicCheck = validateNic(newCustomer.nic, true);
    if (!nicCheck.isValid) {
      alert(`NIC Validation Error:\n${nicCheck.message}`);
      return;
    }

    // 3. Validate Phone Number (10 digits starting with 0)
    const phoneCheck = validatePhone(newCustomer.phone, true);
    if (!phoneCheck.isValid) {
      alert(`Phone Number Validation Error:\n${phoneCheck.message}`);
      return;
    }

    // 4. Validate WhatsApp Number (if entered)
    if (newCustomer.whatsapp) {
      const waCheck = validatePhone(newCustomer.whatsapp, false);
      if (!waCheck.isValid) {
        alert(`WhatsApp Number Validation Error:\n${waCheck.message}`);
        return;
      }
    }

    // 5. Validate Outstanding Balance
    if (newCustomer.outstanding_balance) {
      const balCheck = validateAmount(newCustomer.outstanding_balance, 'Initial Outstanding Balance');
      if (!balCheck.isValid) {
        alert(balCheck.message);
        return;
      }
    }

    const cleanNic = nicCheck.cleanNic;
    const cleanPhone = phoneCheck.cleanPhone;
    const cleanWa = newCustomer.whatsapp ? validatePhone(newCustomer.whatsapp, false).cleanPhone : cleanPhone;
    const fullName = `${newCustomer.first_name || ''} ${newCustomer.last_name || ''}`.trim() || newCustomer.name;

    // Check if customer with this NIC already exists
    const existingWithNic = customers.find(
      (c) => normalizeNic(c.nic) === normalizeNic(cleanNic)
    );
    if (existingWithNic && !matchedCustomerAlert) {
      const confirmUse = window.confirm(
        `A customer with NIC "${cleanNic}" already exists (${existingWithNic.name}). Do you want to record this transaction under the existing customer?`
      );
      if (!confirmUse) return;
    }

    const totalOrders = matchedCustomerAlert ? matchedCustomerAlert.previousCount + 1 : 1;
    const assignedCustomerId = cleanNic;

    const createdRecord = {
      id: `cust-${Date.now()}`,
      customer_id: assignedCustomerId,
      branch_code: normalizeIdPart('branch_code', newCustomer.branch_code || 'MHG'),
      center_code: normalizeIdPart('center_code', newCustomer.center_code || 'C001'),
      contract_no: String(totalOrders),
      item_code: '',
      photo: newCustomer.photo || newCustomer.image_url || '',
      image_url: newCustomer.photo || newCustomer.image_url || '',
      first_name: newCustomer.first_name || '',
      last_name: newCustomer.last_name || '',
      name: fullName,
      civil_status: newCustomer.civil_status || 'Single',
      dob: newCustomer.dob || '',
      phone: cleanPhone,
      whatsapp: cleanWa,
      nic: cleanNic,
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

    addLiveNotification({
      title: `Client Registered`,
      desc: `${fullName} (NIC: ${cleanNic}) added to directory at ${createdRecord.branch_code}/${createdRecord.center_code}.`,
      category: 'alerts',
      type: 'info',
      targetTab: 'customer-directory',
    });

    setIsAddModalOpen(false);
    setMatchedCustomerAlert(null);
    setNewCustomer({
      customer_id: '',
      branch_code: '',
      center_code: '',
      contract_no: '1',
      item_code: '',
      photo: '',
      image_url: '',
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

      addLiveNotification({
        title: `Client Removed`,
        desc: `Customer ${name} was deleted from the customer directory.`,
        category: 'alerts',
        type: 'warning',
        targetTab: 'customer-directory',
      });
    }
  };

  // Record payment against customer's outstanding balance
  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (!selectedCustomer) return;

    const currentBal = Number(selectedCustomer.outstanding_balance) || 0;
    if (amount > currentBal) {
      alert(`Payment amount (Rs. ${amount.toLocaleString()}) cannot exceed the customer's outstanding balance of Rs. ${currentBal.toLocaleString()}.`);
      return;
    }

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

    addLiveNotification({
      title: `Payment Collected: Rs. ${amount.toLocaleString()}`,
      desc: `Rs. ${amount.toLocaleString()} received from ${selectedCustomer.name} (NIC: ${selectedCustomer.nic}).`,
      category: 'payments',
      type: 'payment',
      targetTab: 'payments',
    });

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
          <title>D N S Home Solutions - Customer Directory & Credit Ledger Report</title>
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
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:56px;width:56px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;" /><div class="brand-title">D N S HOME SOLUTIONS</div>
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
            <span>D N S Home Solutions System - Confidential Official Ledger</span>
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
    const cleanNic = customer.nic ? String(customer.nic).trim().toUpperCase() : (customer.customer_id || '');
    setEditingCustomer({
      ...customer,
      photo: customer.photo || customer.image_url || '',
      image_url: customer.photo || customer.image_url || '',
      customer_id: cleanNic,
      nic: cleanNic,
      first_name: firstName,
      last_name: lastName,
      name: customer.name || `${firstName} ${lastName}`.trim(),
      civil_status: customer.civil_status || 'Single',
      dob: customer.dob || '',
      branch_code: customer.branch_code || 'MHG',
      center_code: customer.center_code || 'C001',
    });
    setIsEditModalOpen(true);
  };

  // Save Updated Customer Details (Identified by NIC)
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();

    // 1. Validate First Name & Last Name
    const fnCheck = validateName(editingCustomer.first_name || editingCustomer.name, 'First Name', true);
    if (!fnCheck.isValid) {
      alert(fnCheck.message);
      return;
    }
    if (editingCustomer.last_name) {
      const lnCheck = validateName(editingCustomer.last_name, 'Last Name', false);
      if (!lnCheck.isValid) {
        alert(lnCheck.message);
        return;
      }
    }

    // 2. Validate NIC (Sri Lankan 9 digits + V/X or 12 digits)
    const nicCheck = validateNic(editingCustomer.nic, true);
    if (!nicCheck.isValid) {
      alert(`NIC Validation Error:\n${nicCheck.message}`);
      return;
    }

    // 3. Validate Phone Number (10 digits starting with 0)
    const phoneCheck = validatePhone(editingCustomer.phone, true);
    if (!phoneCheck.isValid) {
      alert(`Phone Number Validation Error:\n${phoneCheck.message}`);
      return;
    }

    // 4. Validate WhatsApp Number (if entered)
    if (editingCustomer.whatsapp) {
      const waCheck = validatePhone(editingCustomer.whatsapp, false);
      if (!waCheck.isValid) {
        alert(`WhatsApp Number Validation Error:\n${waCheck.message}`);
        return;
      }
    }

    // 5. Validate Outstanding Balance
    if (editingCustomer.outstanding_balance) {
      const balCheck = validateAmount(editingCustomer.outstanding_balance, 'Outstanding Balance');
      if (!balCheck.isValid) {
        alert(balCheck.message);
        return;
      }
    }

    const cleanNic = nicCheck.cleanNic;
    const cleanPhone = phoneCheck.cleanPhone;
    const cleanWa = editingCustomer.whatsapp ? validatePhone(editingCustomer.whatsapp, false).cleanPhone : cleanPhone;
    const fullName = `${editingCustomer.first_name || ''} ${editingCustomer.last_name || ''}`.trim() || editingCustomer.name;

    if (
      customers.some(
        (c) => c.id !== editingCustomer.id && normalizeNic(c.nic) === normalizeNic(cleanNic)
      )
    ) {
      alert(`Another customer with NIC "${cleanNic}" already exists.`);
      return;
    }

    const { legacy_customer_id: _legacyId, ...editingData } = editingCustomer;
    const updated = {
      ...editingData,
      photo: editingCustomer.photo || editingCustomer.image_url || '',
      image_url: editingCustomer.photo || editingCustomer.image_url || '',
      name: fullName,
      first_name: editingCustomer.first_name || '',
      last_name: editingCustomer.last_name || '',
      customer_id: cleanNic,
      nic: cleanNic,
      phone: cleanPhone,
      whatsapp: cleanWa,
      branch_code: normalizeIdPart('branch_code', editingCustomer.branch_code || 'MHG'),
      center_code: normalizeIdPart('center_code', editingCustomer.center_code || 'C001'),
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
        return (
          <span className="status-badge badge-showroom">
            <Store size={12} /> {category ? category.replace('_', ' ') : 'Showroom Order'}
          </span>
        );
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
                  {isOutstandingPage && <th>Outstanding Balance</th>}
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
                          {cust.photo || cust.image_url ? (
                            <img
                              src={cust.photo || cust.image_url}
                              alt={cust.name}
                              className="user-avatar"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid #BFDBFE',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div className="user-avatar">{initials}</div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="customer-name">{cust.name}</span>
                              {(cust.nic || cust.customer_id) && (
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
                                  🆔 NIC: {cust.nic || cust.customer_id}
                                </span>
                              )}
                            </div>
                            <div className="customer-meta">
                              {cust.center_code && (
                                <span className="nic-pill">
                                  📍 {cust.branch_code ? `${cust.branch_code}/${cust.center_code}` : cust.center_code}
                                </span>
                              )}
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

                      {/* Outstanding Balance (Only when on Outstanding Balances page) */}
                      {isOutstandingPage && (
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
                      )}

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          {isOutstandingPage && balance > 0 && (
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
                      {cust.photo || cust.image_url ? (
                        <img
                          src={cust.photo || cust.image_url}
                          alt={cust.name}
                          className="user-avatar"
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid #BFDBFE',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div className="user-avatar">{initials}</div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="customer-name" style={{ fontSize: '0.95rem' }}>{cust.name}</span>
                          {(cust.nic || cust.customer_id) && (
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
                              🆔 NIC: {cust.nic || cust.customer_id}
                            </span>
                          )}
                        </div>
                        <div className="customer-meta">
                          {cust.center_code && (
                            <span className="nic-pill">
                              📍 {cust.branch_code ? `${cust.branch_code}/${cust.center_code}` : cust.center_code}
                            </span>
                          )}
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

                    {/* Orders & Total Spent (Only on Outstanding Balances page) */}
                    {isOutstandingPage && (
                      <div className="customer-card-row">
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Orders:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {cust.total_orders || 1} order(s)
                        </span>
                      </div>
                    )}

                    {/* Balance (Only on Outstanding Balances page) */}
                    {isOutstandingPage && (
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
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="customer-card-footer">
                    <div>
                      {isOutstandingPage && balance > 0 && (
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
                    Customer profile recognized by NIC or phone number. Details have been automatically populated.
                  </div>
                  <div className="matched-customer-meta">
                    {matchedCustomerAlert.phone && <span>📞 {matchedCustomerAlert.phone}</span>}
                    {matchedCustomerAlert.nic && <span>🆔 NIC: {matchedCustomerAlert.nic}</span>}
                    {matchedCustomerAlert.city && <span>📍 {matchedCustomerAlert.city}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Profile Photo Upload */}
            <div
              className="form-group full-width"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1.5px dashed #CBD5E1',
                marginBottom: '4px',
              }}
            >
              {/* Photo Preview Circle */}
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#EFF6FF',
                  border: '2px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onClick={() => addPhotoInputRef.current?.click()}
                title="Click to select or change customer photo"
              >
                {newCustomer.photo ? (
                  <img
                    src={newCustomer.photo}
                    alt="Customer Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#1E4D8C' }}>
                    <Camera size={22} style={{ margin: '0 auto', display: 'block' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '2px', display: 'block' }}>Photo</span>
                  </div>
                )}
              </div>

              {/* Upload Actions & Help Text */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                  <ImageIcon size={15} color="#2563EB" /> Customer Profile Photo
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                  Upload client face photo (JPG, PNG, WebP). Optimized & stored in system database.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px', borderRadius: '6px' }}
                    onClick={() => addPhotoInputRef.current?.click()}
                  >
                    <Upload size={13} /> {newCustomer.photo ? 'Change Photo' : 'Upload Customer Photo'}
                  </button>

                  {newCustomer.photo && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '4px', borderRadius: '6px' }}
                      onClick={() => setNewCustomer((prev) => ({ ...prev, photo: '', image_url: '' }))}
                      title="Remove uploaded photo"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={addPhotoInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAddPhotoChange}
                />
              </div>
            </div>

            {/* Row 1: First Name & Last Name */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>First Name *</span>
                {newCustomer.first_name && (
                  <span className={`validation-status-pill ${validateName(newCustomer.first_name, 'First Name').isValid ? 'valid' : 'invalid'}`}>
                    {validateName(newCustomer.first_name, 'First Name').isValid ? '✓ Valid' : 'Invalid'}
                  </span>
                )}
              </label>
              <input
                type="text"
                className={`form-input ${newCustomer.first_name ? (validateName(newCustomer.first_name, 'First Name').isValid ? 'is-valid' : 'is-invalid') : ''}`}
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
              {newCustomer.first_name && !validateName(newCustomer.first_name, 'First Name').isValid && (
                <div className="validation-hint error">
                  <AlertCircle size={12} /> {validateName(newCustomer.first_name, 'First Name').message}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Last Name</span>
                {newCustomer.last_name && (
                  <span className={`validation-status-pill ${validateName(newCustomer.last_name, 'Last Name', false).isValid ? 'valid' : 'invalid'}`}>
                    {validateName(newCustomer.last_name, 'Last Name', false).isValid ? '✓ Valid' : 'Invalid'}
                  </span>
                )}
              </label>
              <input
                type="text"
                className={`form-input ${newCustomer.last_name ? (validateName(newCustomer.last_name, 'Last Name', false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
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
              {newCustomer.last_name && !validateName(newCustomer.last_name, 'Last Name', false).isValid && (
                <div className="validation-hint error">
                  <AlertCircle size={12} /> {validateName(newCustomer.last_name, 'Last Name', false).message}
                </div>
              )}
            </div>

            {/* Row 2: NIC & Phone Number */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>NIC (National Identity Card) *</span>
                {newCustomer.nic && (
                  <span className={`validation-status-pill ${validateNic(newCustomer.nic).isValid ? 'valid' : 'invalid'}`}>
                    {validateNic(newCustomer.nic).isValid ? '✓ Valid NIC' : 'Invalid NIC'}
                  </span>
                )}
              </label>
              <input
                type="text"
                className={`form-input ${newCustomer.nic ? (validateNic(newCustomer.nic).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                required
                maxLength={12}
                placeholder="e.g. 198512345678 or 851234567V"
                value={newCustomer.nic || ''}
                onChange={(e) => {
                  const val = sanitizeNicInput(e.target.value);
                  setNewCustomer((prev) => {
                    const next = { ...prev, nic: val, customer_id: val.trim().toUpperCase() };
                    handleCheckExistingCustomer('nic', val, next);
                    return next;
                  });
                }}
              />
              <div
                className={`validation-hint ${newCustomer.nic ? (validateNic(newCustomer.nic).isValid ? 'success' : 'error') : ''}`}
                style={{ color: newCustomer.nic ? undefined : 'var(--text-muted)' }}
              >
                {newCustomer.nic ? (
                  <>
                    {validateNic(newCustomer.nic).isValid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    <span>{validateNic(newCustomer.nic).message}</span>
                  </>
                ) : (
                  <span>Format: 10 chars (9 digits + V/X) or 12 digits</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Phone Number *</span>
                {newCustomer.phone && (
                  <span className={`validation-status-pill ${validatePhone(newCustomer.phone).isValid ? 'valid' : 'invalid'}`}>
                    {validatePhone(newCustomer.phone).isValid ? '✓ 10 Digits' : `${newCustomer.phone.length}/10 Digits`}
                  </span>
                )}
              </label>
              <input
                type="tel"
                className={`form-input ${newCustomer.phone ? (validatePhone(newCustomer.phone).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                required
                maxLength={10}
                placeholder="07XXXXXXXX (10 digits)"
                value={newCustomer.phone || ''}
                onChange={(e) => {
                  const val = sanitizePhoneInput(e.target.value);
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
              <div
                className={`validation-hint ${newCustomer.phone ? (validatePhone(newCustomer.phone).isValid ? 'success' : 'error') : ''}`}
                style={{ color: newCustomer.phone ? undefined : 'var(--text-muted)' }}
              >
                {newCustomer.phone ? (
                  <>
                    {validatePhone(newCustomer.phone).isValid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    <span>{validatePhone(newCustomer.phone).message}</span>
                  </>
                ) : (
                  <span>10 digits without letters, starting with 0 (e.g. 077XXXXXXX)</span>
                )}
              </div>
            </div>

            {/* Row 3: WhatsApp Number & Date of Birth */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>WhatsApp Number</span>
                {newCustomer.whatsapp && (
                  <span className={`validation-status-pill ${validatePhone(newCustomer.whatsapp, false).isValid ? 'valid' : 'invalid'}`}>
                    {validatePhone(newCustomer.whatsapp, false).isValid ? '✓ 10 Digits' : `${newCustomer.whatsapp.length}/10`}
                  </span>
                )}
              </label>
              <input
                type="tel"
                className={`form-input ${newCustomer.whatsapp ? (validatePhone(newCustomer.whatsapp, false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                maxLength={10}
                placeholder="07XXXXXXXX (Optional)"
                value={newCustomer.whatsapp || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: sanitizePhoneInput(e.target.value) })}
              />
              {newCustomer.whatsapp && !validatePhone(newCustomer.whatsapp, false).isValid && (
                <div className="validation-hint error">
                  <AlertTriangle size={12} /> {validatePhone(newCustomer.whatsapp, false).message}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                max={new Date().toISOString().split('T')[0]}
                value={newCustomer.dob || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, dob: e.target.value })}
              />
            </div>

            {/* Row 4: Assigned Center & Customer Category */}
            <div className="form-group">
              <label className="form-label">Assigned Center</label>
              <select
                className="form-select-full"
                value={`${newCustomer.branch_code || 'MHG'}/${newCustomer.center_code || 'C001'}`}
                onChange={(e) => {
                  const parts = e.target.value.split('/');
                  setNewCustomer((prev) => ({
                    ...prev,
                    branch_code: parts[0] || 'MHG',
                    center_code: parts[1] || 'C001',
                  }));
                }}
              >
                {availableCenters.map((cntr) => {
                  const val = `${cntr.branch_code}/${cntr.center_code}`;
                  return (
                    <option key={cntr.id || val} value={val}>
                      {cntr.branch_code}/{cntr.center_code} — {cntr.name} ({cntr.city})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
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
              {selectedCustomer.photo || selectedCustomer.image_url ? (
                <img
                  src={selectedCustomer.photo || selectedCustomer.image_url}
                  alt={selectedCustomer.name}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '2px solid var(--primary-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  className="user-avatar"
                  style={{ width: '60px', height: '60px', fontSize: '1.25rem', borderRadius: '16px', flexShrink: 0 }}
                >
                  {(selectedCustomer.name || 'C')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedCustomer.name}</h3>
                  {(selectedCustomer.nic || selectedCustomer.customer_id) && (
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
                      🆔 NIC: {selectedCustomer.nic || selectedCustomer.customer_id}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  {renderCategoryBadge(selectedCustomer.category)}
                  {selectedCustomer.center_code && (
                    <span className="nic-pill">
                      📍 Center: {selectedCustomer.branch_code ? `${selectedCustomer.branch_code}/${selectedCustomer.center_code}` : selectedCustomer.center_code}
                    </span>
                  )}
                  {selectedCustomer.civil_status && <span className="nic-pill">Status: {selectedCustomer.civil_status}</span>}
                  {selectedCustomer.dob && <span className="nic-pill">DOB: {selectedCustomer.dob}</span>}
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
              {/* Customer Profile Photo Upload */}
            <div
              className="form-group full-width"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1.5px dashed #CBD5E1',
                marginBottom: '4px',
              }}
            >
              {/* Photo Preview Circle */}
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#EFF6FF',
                  border: '2px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onClick={() => editPhotoInputRef.current?.click()}
                title="Click to select or change customer photo"
              >
                {editingCustomer.photo ? (
                  <img
                    src={editingCustomer.photo}
                    alt="Customer Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#1E4D8C' }}>
                    <Camera size={22} style={{ margin: '0 auto', display: 'block' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '2px', display: 'block' }}>Photo</span>
                  </div>
                )}
              </div>

              {/* Upload Actions & Help Text */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                  <ImageIcon size={15} color="#2563EB" /> Customer Profile Photo
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                  Upload client face photo (JPG, PNG, WebP). Optimized & stored in system database.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px', borderRadius: '6px' }}
                    onClick={() => editPhotoInputRef.current?.click()}
                  >
                    <Upload size={13} /> {editingCustomer.photo ? 'Change Photo' : 'Upload Customer Photo'}
                  </button>

                  {editingCustomer.photo && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '4px', borderRadius: '6px' }}
                      onClick={() => setEditingCustomer((prev) => ({ ...prev, photo: '', image_url: '' }))}
                      title="Remove uploaded photo"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={editPhotoInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleEditPhotoChange}
                />
              </div>
            </div>

            {/* Row 1: First Name & Last Name */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>First Name *</span>
                  {editingCustomer.first_name && (
                    <span className={`validation-status-pill ${validateName(editingCustomer.first_name, 'First Name').isValid ? 'valid' : 'invalid'}`}>
                      {validateName(editingCustomer.first_name, 'First Name').isValid ? '✓ Valid' : 'Invalid'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className={`form-input ${editingCustomer.first_name ? (validateName(editingCustomer.first_name, 'First Name').isValid ? 'is-valid' : 'is-invalid') : ''}`}
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
                {editingCustomer.first_name && !validateName(editingCustomer.first_name, 'First Name').isValid && (
                  <div className="validation-hint error">
                    <AlertCircle size={12} /> {validateName(editingCustomer.first_name, 'First Name').message}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Last Name</span>
                  {editingCustomer.last_name && (
                    <span className={`validation-status-pill ${validateName(editingCustomer.last_name, 'Last Name', false).isValid ? 'valid' : 'invalid'}`}>
                      {validateName(editingCustomer.last_name, 'Last Name', false).isValid ? '✓ Valid' : 'Invalid'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className={`form-input ${editingCustomer.last_name ? (validateName(editingCustomer.last_name, 'Last Name', false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
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
                {editingCustomer.last_name && !validateName(editingCustomer.last_name, 'Last Name', false).isValid && (
                  <div className="validation-hint error">
                    <AlertCircle size={12} /> {validateName(editingCustomer.last_name, 'Last Name', false).message}
                  </div>
                )}
              </div>

              {/* Row 2: NIC & Phone Number */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>NIC (National Identity Card) *</span>
                  {editingCustomer.nic && (
                    <span className={`validation-status-pill ${validateNic(editingCustomer.nic).isValid ? 'valid' : 'invalid'}`}>
                      {validateNic(editingCustomer.nic).isValid ? '✓ Valid NIC' : 'Invalid NIC'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className={`form-input ${editingCustomer.nic ? (validateNic(editingCustomer.nic).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                  required
                  maxLength={12}
                  placeholder="e.g. 198512345678 or 851234567V"
                  value={editingCustomer.nic || ''}
                  onChange={(e) => {
                    const val = sanitizeNicInput(e.target.value);
                    setEditingCustomer({
                      ...editingCustomer,
                      nic: val,
                      customer_id: val.trim().toUpperCase(),
                    });
                  }}
                />
                <div
                  className={`validation-hint ${editingCustomer.nic ? (validateNic(editingCustomer.nic).isValid ? 'success' : 'error') : ''}`}
                  style={{ color: editingCustomer.nic ? undefined : 'var(--text-muted)' }}
                >
                  {editingCustomer.nic ? (
                    <>
                      {validateNic(editingCustomer.nic).isValid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      <span>{validateNic(editingCustomer.nic).message}</span>
                    </>
                  ) : (
                    <span>Format: 10 chars (9 digits + V/X) or 12 digits</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Phone Number *</span>
                  {editingCustomer.phone && (
                    <span className={`validation-status-pill ${validatePhone(editingCustomer.phone).isValid ? 'valid' : 'invalid'}`}>
                      {validatePhone(editingCustomer.phone).isValid ? '✓ 10 Digits' : `${editingCustomer.phone.length}/10 Digits`}
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  className={`form-input ${editingCustomer.phone ? (validatePhone(editingCustomer.phone).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                  required
                  maxLength={10}
                  placeholder="07XXXXXXXX (10 digits)"
                  value={editingCustomer.phone || ''}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      phone: sanitizePhoneInput(e.target.value),
                    })
                  }
                />
                <div
                  className={`validation-hint ${editingCustomer.phone ? (validatePhone(editingCustomer.phone).isValid ? 'success' : 'error') : ''}`}
                  style={{ color: editingCustomer.phone ? undefined : 'var(--text-muted)' }}
                >
                  {editingCustomer.phone ? (
                    <>
                      {validatePhone(editingCustomer.phone).isValid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      <span>{validatePhone(editingCustomer.phone).message}</span>
                    </>
                  ) : (
                    <span>10 digits without letters, starting with 0 (e.g. 077XXXXXXX)</span>
                  )}
                </div>
              </div>

              {/* Row 3: WhatsApp Number & Date of Birth */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>WhatsApp Number</span>
                  {editingCustomer.whatsapp && (
                    <span className={`validation-status-pill ${validatePhone(editingCustomer.whatsapp, false).isValid ? 'valid' : 'invalid'}`}>
                      {validatePhone(editingCustomer.whatsapp, false).isValid ? '✓ 10 Digits' : `${editingCustomer.whatsapp.length}/10`}
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  className={`form-input ${editingCustomer.whatsapp ? (validatePhone(editingCustomer.whatsapp, false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                  maxLength={10}
                  placeholder="07XXXXXXXX (Optional)"
                  value={editingCustomer.whatsapp || ''}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      whatsapp: sanitizePhoneInput(e.target.value),
                    })
                  }
                />
                {editingCustomer.whatsapp && !validatePhone(editingCustomer.whatsapp, false).isValid && (
                  <div className="validation-hint error">
                    <AlertTriangle size={12} /> {validatePhone(editingCustomer.whatsapp, false).message}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-input"
                  max={new Date().toISOString().split('T')[0]}
                  value={editingCustomer.dob || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, dob: e.target.value })}
                />
              </div>

              {/* Row 4: Assigned Center & Customer Category */}
              <div className="form-group">
                <label className="form-label">Assigned Center</label>
                <select
                  className="form-select-full"
                  value={`${editingCustomer.branch_code || 'MHG'}/${editingCustomer.center_code || 'C001'}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('/');
                    setEditingCustomer((prev) => ({
                      ...prev,
                      branch_code: parts[0] || 'MHG',
                      center_code: parts[1] || 'C001',
                    }));
                  }}
                >
                  {availableCenters.map((cntr) => {
                    const val = `${cntr.branch_code}/${cntr.center_code}`;
                    return (
                      <option key={cntr.id || val} value={val}>
                        {cntr.branch_code}/{cntr.center_code} — {cntr.name} ({cntr.city})
                      </option>
                    );
                  })}
                </select>
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

              {/* Row 5: City & Civil Status */}
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

              {/* Row 6: Delivery Address */}
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

              {/* Row 7: Outstanding Balance */}
              <div className="form-group full-width">
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
