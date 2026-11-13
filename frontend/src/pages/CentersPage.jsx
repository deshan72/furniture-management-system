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

// Visual center themes based on center code (C001, C002, etc.)
const CENTER_THEMES = [
  { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' }, // Sky
  { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' }, // Amber
  { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' }, // Emerald
  { bg: '#F3E8FF', color: '#7E22CE', border: '#E9D5FF' }, // Purple
  { bg: '#FFE4E6', color: '#BE123C', border: '#FECDD3' }, // Rose
  { bg: '#CCFBF1', color: '#0F766E', border: '#99F6E4' }, // Teal
  { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' }, // Orange
  { bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE' }, // Violet
];

const getCenterTheme = (code) => {
  if (!code) return CENTER_THEMES[0];
  const numMatch = String(code).match(/(\d+)/);
  const idx = numMatch ? parseInt(numMatch[1], 10) : 0;
  return CENTER_THEMES[idx % CENTER_THEMES.length];
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

// Automatically generates the next Center Code in sequence (e.g. C001, C002 -> C003)
export const getNextCenterCode = (centerList = []) => {
  if (!Array.isArray(centerList) || centerList.length === 0) {
    return 'C001';
  }
  let maxNum = 0;
  centerList.forEach((c) => {
    const raw = String(c.center_code || '').trim().toUpperCase();
    const match = raw.match(/^(?:C)?(\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  });
  const nextNum = maxNum > 0 ? maxNum + 1 : centerList.length + 1;
  return `C${String(nextNum).padStart(3, '0')}`;
};

// Default seed centers (Unique center codes, no branch codes)
const INITIAL_CENTERS = [
  {
    id: 'cntr-1',
    center_code: 'C001',
    branch_code: '',
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
    branch_code: '',
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
    center_code: 'C003',
    branch_code: '',
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
    center_code: 'C004',
    branch_code: '',
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
    center_code: 'C005',
    branch_code: '',
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
    center_code: 'C006',
    branch_code: '',
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
  // Centers List State with localStorage persistence (branch_code removed, unique center_code guaranteed)
  const [centers, setCenters] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_centers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const usedCodes = new Set();
          let fallbackCounter = 1;

          return parsed.map((c, idx) => {
            let dd = c.due_date || '';
            let cd = c.cash_collect_date || '';
            if (c.notes && c.notes.includes('<!--DNS_META:')) {
              try {
                const match = c.notes.match(/<!--DNS_META:(\{.*?\})-->/);
                if (match) {
                  const meta = JSON.parse(match[1]);
                  if (meta.dd && !dd) dd = meta.dd;
                  if (meta.cd && !cd) cd = meta.cd;
                }
              } catch (_) {}
            }

            let code = formatCenterCode(c.center_code);
            if (!code || usedCodes.has(code)) {
              while (usedCodes.has(`C${String(fallbackCounter).padStart(3, '0')}`)) {
                fallbackCounter++;
              }
              code = `C${String(fallbackCounter).padStart(3, '0')}`;
              fallbackCounter++;
            }
            usedCodes.add(code);

            return {
              ...c,
              branch_code: '',
              center_code: code,
              due_date: dd,
              cash_collect_date: cd,
            };
          });
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
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('code_asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialOpenCreate);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);

  // Assign Client to Center Modal States
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(initialOpenAddClient);
  const [targetCenterForClient, setTargetCenterForClient] = useState(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientFilterType, setClientFilterType] = useState('all'); // 'all' | 'other' | 'in_center'
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [assignmentFeedback, setAssignmentFeedback] = useState(null);

  // Sync initialOpenAddClient prop
  useEffect(() => {
    if (initialOpenAddClient) {
      setCustomers(loadSavedCustomers());
      setTargetCenterForClient(centers[0] || null);
      setAssignmentFeedback(null);
      setSelectedClientIds([]);
      setClientSearchQuery('');
      setClientFilterType('all');
      setIsAddClientModalOpen(true);
    }
  }, [initialOpenAddClient, centers]);

  // Sync external customer changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e || e.key === 'dnd_customers_list' || e.type === 'dnd_customers_updated') {
        setCustomers(loadSavedCustomers());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dnd_customers_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dnd_customers_updated', handleStorageChange);
    };
  }, []);

  // Form State for Add Center (Center Code auto-generated)
  const [newCenter, setNewCenter] = useState(() => ({
    center_code: '',
    branch_code: '',
    name: '',
    name_si: '',
    city: 'Maharagama',
    due_date: '',
    cash_collect_date: '',
    address: '',
    contact_person: '',
    phone: '',
    status: 'active',
    notes: '',
  }));

  // Open Create Center modal with next auto-generated Center Code
  const handleOpenAddModal = () => {
    const nextCode = getNextCenterCode(centers);
    setNewCenter({
      center_code: nextCode,
      branch_code: '',
      name: '',
      name_si: '',
      city: 'Maharagama',
      due_date: '',
      cash_collect_date: '',
      address: '',
      contact_person: '',
      phone: '',
      status: 'active',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // Ensure center_code is always generated and ready when modal is open
  useEffect(() => {
    if (isAddModalOpen && !newCenter.center_code) {
      setNewCenter((prev) => ({
        ...prev,
        center_code: getNextCenterCode(centers),
      }));
    }
  }, [isAddModalOpen, centers]);

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
          const sanitized = res.data.map((c) => ({
            ...c,
            branch_code: '',
            center_code: formatCenterCode(c.center_code),
          }));
          setCenters(sanitized);
        }
      })
      .catch(() => {
        // Fallback already loaded
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute customers linked to a center (directly by center_code)
  const getCustomersForCenter = useCallback((center) => {
    if (!center) return [];
    const targetCenter = formatCenterCode(center.center_code);
    return customers.filter((c) => {
      const parts = String(c.customer_id || '').split('/');
      const cCode = formatCenterCode(c.center_code || (parts.length === 4 ? parts[1] : ''));
      return cCode === targetCenter;
    });
  }, [customers]);

  // Unique cities / locations for filter dropdown
  const availableCities = useMemo(() => {
    const cities = new Set();
    centers.forEach((c) => {
      if (c.city) cities.add(c.city.trim());
    });
    return Array.from(cities).sort();
  }, [centers]);

  // KPI Statistics
  const stats = useMemo(() => {
    const total = centers.length;
    const activeCenters = centers.filter((c) => c.status === 'active').length;
    const totalClientsCount = customers.length;

    return {
      total,
      activeCenters,
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
            cntr.city?.toLowerCase().includes(q) ||
            cntr.contact_person?.toLowerCase().includes(q) ||
            cntr.phone?.toLowerCase().includes(q) ||
            cntr.address?.toLowerCase().includes(q) ||
            cntr.notes?.toLowerCase().includes(q);

          if (!matches) return false;
        }

        if (cityFilter !== 'all' && cntr.city?.trim().toLowerCase() !== cityFilter.trim().toLowerCase()) {
          return false;
        }

        if (statusFilter !== 'all' && cntr.status !== statusFilter) {
          return false;
        }

        // Global Center Filter from Header
        if (headerCenter && headerCenter !== 'all') {
          const selC = headerCenter.includes('/') ? headerCenter.split('/')[1] : headerCenter;
          if (formatCenterCode(cntr.center_code) !== formatCenterCode(selC)) {
            return false;
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
        // 'code_asc' default
        return (a.center_code || '').localeCompare(b.center_code || '');
      });
  }, [centers, searchQuery, cityFilter, statusFilter, sortBy, getCustomersForCenter, headerCenter]);

  // Counts for modal filtering
  const modalClientCounts = useMemo(() => {
    if (!targetCenterForClient) {
      return { all: customers.length, other: customers.length, inCenter: 0 };
    }
    const targetCenter = formatCenterCode(targetCenterForClient.center_code);

    let inCenter = 0;
    customers.forEach((c) => {
      const cCenter = formatCenterCode(c.center_code);
      if (cCenter === targetCenter) {
        inCenter += 1;
      }
    });

    return {
      all: customers.length,
      other: customers.length - inCenter,
      inCenter,
    };
  }, [customers, targetCenterForClient]);

  // Filtered clients list for the Assign Client modal
  const filteredClientsForModal = useMemo(() => {
    if (!targetCenterForClient) return customers;
    const targetCenter = formatCenterCode(targetCenterForClient.center_code);
    const q = clientSearchQuery.trim().toLowerCase();

    return customers.filter((c) => {
      const cCenter = formatCenterCode(c.center_code);
      const isCurrentCenter = cCenter === targetCenter;

      if (clientFilterType === 'in_center' && !isCurrentCenter) return false;
      if (clientFilterType === 'other' && isCurrentCenter) return false;

      if (!q) return true;
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.first_name && c.first_name.toLowerCase().includes(q)) ||
        (c.last_name && c.last_name.toLowerCase().includes(q)) ||
        (c.nic && c.nic.toLowerCase().includes(q)) ||
        (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    });
  }, [customers, targetCenterForClient, clientSearchQuery, clientFilterType]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCityFilter('all');
    setStatusFilter('all');
    setSortBy('code_asc');
  };

  const isFilterActive =
    searchQuery.trim() !== '' || cityFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'code_asc';

  // Handle Create Center
  const handleAddCenter = async (e) => {
    e.preventDefault();
    let cCode = formatCenterCode(newCenter.center_code || getNextCenterCode(centers));
    const bCode = '';

    if (!cCode) {
      cCode = getNextCenterCode(centers);
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

    // Check duplicate center code
    const exists = centers.some((c) => formatCenterCode(c.center_code) === cCode);
    if (exists) {
      cCode = getNextCenterCode(centers);
    }

    const createdRecord = {
      id: `cntr-${Date.now()}`,
      center_code: cCode,
      branch_code: '',
      name: newCenter.name.trim(),
      name_si: '',
      city: newCenter.city.trim() || 'Maharagama',
      due_date: newCenter.due_date || '',
      cash_collect_date: newCenter.cash_collect_date || '',
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

    const updatedCenters = [createdRecord, ...centers];
    setCenters(updatedCenters);
    setIsAddModalOpen(false);
    if (onNavigate) onNavigate('centers');

    // Reset Form for next addition with auto-incremented center code
    const nextCode = getNextCenterCode(updatedCenters);
    setNewCenter({
      center_code: nextCode,
      branch_code: '',
      name: '',
      name_si: '',
      city: 'Maharagama',
      due_date: '',
      cash_collect_date: '',
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
      due_date: center.due_date || '',
      cash_collect_date: center.cash_collect_date || '',
    });
    setIsEditModalOpen(true);
  };

  // Save Updated Center
  const handleUpdateCenter = async (e) => {
    e.preventDefault();
    const rawCenter = String(editingCenter.center_code || '').trim();
    const cCode = formatCenterCode(rawCenter);

    if (!cCode || !editingCenter.name.trim()) {
      alert('Please enter Center Code and Name.');
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
        formatCenterCode(c.center_code) === cCode
    );
    if (exists) {
      alert(`Center Code "${cCode}" already exists.`);
      return;
    }

    const updated = {
      ...editingCenter,
      center_code: cCode,
      branch_code: '',
      name: editingCenter.name.trim(),
      name_si: editingCenter.name_si?.trim() || '',
      city: editingCenter.city?.trim() || 'Maharagama',
      due_date: editingCenter.due_date || '',
      cash_collect_date: editingCenter.cash_collect_date || '',
      address: editingCenter.address?.trim() || '',
      contact_person: editingCenter.contact_person?.trim() || '',
      phone: editingCenter.phone?.trim() || '',
      status: editingCenter.status || 'active',
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

  // Open Assign Client to Center Modal
  const handleOpenAddClient = (center = null) => {
    const target = center || (centers.length > 0 ? centers[0] : null);
    setCustomers(loadSavedCustomers());
    setTargetCenterForClient(target);
    setClientSearchQuery('');
    setClientFilterType('all');
    setSelectedClientIds([]);
    setAssignmentFeedback(null);
    setIsAddClientModalOpen(true);
  };

  // Toggle single client selection for bulk assignment
  const handleToggleSelectClient = (clientId) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  // Select / Deselect all visible clients in filtered table
  const handleSelectAllFilteredClients = (filteredList) => {
    const visibleIds = filteredList.map((c) => c.id || c.nic || c.customer_id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedClientIds.includes(id));
    if (allSelected) {
      setSelectedClientIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedClientIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Assign a single existing client to target center
  const handleAssignExistingClient = async (cust) => {
    if (!targetCenterForClient) {
      alert('Please select a regional center first.');
      return;
    }

    const cleanNic = cust.nic || cust.customer_id;
    const targetCenterCode = formatCenterCode(targetCenterForClient.center_code);

    const isCurrentCenter = formatCenterCode(cust.center_code) === targetCenterCode;

    if (isCurrentCenter) {
      setAssignmentFeedback({
        type: 'info',
        message: `Client "${cust.name}" is already registered at Center ${targetCenterCode}.`,
      });
      return;
    }

    if (cust.center_code) {
      const confirmTransfer = window.confirm(
        `Customer "${cust.name}" (NIC: ${cleanNic}) is currently assigned to Center ${cust.center_code}.\n\nDo you want to reassign/transfer this client to Center ${targetCenterCode} (${targetCenterForClient.name})?`
      );
      if (!confirmTransfer) return;
    }

    const updatedCust = {
      ...cust,
      branch_code: '',
      center_code: targetCenterCode,
      city: cust.city || targetCenterForClient.city || 'Maharagama',
    };

    const freshList = loadSavedCustomers();
    const updated = freshList.map((c) =>
      (c.id && c.id === cust.id) || (c.nic && c.nic === cust.nic) || (c.customer_id && c.customer_id === cust.customer_id)
        ? updatedCust
        : c
    );

    setCustomers(updated);
    saveCustomersToStorage(updated);

    try {
      await apiRequest(`/customers/${cust.id}`, {
        method: 'PUT',
        body: updatedCust,
      });
    } catch {
      // Local storage fallback
    }

    addLiveNotification({
      title: `Client Assigned to Center`,
      desc: `${cust.name} (NIC: ${cleanNic}) assigned to Center ${targetCenterCode} (${targetCenterForClient.name}).`,
      category: 'alerts',
      type: 'success',
      targetTab: 'centers',
    });

    setAssignmentFeedback({
      type: 'success',
      message: `Client "${cust.name}" (NIC: ${cleanNic}) successfully assigned to Center ${targetCenterCode} (${targetCenterForClient.name})!`,
    });
  };

  // Bulk assign selected clients to target center
  const handleBatchAssignClients = async () => {
    if (!targetCenterForClient) {
      alert('Please select a regional center first.');
      return;
    }
    if (selectedClientIds.length === 0) {
      alert('Please select at least one customer to assign.');
      return;
    }

    const targetCenterCode = formatCenterCode(targetCenterForClient.center_code);

    const freshList = loadSavedCustomers();
    const updated = freshList.map((c) => {
      const matchId = c.id || c.nic || c.customer_id;
      if (selectedClientIds.includes(matchId) || selectedClientIds.includes(c.id) || selectedClientIds.includes(c.nic)) {
        return {
          ...c,
          branch_code: '',
          center_code: targetCenterCode,
          city: c.city || targetCenterForClient.city || 'Maharagama',
        };
      }
      return c;
    });

    setCustomers(updated);
    saveCustomersToStorage(updated);

    for (const custId of selectedClientIds) {
      const found = updated.find((c) => c.id === custId || c.nic === custId || c.customer_id === custId);
      if (found) {
        try {
          await apiRequest(`/customers/${found.id}`, { method: 'PUT', body: found });
        } catch {
          // ignore
        }
      }
    }

    addLiveNotification({
      title: `${selectedClientIds.length} Clients Assigned`,
      desc: `${selectedClientIds.length} client(s) assigned to Center ${targetCenterCode} (${targetCenterForClient.name}).`,
      category: 'alerts',
      type: 'success',
      targetTab: 'centers',
    });

    setAssignmentFeedback({
      type: 'success',
      message: `Successfully assigned ${selectedClientIds.length} client(s) to Center ${targetCenterCode} (${targetCenterForClient.name})!`,
    });
    setSelectedClientIds([]);
  };

  // Export Centers to CSV
  const handleExportCSV = () => {
    if (!filteredCenters.length) {
      alert('No centers to export.');
      return;
    }

    const headers = ['Center Code', 'Center Name', 'Secondary Name', 'City', 'Officer In Charge', 'Phone', 'Address', 'Status', 'Registered Clients', 'Due Date', 'Cash Collect Date', 'Notes'];
    const rows = filteredCenters.map((c) => {
      const custCount = getCustomersForCenter(c).length;
      return [
        `"${c.center_code || ''}"`,
        `"${c.name?.replace(/"/g, '""') || ''}"`,
        `"${c.name_si?.replace(/"/g, '""') || ''}"`,
        `"${c.city || ''}"`,
        `"${c.contact_person || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.address?.replace(/"/g, '""') || ''}"`,
        `"${c.status || 'active'}"`,
        custCount,
        `"${c.due_date || ''}"`,
        `"${c.cash_collect_date || ''}"`,
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
            <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${c.center_code}</span>
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
                <div class="report-title">Regional Distribution Centers Directory</div>
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
                <th>Center Code</th>
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
          title="Cities & Coverage Areas"
          value={availableCities.length}
          subtitle="Operating coverage locations"
          icon={MapPin}
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
              placeholder="Search centers by code (e.g. C001), name, city, officer, or phone..."
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
              onClick={handleOpenAddModal}
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
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="all">📍 All Cities & Coverage Areas</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
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
            <option value="code_asc">🔢 Center Code (C001, C002...)</option>
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
              className={`filter-chip-btn ${cityFilter === 'all' && statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setCityFilter('all');
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Regional Centers Directory</h3>
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
                ? 'Try adjusting your search query or city filters.'
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
                  const centerTheme = getCenterTheme(center.center_code);

                  return (
                    <tr key={center.id}>
                      {/* Center Name & Visual Code Avatar */}
                      <td>
                        <div className="table-user-cell">
                          <div
                            className="center-branch-avatar"
                            style={{
                              background: centerTheme.bg,
                              color: centerTheme.color,
                              borderColor: centerTheme.border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              fontSize: '0.86rem',
                            }}
                            title={`Center Code: ${center.center_code}`}
                          >
                            <span>{center.center_code}</span>
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
                                  fontSize: '0.70rem',
                                  fontWeight: '700',
                                  fontFamily: 'monospace',
                                  border: '1px solid var(--primary-border)',
                                }}
                              >
                                {center.center_code}
                              </span>
                            </div>

                            <div className="customer-meta" style={{ marginTop: '3px' }}>
                              {center.name_si && (
                                <span style={{ color: 'var(--ash-600)', fontStyle: 'normal' }}>
                                  {center.name_si}
                                </span>
                              )}
                              <span>{center.created_at ? `Created ${new Date(center.created_at).toLocaleDateString()}` : 'Active Center'}</span>
                              {center.due_date && (
                                <span style={{ color: '#B45309', fontWeight: 600 }}>
                                  Due: {center.due_date}
                                </span>
                              )}
                              {center.cash_collect_date && (
                                <span style={{ color: '#15803D', fontWeight: 600 }}>
                                  Collect: {center.cash_collect_date}
                                </span>
                              )}
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
              const centerTheme = getCenterTheme(center.center_code);

              return (
                <div key={center.id} className="center-card">
                  <div>
                    {/* Header */}
                    <div className="center-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="center-branch-avatar"
                          style={{
                            background: centerTheme.bg,
                            color: centerTheme.color,
                            borderColor: centerTheme.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            fontSize: '0.86rem',
                          }}
                        >
                          <span>{center.center_code}</span>
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
                              {center.center_code}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ash-500)' }}>
                            {center.city}
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
                      {(center.due_date || center.cash_collect_date) && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {center.due_date && (
                            <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                              📅 Due: {center.due_date}
                            </span>
                          )}
                          {center.cash_collect_date && (
                            <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                              💵 Collect: {center.cash_collect_date}
                            </span>
                          )}
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
            {/* Row 1: Center Code (Auto-generated) & Center Name */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Center Code *</span>
                <span className="validation-status-pill valid" style={{ background: 'var(--primary-tint)', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}>
                  ⚡ Auto-generated
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                readOnly
                value={newCenter.center_code || getNextCenterCode(centers)}
                style={{
                  backgroundColor: 'var(--ash-100)',
                  cursor: 'not-allowed',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  letterSpacing: '0.05em',
                  color: 'var(--primary)',
                }}
                title="Center Code is automatically assigned in sequence (e.g. C001, C002, C003...)"
              />
              <div className="validation-hint" style={{ color: 'var(--ash-500)', fontSize: '0.74rem' }}>
                Auto-sequenced based on existing centers (e.g. C001, C002, C003)
              </div>
            </div>

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

            {/* Row 2: City / Town & Operating Status */}
            <div className="form-group">
              <label className="form-label">City / Town *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Maharagama, Moratuwa, Colombo"
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

            {/* Row 3: Center Due Date & Center Cash Collect Date */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Center Due Date</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)' }}>Monthly / Weekly Due</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={newCenter.due_date || ''}
                onChange={(e) => setNewCenter({ ...newCenter, due_date: e.target.value })}
              />
              <div className="validation-hint" style={{ color: 'var(--ash-500)', fontSize: '0.74rem' }}>
                Payment due date for customers in this center
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Center Cash Collect Date</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)' }}>Field Collection</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={newCenter.cash_collect_date || ''}
                onChange={(e) => setNewCenter({ ...newCenter, cash_collect_date: e.target.value })}
              />
              <div className="validation-hint" style={{ color: 'var(--ash-500)', fontSize: '0.74rem' }}>
                Officer cash collection / field visit date
              </div>
            </div>

            {/* Row 4: Officer in charge & Contact Phone */}
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

            {/* Row 5: Location Address */}
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

            {/* Row 6: Description / Operating Notes */}
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
              {/* Row 1: Center Code & Center Name */}
              <div className="form-group">
                <label className="form-label">Center Code *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  readOnly
                  value={editingCenter.center_code || ''}
                  style={{ backgroundColor: 'var(--ash-100)', cursor: 'not-allowed', fontWeight: 700, fontFamily: 'monospace' }}
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

              {/* Row 2: City / Town & Operating Status */}
              <div className="form-group">
                <label className="form-label">City / Town *</label>
                <input
                  type="text"
                  className="form-input"
                  required
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

              {/* Row 3: Center Due Date & Center Cash Collect Date */}
              <div className="form-group">
                <label className="form-label">Center Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editingCenter.due_date || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, due_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Center Cash Collect Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editingCenter.cash_collect_date || ''}
                  onChange={(e) => setEditingCenter({ ...editingCenter, cash_collect_date: e.target.value })}
                />
              </div>

              {/* Row 4: Officer in Charge & Contact Phone */}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  ...getCenterTheme(selectedCenter.center_code),
                }}
              >
                <span>{selectedCenter.center_code}</span>
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

            {/* Center Due Date & Cash Collect Date Info */}
            {(selectedCenter.due_date || selectedCenter.cash_collect_date) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '12px 14px', background: '#FEF3C7', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                  <span style={{ fontSize: '0.72rem', color: '#92400E', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                    📅 Center Due Date
                  </span>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.92rem', color: '#78350F' }}>
                    {selectedCenter.due_date || 'Not Set'}
                  </p>
                </div>

                <div style={{ padding: '12px 14px', background: '#DCFCE7', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                    💵 Cash Collect Date
                  </span>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.92rem', color: '#14532D' }}>
                    {selectedCenter.cash_collect_date || 'Not Set'}
                  </p>
                </div>
              </div>
            )}

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
                  No customer records currently registered with code {selectedCenter.center_code}.
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
          7. MODAL: ASSIGN CLIENTS TO REGIONAL CENTER
          ========================================================= */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setAssignmentFeedback(null);
          setSelectedClientIds([]);
          if (onNavigate && initialOpenAddClient) {
            onNavigate('centers');
          }
        }}
        title="Assign Client to Regional Center"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Center Selector Card */}
          <div style={{ background: 'var(--ash-50)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--ash-200)' }}>
            <label className="form-label" style={{ fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ash-900)' }}>
              <Building2 size={16} color="var(--primary)" /> Target Regional Center *
            </label>
            <select
              className="form-select-full"
              value={targetCenterForClient?.id || ''}
              onChange={(e) => {
                const found = centers.find((c) => c.id === e.target.value);
                if (found) {
                  setTargetCenterForClient(found);
                  setSelectedClientIds([]);
                  setAssignmentFeedback(null);
                }
              }}
              style={{ fontWeight: 700, fontSize: '0.92rem', padding: '10px 12px' }}
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.center_code} — {c.name} ({c.city})
                </option>
              ))}
            </select>
            {targetCenterForClient && (
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--ash-600)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>🏛️ Center Code: <strong style={{ color: 'var(--ash-800)' }}>{targetCenterForClient.center_code}</strong></span>
                <span>👤 Officer: <strong style={{ color: 'var(--ash-800)' }}>{targetCenterForClient.contact_person || 'N/A'}</strong></span>
                <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  👥 Registered Clients: {modalClientCounts.inCenter}
                </span>
              </div>
            )}
          </div>

          {/* Quick Helper Note / Link to Customer Directory */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: 'var(--ash-600)',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <span>
              ℹ️ Select registered customers from the system directory to link or transfer to this center.
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  setIsAddClientModalOpen(false);
                  onNavigate('customers');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                  fontSize: '0.8rem',
                }}
              >
                <Plus size={13} /> Add New Client to System First →
              </button>
            )}
          </div>

          {/* Feedback Alert */}
          {assignmentFeedback && (
            <div style={{
              background: assignmentFeedback.type === 'error' ? '#FEE2E2' : assignmentFeedback.type === 'info' ? '#EFF6FF' : '#DCFCE7',
              border: `1px solid ${assignmentFeedback.type === 'error' ? '#FCA5A5' : assignmentFeedback.type === 'info' ? '#BFDBFE' : '#86EFAC'}`,
              color: assignmentFeedback.type === 'error' ? '#B91C1C' : assignmentFeedback.type === 'info' ? '#1D4ED8' : '#15803D',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                {assignmentFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                {assignmentFeedback.message}
              </span>
              <button
                type="button"
                onClick={() => setAssignmentFeedback(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Search Bar & Filter Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.84rem' }}
                  placeholder="Filter clients by Name, NIC, Mobile, or Town..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                />
              </div>

              {/* Quick Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn ${clientFilterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setClientFilterType('all')}
                >
                  All ({modalClientCounts.all})
                </button>
                <button
                  type="button"
                  className={`btn ${clientFilterType === 'other' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setClientFilterType('other')}
                >
                  To Assign ({modalClientCounts.other})
                </button>
                <button
                  type="button"
                  className={`btn ${clientFilterType === 'in_center' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setClientFilterType('in_center')}
                >
                  In Center ({modalClientCounts.inCenter})
                </button>
              </div>
            </div>

            {/* Bulk Action Strip (Visible when checkboxes selected) */}
            {selectedClientIds.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 700, color: '#1E40AF' }}>
                  Selected {selectedClientIds.length} customer(s)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={() => setSelectedClientIds([])}
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={handleBatchAssignClients}
                  >
                    <UserPlus size={14} /> Assign Selected ({selectedClientIds.length}) to Center {targetCenterForClient?.center_code}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing Clients Directory Table */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--ash-200)', borderRadius: '10px' }}>
            <table className="custom-table" style={{ margin: 0, fontSize: '0.82rem', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--ash-100)', zIndex: 1 }}>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredClientsForModal.length > 0 &&
                        filteredClientsForModal.every((c) => selectedClientIds.includes(c.id || c.nic || c.customer_id))
                      }
                      onChange={() => handleSelectAllFilteredClients(filteredClientsForModal)}
                      title="Select all visible"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Client Information</th>
                  <th>NIC Identification</th>
                  <th>Mobile Phone</th>
                  <th>Current Center</th>
                  <th style={{ textAlign: 'right' }}>Assignment Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientsForModal.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--ash-500)' }}>
                      No customers match the current filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredClientsForModal.map((c) => {
                    const clientKey = c.id || c.nic || c.customer_id;
                    const isSelected = selectedClientIds.includes(clientKey) || (c.id && selectedClientIds.includes(c.id)) || (c.nic && selectedClientIds.includes(c.nic));
                    const targetCenter = formatCenterCode(targetCenterForClient?.center_code);
                    const cCenter = formatCenterCode(c.center_code);
                    const isCurrentCenter = targetCenterForClient && cCenter === targetCenter;

                    return (
                      <tr
                        key={clientKey}
                        style={{
                          background: isSelected ? '#EFF6FF' : isCurrentCenter ? '#F0FDF4' : undefined,
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectClient(clientKey)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--ash-900)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                            {c.city ? `📍 ${c.city}` : ''} {c.address ? `• ${c.address}` : ''}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--ash-100)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.76rem',
                          }}>
                            {c.nic || c.customer_id || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.phone || 'N/A'}</div>
                          {c.whatsapp && c.whatsapp !== c.phone && (
                            <div style={{ fontSize: '0.7rem', color: '#16A34A' }}>WA: {c.whatsapp}</div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              background: isCurrentCenter ? '#DCFCE7' : c.center_code ? '#FEF3C7' : '#F1F5F9',
                              color: isCurrentCenter ? '#15803D' : c.center_code ? '#B45309' : '#64748B',
                              fontWeight: 700,
                              display: 'inline-block',
                            }}
                          >
                            {c.center_code ? c.center_code : 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isCurrentCenter ? (
                            <span
                              style={{
                                fontSize: '0.76rem',
                                color: '#16A34A',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#DCFCE7',
                                padding: '4px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              <CheckCircle size={14} /> In This Center
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700,
                              }}
                              onClick={() => handleAssignExistingClient(c)}
                            >
                              <UserPlus size={13} /> Assign Here
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--ash-200)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsAddClientModalOpen(false);
                setAssignmentFeedback(null);
                setSelectedClientIds([]);
                if (onNavigate && initialOpenAddClient) {
                  onNavigate('centers');
                }
              }}
            >
              Done / Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
