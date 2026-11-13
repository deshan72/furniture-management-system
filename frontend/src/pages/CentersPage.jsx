import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  Download,
  Printer,
  MapPin,
  Phone,
  User,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  FileSpreadsheet,
  LayoutGrid,
  List,
  ChevronDown,
  Store,
  Users,
  UserPlus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { printHtmlDocument } from '../utils/printUtils';
import { apiRequest } from '../services/api';
import { loadSavedCustomers, saveCustomersToStorage } from '../utils/customersData';
import { addLiveNotification } from '../utils/notificationsData';
import {
  validateNic,
  validatePhone,
  validateName,
  validateAmount,
  sanitizeNicInput,
  sanitizePhoneInput,
} from '../utils/validators';

// Visual branch identity themes (Colors & Hub names)
const BRANCH_THEMES = {
  MHG: { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD', label: 'Maharagama Hub' },
  MRT: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'Moratuwa Workshop' },
  NGB: { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', label: 'Negombo Coastal' },
  DHW: { bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE', label: 'Dehiwala Urban' },
  CMB: { bg: '#E8F1FA', color: '#1E4D8C', border: '#C6DCF2', label: 'Colombo Central' },
  KDY: { bg: '#FCE7F3', color: '#BE185D', border: '#FBCFE8', label: 'Kandy Hill' },
  GAL: { bg: '#CCFBF1', color: '#0F766E', border: '#99F6E4', label: 'Galle Southern' },
  KRN: { bg: '#FEF9C3', color: '#A16207', border: '#FEF08A', label: 'Kurunegala Hub' },
  GMP: { bg: '#F1F5F9', color: '#334155', border: '#CBD5E1', label: 'Gampaha Hub' },
};

const getBranchTheme = (branchCode) => {
  const code = String(branchCode || '').toUpperCase();
  return (
    BRANCH_THEMES[code] || {
      bg: '#F1F5F9',
      color: '#334155',
      border: '#CBD5E1',
      label: `${code} Branch`,
    }
  );
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

// Default seed centers
const INITIAL_CENTERS = [
  {
    id: 'cntr-1',
    center_code: 'C001',
    branch_code: 'MHG',
    name: 'Maharagama Main Center',
    name_si: '',
    city: 'Maharagama',
    address: 'No. 120, High Level Road, Maharagama',
    contact_person: 'Sarath Gunawardena',
    phone: '0772345671',
    status: 'active',
    notes: 'Main distribution and client service center for Colombo South.',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'cntr-2',
    center_code: 'C002',
    branch_code: 'MHG',
    name: 'Kottawa Town Center',
    name_si: '',
    city: 'Kottawa',
    address: '45, Kottawa Road, Kottawa',
    contact_person: 'Nuwan Perera',
    phone: '0715566778',
    status: 'active',
    notes: 'Sub-center covering Kottawa, Homagama and Pannipitiya areas.',
    created_at: '2026-08-25T11:30:00Z',
  },
  {
    id: 'cntr-3',
    center_code: 'C001',
    branch_code: 'MRT',
    name: 'Moratuwa Woodcraft Center',
    name_si: '',
    city: 'Moratuwa',
    address: '88, Galle Road, Rawathawatta, Moratuwa',
    contact_person: 'Nalaka Fernando',
    phone: '0768899001',
    status: 'active',
    notes: 'Primary workshop hub and timber showroom center.',
    created_at: '2026-07-15T08:45:00Z',
  },
  {
    id: 'cntr-4',
    center_code: 'C001',
    branch_code: 'NGB',
    name: 'Negombo Coastal Center',
    name_si: '',
    city: 'Negombo',
    address: '24/B, Lewis Place, Negombo',
    contact_person: 'Rohan Silva',
    phone: '0704455667',
    status: 'active',
    notes: 'Hotel & commercial resort projects liaison center.',
    created_at: '2026-09-01T10:15:00Z',
  },
  {
    id: 'cntr-5',
    center_code: 'C001',
    branch_code: 'DHW',
    name: 'Dehiwala Urban Center',
    name_si: '',
    city: 'Dehiwala',
    address: '104, Hill Street, Dehiwala',
    contact_person: 'Dinesh Kumara',
    phone: '0785566778',
    status: 'active',
    notes: 'Covers retail showroom stock and office furniture inquiries.',
    created_at: '2026-09-18T14:20:00Z',
  },
  {
    id: 'cntr-6',
    center_code: 'C003',
    branch_code: 'CMB',
    name: 'Colombo Central Center',
    name_si: '',
    city: 'Colombo',
    address: '56/1, Havelock Road, Colombo 05',
    contact_person: 'Chaminda Wickrama',
    phone: '0751122334',
    status: 'active',
    notes: 'High-end custom interior designs & residential projects.',
    created_at: '2026-10-05T13:00:00Z',
  },
];

export default function CentersPage({
  initialOpenCreate = false,
  initialOpenAddClient = false,
  headerCenter = 'all',
  onNavigate,
}) {
  // Centers List State with localStorage persistence
  const [centers, setCenters] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_centers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize legacy 2-digit center codes (e.g. C01 -> C001)
          return parsed.map((c) => ({
            ...c,
            center_code: formatCenterCode(c.center_code || 'C001'),
          }));
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_CENTERS;
  });

  // Customers State (synchronized with localStorage)
  const [customers, setCustomers] = useState(() => loadSavedCustomers());

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('branch_asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialOpenCreate);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);

  // Add Client to Center Modal States
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(initialOpenAddClient);
  const [targetCenterForClient, setTargetCenterForClient] = useState(null);
  const [clientModalTab, setClientModalTab] = useState('new'); // 'new' | 'existing'
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [assignmentFeedback, setAssignmentFeedback] = useState(null);

  const [newClientForm, setNewClientForm] = useState({
    first_name: '',
    last_name: '',
    nic: '',
    phone: '',
    whatsapp: '',
    dob: '',
    city: 'Maharagama',
    address: '',
    civil_status: 'Single',
    category: 'custom_order',
    outstanding_balance: '',
    notes: '',
  });

  // Sync initialOpenAddClient prop
  useEffect(() => {
    if (initialOpenAddClient) {
      setTargetCenterForClient(centers[0] || null);
      setAssignmentFeedback(null);
      setIsAddClientModalOpen(true);
    }
  }, [initialOpenAddClient, centers]);

  // Sync external customer changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e || e.key === 'dnd_customers_list') {
        setCustomers(loadSavedCustomers());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Form State for Add Center
  const [newCenter, setNewCenter] = useState({
    center_code: '',
    branch_code: 'MHG',
    name: '',
    name_si: '',
    city: 'Maharagama',
    address: '',
    contact_person: '',
    phone: '',
    status: 'active',
    notes: '',
  });

  // Save centers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dnd_centers_list', JSON.stringify(centers));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [centers]);

  // Try fetching centers from backend API
  useEffect(() => {
    let isMounted = true;
    apiRequest('/centers')
      .then((res) => {
        if (isMounted && res && res.data && res.data.length > 0) {
          setCenters(res.data);
        }
      })
      .catch(() => {
        // Fallback already loaded
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute customers linked to a center
  const getCustomersForCenter = useCallback((center) => {
    if (!center) return [];
    const targetBranch = String(center.branch_code || '').toUpperCase();
    const targetCenter = formatCenterCode(center.center_code);
    return customers.filter((c) => {
      const parts = String(c.customer_id || '').split('/');
      const bCode = (c.branch_code || (parts.length === 4 ? parts[0] : '')).toUpperCase();
      const cCode = formatCenterCode(c.center_code || (parts.length === 4 ? parts[1] : ''));
      return bCode === targetBranch && cCode === targetCenter;
    });
  }, [customers]);

  // Unique branches for filter dropdown
  const availableBranches = useMemo(() => {
    const branches = new Set();
    centers.forEach((c) => {
      if (c.branch_code) branches.add(c.branch_code.toUpperCase());
    });
    return Array.from(branches).sort();
  }, [centers]);

  // KPI Statistics
  const stats = useMemo(() => {
    const total = centers.length;
    const activeCenters = centers.filter((c) => c.status === 'active').length;
    const uniqueBranches = new Set(centers.map((c) => c.branch_code?.toUpperCase())).size;
    const totalClientsCount = customers.length;

    return {
      total,
      activeCenters,
      uniqueBranches,
      totalClientsCount,
    };
  }, [centers, customers]);

  // Filtered & Sorted Centers
  const filteredCenters = useMemo(() => {
    return centers
      .filter((cntr) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            cntr.name?.toLowerCase().includes(q) ||
            cntr.name_si?.toLowerCase().includes(q) ||
            cntr.center_code?.toLowerCase().includes(q) ||
            cntr.branch_code?.toLowerCase().includes(q) ||
            cntr.city?.toLowerCase().includes(q) ||
            cntr.contact_person?.toLowerCase().includes(q) ||
            cntr.phone?.toLowerCase().includes(q) ||
            cntr.address?.toLowerCase().includes(q) ||
            cntr.notes?.toLowerCase().includes(q);

          if (!matches) return false;
        }

        if (branchFilter !== 'all' && cntr.branch_code?.toUpperCase() !== branchFilter.toUpperCase()) {
          return false;
        }

        if (statusFilter !== 'all' && cntr.status !== statusFilter) {
          return false;
        }

        // Global Center Filter from Header
        if (headerCenter && headerCenter !== 'all') {
          if (headerCenter.includes('/')) {
            const [selB, selC] = headerCenter.split('/');
            if (
              cntr.branch_code?.toUpperCase() !== selB.toUpperCase() ||
              formatCenterCode(cntr.center_code) !== formatCenterCode(selC)
            ) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'clients_desc') {
          return getCustomersForCenter(b).length - getCustomersForCenter(a).length;
        }
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'recent') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        // 'branch_asc' default
        const brCmp = (a.branch_code || '').localeCompare(b.branch_code || '');
        if (brCmp !== 0) return brCmp;
        return (a.center_code || '').localeCompare(b.center_code || '');
      });
  }, [centers, searchQuery, branchFilter, statusFilter, sortBy, getCustomersForCenter, headerCenter]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setBranchFilter('all');
    setStatusFilter('all');
    setSortBy('branch_asc');
  };

  const isFilterActive =
    searchQuery.trim() !== '' || branchFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'branch_asc';

  // Handle Create Center
  const handleAddCenter = async (e) => {
    e.preventDefault();
    const rawCenter = String(newCenter.center_code || '').trim();
    const cCode = formatCenterCode(rawCenter);
    const bCode = String(newCenter.branch_code || '').trim().toUpperCase();

    if (!cCode) {
      alert('Please enter a Center Code (e.g. C001, C002).');
      return;
    }
    if (!bCode) {
      alert('Please enter a Branch Code (e.g. MHG, MRT).');
      return;
    }
    if (!newCenter.name.trim()) {
      alert('Please enter Center Name.');
      return;
    }

    if (newCenter.phone) {
      const pCheck = validatePhone(newCenter.phone, false);
      if (!pCheck.isValid) {
        alert(`Center Contact Phone Error:\n${pCheck.message}`);
        return;
      }
    }

    // Check duplicate center within same branch
    const exists = centers.some(
      (c) => c.branch_code?.toUpperCase() === bCode && formatCenterCode(c.center_code) === cCode
    );
    if (exists) {
      alert(`Center Code "${cCode}" already exists for Branch "${bCode}". Please choose another code.`);
      return;
    }

    const createdRecord = {
      id: `cntr-${Date.now()}`,
      center_code: cCode,
      branch_code: bCode,
      name: newCenter.name.trim(),
      name_si: newCenter.name_si.trim() || '',
      city: newCenter.city.trim() || 'Maharagama',
      address: newCenter.address.trim() || '',
      contact_person: newCenter.contact_person.trim() || '',
      phone: newCenter.phone.trim() || '',
      status: newCenter.status || 'active',
      notes: newCenter.notes.trim() || '',
      created_at: new Date().toISOString(),
    };

    // Try sending to backend API
    try {
      await apiRequest('/centers', {
        method: 'POST',
        body: JSON.stringify(createdRecord),
      });
    } catch {
      // Local state fallback
    }

    setCenters((prev) => [createdRecord, ...prev]);
    setIsAddModalOpen(false);
    if (onNavigate) onNavigate('centers');

    // Reset Form
    setNewCenter({
      center_code: '',
      branch_code: bCode,
      name: '',
      name_si: '',
      city: newCenter.city || 'Maharagama',
      address: '',
      contact_person: '',
      phone: '',
      status: 'active',
      notes: '',
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (center) => {
    setEditingCenter({
      ...center,
    });
    setIsEditModalOpen(true);
  };

  // Save Updated Center
  const handleUpdateCenter = async (e) => {
    e.preventDefault();
    const rawCenter = String(editingCenter.center_code || '').trim();
    const cCode = formatCenterCode(rawCenter);
    const bCode = String(editingCenter.branch_code || '').trim().toUpperCase();

    if (!cCode || !bCode || !editingCenter.name.trim()) {
      alert('Please enter Center Code, Branch Code and Name.');
      return;
    }

    if (editingCenter.phone) {
      const pCheck = validatePhone(editingCenter.phone, false);
      if (!pCheck.isValid) {
        alert(`Center Contact Phone Error:\n${pCheck.message}`);
        return;
      }
    }

    const exists = centers.some(
      (c) =>
        c.id !== editingCenter.id &&
        c.branch_code?.toUpperCase() === bCode &&
        formatCenterCode(c.center_code) === cCode
    );
    if (exists) {
      alert(`Center Code "${cCode}" already exists for Branch "${bCode}".`);
      return;
    }

    const updated = {
      ...editingCenter,
      center_code: cCode,
      branch_code: bCode,
      name: editingCenter.name.trim(),
      name_si: editingCenter.name_si?.trim() || '',
      city: editingCenter.city?.trim() || '',
      address: editingCenter.address?.trim() || '',
      contact_person: editingCenter.contact_person?.trim() || '',
      phone: editingCenter.phone?.trim() || '',
      notes: editingCenter.notes?.trim() || '',
    };

    setCenters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (selectedCenter?.id === updated.id) {
      setSelectedCenter(updated);
    }

    try {
      await apiRequest(`/centers/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    } catch {
      // Local persist
    }

    setIsEditModalOpen(false);
    setEditingCenter(null);
  };

  // Delete Center
  const handleDeleteCenter = (id, name) => {
    const center = centers.find((c) => c.id === id);
    const linkedCusts = center ? getCustomersForCenter(center) : [];

    let confirmMsg = `Are you sure you want to remove Center "${name}"?`;
    if (linkedCusts.length > 0) {
      confirmMsg += `\n\n⚠️ Warning: There are ${linkedCusts.length} client(s) registered under this center!`;
    }

    if (window.confirm(confirmMsg)) {
      setCenters((prev) => prev.filter((c) => c.id !== id));
      if (selectedCenter?.id === id) {
        setIsViewModalOpen(false);
      }
      try {
        apiRequest(`/centers/${id}`, { method: 'DELETE' });
      } catch {
        // local state fallback
      }
    }
  };

  // Open Add Client to Center Modal
  const handleOpenAddClient = (center = null) => {
    const target = center || (centers.length > 0 ? centers[0] : null);
    setTargetCenterForClient(target);
    setNewClientForm({
      first_name: '',
      last_name: '',
      nic: '',
      phone: '',
      whatsapp: '',
      dob: '',
      city: target?.city || 'Maharagama',
      address: '',
      civil_status: 'Single',
      category: 'custom_order',
      outstanding_balance: '',
      notes: '',
    });
    setClientSearchQuery('');
    setAssignmentFeedback(null);
    setClientModalTab('new');
    setIsAddClientModalOpen(true);
  };

  // Register brand new client to target center
  const handleRegisterClientToCenter = (e) => {
    e.preventDefault();
    if (!targetCenterForClient) {
      alert('Please select a regional center first.');
      return;
    }

    // 1. Validate First Name
    const fnCheck = validateName(newClientForm.first_name, 'First Name', true);
    if (!fnCheck.isValid) {
      alert(fnCheck.message);
      return;
    }
    if (newClientForm.last_name) {
      const lnCheck = validateName(newClientForm.last_name, 'Last Name', false);
      if (!lnCheck.isValid) {
        alert(lnCheck.message);
        return;
      }
    }

    // 2. Validate NIC (Sri Lankan 9 digits + V/X or 12 digits)
    const nicCheck = validateNic(newClientForm.nic, true);
    if (!nicCheck.isValid) {
      alert(`NIC Validation Error:\n${nicCheck.message}`);
      return;
    }

    // 3. Validate Phone Number (10 digits starting with 0)
    const phoneCheck = validatePhone(newClientForm.phone, true);
    if (!phoneCheck.isValid) {
      alert(`Phone Number Validation Error:\n${phoneCheck.message}`);
      return;
    }

    // 4. Validate WhatsApp (if entered)
    if (newClientForm.whatsapp) {
      const waCheck = validatePhone(newClientForm.whatsapp, false);
      if (!waCheck.isValid) {
        alert(`WhatsApp Number Validation Error:\n${waCheck.message}`);
        return;
      }
    }

    const cleanNic = nicCheck.cleanNic;
    const cleanPhone = phoneCheck.cleanPhone;
    const cleanWa = newClientForm.whatsapp ? validatePhone(newClientForm.whatsapp, false).cleanPhone : cleanPhone;

    const existing = customers.find(
      (c) =>
        (c.nic && c.nic.trim().toUpperCase() === cleanNic) ||
        (c.customer_id && c.customer_id.trim().toUpperCase() === cleanNic)
    );

    if (existing) {
      const confirmReassign = window.confirm(
        `Customer "${existing.name}" (NIC: ${cleanNic}) is already registered in the system (Current Center: ${existing.branch_code || 'None'}/${existing.center_code || 'None'}).\n\nDo you want to reassign this customer to ${targetCenterForClient.branch_code}/${targetCenterForClient.center_code}?`
      );
      if (!confirmReassign) return;

      const updated = customers.map((c) =>
        c.id === existing.id
          ? {
              ...c,
              branch_code: targetCenterForClient.branch_code,
              center_code: targetCenterForClient.center_code,
            }
          : c
      );
      setCustomers(updated);
      saveCustomersToStorage(updated);
      setAssignmentFeedback({
        type: 'success',
        message: `Customer ${existing.name} (NIC: ${cleanNic}) successfully reassigned to ${targetCenterForClient.branch_code}/${targetCenterForClient.center_code}!`,
      });
      return;
    }

    const fullName = `${newClientForm.first_name || ''} ${newClientForm.last_name || ''}`.trim() || newClientForm.first_name;
    const newRecord = {
      id: `cust-${Date.now()}`,
      customer_id: cleanNic,
      branch_code: targetCenterForClient.branch_code,
      center_code: targetCenterForClient.center_code,
      contract_no: '1',
      item_code: '',
      first_name: newClientForm.first_name.trim(),
      last_name: (newClientForm.last_name || '').trim(),
      name: fullName,
      civil_status: newClientForm.civil_status || 'Single',
      dob: newClientForm.dob || '',
      phone: cleanPhone,
      whatsapp: cleanWa,
      nic: cleanNic,
      city: newClientForm.city || targetCenterForClient.city || 'Maharagama',
      address: newClientForm.address || '',
      category: newClientForm.category || 'custom_order',
      outstanding_balance: Number(newClientForm.outstanding_balance) || 0,
      total_spent: Number(newClientForm.outstanding_balance) || 0,
      total_orders: 1,
      notes: newClientForm.notes || '',
      created_at: new Date().toISOString(),
    };

    const updated = [newRecord, ...customers];
    setCustomers(updated);
    saveCustomersToStorage(updated);

    addLiveNotification({
      title: `Client Registered at Center`,
      desc: `${fullName} (NIC: ${cleanNic}) assigned to ${targetCenterForClient.branch_code}/${targetCenterForClient.center_code}.`,
      category: 'alerts',
      type: 'info',
      targetTab: 'center-directory',
    });

    setAssignmentFeedback({
      type: 'success',
      message: `Client "${fullName}" (NIC: ${cleanNic}) successfully registered and assigned to ${targetCenterForClient.branch_code}/${targetCenterForClient.center_code}!`,
    });
    // Reset form
    setNewClientForm({
      first_name: '',
      last_name: '',
      nic: '',
      phone: '',
      whatsapp: '',
      dob: '',
      city: targetCenterForClient.city || 'Maharagama',
      address: '',
      civil_status: 'Single',
      category: 'custom_order',
      outstanding_balance: '',
      notes: '',
    });
  };

  // Assign existing client to target center
  const handleAssignExistingClient = (cust) => {
    if (!targetCenterForClient) return;
    const cleanNic = cust.nic || cust.customer_id;
    const updated = customers.map((c) =>
      c.id === cust.id
        ? {
            ...c,
            branch_code: targetCenterForClient.branch_code,
            center_code: targetCenterForClient.center_code,
          }
        : c
    );
    setCustomers(updated);
    saveCustomersToStorage(updated);
    setAssignmentFeedback({
      type: 'success',
      message: `Client "${cust.name}" (NIC: ${cleanNic}) successfully assigned to ${targetCenterForClient.branch_code}/${targetCenterForClient.center_code}!`,
    });
  };

  // Export Centers to CSV
  const handleExportCSV = () => {
    if (!filteredCenters.length) {
      alert('No centers to export.');
      return;
    }

    const headers = ['Center Code', 'Branch Code', 'Center Name', 'Secondary Name', 'City', 'Officer In Charge', 'Phone', 'Address', 'Status', 'Registered Clients', 'Notes'];
    const rows = filteredCenters.map((c) => {
      const custCount = getCustomersForCenter(c).length;
      return [
        `"${c.center_code || ''}"`,
        `"${c.branch_code || ''}"`,
        `"${c.name?.replace(/"/g, '""') || ''}"`,
        `"${c.name_si?.replace(/"/g, '""') || ''}"`,
        `"${c.city || ''}"`,
        `"${c.contact_person || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.address?.replace(/"/g, '""') || ''}"`,
        `"${c.status || 'active'}"`,
        custCount,
        `"${c.notes?.replace(/"/g, '""') || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dd_furniture_centers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Printable PDF Report
  const handleExportPDF = () => {
    if (!filteredCenters.length) {
      alert('No centers to print.');
      return;
    }

    const rowsHtml = filteredCenters
      .map((c, idx) => {
        const custCount = getCustomersForCenter(c).length;
        return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700;">
            <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${c.branch_code}</span> / 
            <span style="background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px;">${c.center_code}</span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
            <strong>${c.name}</strong>
            ${c.name_si ? `<br><span style="color: #64748b; font-size: 10px;">${c.name_si}</span>` : ''}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
            <strong>${c.city}</strong>
            ${c.address ? `<br><span style="color: #64748b; font-size: 10px;">${c.address}</span>` : ''}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
            ${c.contact_person || 'N/A'}<br>
            <span style="font-family: monospace; color: #64748b; font-size: 10px;">${c.phone || ''}</span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">
            ${custCount}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; ${
              c.status === 'active' ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'
            }">
              ${c.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </td>
        </tr>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>D N S Home Solutions - Regional Centers Directory Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; border-bottom: 2px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 800; color: #1E4D8C; margin: 0; }
            .report-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 6px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            table.data-table th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="brand-title">D N S HOME SOLUTIONS</div>
                <div class="report-title">Regional Distribution Centers & Branch Codes Directory</div>
              </td>
              <td style="text-align: right; color: #64748b;">
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
                <div><strong>Total Centers:</strong> ${filteredCenters.length}</div>
              </td>
            </tr>
          </table>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Branch / Center Code</th>
                <th>Center Name</th>
                <th>Location / Address</th>
                <th>Officer in Charge & Phone</th>
                <th style="text-align: center;">Registered Clients</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: 'DNS_Centers_Directory' });
  };

  return (
    <div className="customers-page-container">
      {/* =========================================================
          1. STATS OVERVIEW CARDS
          ========================================================= */}
      <div className="stats-grid">
        <StatCard
          title="Total Centers"
          value={stats.total}
          subtitle={`${stats.activeCenters} active operational centers`}
          icon={Building2}
          color="var(--primary)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Active Regional Branches"
          value={stats.uniqueBranches}
          subtitle="Operating regional branch hubs"
          icon={Store}
          color="#0284c7"
          bg="#e0f2fe"
        />
        <StatCard
          title="Registered Clients in Centers"
          value={stats.totalClientsCount}
          subtitle="Customers tagged with center codes"
          icon={Users}
          color="#16a34a"
          bg="#dcfce7"
        />
        <StatCard
          title="Network Operational Rate"
          value={`${Math.round((stats.activeCenters / (stats.total || 1)) * 100)}%`}
          subtitle="Active network availability"
          icon={CheckCircle}
          color="#8b5cf6"
          bg="#f3e8ff"
        />
      </div>

      {/* =========================================================
          2. FILTER & TOOLBAR PANEL
          ========================================================= */}
      <div className="filter-panel">
        {/* Row 1: Search & Primary Actions */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={17} />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search centers by code (e.g. C001, MHG), name, city, officer, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {isFilterActive && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
                style={{ padding: '9px 14px', fontSize: '0.84rem' }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}

            {/* Export Dropdown */}
            <div className="export-dropdown-wrapper">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
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
                    <span>Print Report (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Client to Center Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleOpenAddClient(null)}
              style={{
                padding: '9px 16px',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--primary)',
                borderColor: 'var(--primary-border)',
                background: 'var(--primary-tint)',
                fontWeight: 600,
              }}
            >
              <UserPlus size={16} /> Add Client to Center
            </button>

            {/* Create Center Button */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              style={{ padding: '9px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Create Center
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns */}
        <div className="filter-row-secondary">
          <select
            className="filter-select"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">🏢 All Regional Branches</option>
            {availableBranches.map((br) => {
              const theme = getBranchTheme(br);
              return (
                <option key={br} value={br}>
                  {br} — {theme.label}
                </option>
              );
            })}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">⚡ All Statuses</option>
            <option value="active">✅ Active Centers Only</option>
            <option value="inactive">⏸️ Inactive Centers</option>
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="branch_asc">🔤 Branch & Code (A to Z)</option>
            <option value="clients_desc">👥 Most Registered Clients</option>
            <option value="name_asc">🏢 Center Name (A to Z)</option>
            <option value="recent">🔃 Recently Added</option>
          </select>
        </div>

        {/* Row 3: Quick Filter Chips */}
        <div className="filter-row-chips">
          <div className="filter-chips-list">
            <span className="filter-chips-label">Quick Filters:</span>

            <button
              type="button"
              className={`filter-chip-btn ${branchFilter === 'all' && statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setBranchFilter('all');
                setStatusFilter('all');
              }}
            >
              All Centers
              <span className="filter-count-badge">{centers.length}</span>
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            >
              <CheckCircle size={13} color="#10b981" />
              Active Centers
              <span className="filter-count-badge">{stats.activeCenters}</span>
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
            >
              Inactive
              <span className="filter-count-badge">{centers.length - stats.activeCenters}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing <strong style={{ color: 'var(--text-main)' }}>{filteredCenters.length}</strong> of{' '}
            {centers.length} centers
          </div>
        </div>
      </div>

      {/* =========================================================
          3. CENTERS DIRECTORY TABLE & CARDS
          ========================================================= */}
      <div className="table-wrapper">
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Regional Centers & Branch Network</h3>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} /> Table View
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards View"
            >
              <LayoutGrid size={14} /> Cards View
            </button>
          </div>
        </div>

        {filteredCenters.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              No Centers Found
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              {isFilterActive
                ? 'Try adjusting your search query or branch filters.'
                : 'Click "Create Center" to register your first regional distribution center.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '320px' }}>Center Details & Code</th>
                  <th>Location & Address</th>
                  <th>Officer in Charge</th>
                  <th style={{ textAlign: 'center' }}>Registered Clients</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCenters.map((center) => {
                  const linkedCusts = getCustomersForCenter(center);
                  const branchColor = getBranchTheme(center.branch_code);

                  return (
                    <tr key={center.id}>
                      {/* Center Name & Visual Code Avatar */}
                      <td>
                        <div className="table-user-cell">
                          <div
                            className="center-branch-avatar"
                            style={{
                              background: branchColor.bg,
                              color: branchColor.color,
                              borderColor: branchColor.border,
                            }}
                            title={`Branch: ${center.branch_code} | Center: ${center.center_code}`}
                          >
                            <span>{center.branch_code}</span>
                            <small>{center.center_code}</small>
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="customer-name" style={{ fontSize: '0.94rem' }}>
                                {center.name}
                              </span>
                              <span
                                style={{
                                  background: 'var(--primary-tint)',
                                  color: 'var(--primary)',
                                  padding: '1px 7px',
                                  borderRadius: '5px',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  fontFamily: 'monospace',
                                  border: '1px solid var(--primary-border)',
                                }}
                              >
                                {center.branch_code}/{center.center_code}
                              </span>
                            </div>

                            <div className="customer-meta" style={{ marginTop: '3px' }}>
                              {center.name_si && (
                                <span style={{ color: 'var(--ash-600)', fontStyle: 'normal' }}>
                                  {center.name_si}
                                </span>
                              )}
                              <span>{center.created_at ? `Created ${new Date(center.created_at).toLocaleDateString()}` : 'Active Center'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location & Address */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600, color: 'var(--ash-900)' }}>{center.city}</span>
                        </div>
                        {center.address && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.76rem',
                              color: 'var(--ash-500)',
                              marginTop: '2px',
                              maxWidth: '240px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={center.address}
                          >
                            {center.address}
                          </span>
                        )}
                      </td>

                      {/* Officer in Charge & Contact */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="var(--ash-500)" />
                          <span style={{ fontWeight: 600, color: 'var(--ash-900)' }}>
                            {center.contact_person || 'Not Assigned'}
                          </span>
                        </div>
                        {center.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--ash-600)' }}>
                              {center.phone}
                            </span>
                            <a
                              href={`https://wa.me/94${center.phone.replace(/\D/g, '').replace(/^0/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="icon-btn-action icon-btn-whatsapp"
                              title="WhatsApp Officer"
                              style={{ width: '22px', height: '22px' }}
                            >
                              <MessageSquare size={11} />
                            </a>
                            <a
                              href={`tel:${center.phone}`}
                              className="icon-btn-action"
                              title="Call Officer"
                              style={{ width: '22px', height: '22px' }}
                            >
                              <Phone size={11} />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Registered Clients Count */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            background: linkedCusts.length > 0 ? '#dcfce7' : '#f1f5f9',
                            color: linkedCusts.length > 0 ? '#15803d' : '#64748b',
                            border: `1px solid ${linkedCusts.length > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Users size={12} />
                          {linkedCusts.length} Client{linkedCusts.length === 1 ? '' : 's'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`status-pill ${center.status === 'active' ? 'status-active' : 'status-inactive'}`}
                        >
                          <span className="status-dot-pulse"></span>
                          {center.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="icon-btn-action"
                            style={{ color: 'var(--primary)' }}
                            title="Add or Assign Client to this Center"
                            onClick={() => handleOpenAddClient(center)}
                          >
                            <UserPlus size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-action"
                            title="View Center Details"
                            onClick={() => {
                              setSelectedCenter(center);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-action"
                            title="Edit Center"
                            onClick={() => handleOpenEdit(center)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-action icon-btn-delete"
                            title="Delete Center"
                            onClick={() => handleDeleteCenter(center.id, center.name)}
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
          /* Cards View */
          <div className="center-cards-grid">
            {filteredCenters.map((center) => {
              const linkedCusts = getCustomersForCenter(center);
              const branchColor = getBranchTheme(center.branch_code);

              return (
                <div key={center.id} className="center-card">
                  <div>
                    {/* Header */}
                    <div className="center-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="center-branch-avatar"
                          style={{
                            background: branchColor.bg,
                            color: branchColor.color,
                            borderColor: branchColor.border,
                          }}
                        >
                          <span>{center.branch_code}</span>
                          <small>{center.center_code}</small>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                background: 'var(--primary-tint)',
                                color: 'var(--primary)',
                                padding: '1px 7px',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                fontFamily: 'monospace',
                              }}
                            >
                              {center.branch_code}/{center.center_code}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ash-500)' }}>
                            {branchColor.label}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`status-pill ${
                          center.status === 'active' ? 'status-active' : 'status-inactive'
                        }`}
                      >
                        <span className="status-dot-pulse"></span>
                        {center.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Name */}
                    <h4 className="center-card-title">{center.name}</h4>
                    {center.name_si && <p className="center-card-subtitle">{center.name_si}</p>}

                    {/* Info list */}
                    <div className="center-card-info-list">
                      <div className="center-card-info-item">
                        <MapPin size={14} color="var(--primary)" />
                        <span>{center.address || center.city}</span>
                      </div>
                      {center.contact_person && (
                        <div className="center-card-info-item">
                          <User size={14} color="var(--ash-500)" />
                          <span>{center.contact_person}</span>
                        </div>
                      )}
                      {center.phone && (
                        <div className="center-card-info-item">
                          <Phone size={14} color="var(--ash-500)" />
                          <span style={{ fontFamily: 'monospace' }}>{center.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="center-card-footer">
                    <span
                      style={{
                        background: linkedCusts.length > 0 ? '#dcfce7' : '#f1f5f9',
                        color: linkedCusts.length > 0 ? '#15803d' : '#64748b',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Users size={12} /> {linkedCusts.length} Client{linkedCusts.length === 1 ? '' : 's'}
                    </span>

                    <div className="action-btn-group">
                      <button
                        type="button"
                        className="icon-btn-action"
                        style={{ color: 'var(--primary)' }}
                        title="Add or Assign Client to this Center"
                        onClick={() => handleOpenAddClient(center)}
                      >
                        <UserPlus size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-action"
                        title="View Center"
                        onClick={() => {
                          setSelectedCenter(center);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-action"
                        title="Edit Center"
                        onClick={() => handleOpenEdit(center)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-action icon-btn-delete"
                        title="Delete Center"
                        onClick={() => handleDeleteCenter(center.id, center.name)}
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
          4. MODAL: CREATE NEW CENTER
          ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          if (onNavigate) onNavigate('centers');
        }}
        title="Create New Regional Center"
      >
        <form onSubmit={handleAddCenter}>
          <div className="form-grid">
            {/* Live Customer ID Prefix Card */}
            <div className="form-group full-width">
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--primary-tint) 0%, #FFFFFF 100%)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Sparkles size={14} /> Center Identity & ID Prefix
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                    Customer IDs issued by this center:
                  </div>
                </div>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--primary)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: 'var(--primary)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {newCenter.branch_code || 'BRANCH'} / {newCenter.center_code || 'CENTER'} / CONTRACT / ITEM
                </div>
              </div>
            </div>

            {/* Branch Code & Center Code */}
            <div className="form-group">
              <label className="form-label">Branch Code *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. MHG, MRT, CMB, NGB, DHW"
                value={newCenter.branch_code}
                onChange={(e) =>
                  setNewCenter({
                    ...newCenter,
                    branch_code: e.target.value.replace(/\//g, '').toUpperCase(),
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Center Code *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. C001, C002, C003"
                value={newCenter.center_code}
                onChange={(e) =>
                  setNewCenter({
                    ...newCenter,
                    center_code: e.target.value.replace(/\//g, '').toUpperCase(),
                  })
                }
              />
            </div>

            {/* Center Name & Secondary Name */}
            <div className="form-group">
              <label className="form-label">Center Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Maharagama Main Center"
                value={newCenter.name}
                onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Secondary / Local Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Maharagama Main Hub"
                value={newCenter.name_si}
                onChange={(e) => setNewCenter({ ...newCenter, name_si: e.target.value })}
              />
            </div>

            {/* City & Status */}
            <div className="form-group">
              <label className="form-label">City / Town</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Maharagama, Moratuwa"
                value={newCenter.city}
                onChange={(e) => setNewCenter({ ...newCenter, city: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operating Status</label>
              <select
                className="form-select-full"
                value={newCenter.status}
                onChange={(e) => setNewCenter({ ...newCenter, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Officer in charge & Phone */}
            <div className="form-group">
              <label className="form-label">Officer in Charge</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sarath Gunawardena"
                value={newCenter.contact_person}
                onChange={(e) => setNewCenter({ ...newCenter, contact_person: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Contact Phone</span>
                {newCenter.phone && (
                  <span className={`validation-status-pill ${validatePhone(newCenter.phone, false).isValid ? 'valid' : 'invalid'}`}>
                    {validatePhone(newCenter.phone, false).isValid ? '✓ 10 Digits' : `${newCenter.phone.length}/10`}
                  </span>
                )}
              </label>
              <input
                type="tel"
                className={`form-input ${newCenter.phone ? (validatePhone(newCenter.phone, false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                maxLength={10}
                placeholder="07XXXXXXXX (10 digits)"
                value={newCenter.phone}
                onChange={(e) => setNewCenter({ ...newCenter, phone: sanitizePhoneInput(e.target.value) })}
              />
              {newCenter.phone && !validatePhone(newCenter.phone, false).isValid && (
                <div className="validation-hint error">
                  <AlertCircle size={12} /> {validatePhone(newCenter.phone, false).message}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="form-group full-width">
              <label className="form-label">Location Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. No. 120, High Level Road, Maharagama"
                value={newCenter.address}
                onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label className="form-label">Description / Operating Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Regional notes, delivery coverage, or showroom details..."
                value={newCenter.notes}
                onChange={(e) => setNewCenter({ ...newCenter, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                if (onNavigate) onNavigate('centers');
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={15} /> Save & Register Center
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          5. MODAL: EDIT CENTER
          ========================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingCenter ? `Edit Center - ${editingCenter.name}` : 'Edit Center'}
      >
        {editingCenter && (
          <form onSubmit={handleUpdateCenter}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Branch Code *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingCenter.branch_code || ''}
                  onChange={(e) =>
                    setEditingCenter({
                      ...editingCenter,
                      branch_code: e.target.value.replace(/\//g, '').toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Center Code *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. C001, C002, C003"
                  value={editingCenter.center_code || ''}
                  onChange={(e) =>
                    setEditingCenter({
                      ...editingCenter,
                      center_code: e.target.value.replace(/\//g, '').toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Center Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingCenter.name || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Secondary / Local Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCenter.name_si || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, name_si: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City / Town</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCenter.city || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Operating Status</label>
                <select
                  className="form-select-full"
                  value={editingCenter.status || 'active'}
                  onChange={(e) => setEditingCenter({ ...editingCenter, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Officer in Charge</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCenter.contact_person || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, contact_person: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Contact Phone</span>
                  {editingCenter.phone && (
                    <span className={`validation-status-pill ${validatePhone(editingCenter.phone, false).isValid ? 'valid' : 'invalid'}`}>
                      {validatePhone(editingCenter.phone, false).isValid ? '✓ 10 Digits' : `${editingCenter.phone.length}/10`}
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  className={`form-input ${editingCenter.phone ? (validatePhone(editingCenter.phone, false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                  maxLength={10}
                  placeholder="07XXXXXXXX (10 digits)"
                  value={editingCenter.phone || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, phone: sanitizePhoneInput(e.target.value) })}
                />
                {editingCenter.phone && !validatePhone(editingCenter.phone, false).isValid && (
                  <div className="validation-hint error">
                    <AlertCircle size={12} /> {validatePhone(editingCenter.phone, false).message}
                  </div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Location Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCenter.address || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, address: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={editingCenter.notes || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, notes: e.target.value })}
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
                Update Center Details
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: VIEW CENTER PROFILE & LINKED CUSTOMERS
          ========================================================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedCenter ? `Center Profile - ${selectedCenter.name}` : 'Center Profile'}
      >
        {selectedCenter && (
          <div>
            {/* Center Summary Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--ash-200)',
                marginBottom: '16px',
              }}
            >
              <div
                className="center-branch-avatar"
                style={{
                  width: '56px',
                  height: '56px',
                  fontSize: '1rem',
                  ...getBranchTheme(selectedCenter.branch_code),
                }}
              >
                <span>{selectedCenter.branch_code}</span>
                <small>{selectedCenter.center_code}</small>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                    {selectedCenter.name}
                  </h3>
                  <span
                    className={`status-pill ${
                      selectedCenter.status === 'active' ? 'status-active' : 'status-inactive'
                    }`}
                  >
                    <span className="status-dot-pulse"></span>
                    {selectedCenter.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {selectedCenter.name_si && (
                  <div style={{ color: 'var(--ash-600)', fontSize: '0.85rem', marginTop: '2px' }}>
                    {selectedCenter.name_si}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                  <span
                    style={{
                      background: '#E0F2FE',
                      color: '#0369A1',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    Branch: {selectedCenter.branch_code}
                  </span>
                  <span
                    style={{
                      background: 'var(--primary-tint)',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    Center Code: {selectedCenter.center_code}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', background: 'var(--ash-50)', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  City / Location
                </span>
                <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                  {selectedCenter.city}
                </p>
                {selectedCenter.address && (
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--ash-600)' }}>
                    📍 {selectedCenter.address}
                  </p>
                )}
              </div>

              <div style={{ padding: '14px', background: 'var(--ash-50)', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Officer in Charge
                </span>
                <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                  {selectedCenter.contact_person || 'Not Assigned'}
                </p>
                {selectedCenter.phone && (
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--ash-600)', fontFamily: 'monospace' }}>
                    📞 {selectedCenter.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Linked Customers List under this Center */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="var(--primary)" /> Registered Clients under this Center
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleOpenAddClient(selectedCenter);
                    }}
                  >
                    <UserPlus size={13} /> + Add Client
                  </button>
                  <span
                    style={{
                      background: getCustomersForCenter(selectedCenter).length > 0 ? '#DCFCE7' : 'var(--ash-100)',
                      color: getCustomersForCenter(selectedCenter).length > 0 ? '#15803D' : 'var(--ash-600)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {getCustomersForCenter(selectedCenter).length} Total
                  </span>
                </div>
              </div>

              {getCustomersForCenter(selectedCenter).length === 0 ? (
                <div style={{ padding: '24px', background: 'var(--ash-50)', borderRadius: '10px', textAlign: 'center', color: 'var(--ash-500)', fontSize: '0.85rem' }}>
                  No customer records currently registered with code {selectedCenter.branch_code}/{selectedCenter.center_code}.
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--ash-200)', borderRadius: '10px' }}>
                  <table className="custom-table" style={{ margin: 0, fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>NIC / ID</th>
                        <th>Client Name</th>
                        <th>Phone</th>
                        <th>Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCustomersForCenter(selectedCenter).map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            {c.nic || c.customer_id}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--ash-900)' }}>{c.name}</td>
                          <td style={{ fontFamily: 'monospace' }}>{c.phone}</td>
                          <td style={{ color: Number(c.outstanding_balance) > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                            Rs. {(Number(c.outstanding_balance) || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedCenter);
                }}
              >
                <Edit2 size={14} /> Edit Center
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: ADD CLIENT TO REGIONAL CENTER
          ========================================================= */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setAssignmentFeedback(null);
          if (onNavigate && initialOpenAddClient) {
            onNavigate('centers');
          }
        }}
        title="Add Client to Regional Center"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Center Selector */}
          <div style={{ background: 'var(--ash-50)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} color="var(--primary)" /> Target Regional Center *
            </label>
            <select
              className="form-select-full"
              value={targetCenterForClient?.id || ''}
              onChange={(e) => {
                const found = centers.find((c) => c.id === e.target.value);
                if (found) setTargetCenterForClient(found);
              }}
              style={{ fontWeight: 600 }}
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.branch_code}/{c.center_code} — {c.name} ({c.city})
                </option>
              ))}
            </select>
            {targetCenterForClient && (
              <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--ash-600)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span>📍 Branch: <strong>{targetCenterForClient.branch_code}</strong></span>
                <span>🏛️ Center Code: <strong>{targetCenterForClient.center_code}</strong></span>
                <span>👤 Officer: <strong>{targetCenterForClient.contact_person || 'N/A'}</strong></span>
                <span>👥 Registered Clients: <strong>{getCustomersForCenter(targetCenterForClient).length}</strong></span>
              </div>
            )}
          </div>

          {/* Feedback Alert */}
          {assignmentFeedback && (
            <div style={{
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              color: '#15803D',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> {assignmentFeedback.message}
              </span>
              <button
                type="button"
                onClick={() => setAssignmentFeedback(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#15803D' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Tab switcher: Register New vs Assign Existing */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--ash-200)', paddingBottom: '10px' }}>
            <button
              type="button"
              className={`btn ${clientModalTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setClientModalTab('new');
                setAssignmentFeedback(null);
              }}
            >
              <UserPlus size={14} /> Register New Client
            </button>
            <button
              type="button"
              className={`btn ${clientModalTab === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setClientModalTab('existing');
                setAssignmentFeedback(null);
              }}
            >
              <Users size={14} /> Assign Existing Client ({customers.length})
            </button>
          </div>

          {clientModalTab === 'new' ? (
            <form onSubmit={handleRegisterClientToCenter}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>First Name *</span>
                    {newClientForm.first_name && (
                      <span className={`validation-status-pill ${validateName(newClientForm.first_name, 'First Name').isValid ? 'valid' : 'invalid'}`}>
                        {validateName(newClientForm.first_name, 'First Name').isValid ? '✓ Valid' : 'Invalid'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className={`form-input ${newClientForm.first_name ? (validateName(newClientForm.first_name, 'First Name').isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    required
                    placeholder="e.g. Sunil"
                    value={newClientForm.first_name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, first_name: e.target.value })}
                  />
                  {newClientForm.first_name && !validateName(newClientForm.first_name, 'First Name').isValid && (
                    <div className="validation-hint error">
                      <AlertCircle size={12} /> {validateName(newClientForm.first_name, 'First Name').message}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Last Name</span>
                    {newClientForm.last_name && (
                      <span className={`validation-status-pill ${validateName(newClientForm.last_name, 'Last Name', false).isValid ? 'valid' : 'invalid'}`}>
                        {validateName(newClientForm.last_name, 'Last Name', false).isValid ? '✓ Valid' : 'Invalid'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className={`form-input ${newClientForm.last_name ? (validateName(newClientForm.last_name, 'Last Name', false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    placeholder="e.g. Jayawardena"
                    value={newClientForm.last_name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, last_name: e.target.value })}
                  />
                  {newClientForm.last_name && !validateName(newClientForm.last_name, 'Last Name', false).isValid && (
                    <div className="validation-hint error">
                      <AlertCircle size={12} /> {validateName(newClientForm.last_name, 'Last Name', false).message}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>NIC (National Identity Card) *</span>
                    {newClientForm.nic && (
                      <span className={`validation-status-pill ${validateNic(newClientForm.nic).isValid ? 'valid' : 'invalid'}`}>
                        {validateNic(newClientForm.nic).isValid ? '✓ Valid NIC' : 'Invalid NIC'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className={`form-input ${newClientForm.nic ? (validateNic(newClientForm.nic).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    required
                    maxLength={12}
                    placeholder="e.g. 198512345678 or 851234567V"
                    value={newClientForm.nic}
                    onChange={(e) => setNewClientForm({ ...newClientForm, nic: sanitizeNicInput(e.target.value) })}
                  />
                  <div
                    className={`validation-hint ${newClientForm.nic ? (validateNic(newClientForm.nic).isValid ? 'success' : 'error') : ''}`}
                    style={{ color: newClientForm.nic ? undefined : 'var(--text-muted)' }}
                  >
                    {newClientForm.nic ? (
                      <>
                        {validateNic(newClientForm.nic).isValid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        <span>{validateNic(newClientForm.nic).message}</span>
                      </>
                    ) : (
                      <span>Format: 10 chars (9 digits + V/X) or 12 digits</span>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Phone Number *</span>
                    {newClientForm.phone && (
                      <span className={`validation-status-pill ${validatePhone(newClientForm.phone).isValid ? 'valid' : 'invalid'}`}>
                        {validatePhone(newClientForm.phone).isValid ? '✓ 10 Digits' : `${newClientForm.phone.length}/10 Digits`}
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    className={`form-input ${newClientForm.phone ? (validatePhone(newClientForm.phone).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    required
                    maxLength={10}
                    placeholder="07XXXXXXXX (10 digits)"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: sanitizePhoneInput(e.target.value) })}
                  />
                  <div
                    className={`validation-hint ${newClientForm.phone ? (validatePhone(newClientForm.phone).isValid ? 'success' : 'error') : ''}`}
                    style={{ color: newClientForm.phone ? undefined : 'var(--text-muted)' }}
                  >
                    {newClientForm.phone ? (
                      <>
                        {validatePhone(newClientForm.phone).isValid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        <span>{validatePhone(newClientForm.phone).message}</span>
                      </>
                    ) : (
                      <span>10 digits without letters, starting with 0</span>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>WhatsApp Number</span>
                    {newClientForm.whatsapp && (
                      <span className={`validation-status-pill ${validatePhone(newClientForm.whatsapp, false).isValid ? 'valid' : 'invalid'}`}>
                        {validatePhone(newClientForm.whatsapp, false).isValid ? '✓ 10 Digits' : `${newClientForm.whatsapp.length}/10`}
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    className={`form-input ${newClientForm.whatsapp ? (validatePhone(newClientForm.whatsapp, false).isValid ? 'is-valid' : 'is-invalid') : ''}`}
                    maxLength={10}
                    placeholder="07XXXXXXXX (Optional)"
                    value={newClientForm.whatsapp}
                    onChange={(e) => setNewClientForm({ ...newClientForm, whatsapp: sanitizePhoneInput(e.target.value) })}
                  />
                  {newClientForm.whatsapp && !validatePhone(newClientForm.whatsapp, false).isValid && (
                    <div className="validation-hint error">
                      <AlertTriangle size={12} /> {validatePhone(newClientForm.whatsapp, false).message}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    max={new Date().toISOString().split('T')[0]}
                    value={newClientForm.dob}
                    onChange={(e) => setNewClientForm({ ...newClientForm, dob: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City / Town</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maharagama"
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Civil Status</label>
                  <select
                    className="form-select-full"
                    value={newClientForm.civil_status}
                    onChange={(e) => setNewClientForm({ ...newClientForm, civil_status: e.target.value })}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Full Delivery Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="House No, Street, Road, City"
                    value={newClientForm.address}
                    onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Category</label>
                  <select
                    className="form-select-full"
                    value={newClientForm.category}
                    onChange={(e) => setNewClientForm({ ...newClientForm, category: e.target.value })}
                  >
                    <option value="custom_order">Custom Made Furniture</option>
                    <option value="showroom">Showroom / Ready Stock</option>
                    <option value="wholesale">Commercial / Wholesale</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Outstanding Balance (LKR)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="500"
                    placeholder="0.00"
                    value={newClientForm.outstanding_balance}
                    onChange={(e) => setNewClientForm({ ...newClientForm, outstanding_balance: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Furniture Preferences & Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Teak wood bedroom suite, showroom inquiries..."
                    value={newClientForm.notes}
                    onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddClientModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={16} /> Save & Register to Center
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* Search Existing Clients */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ash-400)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Filter existing clients by name, NIC, or phone..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--ash-200)', borderRadius: '10px' }}>
                <table className="custom-table" style={{ margin: 0, fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>NIC</th>
                      <th>Phone</th>
                      <th>Current Center</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter((c) => {
                        if (!clientSearchQuery) return true;
                        const q = clientSearchQuery.toLowerCase();
                        return (
                          (c.name && c.name.toLowerCase().includes(q)) ||
                          (c.nic && c.nic.toLowerCase().includes(q)) ||
                          (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
                          (c.phone && c.phone.includes(q))
                        );
                      })
                      .map((c) => {
                        const isCurrentCenter =
                          targetCenterForClient &&
                          c.branch_code === targetCenterForClient.branch_code &&
                          formatCenterCode(c.center_code) === formatCenterCode(targetCenterForClient.center_code);

                        return (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 600, color: 'var(--ash-900)' }}>{c.name}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                              {c.nic || c.customer_id}
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{c.phone}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                background: isCurrentCenter ? '#DCFCE7' : 'var(--ash-100)',
                                color: isCurrentCenter ? '#15803D' : 'var(--ash-700)',
                                fontWeight: 600,
                              }}>
                                {c.branch_code && c.center_code ? `${c.branch_code}/${c.center_code}` : 'Unassigned'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {isCurrentCenter ? (
                                <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle size={13} /> In Center
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                                  onClick={() => handleAssignExistingClient(c)}
                                >
                                  Assign Here
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
