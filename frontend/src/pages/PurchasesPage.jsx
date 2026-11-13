import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Filter,
  Download,
  Printer,
  Calendar,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Zap,
  Building,
  Phone,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  X,
  Truck,
  Check,
  List,
  LayoutGrid,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import {
  loadSavedPurchases,
  savePurchasesToStorage,
  generateNextPONumber,
  generateNextGRNNumber,
  SUPPLIER_CATEGORIES,
  PRESET_SUPPLIERS,
} from '../utils/purchasesData';
import { addLiveNotification } from '../utils/notificationsData';
import { printHtmlDocument } from '../utils/printUtils';
import { formatLKR, formatDate } from '../utils/formatters';

export default function PurchasesPage({ onNavigate }) {
  // Master purchases list
  const [purchases, setPurchases] = useState(() => loadSavedPurchases());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Form state for new purchase
  const [newPurchase, setNewPurchase] = useState({
    po_number: '',
    grn_number: '',
    date: new Date().toISOString().slice(0, 10),
    supplier_name: '',
    supplier_phone: '',
    supplier_city: 'Moratuwa',
    supplier_invoice_no: '',
    category: 'timber',
    item_description: '',
    quantity: '1',
    unit: 'cu.ft',
    unit_cost: '',
    paid_amount: '',
    payment_method: 'Bank Transfer',
    destination_workshop: 'Moratuwa Main Workshop',
    received_by: 'Workshop Supervisor',
    notes: '',
  });

  // Edit form state
  const [editPurchase, setEditPurchase] = useState(null);

  // Auto-save to localStorage whenever purchases change
  useEffect(() => {
    savePurchasesToStorage(purchases);
  }, [purchases]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e || e.key === 'dnd_purchases_list_v1') {
        setPurchases(loadSavedPurchases());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Open Add Modal with fresh auto-generated PO & GRN numbers
  const handleOpenAddModal = () => {
    const nextPO = generateNextPONumber(purchases);
    const nextGRN = generateNextGRNNumber(purchases);
    setNewPurchase({
      po_number: nextPO,
      grn_number: nextGRN,
      date: new Date().toISOString().slice(0, 10),
      supplier_name: PRESET_SUPPLIERS[0]?.name || '',
      supplier_phone: PRESET_SUPPLIERS[0]?.phone || '',
      supplier_city: PRESET_SUPPLIERS[0]?.city || 'Moratuwa',
      supplier_invoice_no: '',
      category: 'timber',
      item_description: '',
      quantity: '10',
      unit: 'cu.ft',
      unit_cost: '4500',
      paid_amount: '',
      payment_method: 'Bank Transfer',
      destination_workshop: 'Moratuwa Main Workshop',
      received_by: 'Master Carpenter Bandara',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCount = purchases.length;
    let totalSpend = 0;
    let totalPaid = 0;
    let totalBalanceDue = 0;
    let timberSpend = 0;
    let melamineSpend = 0;
    let hardwareSpend = 0;

    purchases.forEach((p) => {
      const gross = Number(p.total_cost) || 0;
      const paid = Number(p.paid_amount) || 0;
      const balance = Number(p.balance_due) || 0;

      totalSpend += gross;
      totalPaid += paid;
      totalBalanceDue += balance;

      const cat = (p.category || '').toLowerCase();
      if (cat === 'timber') timberSpend += gross;
      else if (cat === 'melamine') melamineSpend += gross;
      else if (cat === 'hardware') hardwareSpend += gross;
    });

    return {
      totalCount,
      totalSpend,
      totalPaid,
      totalBalanceDue,
      timberSpend,
      melamineSpend,
      hardwareSpend,
    };
  }, [purchases]);

  // Filtered and Sorted Purchases
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            p.po_number?.toLowerCase().includes(q) ||
            p.grn_number?.toLowerCase().includes(q) ||
            p.supplier_name?.toLowerCase().includes(q) ||
            p.supplier_invoice_no?.toLowerCase().includes(q) ||
            p.item_description?.toLowerCase().includes(q) ||
            p.received_by?.toLowerCase().includes(q) ||
            p.destination_workshop?.toLowerCase().includes(q);

          if (!matches) return false;
        }

        // Category Filter
        if (categoryFilter !== 'all') {
          if ((p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'paid' && Number(p.balance_due) > 0) return false;
          if (statusFilter === 'due' && Number(p.balance_due) <= 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cost_desc') {
          return (Number(b.total_cost) || 0) - (Number(a.total_cost) || 0);
        }
        if (sortBy === 'cost_asc') {
          return (Number(a.total_cost) || 0) - (Number(b.total_cost) || 0);
        }
        if (sortBy === 'supplier_asc') {
          return (a.supplier_name || '').localeCompare(b.supplier_name || '');
        }
        // recent by default
        return new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0);
      });
  }, [purchases, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSortBy('recent');
  };

  const isFilterActive =
    searchQuery.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'recent';

  // Handle Preset Supplier Selection in Add Form
  const handleSelectPresetSupplier = (supplierName) => {
    const found = PRESET_SUPPLIERS.find((s) => s.name === supplierName);
    if (found) {
      const catObj = SUPPLIER_CATEGORIES.find((c) => c.id === found.defaultCategory);
      setNewPurchase((prev) => ({
        ...prev,
        supplier_name: found.name,
        supplier_phone: found.phone,
        supplier_city: found.city,
        category: found.defaultCategory || prev.category,
        unit: catObj?.defaultUnit || prev.unit,
      }));
    } else {
      setNewPurchase((prev) => ({ ...prev, supplier_name: supplierName }));
    }
  };

  // Submit New Purchase Record
  const handleSaveNewPurchase = (e) => {
    e.preventDefault();
    if (!newPurchase.supplier_name || !newPurchase.item_description) {
      alert('Please enter Supplier Name and Material Description.');
      return;
    }

    const qty = Number(newPurchase.quantity) || 1;
    const unitPrice = Number(newPurchase.unit_cost) || 0;
    const grossTotal = qty * unitPrice;

    let paid = newPurchase.paid_amount !== '' ? Number(newPurchase.paid_amount) : grossTotal;
    if (isNaN(paid) || paid < 0) paid = 0;
    if (paid > grossTotal) paid = grossTotal;

    const balanceDue = Math.max(0, grossTotal - paid);

    let status = 'Paid in Full';
    if (balanceDue > 0) {
      status = paid > 0 ? 'Partial Advance' : 'Credit Due';
    }

    const createdRecord = {
      id: `pur-${Date.now()}`,
      po_number: newPurchase.po_number || generateNextPONumber(purchases),
      grn_number: newPurchase.grn_number || generateNextGRNNumber(purchases),
      date: newPurchase.date || new Date().toISOString().slice(0, 10),
      supplier_name: newPurchase.supplier_name.trim(),
      supplier_phone: newPurchase.supplier_phone.trim(),
      supplier_city: newPurchase.supplier_city.trim() || 'Moratuwa',
      supplier_invoice_no: newPurchase.supplier_invoice_no?.trim() || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      category: newPurchase.category || 'timber',
      item_description: newPurchase.item_description.trim(),
      quantity: qty,
      unit: newPurchase.unit || 'cu.ft',
      unit_cost: unitPrice,
      total_cost: grossTotal,
      paid_amount: paid,
      balance_due: balanceDue,
      payment_status: status,
      payment_method: newPurchase.payment_method || 'Bank Transfer',
      destination_workshop: newPurchase.destination_workshop || 'Moratuwa Main Workshop',
      received_by: newPurchase.received_by?.trim() || 'Workshop Supervisor',
      notes: newPurchase.notes?.trim() || '',
      created_at: new Date().toISOString(),
    };

    const updated = [createdRecord, ...purchases];
    setPurchases(updated);
    savePurchasesToStorage(updated);

    addLiveNotification({
      type: 'order_created',
      title: `Stock Purchase Received: ${createdRecord.po_number}`,
      message: `${createdRecord.item_description} (${createdRecord.quantity} ${createdRecord.unit}) received from ${createdRecord.supplier_name} - ${formatLKR(createdRecord.total_cost)}.`,
      badge: 'Purchasing',
      linkTab: 'purchases',
    });

    setIsAddModalOpen(false);
    alert(`✅ Purchase Order ${createdRecord.po_number} / ${createdRecord.grn_number} saved successfully!`);
  };

  // Open Edit Purchase Modal
  const handleOpenEdit = (purchase) => {
    setEditPurchase({ ...purchase });
    setIsEditModalOpen(true);
  };

  // Save Edited Purchase
  const handleSaveEditPurchase = (e) => {
    e.preventDefault();
    if (!editPurchase) return;

    const qty = Number(editPurchase.quantity) || 1;
    const unitPrice = Number(editPurchase.unit_cost) || 0;
    const grossTotal = qty * unitPrice;

    let paid = editPurchase.paid_amount !== '' ? Number(editPurchase.paid_amount) : grossTotal;
    if (isNaN(paid) || paid < 0) paid = 0;
    if (paid > grossTotal) paid = grossTotal;

    const balanceDue = Math.max(0, grossTotal - paid);

    let status = 'Paid in Full';
    if (balanceDue > 0) {
      status = paid > 0 ? 'Partial Advance' : 'Credit Due';
    }

    const updatedItem = {
      ...editPurchase,
      quantity: qty,
      unit_cost: unitPrice,
      total_cost: grossTotal,
      paid_amount: paid,
      balance_due: balanceDue,
      payment_status: status,
    };

    const updated = purchases.map((p) => (p.id === updatedItem.id ? updatedItem : p));
    setPurchases(updated);
    savePurchasesToStorage(updated);

    if (selectedPurchase?.id === updatedItem.id) {
      setSelectedPurchase(updatedItem);
    }

    setIsEditModalOpen(false);
    setEditPurchase(null);
  };

  // Delete Purchase Record
  const handleDeletePurchase = (id, poNumber) => {
    if (window.confirm(`Are you sure you want to delete purchase record ${poNumber}?`)) {
      const updated = purchases.filter((p) => p.id !== id);
      setPurchases(updated);
      savePurchasesToStorage(updated);
      if (selectedPurchase?.id === id) {
        setIsViewModalOpen(false);
      }
    }
  };

  // Export Purchases to CSV
  const handleExportCSV = () => {
    if (!filteredPurchases.length) {
      alert('No purchases to export.');
      return;
    }

    const headers = [
      'PO Number',
      'GRN Number',
      'Purchase Date',
      'Supplier Name',
      'Supplier Phone',
      'Supplier Invoice No',
      'Category',
      'Item Description',
      'Quantity',
      'Unit',
      'Unit Cost (LKR)',
      'Total Value (LKR)',
      'Paid Amount (LKR)',
      'Balance Due (LKR)',
      'Payment Status',
      'Payment Method',
      'Destination Workshop',
      'Received By',
      'Notes',
    ];

    const rows = filteredPurchases.map((p) => [
      `"${p.po_number || ''}"`,
      `"${p.grn_number || ''}"`,
      `"${p.date || ''}"`,
      `"${p.supplier_name?.replace(/"/g, '""') || ''}"`,
      `"${p.supplier_phone || ''}"`,
      `"${p.supplier_invoice_no || ''}"`,
      `"${p.category || ''}"`,
      `"${p.item_description?.replace(/"/g, '""') || ''}"`,
      p.quantity || 0,
      `"${p.unit || ''}"`,
      p.unit_cost || 0,
      p.total_cost || 0,
      p.paid_amount || 0,
      p.balance_due || 0,
      `"${p.payment_status || ''}"`,
      `"${p.payment_method || ''}"`,
      `"${p.destination_workshop || ''}"`,
      `"${p.received_by?.replace(/"/g, '""') || ''}"`,
      `"${p.notes?.replace(/"/g, '""') || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dns_stock_purchases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Inward Goods / Purchases Report
  const handlePrintReport = () => {
    if (!filteredPurchases.length) {
      alert('No purchases to print.');
      return;
    }

    const rowsHtml = filteredPurchases.map((p, idx) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1; font-family: monospace; font-weight: 700; color: #1E4D8C;">${p.po_number}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1;">${formatDate(p.purchase_date)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1;"><strong>${p.supplier_name}</strong></td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1;">${p.item_description}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1; text-align: center;">${p.quantity} ${p.unit}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1; text-align: right; font-weight: 700;">${formatLKR(p.total_amount)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #CBD5E1; text-align: center;">${p.payment_status}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Stock Purchases Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1E293B; margin: 0; padding: 20px; font-size: 11px; }
            .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #1E4D8C; padding-bottom: 10px; margin-bottom: 16px; }
            .company-title { font-size: 20px; font-weight: 900; color: #1E4D8C; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5px; }
            th { background: #F1F5F9; border-bottom: 2px solid #94A3B8; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h1 class="company-title">D N S HOME SOLUTIONS</h1>
              <div>Stock Purchases & Inward Goods (GRN) Manifest</div>
            </div>
            <div style="text-align: right; font-size: 10px; color: #64748B;">
              <div>Date: ${new Date().toLocaleDateString('en-GB')}</div>
              <div>Records: ${filteredPurchases.length} Purchase(s)</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>PO Number</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Materials / Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Total Cost</th>
                <th style="text-align: center;">Payment</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: 'DNS_Purchases_Report' });
  };

  // Category Badge Render Helper
  const renderCategoryBadge = (category) => {
    switch (category?.toLowerCase()) {
      case 'timber':
        return (
          <span
            className="status-badge"
            style={{ background: '#FDF4ED', color: '#9A3412', border: '1px solid #FED7AA', fontWeight: 700 }}
          >
            🪵 Raw Timber
          </span>
        );
      case 'melamine':
        return (
          <span
            className="status-badge"
            style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 700 }}
          >
            📋 Melamine
          </span>
        );
      case 'hardware':
        return (
          <span
            className="status-badge"
            style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', fontWeight: 700 }}
          >
            🔩 Hardware
          </span>
        );
      case 'finishes':
        return (
          <span
            className="status-badge"
            style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', fontWeight: 700 }}
          >
            🎨 Polish & Lacquer
          </span>
        );
      case 'upholstery':
        return (
          <span
            className="status-badge"
            style={{ background: '#FDF2F8', color: '#BE185D', border: '1px solid #FBCFE8', fontWeight: 700 }}
          >
            🛋️ Foam & Fabric
          </span>
        );
      case 'electrical':
        return (
          <span
            className="status-badge"
            style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', fontWeight: 700 }}
          >
            ⚡ Electrical
          </span>
        );
      default:
        return (
          <span className="status-badge" style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}>
            📦 Consumables
          </span>
        );
    }
  };

  // Payment Status Badge Helper
  const renderPaymentBadge = (status, balanceDue = 0) => {
    if (balanceDue <= 0) {
      return (
        <span className="status-badge badge-settled">
          <CheckCircle size={12} /> Paid in Full
        </span>
      );
    }
    if (status === 'Partial Advance') {
      return (
        <span
          className="status-badge"
          style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', fontWeight: 700 }}
        >
          <Clock size={12} /> Partial ({formatLKR(balanceDue)} due)
        </span>
      );
    }
    return (
      <span className="status-badge badge-debt">
        <AlertTriangle size={12} /> Credit Due ({formatLKR(balanceDue)})
      </span>
    );
  };

  return (
    <div className="purchases-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* =========================================================
          1. STATS OVERVIEW CARDS
          ========================================================= */}
      <div className="stats-grid">
        <StatCard
          title="Total Procurement Spend"
          value={formatLKR(stats.totalSpend)}
          subtitle="Cumulative workshop materials bought"
          icon={DollarSign}
          color="var(--primary)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Inward Shipments (GRNs)"
          value={`${stats.totalCount} Orders`}
          subtitle="Verified goods receipts"
          icon={Truck}
          color="var(--success)"
          bg="var(--success-tint)"
        />
        <StatCard
          title="Raw Timber Spend"
          value={formatLKR(stats.timberSpend)}
          subtitle="Teak, Mahogany & log procurements"
          icon={Layers}
          color="#9A3412"
          bg="#FDF4ED"
        />
        <StatCard
          title="Supplier Credit Balance"
          value={formatLKR(stats.totalBalanceDue)}
          subtitle={stats.totalBalanceDue > 0 ? 'Pending payment settlements' : 'All supplier bills settled'}
          icon={AlertTriangle}
          color={stats.totalBalanceDue > 0 ? '#DC2626' : 'var(--success)'}
          bg={stats.totalBalanceDue > 0 ? '#FEF2F2' : 'var(--success-tint)'}
        />
      </div>

      {/* =========================================================
          2. FILTER & SEARCH CONTROL CARD
          ========================================================= */}
      <div className="filter-card">
        {/* Row 1: Search + Actions */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={18} />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by PO # (PO-2026-081), Supplier Name, Invoice No, Material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="filter-search-clear" onClick={() => setSearchQuery('')} title="Clear Search">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {/* Reset Filters */}
            {isFilterActive && (
              <button
                className="btn btn-secondary"
                onClick={handleResetFilters}
                title="Reset all filters"
                style={{ padding: '9px 14px', fontSize: '0.84rem' }}
              >
                <RotateCcw size={15} /> Reset
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
                    <FileSpreadsheet size={16} color="var(--success)" />
                    <span>Export Purchases as CSV (Excel)</span>
                  </button>
                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      handlePrintReport();
                      setIsExportMenuOpen(false);
                    }}
                  >
                    <Printer size={16} color="var(--primary)" />
                    <span>Print Inward Goods Report</span>
                  </button>
                </div>
              )}
            </div>

            {/* + Record New Purchase */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{ padding: '9px 18px', fontSize: '0.86rem', gap: '8px' }}
            >
              <Plus size={16} /> Record New Purchase (GRN)
            </button>
          </div>
        </div>

        {/* Row 2: Select Dropdowns */}
        <div className="filter-row-secondary">
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">📦 All Material Categories</option>
            <option value="timber">🪵 Raw Timber & Logs</option>
            <option value="melamine">📋 Melamine Boards & Plywood</option>
            <option value="hardware">🔩 Hardware & Fittings</option>
            <option value="finishes">🎨 Polish & Lacquers</option>
            <option value="upholstery">🛋️ Foam & Fabric</option>
            <option value="electrical">⚡ Smart Electrical</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">💳 All Payment Statuses</option>
            <option value="paid">✅ Paid in Full</option>
            <option value="due">⚠️ Outstanding Credit Due</option>
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">⏱️ Date: Most Recent</option>
            <option value="cost_desc">💰 Value: High to Low</option>
            <option value="cost_asc">💵 Value: Low to High</option>
            <option value="supplier_asc">🔤 Supplier: A to Z</option>
          </select>
        </div>

        {/* Row 3: Quick Filter Chips */}
        <div className="filter-row-chips">
          <div className="filter-chips-list">
            <span className="filter-chips-label">Quick Filters:</span>

            <button
              className={`filter-chip-btn ${categoryFilter === 'all' && statusFilter === 'all' ? 'active' : ''}`}
              onClick={handleResetFilters}
            >
              All Purchases <span className="filter-count-badge">{purchases.length}</span>
            </button>

            <button
              className={`filter-chip-btn ${categoryFilter === 'timber' ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'timber' ? 'all' : 'timber')}
            >
              🪵 Raw Timber
            </button>

            <button
              className={`filter-chip-btn ${categoryFilter === 'melamine' ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'melamine' ? 'all' : 'melamine')}
            >
              📋 Melamine
            </button>

            <button
              className={`filter-chip-btn ${categoryFilter === 'hardware' ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'hardware' ? 'all' : 'hardware')}
            >
              🔩 Hardware & Hinges
            </button>

            <button
              className={`filter-chip-btn ${statusFilter === 'due' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'due' ? 'all' : 'due')}
            >
              <AlertTriangle size={12} color="#DC2626" /> Credit Due
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--ash-500)', fontWeight: 500 }}>
            Showing <strong>{filteredPurchases.length}</strong> of {purchases.length} purchases
          </div>
        </div>
      </div>

      {/* =========================================================
          3. PURCHASES TABLE / CARDS PANEL
          ========================================================= */}
      <div className="table-wrapper">
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={19} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ash-900)' }}>
              Inward Stock Receipts & Supplier Purchases
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--ash-500)', fontWeight: 500 }}>
              ({filteredPurchases.length} records)
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} /> Table View
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards Grid View"
            >
              <LayoutGrid size={14} /> Cards View
            </button>
          </div>
        </div>

        {/* View Mode 1: Table View */}
        {viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>PO / GRN No</th>
                  <th style={{ width: '220px' }}>Supplier Details</th>
                  <th>Category</th>
                  <th style={{ width: '280px' }}>Material Specifications</th>
                  <th style={{ textAlign: 'center' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                  <th style={{ textAlign: 'center' }}>Payment Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty-state">
                        <ShoppingCart size={42} color="var(--ash-400)" />
                        <h4 style={{ color: 'var(--ash-900)' }}>No purchase orders found</h4>
                        <p style={{ color: 'var(--ash-500)', fontSize: '0.84rem' }}>
                          Try adjusting your search terms or record a new raw material shipment.
                        </p>
                        <button className="btn btn-secondary" onClick={handleResetFilters}>
                          Reset All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((pur) => {
                    return (
                      <tr key={pur.id}>
                        {/* PO & GRN */}
                        <td>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  color: 'var(--primary)',
                                  fontSize: '0.84rem',
                                }}
                              >
                                {pur.po_number}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                              <span>{pur.grn_number}</span> • <span>{formatDate(pur.date)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Supplier Info */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ash-900)', fontSize: '0.86rem' }}>
                              {pur.supplier_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                              <span>📞 {pur.supplier_phone || 'N/A'}</span>
                              {pur.supplier_invoice_no && (
                                <>
                                  <span>•</span>
                                  <span style={{ fontFamily: 'monospace' }}>Bill: {pur.supplier_invoice_no}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>{renderCategoryBadge(pur.category)}</td>

                        {/* Material Specs */}
                        <td>
                          <div>
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ash-900)', display: 'block' }}>
                              {pur.item_description}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px', display: 'block' }}>
                              Dest: {pur.destination_workshop} • Rec: {pur.received_by}
                            </span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              background: 'var(--ash-100)',
                              border: '1px solid var(--ash-300)',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              color: 'var(--ash-900)',
                            }}
                          >
                            {pur.quantity} {pur.unit}
                          </span>
                        </td>

                        {/* Total Cost */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--ash-900)' }}>
                            {formatLKR(pur.total_cost)}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.70rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                            @ {formatLKR(pur.unit_cost)} / {pur.unit}
                          </span>
                        </td>

                        {/* Payment Status */}
                        <td style={{ textAlign: 'center' }}>
                          {renderPaymentBadge(pur.payment_status, pur.balance_due)}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="icon-btn-action"
                              title="View Purchase Voucher & Invoice"
                              onClick={() => {
                                setSelectedPurchase(pur);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="icon-btn-action"
                              title="Edit Purchase Record"
                              onClick={() => handleOpenEdit(pur)}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="icon-btn-action icon-btn-delete"
                              title="Delete Record"
                              onClick={() => handleDeletePurchase(pur.id, pur.po_number)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* View Mode 2: Cards Grid View */
          <div className="customer-cards-grid">
            {filteredPurchases.map((pur) => {
              return (
                <div key={pur.id} className="customer-card-item">
                  <div className="customer-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {pur.po_number}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>({pur.grn_number})</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                        {formatDate(pur.date)}
                      </div>
                    </div>
                    {renderCategoryBadge(pur.category)}
                  </div>

                  <div className="customer-card-body">
                    {/* Supplier */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Supplier:</span>
                      <span style={{ fontWeight: 700, color: 'var(--ash-900)' }}>{pur.supplier_name}</span>
                    </div>

                    {/* Material Specs */}
                    <div style={{ margin: '6px 0', padding: '8px 10px', background: 'var(--ash-50)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                        Material & Description:
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ash-900)' }}>
                        {pur.item_description}
                      </span>
                    </div>

                    {/* Quantity & Unit Cost */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Quantity:</span>
                      <span style={{ fontWeight: 700, color: 'var(--ash-900)' }}>
                        {pur.quantity} {pur.unit} (@ {formatLKR(pur.unit_cost)})
                      </span>
                    </div>

                    {/* Total Value */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Total Cost:</span>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                        {formatLKR(pur.total_cost)}
                      </span>
                    </div>

                    {/* Payment Status */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Payment Status:</span>
                      {renderPaymentBadge(pur.payment_status, pur.balance_due)}
                    </div>
                  </div>

                  <div className="customer-card-footer">
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '5px' }}
                      onClick={() => {
                        setSelectedPurchase(pur);
                        setIsViewModalOpen(true);
                      }}
                    >
                      <Eye size={13} color="var(--primary)" /> View Voucher
                    </button>

                    <div className="action-btn-group">
                      <button
                        className="icon-btn-action"
                        title="Edit Purchase"
                        onClick={() => handleOpenEdit(pur)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="icon-btn-action icon-btn-delete"
                        title="Delete Purchase"
                        onClick={() => handleDeletePurchase(pur.id, pur.po_number)}
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
          4. MODAL: RECORD NEW INWARD GOODS / PURCHASE (GRN)
          ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="📥 Record New Raw Material Purchase (GRN)"
      >
        <form onSubmit={handleSaveNewPurchase}>
          <div className="form-grid">
            {/* Row 1: PO & GRN Numbers */}
            <div className="form-group">
              <label className="form-label">Purchase Order (PO) # *</label>
              <input
                type="text"
                className="form-input"
                required
                value={newPurchase.po_number}
                onChange={(e) => setNewPurchase({ ...newPurchase, po_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Goods Received Note (GRN) # *</label>
              <input
                type="text"
                className="form-input"
                required
                value={newPurchase.grn_number}
                onChange={(e) => setNewPurchase({ ...newPurchase, grn_number: e.target.value })}
              />
            </div>

            {/* Row 2: Purchase Date & Invoice No */}
            <div className="form-group">
              <label className="form-label">Purchase Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={newPurchase.date}
                onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier Bill / Invoice #</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. INV-9842"
                value={newPurchase.supplier_invoice_no}
                onChange={(e) => setNewPurchase({ ...newPurchase, supplier_invoice_no: e.target.value })}
              />
            </div>

            {/* Row 3: Supplier Selection & Phone */}
            <div className="form-group">
              <label className="form-label">Supplier Name *</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Moratuwa Timber Depot & Mills"
                  value={newPurchase.supplier_name}
                  onChange={(e) => setNewPurchase({ ...newPurchase, supplier_name: e.target.value })}
                  list="preset-suppliers-list"
                />
                <datalist id="preset-suppliers-list">
                  {PRESET_SUPPLIERS.map((s) => (
                    <option key={s.name} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Supplier Contact Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 077-8899112"
                value={newPurchase.supplier_phone}
                onChange={(e) => setNewPurchase({ ...newPurchase, supplier_phone: e.target.value })}
              />
            </div>

            {/* Row 4: Material Category & Unit */}
            <div className="form-group">
              <label className="form-label">Material Category *</label>
              <select
                className="form-select-full"
                value={newPurchase.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  const catObj = SUPPLIER_CATEGORIES.find((c) => c.id === cat);
                  setNewPurchase({
                    ...newPurchase,
                    category: cat,
                    unit: catObj?.defaultUnit || 'Units',
                  });
                }}
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. cu.ft, Sheets, Sets, Gallons, Rolls"
                value={newPurchase.unit}
                onChange={(e) => setNewPurchase({ ...newPurchase, unit: e.target.value })}
              />
            </div>

            {/* Row 5: Material Description */}
            <div className="form-group full-width">
              <label className="form-label">Material Description & Dimensions / Quality Specs *</label>
              <textarea
                className="form-input"
                rows="2"
                required
                placeholder="e.g. Ceylon Teak 2x4 planed planks (Moisture below 12%) for Dining Table production batch"
                value={newPurchase.item_description}
                onChange={(e) => setNewPurchase({ ...newPurchase, item_description: e.target.value })}
              />
            </div>

            {/* Row 6: Quantity & Unit Cost */}
            <div className="form-group">
              <label className="form-label">Quantity Received *</label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                className="form-input"
                placeholder="10"
                value={newPurchase.quantity}
                onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit Cost (LKR) *</label>
              <input
                type="number"
                min="0"
                required
                className="form-input"
                placeholder="4500"
                value={newPurchase.unit_cost}
                onChange={(e) => setNewPurchase({ ...newPurchase, unit_cost: e.target.value })}
              />
            </div>

            {/* Cost Summary Box */}
            <div
              className="full-width"
              style={{
                background: 'var(--ash-50)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Calculated Gross Total:
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {formatLKR((Number(newPurchase.quantity) || 0) * (Number(newPurchase.unit_cost) || 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ash-600)', textAlign: 'right' }}>
                Formula: {newPurchase.quantity || 0} {newPurchase.unit} × {formatLKR(newPurchase.unit_cost || 0)}
              </div>
            </div>

            {/* Row 7: Paid Amount & Payment Method */}
            <div className="form-group">
              <label className="form-label">Amount Paid Now (LKR)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="Leave blank for Paid in Full"
                value={newPurchase.paid_amount}
                onChange={(e) => setNewPurchase({ ...newPurchase, paid_amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select-full"
                value={newPurchase.payment_method}
                onChange={(e) => setNewPurchase({ ...newPurchase, payment_method: e.target.value })}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit">Credit / Account</option>
              </select>
            </div>

            {/* Row 8: Destination Workshop & Receiver */}
            <div className="form-group">
              <label className="form-label">Destination Workshop</label>
              <select
                className="form-select-full"
                value={newPurchase.destination_workshop}
                onChange={(e) => setNewPurchase({ ...newPurchase, destination_workshop: e.target.value })}
              >
                <option value="Moratuwa Main Workshop">Moratuwa Main Workshop</option>
                <option value="Maharagama Carpentry Hub">Maharagama Carpentry Hub</option>
                <option value="Negombo Showroom Depot">Negombo Showroom Depot</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Received & Inspected By</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Master Carpenter Bandara"
                value={newPurchase.received_by}
                onChange={(e) => setNewPurchase({ ...newPurchase, received_by: e.target.value })}
              />
            </div>

            {/* Row 9: Notes */}
            <div className="form-group full-width">
              <label className="form-label">Procurement & Storage Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Stacked in Yard B, moisture 11%, batch reserved for Dining Suite orders"
                value={newPurchase.notes}
                onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '9px 20px', fontWeight: 700 }}>
              <CheckCircle size={16} /> Save Purchase & Record GRN
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          5. MODAL: VIEW PURCHASE VOUCHER & INWARD GOODS DETAILS
          ========================================================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedPurchase ? `Purchase Order Voucher: ${selectedPurchase.po_number}` : 'Purchase Details'}
      >
        {selectedPurchase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Voucher Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1E4D8C 0%, #143661 100%)',
                color: '#fff',
                padding: '18px 22px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                  OFFICIAL GOODS RECEIVED NOTE
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace' }}>
                  {selectedPurchase.po_number}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                  GRN Reference: <strong>{selectedPurchase.grn_number}</strong> • Date: <strong>{formatDate(selectedPurchase.date)}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.8 }}>TOTAL ORDER VALUE</span>
                <div style={{ fontSize: '1.45rem', fontWeight: 900 }}>{formatLKR(selectedPurchase.total_cost)}</div>
                <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                  {selectedPurchase.balance_due > 0 ? (
                    <span style={{ color: '#FCA5A5', fontWeight: 700 }}>Due: {formatLKR(selectedPurchase.balance_due)}</span>
                  ) : (
                    <span style={{ color: '#86EFAC', fontWeight: 700 }}>● Fully Paid</span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid 2x2 Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Supplier Box */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                  SUPPLIER INFORMATION
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '4px' }}>
                  {selectedPurchase.supplier_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ash-600)', marginTop: '4px' }}>
                  📞 {selectedPurchase.supplier_phone || 'N/A'} • 📍 {selectedPurchase.supplier_city || 'Sri Lanka'}
                </div>
                {selectedPurchase.supplier_invoice_no && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--ash-700)', marginTop: '4px' }}>
                    Supplier Bill/Invoice: <strong>{selectedPurchase.supplier_invoice_no}</strong>
                  </div>
                )}
              </div>

              {/* Delivery Destination */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                  WORKSHOP DESTINATION
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '4px' }}>
                  {selectedPurchase.destination_workshop}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ash-600)', marginTop: '4px' }}>
                  Received By: <strong>{selectedPurchase.received_by}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ash-700)', marginTop: '4px' }}>
                  Method: <strong>{selectedPurchase.payment_method}</strong>
                </div>
              </div>
            </div>

            {/* Material Specifications */}
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                  MATERIAL & SPECIFICATIONS
                </span>
                {renderCategoryBadge(selectedPurchase.category)}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                {selectedPurchase.item_description}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.84rem' }}>
                <div>
                  <span style={{ color: 'var(--ash-500)' }}>Quantity: </span>
                  <strong>{selectedPurchase.quantity} {selectedPurchase.unit}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ash-500)' }}>Unit Rate: </span>
                  <strong>{formatLKR(selectedPurchase.unit_cost)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ash-500)' }}>Paid: </span>
                  <strong style={{ color: 'var(--success)' }}>{formatLKR(selectedPurchase.paid_amount)}</strong>
                </div>
              </div>
              {selectedPurchase.notes && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--ash-600)', fontStyle: 'italic' }}>
                  Notes: {selectedPurchase.notes}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!selectedPurchase) return;
                  const voucherHtml = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8" />
                        <title>Purchase Voucher - ${selectedPurchase.po_number}</title>
                        <style>
                          @page { size: A5 landscape; margin: 10mm; }
                          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1E293B; margin: 0; padding: 16px; font-size: 11px; }
                          .v-box { border: 2px solid #1E4D8C; border-radius: 8px; padding: 14px; }
                          .v-header { display: flex; justify-content: space-between; border-bottom: 2px solid #1E4D8C; padding-bottom: 8px; margin-bottom: 12px; }
                          .v-title { font-size: 18px; font-weight: 900; color: #1E4D8C; margin: 0; }
                          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
                          .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; }
                          .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
                          .sig-line { border-bottom: 1px solid #475569; width: 140px; height: 30px; }
                        </style>
                      </head>
                      <body>
                        <div class="v-box">
                          <div class="v-header">
                            <div>
                              <h2 class="v-title">D N S HOME SOLUTIONS</h2>
                              <div style="font-size: 10px; color: #64748B;">Official Inward Goods & Purchase Voucher</div>
                            </div>
                            <div style="text-align: right; font-size: 10px;">
                              <div><strong>PO #:</strong> ${selectedPurchase.po_number}</div>
                              <div><strong>GRN #:</strong> ${selectedPurchase.grn_number}</div>
                              <div><strong>Date:</strong> ${formatDate(selectedPurchase.purchase_date)}</div>
                            </div>
                          </div>

                          <div class="grid">
                            <div class="card">
                              <strong>Supplier:</strong> ${selectedPurchase.supplier_name}<br />
                              <span>Contact: ${selectedPurchase.supplier_contact || 'N/A'}</span>
                            </div>
                            <div class="card" style="text-align: right;">
                              <strong>Total Amount:</strong> ${formatLKR(selectedPurchase.total_amount)}<br />
                              <span style="color: #10B981; font-weight: 700;">Paid: ${formatLKR(selectedPurchase.paid_amount)}</span>
                            </div>
                          </div>

                          <div class="card" style="margin-bottom: 12px;">
                            <strong>Description:</strong> ${selectedPurchase.item_description} (${selectedPurchase.quantity} ${selectedPurchase.unit} @ ${formatLKR(selectedPurchase.unit_cost)})
                            ${selectedPurchase.notes ? `<div style="font-size: 9.5px; color: #64748B; margin-top: 4px;">Note: ${selectedPurchase.notes}</div>` : ''}
                          </div>

                          <div class="signatures">
                            <div>
                              <div class="sig-line"></div>
                              <div style="font-size: 9px; margin-top: 4px;">Goods Received By</div>
                            </div>
                            <div>
                              <div class="sig-line"></div>
                              <div style="font-size: 9px; margin-top: 4px;">Workshop Supervisor</div>
                            </div>
                            <div>
                              <div class="sig-line"></div>
                              <div style="font-size: 9px; margin-top: 4px;">Authorized Manager</div>
                            </div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `;
                  printHtmlDocument(voucherHtml, { title: `DNS_Voucher_${selectedPurchase.po_number}` });
                }}
                style={{ gap: '6px' }}
              >
                <Printer size={15} /> Print Voucher
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: EDIT PURCHASE RECORD
          ========================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editPurchase ? `Edit Purchase - ${editPurchase.po_number}` : 'Edit Purchase'}
      >
        {editPurchase && (
          <form onSubmit={handleSaveEditPurchase}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editPurchase.supplier_name || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, supplier_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={editPurchase.supplier_phone || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, supplier_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Invoice / Bill #</label>
                <input
                  type="text"
                  className="form-input"
                  value={editPurchase.supplier_invoice_no || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, supplier_invoice_no: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editPurchase.date || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, date: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Material Description *</label>
                <textarea
                  className="form-input"
                  rows="2"
                  required
                  value={editPurchase.item_description || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, item_description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={editPurchase.quantity || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, quantity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Cost (LKR)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editPurchase.unit_cost || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, unit_cost: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Paid Amount (LKR)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editPurchase.paid_amount || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, paid_amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select-full"
                  value={editPurchase.payment_method || 'Bank Transfer'}
                  onChange={(e) => setEditPurchase({ ...editPurchase, payment_method: e.target.value })}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Credit / Account</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={editPurchase.notes || ''}
                  onChange={(e) => setEditPurchase({ ...editPurchase, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

