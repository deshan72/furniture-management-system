import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  CheckCircle,
  X,
  CreditCard,
  DollarSign,
  Users,
  ChevronDown,
  LayoutGrid,
  List,
  Clock,
  Trash2,
  FileText,
  UserPlus,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { formatLKR, formatDate } from '../utils/formatters';
import {
  loadSavedOrders,
  saveOrdersToStorage,
  generateNextPassbookNo,
  buildContractNumber,
} from '../utils/ordersData';
import { loadSavedCustomers, saveCustomersToStorage } from '../utils/customersData';
import { loadSavedProducts } from '../utils/productUtils';
import { INITIAL_CENTERS, formatCenterCode } from '../utils/centersData';

export default function OrdersPage({ headerCenter = 'all' }) {
  // Orders list state
  const [orders, setOrders] = useState(() => loadSavedOrders());
  // Active customers list state
  const [customers, setCustomers] = useState(() => loadSavedCustomers());
  // Products catalog state
  const [products, setProducts] = useState(() => loadSavedProducts());
  // Centers state
  const [centers] = useState(() => {
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
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'installment' | 'cash'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active Loan' | 'Fully Paid'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'amount_desc' | 'balance_desc'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Quick Client Register sub-modal within order placement
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickClient, setQuickClient] = useState({
    first_name: '',
    last_name: '',
    nic: '',
    phone: '',
    city: 'Maharagama',
    address: '',
    branch_code: 'MHG',
    center_code: 'C001',
  });

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCenterCode, setSelectedCenterCode] = useState('C001');
  const [selectedBranchCode, setSelectedBranchCode] = useState('MHG');

  // Product selection (dual search: by Code or by Name)
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  // Contract Number & Passbook
  const [passbookNo, setPassbookNo] = useState('');

  // Payment & Loan terms
  const [paymentType, setPaymentType] = useState('installment'); // 'installment' | 'cash'
  const [downPayment, setDownPayment] = useState(0);
  const [loanFrequency, setLoanFrequency] = useState('monthly'); // 'monthly' | 'weekly'
  const [loanTerms, setLoanTerms] = useState(12);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Sync external changes from localStorage
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e || e.key === 'dnd_orders_list_v2') setOrders(loadSavedOrders());
      if (!e || e.key === 'dnd_customers_list') setCustomers(loadSavedCustomers());
      if (!e || e.key === 'dnd_products_list') setProducts(loadSavedProducts());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Set default center filter if prop headerCenter changes
  useEffect(() => {
    if (headerCenter && headerCenter !== 'all') {
      const parts = headerCenter.split('/');
      if (parts.length === 2) {
        setCenterFilter(parts[1]);
      }
    }
  }, [headerCenter]);

  // Active Customers only (filter for customers with status !== 'inactive')
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => c && c.status !== 'inactive');
  }, [customers]);

  // Selected customer object
  const activeSelectedCustomer = useMemo(() => {
    return activeCustomers.find((c) => c.id === selectedCustomerId || (c.nic && c.nic === selectedCustomerId)) || null;
  }, [activeCustomers, selectedCustomerId]);

  // Selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId || p.item_code === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Total order value computation
  const totalOrderValue = useMemo(() => {
    const q = Number(quantity) || 1;
    const p = Number(unitPrice) || 0;
    return q * p;
  }, [quantity, unitPrice]);

  // Loan Balance to be financed
  const loanBalance = useMemo(() => {
    if (paymentType === 'cash') return 0;
    const dp = Number(downPayment) || 0;
    return Math.max(0, totalOrderValue - dp);
  }, [paymentType, totalOrderValue, downPayment]);

  // Installment value auto-calculation
  const calculatedInstallmentValue = useMemo(() => {
    if (paymentType === 'cash' || loanBalance <= 0) return 0;
    const t = Number(loanTerms) || 1;
    return Math.ceil(loanBalance / t);
  }, [paymentType, loanBalance, loanTerms]);

  // Generated Contract Number: (pn / center code / item code)
  const currentContractNumber = useMemo(() => {
    const pn = passbookNo || 'PN-001';
    const center = selectedCenterCode || 'C001';
    const item = selectedProduct ? selectedProduct.item_code : 'ITEM';
    return buildContractNumber(pn, center, item);
  }, [passbookNo, selectedCenterCode, selectedProduct]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const activeLoans = orders.filter((o) => o.payment_type === 'installment' && Number(o.balance_due) > 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.gross_amount) || 0), 0);
    const totalPendingCredit = orders.reduce((sum, o) => sum + (Number(o.balance_due) || 0), 0);
    const fullyPaidOrders = orders.filter((o) => Number(o.balance_due) <= 0).length;

    return {
      totalOrders,
      activeLoansCount: activeLoans.length,
      totalRevenue,
      totalPendingCredit,
      fullyPaidOrders,
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchInvoice = order.invoice_no?.toLowerCase().includes(q);
          const matchContract = order.contract_no?.toLowerCase().includes(q);
          const matchCustName = order.customer_name?.toLowerCase().includes(q);
          const matchCustNic = (order.customer_nic || order.customer_id)?.toLowerCase().includes(q);
          const matchItem = (order.item_name || order.items_summary)?.toLowerCase().includes(q);
          const matchItemCode = order.item_code?.toLowerCase().includes(q);
          if (!matchInvoice && !matchContract && !matchCustName && !matchCustNic && !matchItem && !matchItemCode) {
            return false;
          }
        }

        // Center Filter
        if (centerFilter !== 'all') {
          const cCode = formatCenterCode(order.center_code);
          const target = formatCenterCode(centerFilter);
          if (cCode !== target) return false;
        }

        // Payment Type Filter
        if (paymentFilter !== 'all') {
          if (order.payment_type !== paymentFilter) return false;
        }

        // Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'Active Loan' && (order.payment_type !== 'installment' || Number(order.balance_due) <= 0)) {
            return false;
          }
          if (statusFilter === 'Fully Paid' && Number(order.balance_due) > 0) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
        }
        if (sortBy === 'amount_desc') {
          return (Number(b.gross_amount) || 0) - (Number(a.gross_amount) || 0);
        }
        if (sortBy === 'balance_desc') {
          return (Number(b.balance_due) || 0) - (Number(a.balance_due) || 0);
        }
        return 0;
      });
  }, [orders, searchQuery, centerFilter, paymentFilter, statusFilter, sortBy]);

  // Open Place New Order Modal
  const handleOpenPlaceOrder = () => {
    const nextPn = generateNextPassbookNo(orders);
    setPassbookNo(nextPn);

    // Default to first active customer if available
    const firstCust = activeCustomers[0] || null;
    setSelectedCustomerId(firstCust ? firstCust.id : '');
    setSelectedCenterCode(firstCust?.center_code || 'C001');
    setSelectedBranchCode(firstCust?.branch_code || 'MHG');
    setDeliveryAddress(firstCust?.address || '');

    // Default to first product if available
    const firstProd = products[0] || null;
    setSelectedProductId(firstProd ? firstProd.id : '');
    setQuantity(1);
    setUnitPrice(firstProd ? firstProd.selling_price : 0);

    // Installment Defaults
    setPaymentType('installment');
    setDownPayment(firstProd ? Math.round(firstProd.selling_price * 0.2) : 20000);
    setLoanFrequency('monthly');
    setLoanTerms(12);

    // Default due date: +30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setFirstDueDate(nextMonth.toISOString().slice(0, 10));

    // Delivery date: +7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDeliveryDate(nextWeek.toISOString().slice(0, 10));

    setPaymentMethod('Bank Transfer');
    setOrderNotes('');
    setShowQuickRegister(false);
    setIsAddModalOpen(true);
  };

  // When customer changes in form
  const handleSelectCustomer = (custId) => {
    setSelectedCustomerId(custId);
    const cust = activeCustomers.find((c) => c.id === custId);
    if (cust) {
      if (cust.center_code) setSelectedCenterCode(formatCenterCode(cust.center_code));
      if (cust.branch_code) setSelectedBranchCode(cust.branch_code);
      if (cust.address) setDeliveryAddress(cust.address);
    }
  };

  // When product changes in form (by Code or by Name)
  const handleSelectProduct = (prodIdOrCode) => {
    const prod = products.find((p) => p.id === prodIdOrCode || p.item_code === prodIdOrCode);
    if (prod) {
      setSelectedProductId(prod.id);
      setUnitPrice(prod.selling_price || 0);
      // Auto-adjust default down payment (20%)
      const calcTotal = (Number(quantity) || 1) * (prod.selling_price || 0);
      setDownPayment(Math.round(calcTotal * 0.2));
    } else {
      setSelectedProductId('');
      setUnitPrice(0);
    }
  };

  // When loan frequency changes, update default terms & due date
  const handleFrequencyChange = (freq) => {
    setLoanFrequency(freq);
    if (freq === 'weekly') {
      setLoanTerms(12); // 12 weeks
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFirstDueDate(nextWeek.toISOString().slice(0, 10));
    } else {
      setLoanTerms(12); // 12 months
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setFirstDueDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  // Quick register a new active client right from the order form
  const handleQuickRegisterClient = (e) => {
    e.preventDefault();
    if (!quickClient.first_name || !quickClient.nic || !quickClient.phone) {
      alert('Please fill in First Name, NIC, and Phone Number.');
      return;
    }

    const cleanNic = quickClient.nic.trim().toUpperCase();
    const existing = customers.find(
      (c) => (c.nic && c.nic.trim().toUpperCase() === cleanNic) || c.customer_id === cleanNic
    );
    if (existing) {
      alert(`Customer with NIC "${cleanNic}" already exists. Selecting them automatically.`);
      setSelectedCustomerId(existing.id);
      setShowQuickRegister(false);
      return;
    }

    const fullName = `${quickClient.first_name} ${quickClient.last_name || ''}`.trim();
    const newCust = {
      id: `cust-${Date.now()}`,
      customer_id: cleanNic,
      branch_code: quickClient.branch_code || 'MHG',
      center_code: formatCenterCode(quickClient.center_code || 'C001'),
      contract_no: '1',
      item_code: '',
      first_name: quickClient.first_name,
      last_name: quickClient.last_name || '',
      name: fullName,
      civil_status: 'Single',
      dob: '',
      phone: quickClient.phone,
      whatsapp: quickClient.phone,
      nic: cleanNic,
      city: quickClient.city || 'Maharagama',
      address: quickClient.address || '',
      category: 'custom_order',
      outstanding_balance: 0,
      total_spent: 0,
      total_orders: 0,
      status: 'active',
      notes: 'Quick registered during order placement',
      created_at: new Date().toISOString(),
    };

    const updatedCustomers = [newCust, ...customers];
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    // Auto-select this newly registered customer
    setSelectedCustomerId(newCust.id);
    setSelectedCenterCode(newCust.center_code);
    setSelectedBranchCode(newCust.branch_code);
    setDeliveryAddress(newCust.address);
    setShowQuickRegister(false);
    alert(`Active Customer "${fullName}" (NIC: ${cleanNic}) registered successfully!`);
  };

  // Submit and Place New Order
  const handlePlaceOrder = (e) => {
    e.preventDefault();

    // 1. Validation: Customer must be active
    if (!activeSelectedCustomer) {
      alert('Please select an active registered customer. Only active clients can place orders.');
      return;
    }

    // 2. Validation: Product must be selected
    if (!selectedProduct) {
      alert('Please select a furniture item from the catalog.');
      return;
    }

    // 3. Validation: Quantities & Amounts
    if (quantity <= 0) {
      alert('Quantity must be at least 1.');
      return;
    }
    if (unitPrice <= 0) {
      alert('Unit price must be greater than zero.');
      return;
    }

    // Check passbook and contract number
    const finalPassbook = (passbookNo || 'PN-001').trim().toUpperCase();
    const finalContract = buildContractNumber(
      finalPassbook,
      selectedCenterCode || activeSelectedCustomer.center_code || 'C001',
      selectedProduct.item_code
    );

    const isInstallment = paymentType === 'installment';
    const finalGross = Number(totalOrderValue);
    const finalAdvance = isInstallment ? Math.min(Number(downPayment) || 0, finalGross) : finalGross;
    const finalBalanceDue = Math.max(0, finalGross - finalAdvance);
    const finalTerms = isInstallment ? Number(loanTerms) || 1 : 1;
    const finalInstallmentVal = isInstallment ? Math.ceil(finalBalanceDue / finalTerms) : 0;

    const newOrder = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      invoice_no: `DS-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      contract_no: finalContract,
      passbook_no: finalPassbook,
      date: new Date().toISOString().slice(0, 10),
      customer_id: activeSelectedCustomer.nic || activeSelectedCustomer.customer_id,
      customer_name: activeSelectedCustomer.name,
      customer_phone: activeSelectedCustomer.phone,
      customer_nic: activeSelectedCustomer.nic || activeSelectedCustomer.customer_id,
      customer_address: deliveryAddress || activeSelectedCustomer.address,
      branch_code: selectedBranchCode || activeSelectedCustomer.branch_code || 'MHG',
      center_code: formatCenterCode(selectedCenterCode || activeSelectedCustomer.center_code || 'C001'),
      item_id: selectedProduct.id,
      item_code: selectedProduct.item_code,
      item_name: selectedProduct.name,
      category: selectedProduct.category,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      gross_amount: finalGross,
      advance_paid: finalAdvance,
      balance_due: finalBalanceDue,
      payment_type: paymentType,
      loan_frequency: isInstallment ? loanFrequency : null,
      loan_terms: finalTerms,
      installment_value: finalInstallmentVal,
      first_due_date: isInstallment ? firstDueDate : null,
      installments_paid: isInstallment && finalBalanceDue <= 0 ? finalTerms : finalAdvance > 0 ? 1 : 0,
      payment_method: paymentMethod,
      delivery_date: deliveryDate,
      status: finalBalanceDue <= 0 ? 'Fully Paid' : 'Active Loan',
      notes: orderNotes || `Order for ${selectedProduct.name}`,
      created_at: new Date().toISOString(),
    };

    // 1. Update Orders list & persistence
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // 2. Update Customer's ledger (outstanding balance & spent)
    const updatedCustomers = customers.map((c) => {
      if (c.id === activeSelectedCustomer.id || c.nic === activeSelectedCustomer.nic) {
        return {
          ...c,
          outstanding_balance: (Number(c.outstanding_balance) || 0) + finalBalanceDue,
          total_spent: (Number(c.total_spent) || 0) + finalGross,
          total_orders: (Number(c.total_orders) || 0) + 1,
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    // 3. Update Product Stock (decrement by ordered quantity)
    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        return {
          ...p,
          stock_quantity: Math.max(0, (Number(p.stock_quantity) || 0) - Number(quantity)),
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    try {
      localStorage.setItem('dnd_products_list', JSON.stringify(updatedProducts));
    } catch {}

    // Close modal & open details view
    setIsAddModalOpen(false);
    setSelectedOrder(newOrder);
    setIsViewModalOpen(true);
  };

  // Record Installment Payment on an active order
  const handleRecordInstallment = (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0 || !selectedOrder) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const currentBal = Number(selectedOrder.balance_due) || 0;
    const newBal = Math.max(0, currentBal - amt);
    const newAdvance = (Number(selectedOrder.advance_paid) || 0) + amt;
    const paidCount = (selectedOrder.installments_paid || 0) + 1;
    const newStatus = newBal <= 0 ? 'Fully Paid' : 'Active Loan';

    const updatedOrder = {
      ...selectedOrder,
      advance_paid: newAdvance,
      balance_due: newBal,
      installments_paid: paidCount,
      status: newStatus,
    };

    // Update in Orders list
    const updatedOrders = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);
    setSelectedOrder(updatedOrder);

    // Update Customer outstanding balance
    const updatedCustomers = customers.map((c) => {
      if (c.nic === selectedOrder.customer_nic || c.id === selectedOrder.customer_id) {
        return {
          ...c,
          outstanding_balance: Math.max(0, (Number(c.outstanding_balance) || 0) - amt),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    alert(`Installment payment of ${formatLKR(amt)} recorded successfully! Remaining balance: ${formatLKR(newBal)}`);
  };

  // Delete Order
  const handleDeleteOrder = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to cancel / remove order with Contract "${contractNo}"?`)) {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrders(updated);
      saveOrdersToStorage(updated);
      if (selectedOrder?.id === orderId) {
        setIsViewModalOpen(false);
      }
    }
  };

  // Export Orders to CSV
  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      alert('No orders to export.');
      return;
    }

    const headers = [
      'Invoice No',
      'Contract No',
      'Date',
      'Customer Name',
      'Customer NIC',
      'Phone',
      'Branch',
      'Center Code',
      'Item Code',
      'Item Name',
      'Payment Type',
      'Loan Frequency',
      'Terms',
      'Installment Value',
      'Gross Amount',
      'Advance Paid',
      'Balance Due',
      'Status',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.invoice_no || ''}"`,
      `"${o.contract_no || ''}"`,
      `"${o.date || ''}"`,
      `"${o.customer_name?.replace(/"/g, '""') || ''}"`,
      `"${o.customer_nic || ''}"`,
      `"${o.customer_phone || ''}"`,
      `"${o.branch_code || ''}"`,
      `"${o.center_code || ''}"`,
      `"${o.item_code || ''}"`,
      `"${o.item_name?.replace(/"/g, '""') || ''}"`,
      `"${o.payment_type || ''}"`,
      `"${o.loan_frequency || ''}"`,
      o.loan_terms || 1,
      o.installment_value || 0,
      o.gross_amount || 0,
      o.advance_paid || 0,
      o.balance_due || 0,
      `"${o.status || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dd_furniture_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for category badge
  const renderCategoryBadge = (cat) => {
    const c = String(cat || '').toLowerCase();
    if (c.includes('wood')) {
      return (
        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
          🪵 Wood (WD)
        </span>
      );
    }
    if (c.includes('melamine')) {
      return (
        <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
          🪚 Melamine (MEL)
        </span>
      );
    }
    return (
      <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
        ⚡ Electrical (ELC)
      </span>
    );
  };

  return (
    <div className="customers-page-container">
      {/* 1. TOP STATS OVERVIEW */}
      <div className="stats-grid">
        <StatCard
          icon={ShoppingCart}
          title="Total Orders"
          value={stats.totalOrders}
          subtitle={`${stats.fullyPaidOrders} fully settled orders`}
        />
        <StatCard
          icon={Clock}
          title="Active Loan Contracts"
          value={stats.activeLoansCount}
          subtitle={`Installment plans in progress`}
        />
        <StatCard
          icon={DollarSign}
          title="Total Order Volume"
          value={formatLKR(stats.totalRevenue)}
          subtitle="Cumulative sales turnover"
        />
        <StatCard
          icon={CreditCard}
          title="Pending Credit Balance"
          value={formatLKR(stats.totalPendingCredit)}
          subtitle="Uncollected loan balance"
        />
      </div>

      {/* 2. FILTER & ACTION BAR */}
      <div className="customers-filter-card">
        <div className="filter-row-primary">
          <div className="filter-search-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by invoice, contract (pn/center/item), customer name, NIC, item code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {/* View switcher */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

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
                    <Download size={16} color="var(--primary)" />
                    <span>Export CSV File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Place New Order Button */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenPlaceOrder}
              style={{ padding: '9px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Place New Order
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns */}
        <div className="filter-row-secondary">
          <select
            className="filter-select"
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
          >
            <option value="all">🏢 All Regional Centers</option>
            {centers.map((c) => (
              <option key={c.id} value={c.center_code}>
                {c.branch_code}/{c.center_code} — {c.name}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">💳 All Payment Types</option>
            <option value="installment">📅 Installment / Loan Contracts</option>
            <option value="cash">💵 Cash / Full Payment</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">📋 All Statuses</option>
            <option value="Active Loan">⏳ Active Loan (Balance Due)</option>
            <option value="Fully Paid">✅ Fully Settled</option>
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">🕒 Most Recent Orders</option>
            <option value="amount_desc">💰 Highest Total Value</option>
            <option value="balance_desc">⚠️ Highest Balance Due</option>
          </select>
        </div>
      </div>

      {/* 3. ORDERS LIST VIEW */}
      <div className="customers-content-wrapper">
        {filteredOrders.length === 0 ? (
          <div className="customers-empty-state">
            <div className="empty-icon-circle">
              <ShoppingCart size={32} />
            </div>
            <h3>No Orders Found</h3>
            <p>No customer orders match your active filter criteria. Click below to place a new order.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenPlaceOrder}
              style={{ marginTop: '12px' }}
            >
              <Plus size={16} /> Place First Order
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice & Contract No</th>
                  <th>Active Client Info</th>
                  <th>Furniture Item</th>
                  <th>Terms & Frequency</th>
                  <th>Order Value</th>
                  <th>Balance Due</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isInstallment = order.payment_type === 'installment';
                  const isPaid = Number(order.balance_due) <= 0;

                  return (
                    <tr key={order.id}>
                      {/* Invoice & Contract Number */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ash-900)' }}>
                            {order.invoice_no}
                          </span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: 'var(--primary)',
                              background: 'var(--primary-tint)',
                              border: '1px solid var(--primary-border)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              maxWidth: 'fit-content',
                            }}
                          >
                            📜 {order.contract_no}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)' }}>
                            {formatDate(order.date)}
                          </span>
                        </div>
                      </td>

                      {/* Client Info */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--ash-900)', fontSize: '0.9rem' }}>
                            {order.customer_name}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                              🆔 {order.customer_nic || order.customer_id}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--ash-600)' }}>
                              📞 {order.customer_phone}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)' }}>
                            📍 Center: {order.branch_code}/{order.center_code}
                          </span>
                        </div>
                      </td>

                      {/* Furniture Item */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                            {order.item_name || order.items_summary}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ash-700)' }}>
                              Code: {order.item_code}
                            </span>
                            {order.quantity > 1 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 600 }}>
                                (Qty: {order.quantity})
                              </span>
                            )}
                            {renderCategoryBadge(order.category)}
                          </div>
                        </div>
                      </td>

                      {/* Terms & Loan Frequency */}
                      <td>
                        {isInstallment ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                              {order.loan_frequency === 'weekly' ? '📅 Weekly Loan' : '🗓️ Monthly Loan'}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--ash-600)' }}>
                              {order.loan_terms} terms • {formatLKR(order.installment_value)}/{order.loan_frequency === 'weekly' ? 'wk' : 'mo'}
                            </span>
                            {order.first_due_date && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--accent-gold)' }}>
                                Due: {formatDate(order.first_due_date)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--ash-600)', fontWeight: 600 }}>
                            💵 Direct Cash Sale
                          </span>
                        )}
                      </td>

                      {/* Order Value */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {formatLKR(order.gross_amount)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                            Adv: {formatLKR(order.advance_paid)}
                          </span>
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: isPaid ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {formatLKR(order.balance_due)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`status-pill ${isPaid ? 'status-active' : 'status-inactive'}`}
                          style={{
                            background: isPaid ? '#DCFCE7' : '#FEF3C7',
                            color: isPaid ? '#15803D' : '#B45309',
                            border: isPaid ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                          }}
                        >
                          {isPaid ? 'Fully Paid' : 'Active Loan'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="icon-btn-action"
                            title="View Order & Loan Schedule"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-action"
                            title="Print Contract & Invoice Receipt"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsPrintModalOpen(true);
                            }}
                          >
                            <Printer size={15} color="var(--accent-gold)" />
                          </button>
                          {!isPaid && (
                            <button
                              type="button"
                              className="icon-btn-action"
                              style={{ color: '#16A34A' }}
                              title="Record Installment Payment"
                              onClick={() => {
                                setSelectedOrder(order);
                                setPaymentAmount(order.installment_value || '');
                                setIsPaymentModalOpen(true);
                              }}
                            >
                              <CreditCard size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-btn-action icon-btn-delete"
                            title="Cancel Order"
                            onClick={() => handleDeleteOrder(order.id, order.contract_no)}
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
          <div className="customer-cards-grid">
            {filteredOrders.map((order) => {
              const isPaid = Number(order.balance_due) <= 0;
              return (
                <div key={order.id} className="customer-card-item">
                  <div className="customer-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>{order.invoice_no}</span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'var(--primary-tint)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}>
                          {order.contract_no}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)' }}>
                        Client: {order.customer_name} (NIC: {order.customer_nic})
                      </span>
                    </div>
                    {renderCategoryBadge(order.category)}
                  </div>

                  <div className="customer-card-body">
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-600)', fontSize: '0.8rem' }}>Item:</span>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{order.item_name} ({order.item_code})</span>
                    </div>
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-600)', fontSize: '0.8rem' }}>Center:</span>
                      <span style={{ fontSize: '0.8rem' }}>{order.branch_code}/{order.center_code}</span>
                    </div>
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-600)', fontSize: '0.8rem' }}>Total Value:</span>
                      <span style={{ fontWeight: 700 }}>{formatLKR(order.gross_amount)}</span>
                    </div>
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-600)', fontSize: '0.8rem' }}>Remaining Balance:</span>
                      <span style={{ fontWeight: 700, color: isPaid ? '#16A34A' : '#DC2626' }}>
                        {formatLKR(order.balance_due)}
                      </span>
                    </div>
                    {order.payment_type === 'installment' && (
                      <div className="customer-card-row" style={{ background: 'var(--ash-50)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--ash-600)' }}>Plan:</span>
                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--primary)' }}>
                          {formatLKR(order.installment_value)} × {order.loan_terms} {order.loan_frequency}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="customer-card-footer">
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isPaid ? '#DCFCE7' : '#FEF3C7',
                        color: isPaid ? '#15803D' : '#B45309',
                      }}
                    >
                      {isPaid ? 'Fully Paid' : 'Active Loan'}
                    </span>
                    <div className="action-btn-group">
                      <button
                        type="button"
                        className="icon-btn-action"
                        title="View Details"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-action"
                        title="Print Invoice"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsPrintModalOpen(true);
                        }}
                      >
                        <Printer size={15} color="var(--accent-gold)" />
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
          4. MODAL: PLACE NEW ORDER & INSTALLMENT CONTRACT
          ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Place New Furniture Order & Contract"
      >
        <form onSubmit={handlePlaceOrder}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* ---------------- STEP 1: ACTIVE CLIENT SELECTION ---------------- */}
            <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="var(--primary)" /> Select Active Customer *
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setShowQuickRegister(!showQuickRegister)}
                >
                  <UserPlus size={13} /> {showQuickRegister ? 'Close Form' : '+ Quick Register Client'}
                </button>
              </div>

              {/* Quick Register Sub-Form if client is not in system yet */}
              {showQuickRegister && (
                <div style={{ background: '#fff', border: '1px solid var(--primary-border)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
                    Quick Register Active Customer
                  </div>
                  <div className="form-grid" style={{ gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Sunil"
                        value={quickClient.first_name}
                        onChange={(e) => setQuickClient({ ...quickClient, first_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Jayawardena"
                        value={quickClient.last_name}
                        onChange={(e) => setQuickClient({ ...quickClient, last_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">NIC (National Identity Card) *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 198512345678"
                        value={quickClient.nic}
                        onChange={(e) => setQuickClient({ ...quickClient, nic: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="077XXXXXXX"
                        value={quickClient.phone}
                        onChange={(e) => setQuickClient({ ...quickClient, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Center</label>
                      <select
                        className="form-select-full"
                        value={`${quickClient.branch_code}/${quickClient.center_code}`}
                        onChange={(e) => {
                          const [b, c] = e.target.value.split('/');
                          setQuickClient({ ...quickClient, branch_code: b, center_code: c });
                        }}
                      >
                        {centers.map((cntr) => (
                          <option key={cntr.id} value={`${cntr.branch_code}/${cntr.center_code}`}>
                            {cntr.branch_code}/{cntr.center_code} — {cntr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-input"
                        value={quickClient.city}
                        onChange={(e) => setQuickClient({ ...quickClient, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '10px', fontSize: '0.78rem', padding: '5px 12px' }}
                    onClick={handleQuickRegisterClient}
                  >
                    Save & Select Customer
                  </button>
                </div>
              )}

              {/* Active Client Dropdown */}
              <select
                className="form-select-full"
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                required
                style={{ fontWeight: 600 }}
              >
                <option value="">-- Choose from Registered Active Clients ({activeCustomers.length}) --</option>
                {activeCustomers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} — NIC: {cust.nic || cust.customer_id} — 📞 {cust.phone} (Center: {cust.branch_code || 'MHG'}/{cust.center_code || 'C001'})
                  </option>
                ))}
              </select>

              {/* Active Client Card Preview */}
              {activeSelectedCustomer ? (
                <div style={{ marginTop: '10px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#14532D', fontSize: '0.9rem' }}>
                      👤 {activeSelectedCustomer.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#166534', color: '#fff', padding: '1px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                      Active Client Verified
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#166534', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>🆔 NIC: <strong>{activeSelectedCustomer.nic || activeSelectedCustomer.customer_id}</strong></span>
                    <span>📞 Phone: <strong>{activeSelectedCustomer.phone}</strong></span>
                    <span>📍 Center: <strong>{selectedBranchCode}/{selectedCenterCode}</strong></span>
                    <span>⚖️ Current Balance: <strong>{formatLKR(activeSelectedCustomer.outstanding_balance)}</strong></span>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#DC2626' }}>
                  ⚠️ Only an active registered client can place an order. Please select a customer above or click "+ Quick Register Client".
                </div>
              )}
            </div>

            {/* ---------------- STEP 2: FURNITURE ITEM SELECTION (Dual Search) ---------------- */}
            <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCart size={16} color="var(--primary)" /> Furniture Item Selection (By Code or By Name) *
              </label>

              <div className="form-grid" style={{ gap: '12px' }}>
                {/* Search / Select by Item Code */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--ash-700)' }}>
                    Select by Item Code
                  </label>
                  <select
                    className="form-select-full"
                    value={selectedProduct ? selectedProduct.item_code : ''}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    style={{ fontWeight: 600, fontFamily: 'monospace' }}
                  >
                    <option value="">-- Choose Item Code --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.item_code}>
                        {p.item_code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search / Select by Product Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--ash-700)' }}>
                    Select by Furniture Name
                  </label>
                  <select
                    className="form-select-full"
                    value={selectedProduct ? selectedProduct.id : ''}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="">-- Choose Furniture Name --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.item_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item Details & Value Auto-Generation */}
              {selectedProduct && (
                <div style={{ marginTop: '12px', background: '#fff', border: '1px solid var(--ash-200)', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedProduct.name}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.76rem', color: 'var(--primary)' }}>
                        {selectedProduct.item_code}
                      </span>
                      {renderCategoryBadge(selectedProduct.category)}
                    </div>
                    <span style={{ fontSize: '0.76rem', color: selectedProduct.stock_quantity > 0 ? '#15803D' : '#DC2626', fontWeight: 600 }}>
                      📦 In Stock: {selectedProduct.stock_quantity} units
                    </span>
                  </div>

                  <div className="form-grid" style={{ gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.76rem' }}>
                        Auto-Generated Item Value / Unit Price (LKR) *
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min="0"
                        step="500"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                        style={{ fontWeight: 700, color: 'var(--primary)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.76rem' }}>Quantity *</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min="1"
                        max="50"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700 }}>
                    <span>Total Item Value:</span>
                    <span style={{ color: 'var(--primary)', fontSize: '1rem' }}>{formatLKR(totalOrderValue)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ---------------- STEP 3: CONTRACT NUMBER (pn/center code/item code) ---------------- */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} /> Official Contract Number — (pn / center code / item code)
                </span>
                <span
                  style={{
                    background: '#1D4ED8',
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {currentContractNumber}
                </span>
              </div>

              <div className="form-grid" style={{ gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.76rem', color: '#1E40AF' }}>
                    Passbook / Proposal No (PN) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. PN-007"
                    value={passbookNo}
                    onChange={(e) => setPassbookNo(e.target.value.toUpperCase())}
                    style={{ fontWeight: 700, fontFamily: 'monospace' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.76rem', color: '#1E40AF' }}>
                    Center Code *
                  </label>
                  <select
                    className="form-select-full"
                    value={selectedCenterCode}
                    onChange={(e) => setSelectedCenterCode(e.target.value)}
                    style={{ fontWeight: 700, fontFamily: 'monospace' }}
                  >
                    {centers.map((c) => (
                      <option key={c.id} value={c.center_code}>
                        {c.center_code} ({c.branch_code} — {c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ---------------- STEP 4: PAYMENT TERMS & LOAN CALCULATOR ---------------- */}
            <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} color="var(--primary)" /> Payment & Loan Terms *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn ${paymentType === 'installment' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                    onClick={() => setPaymentType('installment')}
                  >
                    💳 Installment / Loan
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentType === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                    onClick={() => {
                      setPaymentType('cash');
                      setDownPayment(totalOrderValue);
                    }}
                  >
                    💵 Full Cash Payment
                  </button>
                </div>
              </div>

              {paymentType === 'installment' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-grid" style={{ gap: '10px' }}>
                    {/* Down Payment */}
                    <div className="form-group">
                      <label className="form-label">Down Payment / Advance Received (LKR)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        max={totalOrderValue}
                        step="500"
                        value={downPayment}
                        onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))}
                        style={{ fontWeight: 700 }}
                      />
                    </div>

                    {/* Loan Balance */}
                    <div className="form-group">
                      <label className="form-label">Loan Balance to Finance (LKR)</label>
                      <input
                        type="text"
                        className="form-input"
                        disabled
                        value={formatLKR(loanBalance)}
                        style={{ fontWeight: 700, color: '#DC2626', background: 'var(--ash-100)' }}
                      />
                    </div>

                    {/* Loan Frequency (Weekly vs Monthly) */}
                    <div className="form-group">
                      <label className="form-label">Loan Frequency *</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className={`btn ${loanFrequency === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '7px', fontSize: '0.8rem' }}
                          onClick={() => handleFrequencyChange('monthly')}
                        >
                          🗓️ Monthly
                        </button>
                        <button
                          type="button"
                          className={`btn ${loanFrequency === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '7px', fontSize: '0.8rem' }}
                          onClick={() => handleFrequencyChange('weekly')}
                        >
                          📅 Weekly
                        </button>
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="form-group">
                      <label className="form-label">
                        Terms ({loanFrequency === 'weekly' ? 'Number of Weeks' : 'Number of Months'}) *
                      </label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="1"
                          max="60"
                          value={loanTerms}
                          onChange={(e) => setLoanTerms(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          style={{ fontWeight: 700 }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {loanFrequency === 'monthly' ? (
                            <>
                              {[3, 6, 12, 18].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className={`btn ${loanTerms === t ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                                  onClick={() => setLoanTerms(t)}
                                >
                                  {t}M
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              {[4, 8, 12, 16].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className={`btn ${loanTerms === t ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                                  onClick={() => setLoanTerms(t)}
                                >
                                  {t}W
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Generated Installment Value Box */}
                  <div
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.76rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>
                        Auto-Calculated Installment Value
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#B45309' }}>
                        {formatLKR(calculatedInstallmentValue)} / {loanFrequency === 'weekly' ? 'week' : 'month'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#78350F' }}>
                        {loanTerms} installments × {formatLKR(calculatedInstallmentValue)} = {formatLKR(loanBalance)} total loan
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.74rem', color: '#92400E' }}>First Due Date:</span>
                      <input
                        type="date"
                        className="form-input"
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.78rem', marginTop: '4px' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '8px', padding: '12px 14px', color: '#166534' }}>
                  <div style={{ fontWeight: 700 }}>💵 Full Payment Sale: {formatLKR(totalOrderValue)}</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                    Full payment received today. Order will be marked as fully settled upon checkout.
                  </div>
                </div>
              )}
            </div>

            {/* ---------------- STEP 5: DELIVERY & NOTES ---------------- */}
            <div className="form-grid" style={{ gap: '10px' }}>
              <div className="form-group full-width">
                <label className="form-label">Delivery Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street, City"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Delivery Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method for Advance</label>
                <select
                  className="form-select-full"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Special Order Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Special polish finish, delivery instructions, guarantor info..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!activeSelectedCustomer || !selectedProduct}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle size={16} /> Confirm & Place Order
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          5. MODAL: VIEW ORDER DETAILS & REPAYMENT SCHEDULE
          ========================================================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedOrder ? `Order Details - ${selectedOrder.invoice_no}` : 'Order Details'}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Bar with Contract and Status */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--ash-50)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--ash-200)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)', textTransform: 'uppercase' }}>
                  Contract Number
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                  📜 {selectedOrder.contract_no}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)', textTransform: 'uppercase' }}>
                  Status
                </span>
                <div>
                  <span
                    style={{
                      background: Number(selectedOrder.balance_due) <= 0 ? '#DCFCE7' : '#FEF3C7',
                      color: Number(selectedOrder.balance_due) <= 0 ? '#15803D' : '#B45309',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                    }}
                  >
                    {Number(selectedOrder.balance_due) <= 0 ? 'Fully Settled' : 'Active Loan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Client & Product Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#fff', border: '1px solid var(--ash-200)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Customer
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 700, marginTop: '4px' }}>
                  {selectedOrder.customer_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                  🆔 NIC: {selectedOrder.customer_nic || selectedOrder.customer_id}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ash-600)' }}>
                  📞 {selectedOrder.customer_phone}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '4px' }}>
                  📍 Center: {selectedOrder.branch_code}/{selectedOrder.center_code}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--ash-200)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Furniture Item
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 700, marginTop: '4px' }}>
                  {selectedOrder.item_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ash-700)', fontFamily: 'monospace' }}>
                  Code: {selectedOrder.item_code} (Qty: {selectedOrder.quantity})
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                  Total: {formatLKR(selectedOrder.gross_amount)}
                </div>
              </div>
            </div>

            {/* Loan Terms & Repayment Status */}
            {selectedOrder.payment_type === 'installment' && (
              <div style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.76rem', color: '#854D0E', fontWeight: 700, textTransform: 'uppercase' }}>
                      Loan & Installment Terms
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#A16207' }}>
                      {formatLKR(selectedOrder.installment_value)} / {selectedOrder.loan_frequency === 'weekly' ? 'week' : 'month'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#713F12' }}>
                      {selectedOrder.loan_terms} total installments ({selectedOrder.loan_frequency} plan)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#854D0E' }}>Balance Remaining:</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#DC2626' }}>
                      {formatLKR(selectedOrder.balance_due)}
                    </div>
                    {Number(selectedOrder.balance_due) > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.74rem', marginTop: '6px' }}
                        onClick={() => {
                          setPaymentAmount(selectedOrder.installment_value || '');
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <CreditCard size={12} /> Pay Installment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="modal-actions" style={{ marginTop: '10px' }}>
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
                  setIsPrintModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Contract & Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: RECORD INSTALLMENT PAYMENT
          ========================================================= */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={selectedOrder ? `Record Payment - ${selectedOrder.contract_no}` : 'Record Payment'}
      >
        {selectedOrder && (
          <form onSubmit={handleRecordInstallment}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px' }}>
                <div>Client: <strong>{selectedOrder.customer_name}</strong></div>
                <div>NIC: <strong>{selectedOrder.customer_nic}</strong></div>
                <div>Current Balance: <strong style={{ color: '#DC2626' }}>{formatLKR(selectedOrder.balance_due)}</strong></div>
                <div>Installment Due: <strong>{formatLKR(selectedOrder.installment_value)}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  min="1"
                  max={selectedOrder.balance_due}
                  step="100"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={15} /> Confirm Payment & Update Ledger
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: PRINT INVOICE & CONTRACT (PDF / PRINT VIEW)
          ========================================================= */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={selectedOrder ? `Print Bill & Contract - ${selectedOrder.contract_no}` : 'Print Invoice'}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              id="printable-bill"
              style={{
                background: '#fff',
                padding: '24px',
                border: '1px solid var(--ash-300)',
                borderRadius: '8px',
                color: '#1e293b',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo.jpg" alt="D&S Logo" style={{ height: '48px', width: 'auto', borderRadius: '4px' }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      D&S FURNITURE WORKSHOP & SHOWROOM
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Solid Teak, Mahogany & Melamine Masters • Regional Center: {selectedOrder.branch_code}/{selectedOrder.center_code}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>INVOICE / CONTRACT</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{selectedOrder.invoice_no}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>
                    {selectedOrder.contract_no}
                  </div>
                </div>
              </div>

              {/* Customer & Contract Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: '3px' }}>CUSTOMER DETAILS</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedOrder.customer_name}</div>
                  <div>🆔 NIC: <strong>{selectedOrder.customer_nic || selectedOrder.customer_id}</strong></div>
                  <div>📞 Phone: {selectedOrder.customer_phone}</div>
                  <div>📍 Address: {selectedOrder.customer_address || 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: '3px' }}>CONTRACT SPECIFICATIONS</div>
                  <div>Date: {formatDate(selectedOrder.date)}</div>
                  <div>Passbook (PN): <strong>{selectedOrder.passbook_no}</strong></div>
                  <div>Center Code: <strong>{selectedOrder.center_code}</strong></div>
                  <div>Payment Plan: <strong>{selectedOrder.payment_type === 'installment' ? `${selectedOrder.loan_terms} ${selectedOrder.loan_frequency} installments` : 'Cash Full Payment'}</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', margin: '12px 0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Item Code</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Furniture Description</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>{selectedOrder.item_code}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{selectedOrder.item_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{selectedOrder.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatLKR(selectedOrder.unit_price)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{formatLKR(selectedOrder.gross_amount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals & Loan Terms */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <div style={{ width: '280px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Total:</span>
                    <strong>{formatLKR(selectedOrder.gross_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Down Payment / Advance:</span>
                    <strong>{formatLKR(selectedOrder.advance_paid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', color: '#dc2626', fontWeight: 800 }}>
                    <span>Balance Due:</span>
                    <span>{formatLKR(selectedOrder.balance_due)}</span>
                  </div>
                  {selectedOrder.payment_type === 'installment' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginTop: '4px', fontSize: '0.78rem' }}>
                      <span>Installment:</span>
                      <strong>{formatLKR(selectedOrder.installment_value)} / {selectedOrder.loan_frequency}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #475569', width: '160px', marginBottom: '4px' }}></div>
                  <div>Customer Signature (NIC Verified)</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #475569', width: '160px', marginBottom: '4px' }}></div>
                  <div>Authorized Branch Officer Signature</div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print / Save as PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
