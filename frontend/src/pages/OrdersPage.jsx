import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Printer,
  X,
  CreditCard,
  LayoutGrid,
  List,
  Trash2,
  FileText,
  UserPlus,
  CheckCircle,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  Eye,
  ArrowRight,
  Clock,
  RotateCcw,
} from 'lucide-react';
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
  // Orders, customers, products and centers data
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [customers, setCustomers] = useState(() => loadSavedCustomers());
  const [products, setProducts] = useState(() => loadSavedProducts());
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

  // Main Page Filters & View Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paid'
  const [viewMode, setViewMode] = useState('table'); // Default to professional Table View

  // Modals
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Selected Order for viewing details, printing, or paying
  const [activeSelectedOrder, setActiveSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Quick Register Customer inside Add Order Modal
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

  // ==========================================
  // ADD NEW ORDER FORM STATE
  // ==========================================
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCenterCode, setFormCenterCode] = useState('C001');
  const [formBranchCode, setFormBranchCode] = useState('MHG');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');

  const [formProductId, setFormProductId] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitPrice, setFormUnitPrice] = useState(0);

  // Autocomplete Search & Suggestions state for Code & Name
  const [codeSearchText, setCodeSearchText] = useState('');
  const [nameSearchText, setNameSearchText] = useState('');
  const [isCodeDropdownOpen, setIsCodeDropdownOpen] = useState(false);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);

  const [formPassbookNo, setFormPassbookNo] = useState('');
  const [formPaymentType, setFormPaymentType] = useState('installment'); // 'installment' | 'cash'
  const [formDownPayment, setFormDownPayment] = useState(0);
  const [formLoanFrequency, setFormLoanFrequency] = useState('monthly'); // 'monthly' | 'weekly'
  const [formLoanTerms, setFormLoanTerms] = useState(12);
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');

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

  // Filter for active registered clients only
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => c && c.status !== 'inactive');
  }, [customers]);

  // Form: Currently selected active customer
  const formSelectedCustomer = useMemo(() => {
    return activeCustomers.find((c) => c.id === formCustomerId || (c.nic && c.nic === formCustomerId)) || null;
  }, [activeCustomers, formCustomerId]);

  // Form: Currently selected product
  const formSelectedProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId || p.item_code === formProductId) || null;
  }, [products, formProductId]);

  // Form: Auto-calculated Gross Order Total
  const formGrossTotal = useMemo(() => {
    return (Number(formQuantity) || 1) * (Number(formUnitPrice) || 0);
  }, [formQuantity, formUnitPrice]);

  // Form: Loan Balance calculation
  const formLoanBalance = useMemo(() => {
    if (formPaymentType === 'cash') return 0;
    return Math.max(0, formGrossTotal - (Number(formDownPayment) || 0));
  }, [formPaymentType, formGrossTotal, formDownPayment]);

  // Form: Auto-calculated Installment Value
  const formCalculatedInstallment = useMemo(() => {
    if (formPaymentType === 'cash' || formLoanBalance <= 0) return 0;
    const t = Number(formLoanTerms) || 1;
    return Math.ceil(formLoanBalance / t);
  }, [formPaymentType, formLoanBalance, formLoanTerms]);

  // Form: Real-time Contract Code (pn / center code / item code)
  const formContractCode = useMemo(() => {
    const pn = formPassbookNo || 'PN-001';
    const center = formCenterCode || 'C001';
    const item = formSelectedProduct ? formSelectedProduct.item_code : 'WD-001';
    return buildContractNumber(pn, center, item);
  }, [formPassbookNo, formCenterCode, formSelectedProduct]);

  // Suggestions for Code search (suggests matching items by item_code)
  const codeSuggestions = useMemo(() => {
    if (!codeSearchText.trim()) return products;
    const q = codeSearchText.toLowerCase().trim();
    return products.filter(
      (p) => p.item_code?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
  }, [products, codeSearchText]);

  // Suggestions for Name search (suggests matching items by product name)
  const nameSuggestions = useMemo(() => {
    if (!nameSearchText.trim()) return products;
    const q = nameSearchText.toLowerCase().trim();
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.item_code?.toLowerCase().includes(q)
    );
  }, [products, nameSearchText]);

  // Select a product from suggestions or direct selection
  const handleSelectProduct = (prod) => {
    if (prod) {
      setFormProductId(prod.id);
      setFormUnitPrice(prod.selling_price || 0);
      setCodeSearchText(prod.item_code || '');
      setNameSearchText(prod.name || '');
      const total = (Number(formQuantity) || 1) * (prod.selling_price || 0);
      setFormDownPayment(Math.round(total * 0.2));
    } else {
      setFormProductId('');
      setFormUnitPrice(0);
      setCodeSearchText('');
      setNameSearchText('');
      setFormDownPayment(0);
    }
    setIsCodeDropdownOpen(false);
    setIsNameDropdownOpen(false);
  };

  // Open "Add New Order" Modal & Initialize Defaults
  const handleOpenAddOrderModal = () => {
    const nextPn = generateNextPassbookNo(orders);
    setFormPassbookNo(nextPn);

    const firstCust = activeCustomers[0] || null;
    if (firstCust) {
      setFormCustomerId(firstCust.id);
      setFormCenterCode(formatCenterCode(firstCust.center_code || 'C001'));
      setFormBranchCode(firstCust.branch_code || 'MHG');
      setFormDeliveryAddress(firstCust.address || '');
    } else {
      setFormCustomerId('');
    }

    const firstProd = products[0] || null;
    if (firstProd) {
      setFormProductId(firstProd.id);
      setCodeSearchText(firstProd.item_code || '');
      setNameSearchText(firstProd.name || '');
      setFormUnitPrice(firstProd.selling_price || 0);
      setFormQuantity(1);
      setFormDownPayment(Math.round((firstProd.selling_price || 0) * 0.2));
    } else {
      setFormProductId('');
      setCodeSearchText('');
      setNameSearchText('');
      setFormUnitPrice(0);
      setFormQuantity(1);
      setFormDownPayment(0);
    }

    setFormPaymentType('installment');
    setFormLoanFrequency('monthly');
    setFormLoanTerms(12);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setFormFirstDueDate(nextMonth.toISOString().slice(0, 10));

    setFormPaymentMethod('Cash');
    setFormNotes('');
    setShowQuickRegister(false);
    setIsCodeDropdownOpen(false);
    setIsNameDropdownOpen(false);
    setIsAddOrderModalOpen(true);
  };

  // When customer changes in form
  const handleFormSelectCustomer = (custId) => {
    setFormCustomerId(custId);
    const cust = activeCustomers.find((c) => c.id === custId);
    if (cust) {
      if (cust.center_code) setFormCenterCode(formatCenterCode(cust.center_code));
      if (cust.branch_code) setFormBranchCode(cust.branch_code);
      if (cust.address) setFormDeliveryAddress(cust.address);
    }
  };

  // When loan frequency changes
  const handleFormFrequencyChange = (freq) => {
    setFormLoanFrequency(freq);
    if (freq === 'weekly') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFormFirstDueDate(nextWeek.toISOString().slice(0, 10));
    } else {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setFormFirstDueDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  // Quick percent preset for down payment
  const handleSetDownPaymentPercent = (pct) => {
    const calculated = Math.round(formGrossTotal * (pct / 100));
    setFormDownPayment(calculated);
  };

  // Quick Register Customer inside Modal
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
      alert(`Customer with NIC "${cleanNic}" already exists. Selected automatically.`);
      setFormCustomerId(existing.id);
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
      notes: 'Registered during order creation',
      created_at: new Date().toISOString(),
    };

    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveCustomersToStorage(updated);

    setFormCustomerId(newCust.id);
    setFormCenterCode(newCust.center_code);
    setFormBranchCode(newCust.branch_code);
    setFormDeliveryAddress(newCust.address);
    setShowQuickRegister(false);
  };

  // Submit and Place Order
  const handleConfirmPlaceOrder = (andPrint = false) => {
    if (!formSelectedCustomer) {
      alert('Please select an active registered customer. Only active clients can place orders.');
      return;
    }
    if (!formSelectedProduct) {
      alert('Please select a furniture item.');
      return;
    }

    const finalPassbook = (formPassbookNo || 'PN-001').trim().toUpperCase();
    const finalContract = buildContractNumber(
      finalPassbook,
      formCenterCode || formSelectedCustomer.center_code || 'C001',
      formSelectedProduct.item_code
    );

    const isInstallment = formPaymentType === 'installment';
    const finalGross = Number(formGrossTotal);
    const finalAdvance = isInstallment ? Math.min(Number(formDownPayment) || 0, finalGross) : finalGross;
    const finalBalanceDue = Math.max(0, finalGross - finalAdvance);
    const finalTerms = isInstallment ? Number(formLoanTerms) || 1 : 1;
    const finalInstallmentVal = isInstallment ? Math.ceil(finalBalanceDue / finalTerms) : 0;

    const newOrder = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      invoice_no: `DS-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      contract_no: finalContract,
      passbook_no: finalPassbook,
      date: new Date().toISOString().slice(0, 10),
      customer_id: formSelectedCustomer.nic || formSelectedCustomer.customer_id,
      customer_name: formSelectedCustomer.name,
      customer_phone: formSelectedCustomer.phone,
      customer_nic: formSelectedCustomer.nic || formSelectedCustomer.customer_id,
      customer_address: formDeliveryAddress || formSelectedCustomer.address,
      branch_code: formBranchCode || formSelectedCustomer.branch_code || 'MHG',
      center_code: formatCenterCode(formCenterCode || formSelectedCustomer.center_code || 'C001'),
      item_id: formSelectedProduct.id,
      item_code: formSelectedProduct.item_code,
      item_name: formSelectedProduct.name,
      category: formSelectedProduct.category,
      quantity: Number(formQuantity),
      unit_price: Number(formUnitPrice),
      gross_amount: finalGross,
      advance_paid: finalAdvance,
      balance_due: finalBalanceDue,
      payment_type: formPaymentType,
      loan_frequency: isInstallment ? formLoanFrequency : null,
      loan_terms: finalTerms,
      installment_value: finalInstallmentVal,
      first_due_date: isInstallment ? formFirstDueDate : null,
      installments_paid: isInstallment && finalBalanceDue <= 0 ? finalTerms : finalAdvance > 0 ? 1 : 0,
      payment_method: formPaymentMethod,
      status: finalBalanceDue <= 0 ? 'Fully Paid' : 'Active Loan',
      notes: formNotes || `Order for ${formSelectedProduct.name}`,
      created_at: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // Update customer stats
    const updatedCustomers = customers.map((c) => {
      if (c.id === formSelectedCustomer.id) {
        return {
          ...c,
          outstanding_balance: (c.outstanding_balance || 0) + finalBalanceDue,
          total_spent: (c.total_spent || 0) + finalGross,
          total_orders: (c.total_orders || 0) + 1,
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    setIsAddOrderModalOpen(false);

    if (andPrint) {
      setActiveSelectedOrder(newOrder);
      setIsPrintModalOpen(true);
    } else {
      setActiveSelectedOrder(newOrder);
      setIsViewDetailsModalOpen(true);
    }
  };

  // Record Installment Payment
  const handleRecordInstallment = (e) => {
    e.preventDefault();
    if (!activeSelectedOrder) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amt > activeSelectedOrder.balance_due) {
      alert(`Amount exceeds balance due of ${formatLKR(activeSelectedOrder.balance_due)}.`);
      return;
    }

    const newBal = Math.max(0, activeSelectedOrder.balance_due - amt);
    const newPaidCount = (activeSelectedOrder.installments_paid || 0) + 1;
    const newStatus = newBal <= 0 ? 'Fully Paid' : 'Active Loan';

    const updatedOrders = orders.map((o) => {
      if (o.id === activeSelectedOrder.id) {
        return {
          ...o,
          balance_due: newBal,
          advance_paid: (o.advance_paid || 0) + amt,
          installments_paid: newPaidCount,
          status: newStatus,
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // Update customer outstanding balance
    const updatedCustomers = customers.map((c) => {
      if (c.nic === activeSelectedOrder.customer_nic || c.id === activeSelectedOrder.customer_id) {
        return {
          ...c,
          outstanding_balance: Math.max(0, (c.outstanding_balance || 0) - amt),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    const updatedCurrent = {
      ...activeSelectedOrder,
      balance_due: newBal,
      advance_paid: (activeSelectedOrder.advance_paid || 0) + amt,
      status: newStatus,
    };
    setActiveSelectedOrder(updatedCurrent);

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    alert(`Installment of ${formatLKR(amt)} recorded! Remaining balance: ${formatLKR(newBal)}`);
  };

  // Cancel / Delete Order
  const handleDeleteOrder = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to cancel order "${contractNo}"?`)) {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrders(updated);
      saveOrdersToStorage(updated);
      if (activeSelectedOrder && activeSelectedOrder.id === orderId) {
        setIsViewDetailsModalOpen(false);
        setActiveSelectedOrder(null);
      }
    }
  };

  // Export CSV
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
      'NIC',
      'Phone',
      'Center',
      'Item Code',
      'Item Name',
      'Total Value',
      'Advance',
      'Balance Due',
      'Status',
    ];
    const rows = filteredOrders.map((o) => [
      `"${o.invoice_no}"`,
      `"${o.contract_no}"`,
      `"${o.date}"`,
      `"${o.customer_name}"`,
      `"${o.customer_nic}"`,
      `"${o.customer_phone}"`,
      `"${o.branch_code}/${o.center_code}"`,
      `"${o.item_code}"`,
      `"${o.item_name}"`,
      o.gross_amount,
      o.advance_paid,
      o.balance_due,
      `"${o.status}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = order.invoice_no?.toLowerCase().includes(q);
        const matchContract = order.contract_no?.toLowerCase().includes(q);
        const matchCust = order.customer_name?.toLowerCase().includes(q);
        const matchNic = (order.customer_nic || order.customer_id)?.toLowerCase().includes(q);
        const matchItem = (order.item_name || order.items_summary)?.toLowerCase().includes(q);
        const matchCode = order.item_code?.toLowerCase().includes(q);
        if (!matchInvoice && !matchContract && !matchCust && !matchNic && !matchItem && !matchCode) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'active' && Number(order.balance_due) <= 0) return false;
      if (statusFilter === 'paid' && Number(order.balance_due) > 0) return false;

      // Header Center filter
      if (headerCenter && headerCenter !== 'all') {
        const parts = headerCenter.split('/');
        if (parts.length === 2 && formatCenterCode(order.center_code) !== formatCenterCode(parts[1])) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, headerCenter]);

  const activeLoansCount = orders.filter((o) => Number(o.balance_due) > 0).length;
  const settledCount = orders.filter((o) => Number(o.balance_due) <= 0).length;

  // Cumulative totals for the table view
  const filteredTotalValue = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.gross_amount) || 0), 0);
  }, [filteredOrders]);

  const filteredTotalBalance = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.balance_due) || 0), 0);
  }, [filteredOrders]);

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* =========================================================
          1. HEADER: CLEAN, PROMINENT "+ Add New Order" BUTTON
          ========================================================= */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--ash-200)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={24} color="var(--primary)" /> Orders & Invoices
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.82rem', color: 'var(--ash-500)' }}>
            <span>Total Orders: <strong style={{ color: 'var(--ash-900)' }}>{orders.length}</strong></span>
            <span>•</span>
            <span style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D97706' }}></span>
              Active Loans: <strong>{activeLoansCount}</strong>
            </span>
            <span>•</span>
            <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A' }}></span>
              Fully Settled: <strong>{settledCount}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export CSV
          </button>

          {/* MAIN PROMINENT "+ Add New Order" BUTTON IN HEADER */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddOrderModal}
            style={{
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.28)',
            }}
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Order
          </button>
        </div>
      </div>

      {/* =========================================================
          2. SEARCH & FILTER BAR
          ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            placeholder="Search by client name, NIC, contract (PN/Center/Item), invoice, or item code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '9px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ash-400)',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('all')}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('active')}
          >
            Active Loans ({activeLoansCount})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('paid')}
          >
            Fully Settled ({settledCount})
          </button>
        </div>

        {/* View Layout Switcher */}
        <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            style={{
              border: 'none',
              background: viewMode === 'cards' ? '#fff' : 'transparent',
              color: viewMode === 'cards' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <LayoutGrid size={14} /> Cards View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              border: 'none',
              background: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <List size={14} /> Table View
          </button>
        </div>
      </div>

      {/* =========================================================
          3. BELOW: ORDER DETAILS / PLACED ORDERS LIST
          "pahalin oredr details pennanna"
          ========================================================= */}
      {filteredOrders.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '12px',
            border: '1px dashed var(--ash-300)',
            color: 'var(--ash-500)',
          }}
        >
          <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>No orders found matching your search</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
            Click "+ Add New Order" above to place an order for a client.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CLIENT-FRIENDLY MODERN CARDS GRID */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredOrders.map((order) => {
            const isPaid = Number(order.balance_due) <= 0;

            return (
              <div
                key={order.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid var(--ash-200)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Top Bar: Contract Number Badge & Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        color: 'var(--primary)',
                        background: 'var(--primary-tint)',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--primary-border)',
                      }}
                    >
                      📜 {order.contract_no}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isPaid ? '#DCFCE7' : '#FEF3C7',
                        color: isPaid ? '#15803D' : '#B45309',
                      }}
                    >
                      {isPaid ? 'Fully Paid' : 'Active Loan'}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ash-900)' }}>
                    {order.customer_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.78rem', color: 'var(--ash-600)' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      🆔 {order.customer_nic || order.customer_id}
                    </span>
                    <span>•</span>
                    <span>📞 {order.customer_phone}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                    📍 Center: {order.branch_code}/{order.center_code} • Date: {formatDate(order.date)}
                  </div>

                  {/* Furniture Item Box */}
                  <div
                    style={{
                      background: 'var(--ash-50)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      marginTop: '10px',
                      border: '1px solid var(--ash-200)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--ash-800)' }}>
                      🛋️ {order.item_name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Code: {order.item_code}</span>
                      <span>Qty: {order.quantity || 1}</span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--ash-500)' }}>Order Value:</span>
                      <strong style={{ color: 'var(--ash-900)' }}>{formatLKR(order.gross_amount)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--ash-500)' }}>
                        {order.payment_type === 'installment' ? 'Installment Plan:' : 'Payment Type:'}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--ash-800)' }}>
                        {order.payment_type === 'installment'
                          ? `${formatLKR(order.installment_value)} / ${order.loan_frequency}`
                          : 'Full Cash'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px dashed var(--ash-200)',
                        paddingTop: '6px',
                        marginTop: '2px',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--ash-700)' }}>Remaining Balance:</span>
                      <strong style={{ color: isPaid ? '#16A34A' : '#DC2626', fontSize: '0.92rem' }}>
                        {formatLKR(order.balance_due)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions for each card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-100)', paddingTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setActiveSelectedOrder(order);
                      setIsViewDetailsModalOpen(true);
                    }}
                  >
                    <Eye size={13} /> View Details
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Number(order.balance_due) > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          setActiveSelectedOrder(order);
                          setPaymentAmount(order.installment_value || '');
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <CreditCard size={13} /> Pay
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setActiveSelectedOrder(order);
                        setIsPrintModalOpen(true);
                      }}
                    >
                      <Printer size={13} /> Print
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PROFESSIONAL ENTERPRISE TABLE VIEW */
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid var(--ash-200)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            overflow: 'hidden',
          }}
        >
          <div className="table-responsive" style={{ margin: 0 }}>
            <table className="custom-table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '1px solid var(--ash-200)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Contract Code & Date
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Client Profile & NIC
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Furniture Item
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Order Value
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Repayment Plan
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    Balance Due
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase', textAlign: 'center' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => {
                  const isPaid = Number(order.balance_due) <= 0;
                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid var(--ash-100)',
                        background: idx % 2 === 0 ? '#fff' : 'var(--ash-50)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : 'var(--ash-50)')}
                    >
                      {/* 1. Contract Code & Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            fontSize: '0.82rem',
                            background: '#EFF6FF',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid #BFDBFE',
                            display: 'inline-block',
                          }}
                        >
                          📜 {order.contract_no}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '4px' }}>
                          📅 {formatDate(order.date)} • {order.invoice_no}
                        </div>
                      </td>

                      {/* 2. Client Profile & NIC */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                          {order.customer_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.76rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            🆔 {order.customer_nic || order.customer_id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                          📞 {order.customer_phone} • 📍 {order.branch_code}/{order.center_code}
                        </div>
                      </td>

                      {/* 3. Furniture Item */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--ash-900)' }}>
                          🛋️ {order.item_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              color: 'var(--ash-700)',
                              border: '1px solid var(--ash-200)',
                            }}
                          >
                            {order.item_code}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                            Qty: {order.quantity || 1}
                          </span>
                        </div>
                      </td>

                      {/* 4. Order Value & Advance */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                          {formatLKR(order.gross_amount)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>
                          Adv: {formatLKR(order.advance_paid)}
                        </div>
                      </td>

                      {/* 5. Repayment Plan */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {order.payment_type === 'installment' ? (
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#A16207' }}>
                              {formatLKR(order.installment_value)} / {order.loan_frequency}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                              {order.loan_terms} installments ({order.loan_frequency})
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              color: 'var(--ash-700)',
                            }}
                          >
                            Full Cash Sale
                          </span>
                        )}
                      </td>

                      {/* 6. Balance Due */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: '0.96rem',
                            color: isPaid ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {formatLKR(order.balance_due)}
                        </div>
                        {isPaid && (
                          <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
                            ✓ Fully Settled
                          </div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isPaid ? '#DCFCE7' : '#FEF3C7',
                            color: isPaid ? '#15803D' : '#B45309',
                            border: isPaid ? '1px solid #86EFAC' : '1px solid #FDE68A',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isPaid ? '#16A34A' : '#D97706',
                            }}
                          />
                          {isPaid ? 'Fully Paid' : 'Active Loan'}
                        </span>
                      </td>

                      {/* 8. Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '5px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="View Contract Details"
                            onClick={() => {
                              setActiveSelectedOrder(order);
                              setIsViewDetailsModalOpen(true);
                            }}
                          >
                            <Eye size={13} /> View
                          </button>

                          {Number(order.balance_due) > 0 && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '5px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Record Installment Payment"
                              onClick={() => {
                                setActiveSelectedOrder(order);
                                setPaymentAmount(order.installment_value || '');
                                setIsPaymentModalOpen(true);
                              }}
                            >
                              <CreditCard size={13} /> Pay
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '5px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Print Agreement / Receipt"
                            onClick={() => {
                              setActiveSelectedOrder(order);
                              setIsPrintModalOpen(true);
                            }}
                          >
                            <Printer size={13} /> Print
                          </button>

                          <button
                            type="button"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--ash-400)',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '4px',
                            }}
                            title="Cancel Order"
                            onClick={() => handleDeleteOrder(order.id, order.contract_no)}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ash-400)')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div
            style={{
              padding: '12px 18px',
              background: '#F8FAFC',
              borderTop: '1px solid var(--ash-200)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.8rem',
              color: 'var(--ash-600)',
            }}
          >
            <div>
              Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> total orders
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div>
                Total Turnover: <strong style={{ color: 'var(--ash-900)', fontSize: '0.88rem' }}>{formatLKR(filteredTotalValue)}</strong>
              </div>
              <div>
                Outstanding Balance: <strong style={{ color: '#DC2626', fontSize: '0.88rem' }}>{formatLKR(filteredTotalBalance)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. MODAL: ADD NEW ORDER (CLEAN, CLIENT-FRIENDLY & PROFESSIONAL)
          ========================================================= */}
      <Modal
        isOpen={isAddOrderModalOpen}
        onClose={() => setIsAddOrderModalOpen(false)}
        title="Create New Furniture Order & Contract"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STEP 1: SELECT ACTIVE CLIENT */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                1. Select Active Customer *
              </label>
              <button
                type="button"
                onClick={() => setShowQuickRegister(!showQuickRegister)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <UserPlus size={13} /> {showQuickRegister ? 'Cancel' : '+ Quick Register Client'}
              </button>
            </div>

            {/* Quick Register inline drawer */}
            {showQuickRegister && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid var(--primary-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                  Register New Customer:
                </div>
                <div className="form-grid" style={{ gap: '8px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>First Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Sunil"
                      value={quickClient.first_name}
                      onChange={(e) => setQuickClient({ ...quickClient, first_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Perera"
                      value={quickClient.last_name}
                      onChange={(e) => setQuickClient({ ...quickClient, last_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>NIC *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="198512345678"
                      value={quickClient.nic}
                      onChange={(e) => setQuickClient({ ...quickClient, nic: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Phone *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="077XXXXXXX"
                      value={quickClient.phone}
                      onChange={(e) => setQuickClient({ ...quickClient, phone: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700 }}
                  onClick={handleQuickRegisterClient}
                >
                  Save & Select Client
                </button>
              </div>
            )}

            <select
              className="form-select-full"
              value={formCustomerId}
              onChange={(e) => handleFormSelectCustomer(e.target.value)}
              style={{ fontWeight: 600, fontSize: '0.88rem' }}
            >
              <option value="">-- Choose Registered Active Client ({activeCustomers.length}) --</option>
              {activeCustomers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} — NIC: {cust.nic || cust.customer_id} (📞 {cust.phone})
                </option>
              ))}
            </select>

            {formSelectedCustomer && (
              <div
                style={{
                  marginTop: '10px',
                  background: '#fff',
                  border: '1px solid var(--ash-200)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  Client: <strong style={{ color: 'var(--ash-900)' }}>{formSelectedCustomer.name}</strong> •{' '}
                  NIC: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{formSelectedCustomer.nic || formSelectedCustomer.customer_id}</strong>
                </div>
                <div style={{ color: 'var(--ash-600)' }}>
                  📍 Center: <strong>{formBranchCode}/{formCenterCode}</strong>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SEARCH & SELECT FURNITURE ITEM (BY CODE OR NAME WITH LIVE SUGGESTIONS) */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)', position: 'relative' }}>
            {/* Click-outside backdrop when suggestions are open */}
            {(isCodeDropdownOpen || isNameDropdownOpen) && (
              <div
                onClick={() => {
                  setIsCodeDropdownOpen(false);
                  setIsNameDropdownOpen(false);
                }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 55,
                  background: 'transparent',
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                2. Furniture Item Search (By Code or Name) *
              </label>
              {formSelectedProduct && (
                <button
                  type="button"
                  onClick={() => handleSelectProduct(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} /> Clear / Change Item
                </button>
              )}
            </div>

            <div className="form-grid" style={{ gap: '12px' }}>
              {/* Dual Search 1: Search by Product Code with suggestions */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                  Search by Product Code (WD / MEL / ELC)
                </label>
                <div style={{ position: 'relative', zIndex: 58 }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ash-400)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type code e.g. WD-001, MEL-001..."
                    value={codeSearchText}
                    onFocus={() => {
                      setIsCodeDropdownOpen(true);
                      setIsNameDropdownOpen(false);
                    }}
                    onChange={(e) => {
                      setCodeSearchText(e.target.value);
                      setIsCodeDropdownOpen(true);
                      setIsNameDropdownOpen(false);
                    }}
                    style={{
                      paddingLeft: '32px',
                      paddingRight: codeSearchText ? '28px' : '10px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '0.86rem',
                    }}
                  />
                  {codeSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setCodeSearchText('');
                        setIsCodeDropdownOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ash-400)',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Live Code Suggestions Popover */}
                {isCodeDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid var(--primary-border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 65,
                    }}
                  >
                    {codeSuggestions.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ash-500)' }}>
                        No furniture items match code "{codeSearchText}"
                      </div>
                    ) : (
                      codeSuggestions.map((item) => {
                        const isChosen = formSelectedProduct?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectProduct(item)}
                            style={{
                              padding: '9px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--ash-100)',
                              cursor: 'pointer',
                              background: isChosen ? 'var(--primary-tint)' : '#fff',
                              transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = isChosen ? 'var(--primary-tint)' : '#fff')
                            }
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  color: 'var(--primary)',
                                  background: '#EFF6FF',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                {item.item_code}
                              </span>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'capitalize' }}>
                                  {item.category?.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A', whiteSpace: 'nowrap' }}>
                              {formatLKR(item.selling_price)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Dual Search 2: Search by Product Name with suggestions */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                  Search by Product Name
                </label>
                <div style={{ position: 'relative', zIndex: 58 }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ash-400)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type name e.g. Dining Table, Cupboard, Chair..."
                    value={nameSearchText}
                    onFocus={() => {
                      setIsNameDropdownOpen(true);
                      setIsCodeDropdownOpen(false);
                    }}
                    onChange={(e) => {
                      setNameSearchText(e.target.value);
                      setIsNameDropdownOpen(true);
                      setIsCodeDropdownOpen(false);
                    }}
                    style={{
                      paddingLeft: '32px',
                      paddingRight: nameSearchText ? '28px' : '10px',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                    }}
                  />
                  {nameSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setNameSearchText('');
                        setIsNameDropdownOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ash-400)',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Live Name Suggestions Popover */}
                {isNameDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid var(--primary-border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 65,
                    }}
                  >
                    {nameSuggestions.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ash-500)' }}>
                        No furniture items match name "{nameSearchText}"
                      </div>
                    ) : (
                      nameSuggestions.map((item) => {
                        const isChosen = formSelectedProduct?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectProduct(item)}
                            style={{
                              padding: '9px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--ash-100)',
                              cursor: 'pointer',
                              background: isChosen ? 'var(--primary-tint)' : '#fff',
                              transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = isChosen ? 'var(--primary-tint)' : '#fff')
                            }
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                                {item.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {item.item_code}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'capitalize' }}>
                                  • {item.category?.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A', whiteSpace: 'nowrap' }}>
                              {formatLKR(item.selling_price)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-generated Item Amount & Quantity & Confirmation Box */}
            {formSelectedProduct ? (
              <div
                style={{
                  marginTop: '12px',
                  background: '#fff',
                  border: '1px solid var(--ash-200)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                    Item Amount (Auto-generated LKR) *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                    style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ fontWeight: 800, fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Order Value
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--ash-900)' }}>
                    {formatLKR(formGrossTotal)}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: '#FFFBEB',
                  borderRadius: '6px',
                  border: '1px dashed #FDE68A',
                  color: '#92400E',
                  fontSize: '0.76rem',
                }}
              >
                💡 Type an Item Code or Product Name above to view instant suggestions and auto-generate the item price.
              </div>
            )}
          </div>

          {/* STEP 3: CONTRACT CODE (pn / center code / item code) */}
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase' }}>
                CONTRACT CODE (pn / center code / item code)
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: '#1D4ED8', marginTop: '2px' }}>
                📜 {formContractCode}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: '#1E40AF', fontWeight: 600 }}>Passbook:</span>
              <input
                type="text"
                value={formPassbookNo}
                onChange={(e) => setFormPassbookNo(e.target.value)}
                style={{
                  width: '85px',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  border: '1px solid #93C5FD',
                  background: '#fff',
                }}
              />
            </div>
          </div>

          {/* STEP 4: INSTALLMENT PLAN, TERMS & FREQUENCY */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                3. Payment Terms & Installment Plan
              </label>
              <div style={{ display: 'flex', background: 'var(--ash-200)', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFormPaymentType('installment')}
                  style={{
                    border: 'none',
                    background: formPaymentType === 'installment' ? 'var(--primary)' : 'transparent',
                    color: formPaymentType === 'installment' ? '#fff' : 'var(--ash-700)',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  Installment Loan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormPaymentType('cash');
                    setFormDownPayment(formGrossTotal);
                  }}
                  style={{
                    border: 'none',
                    background: formPaymentType === 'cash' ? 'var(--primary)' : 'transparent',
                    color: formPaymentType === 'cash' ? '#fff' : 'var(--ash-700)',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  Full Cash
                </button>
              </div>
            </div>

            {formPaymentType === 'installment' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-grid" style={{ gap: '10px' }}>
                  {/* Down Payment */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700, margin: 0 }}>
                        Down Payment (Advance LKR)
                      </label>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[10, 20, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleSetDownPaymentPercent(pct)}
                            style={{
                              border: '1px solid var(--ash-300)',
                              background: '#fff',
                              fontSize: '0.66rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      value={formDownPayment}
                      onChange={(e) => setFormDownPayment(Math.max(0, Number(e.target.value)))}
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  {/* Loan Frequency */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      Loan Frequency *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`btn ${formLoanFrequency === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px', fontSize: '0.76rem', fontWeight: 700 }}
                        onClick={() => handleFormFrequencyChange('monthly')}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={`btn ${formLoanFrequency === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px', fontSize: '0.76rem', fontWeight: 700 }}
                        onClick={() => handleFormFrequencyChange('weekly')}
                      >
                        Weekly
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      Terms ({formLoanFrequency === 'weekly' ? 'Weeks' : 'Months'}) *
                    </label>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={formLoanTerms}
                        onChange={(e) => setFormLoanTerms(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ fontWeight: 700, width: '75px' }}
                      />
                      {[6, 12, 16, 24].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormLoanTerms(t)}
                          style={{
                            border: '1px solid var(--ash-300)',
                            background: formLoanTerms === t ? 'var(--primary)' : '#fff',
                            color: formLoanTerms === t ? '#fff' : 'var(--ash-700)',
                            fontSize: '0.7rem',
                            padding: '5px 7px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* First Due Date */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      First Due Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formFirstDueDate}
                      onChange={(e) => setFormFirstDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Auto Installment Banner */}
                <div
                  style={{
                    background: '#FEF9C3',
                    border: '1px solid #FEF08A',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 700, textTransform: 'uppercase' }}>
                      Auto Installment Plan:
                    </span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#A16207' }}>
                      {formatLKR(formCalculatedInstallment)} / {formLoanFrequency === 'weekly' ? 'week' : 'month'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 700 }}>REMAINING BALANCE</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#DC2626' }}>
                      {formatLKR(formLoanBalance)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#166534', fontWeight: 700, fontSize: '0.85rem' }}>
                Full Cash Settlement: {formatLKR(formGrossTotal)}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddOrderModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleConfirmPlaceOrder(true)}
              disabled={!formSelectedCustomer || !formSelectedProduct}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Printer size={15} /> Place & Print Bill
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleConfirmPlaceOrder(false)}
              disabled={!formSelectedCustomer || !formSelectedProduct}
              style={{ fontWeight: 800, padding: '9px 18px' }}
            >
              <CheckCircle size={16} /> Confirm & Place Order
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================
          5. MODAL: VIEW ORDER DETAILS (CLEAN DIALOG)
          ========================================================= */}
      <Modal
        isOpen={isViewDetailsModalOpen}
        onClose={() => setIsViewDetailsModalOpen(false)}
        title={activeSelectedOrder ? `Contract Details - ${activeSelectedOrder.contract_no}` : 'Order Details'}
      >
        {activeSelectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700 }}>OFFICIAL CONTRACT CODE</span>
                <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: '#1D4ED8' }}>
                  📜 {activeSelectedOrder.contract_no}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1E40AF', marginTop: '2px' }}>
                  Invoice: {activeSelectedOrder.invoice_no} • Date: {formatDate(activeSelectedOrder.date)}
                </div>
              </div>

              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: Number(activeSelectedOrder.balance_due) <= 0 ? '#DCFCE7' : '#FEF3C7',
                  color: Number(activeSelectedOrder.balance_due) <= 0 ? '#15803D' : '#B45309',
                }}
              >
                {Number(activeSelectedOrder.balance_due) <= 0 ? 'Fully Paid' : 'Active Loan'}
              </span>
            </div>

            {/* 2-Column Info: Customer & Item */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Client Information</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {activeSelectedOrder.customer_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    🆔 NIC: {activeSelectedOrder.customer_nic || activeSelectedOrder.customer_id}
                  </span>
                  <span>📞 {activeSelectedOrder.customer_phone}</span>
                  <span>📍 {activeSelectedOrder.branch_code}/{activeSelectedOrder.center_code}</span>
                </div>
              </div>

              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Furniture Item</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {activeSelectedOrder.item_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Code: {activeSelectedOrder.item_code}</span>
                  <span>Quantity: {activeSelectedOrder.quantity} Unit(s)</span>
                  <span>Unit Price: {formatLKR(activeSelectedOrder.unit_price)}</span>
                </div>
              </div>
            </div>

            {/* Payment & Terms */}
            <div style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#854D0E', fontWeight: 700 }}>PAYMENT PLAN</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#A16207' }}>
                    {activeSelectedOrder.payment_type === 'installment'
                      ? `${formatLKR(activeSelectedOrder.installment_value)} / ${activeSelectedOrder.loan_frequency}`
                      : 'Full Cash Sale'}
                  </div>
                  {activeSelectedOrder.payment_type === 'installment' && (
                    <div style={{ fontSize: '0.76rem', color: '#713F12' }}>
                      {activeSelectedOrder.loan_terms} terms • Advance: {formatLKR(activeSelectedOrder.advance_paid)}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#854D0E', fontWeight: 700 }}>BALANCE DUE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: Number(activeSelectedOrder.balance_due) > 0 ? '#DC2626' : '#16A34A' }}>
                    {formatLKR(activeSelectedOrder.balance_due)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-200)', paddingTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                onClick={() => handleDeleteOrder(activeSelectedOrder.id, activeSelectedOrder.contract_no)}
              >
                <Trash2 size={14} /> Cancel Order
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {Number(activeSelectedOrder.balance_due) > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setIsViewDetailsModalOpen(false);
                      setPaymentAmount(activeSelectedOrder.installment_value || '');
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    <CreditCard size={14} /> Record Payment
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsViewDetailsModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                >
                  <Printer size={14} /> Print Bill
                </button>
              </div>
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
        title={activeSelectedOrder ? `Pay Installment - ${activeSelectedOrder.contract_no}` : 'Record Payment'}
      >
        {activeSelectedOrder && (
          <form onSubmit={handleRecordInstallment}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.84rem' }}>
                <div>Client: <strong>{activeSelectedOrder.customer_name}</strong></div>
                <div>NIC: <strong>{activeSelectedOrder.customer_nic}</strong></div>
                <div>Remaining Balance: <strong style={{ color: '#DC2626' }}>{formatLKR(activeSelectedOrder.balance_due)}</strong></div>
                <div>Installment Due: <strong>{formatLKR(activeSelectedOrder.installment_value)}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  min="1"
                  max={activeSelectedOrder.balance_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}
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
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Confirm Payment
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: PRINT BILL / CONTRACT RECEIPT
          ========================================================= */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={activeSelectedOrder ? `Print Bill - ${activeSelectedOrder.contract_no}` : 'Print Bill'}
      >
        {activeSelectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              id="printable-bill"
              style={{
                background: '#fff',
                padding: '20px',
                border: '1px solid var(--ash-300)',
                borderRadius: '8px',
                color: '#1e293b',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>D&S FURNITURE WORKSHOP</h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Center: {activeSelectedOrder.branch_code}/{activeSelectedOrder.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>CONTRACT RECEIPT</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 900, color: '#2563eb' }}>
                    {activeSelectedOrder.contract_no}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div>
                  <div>Customer: <strong>{activeSelectedOrder.customer_name}</strong></div>
                  <div>NIC: <strong>{activeSelectedOrder.customer_nic}</strong></div>
                  <div>Phone: {activeSelectedOrder.customer_phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Date: {formatDate(activeSelectedOrder.date)}</div>
                  <div>Invoice No: <strong>{activeSelectedOrder.invoice_no}</strong></div>
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', margin: '10px 0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>
                      {activeSelectedOrder.item_name} ({activeSelectedOrder.item_code})
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{activeSelectedOrder.quantity}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{formatLKR(activeSelectedOrder.unit_price)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800 }}>{formatLKR(activeSelectedOrder.gross_amount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Financials */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <div style={{ width: '250px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Amount:</span>
                    <strong>{formatLKR(activeSelectedOrder.gross_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Advance Received:</span>
                    <strong>{formatLKR(activeSelectedOrder.advance_paid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', color: '#dc2626', fontWeight: 900 }}>
                    <span>Remaining Balance:</span>
                    <span>{formatLKR(activeSelectedOrder.balance_due)}</span>
                  </div>
                  {activeSelectedOrder.payment_type === 'installment' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', fontSize: '0.78rem' }}>
                      <span>Installment Plan:</span>
                      <strong>{formatLKR(activeSelectedOrder.installment_value)} / {activeSelectedOrder.loan_frequency}</strong>
                    </div>
                  )}
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Printer size={15} /> Print Agreement
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
