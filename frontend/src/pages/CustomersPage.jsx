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
  Calendar,
  CreditCard,
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
    name: 'Sunil Jayawardena',
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
    name: 'Chamari Perera',
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
    name: 'Nimal Karunaratne',
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
    name: 'Dilshan Fernando (Beach Resort)',
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
    name: 'Kasun Madushanka',
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
    name: 'Priyantha Wickramasinghe',
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

export default function CustomersPage({ initialDebtFilter = 'all' }) {
  // Customers List State (with local storage persistence)
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_customers_list');
      if (saved) return JSON.parse(saved);
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

  // Form State for Add Customer
  const [newCustomer, setNewCustomer] = useState({
    name: '',
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
          // Merge or set if backend has records
          setCustomers(res.data);
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
        // 1. Text Search (Name, Phone, WhatsApp, NIC, City, Address, Notes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            cust.name?.toLowerCase().includes(q) ||
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
  }, [customers, searchQuery, debtFilter, categoryFilter, cityFilter, sortBy]);

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

  // Add new customer handler
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      alert('Please fill in Customer Name and Phone Number.');
      return;
    }

    const createdRecord = {
      id: `cust-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      whatsapp: newCustomer.whatsapp || newCustomer.phone,
      nic: newCustomer.nic,
      city: newCustomer.city || 'Maharagama',
      address: newCustomer.address,
      category: newCustomer.category || 'custom_order',
      outstanding_balance: Number(newCustomer.outstanding_balance) || 0,
      total_spent: Number(newCustomer.outstanding_balance) || 0,
      total_orders: 1,
      notes: newCustomer.notes,
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
    setNewCustomer({
      name: '',
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

    const headers = ['Name', 'Phone', 'WhatsApp', 'NIC', 'City', 'Address', 'Category', 'Outstanding Balance (LKR)', 'Notes'];
    const rows = filteredCustomers.map((c) => [
      `"${c.name?.replace(/"/g, '""') || ''}"`,
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
          <title>D & D Furniture - Customer Directory & Credit Ledger Report</title>
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
                <div class="brand-title">D & D FURNITURE SYSTEM</div>
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
              <div class="summary-label">Accounts with Debt (ණය ඇති)</div>
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
            <span>D & D Furniture System - Confidential Official Ledger</span>
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
    setEditingCustomer({ ...customer });
    setIsEditModalOpen(true);
  };

  // Save Updated Customer Details
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer?.name || !editingCustomer?.phone) {
      alert('Please fill in Customer Name and Phone Number.');
      return;
    }

    const updated = {
      ...editingCustomer,
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
            <Hammer size={12} /> Custom Made (ඇණවුම්)
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
          title="Outstanding Balances (ණය)"
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
              onClick={() => setIsAddModalOpen(true)}
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
            <option value="debt">⚠️ With Debt Only (ණය ඇති අය)</option>
            <option value="settled">✅ Fully Settled (ණය රහිත)</option>
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
              Pending Balances (ණය ඇති අය)
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
                            <span className="customer-name">{cust.name}</span>
                            <div className="customer-meta">
                              {cust.nic && <span className="nic-pill">NIC: {cust.nic}</span>}
                              <span>Added {new Date(cust.created_at || Date.now()).toLocaleDateString()}</span>
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
                        <span className="customer-name" style={{ fontSize: '0.95rem' }}>{cust.name}</span>
                        <div className="customer-meta">
                          {cust.nic && <span className="nic-pill">NIC: {cust.nic}</span>}
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
            <div className="form-group full-width">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Sunil Jayawardena"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="077XXXXXXX"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="077XXXXXXX"
                value={newCustomer.whatsapp}
                onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">NIC (National Identity Card)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 198512345678 or 851234567V"
                value={newCustomer.nic}
                onChange={(e) => setNewCustomer({ ...newCustomer, nic: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">City / Town</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Maharagama, Kottawa, Negombo"
                value={newCustomer.city}
                onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Full Delivery Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="House No, Street, Road, City"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Category</label>
              <select
                className="form-select-full"
                value={newCustomer.category}
                onChange={(e) => setNewCustomer({ ...newCustomer, category: e.target.value })}
              >
                <option value="custom_order">Custom Made Furniture (ඇණවුම්)</option>
                <option value="showroom">Showroom / Ready Stock</option>
                <option value="wholesale">Commercial / Wholesale</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Outstanding Balance (LKR)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                min="0"
                step="500"
                value={newCustomer.outstanding_balance}
                onChange={(e) => setNewCustomer({ ...newCustomer, outstanding_balance: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Wood / Furniture Preferences & Notes</label>
              <textarea
                className="form-textarea"
                placeholder="e.g., Requested Teak wood living room suite, delivery promised for October 25th."
                value={newCustomer.notes}
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedCustomer.name}</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  {renderCategoryBadge(selectedCustomer.category)}
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
                  OUTSTANDING CREDIT BALANCE (හිඟ මුදල්)
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
              <div className="form-group full-width">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Sunil Jayawardena"
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
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
                  <option value="custom_order">Custom Made Furniture (ඇණවුම්)</option>
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
