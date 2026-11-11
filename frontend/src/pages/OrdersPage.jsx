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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
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
  // Main view tab: 'create' (Admin Order Desk) | 'history' (Placed Orders & Contracts)
  const [activeTab, setActiveTab] = useState('create');

  // Orders, customers, products and centers state
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

  // Selected Order for separate display in History (Master-Detail view)
  const [selectedOrderId, setSelectedOrderId] = useState(() => {
    const list = loadSavedOrders();
    return list.length > 0 ? list[0].id : null;
  });

  // History search & filters
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all' | 'active' | 'paid'
  const [historyViewMode, setHistoryViewMode] = useState('split'); // 'split' | 'table'

  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [orderToPrint, setOrderToPrint] = useState(null);

  // Success alert after placing order
  const [placedOrderSuccess, setPlacedOrderSuccess] = useState(null);

  // Quick register client drawer inside Order Desk
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
  // ADMIN ORDER DESK (FORM STATE)
  // ==========================================
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCenterCode, setSelectedCenterCode] = useState('C001');
  const [selectedBranchCode, setSelectedBranchCode] = useState('MHG');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Category filter in Item selection
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all'); // 'all' | 'wood' | 'melamine' | 'electrical_item'

  // Product selection
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  // Passbook & Contract Number
  const [passbookNo, setPassbookNo] = useState(() => generateNextPassbookNo(loadSavedOrders()));

  // Payment & Loan terms
  const [paymentType, setPaymentType] = useState('installment'); // 'installment' | 'cash'
  const [downPayment, setDownPayment] = useState(0);
  const [loanFrequency, setLoanFrequency] = useState('monthly'); // 'monthly' | 'weekly'
  const [loanTerms, setLoanTerms] = useState(12);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [paymentMethod, setPaymentMethod] = useState('Cash');
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

  // Filter active registered customers only
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => c && c.status !== 'inactive');
  }, [customers]);

  // Currently selected customer object
  const activeSelectedCustomer = useMemo(() => {
    return activeCustomers.find((c) => c.id === selectedCustomerId || (c.nic && c.nic === selectedCustomerId)) || null;
  }, [activeCustomers, selectedCustomerId]);

  // Set default customer when customer list loads
  useEffect(() => {
    if (!selectedCustomerId && activeCustomers.length > 0) {
      const first = activeCustomers[0];
      setSelectedCustomerId(first.id);
      setSelectedCenterCode(formatCenterCode(first.center_code || 'C001'));
      setSelectedBranchCode(first.branch_code || 'MHG');
      setDeliveryAddress(first.address || '');
    }
  }, [activeCustomers, selectedCustomerId]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (itemCategoryFilter === 'all') return products;
    return products.filter((p) => p.category === itemCategoryFilter);
  }, [products, itemCategoryFilter]);

  // Currently selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId || p.item_code === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Set default product when products list loads
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      const first = products[0];
      setSelectedProductId(first.id);
      setUnitPrice(first.selling_price || 0);
      setDownPayment(Math.round((first.selling_price || 0) * 0.2));
    }
  }, [products, selectedProductId]);

  // Total order value calculation
  const totalOrderValue = useMemo(() => {
    return (Number(quantity) || 1) * (Number(unitPrice) || 0);
  }, [quantity, unitPrice]);

  // Loan Balance calculation
  const loanBalance = useMemo(() => {
    if (paymentType === 'cash') return 0;
    return Math.max(0, totalOrderValue - (Number(downPayment) || 0));
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
    const item = selectedProduct ? selectedProduct.item_code : 'WD-001';
    return buildContractNumber(pn, center, item);
  }, [passbookNo, selectedCenterCode, selectedProduct]);

  // When customer changes
  const handleSelectCustomer = (custId) => {
    setSelectedCustomerId(custId);
    const cust = activeCustomers.find((c) => c.id === custId);
    if (cust) {
      if (cust.center_code) setSelectedCenterCode(formatCenterCode(cust.center_code));
      if (cust.branch_code) setSelectedBranchCode(cust.branch_code);
      if (cust.address) setDeliveryAddress(cust.address);
    }
  };

  // When product changes (by Code or Name)
  const handleSelectProduct = (prodIdOrCode) => {
    const prod = products.find((p) => p.id === prodIdOrCode || p.item_code === prodIdOrCode);
    if (prod) {
      setSelectedProductId(prod.id);
      setUnitPrice(prod.selling_price || 0);
      const total = (Number(quantity) || 1) * (prod.selling_price || 0);
      setDownPayment(Math.round(total * 0.2));
    }
  };

  // When frequency changes
  const handleFrequencyChange = (freq) => {
    setLoanFrequency(freq);
    if (freq === 'weekly') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFirstDueDate(nextWeek.toISOString().slice(0, 10));
    } else {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setFirstDueDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  // Quick preset down payment percentage
  const handleSetDownPaymentPercent = (pct) => {
    const calculated = Math.round(totalOrderValue * (pct / 100));
    setDownPayment(calculated);
  };

  // Quick Register Customer
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

    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveCustomersToStorage(updated);

    setSelectedCustomerId(newCust.id);
    setSelectedCenterCode(newCust.center_code);
    setSelectedBranchCode(newCust.branch_code);
    setDeliveryAddress(newCust.address);
    setShowQuickRegister(false);
  };

  // Submit and Place New Order
  const handlePlaceOrder = (andPrint = false) => {
    if (!activeSelectedCustomer) {
      alert('Please select an active registered customer. Only active clients can place orders.');
      return;
    }
    if (!selectedProduct) {
      alert('Please select a furniture item.');
      return;
    }

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
      status: finalBalanceDue <= 0 ? 'Fully Paid' : 'Active Loan',
      notes: orderNotes || `Order placed for ${selectedProduct.name}`,
      created_at: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);
    setSelectedOrderId(newOrder.id);

    // Update customer stats
    const updatedCustomers = customers.map((c) => {
      if (c.id === activeSelectedCustomer.id) {
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

    // Increment Passbook Number for next order
    setPassbookNo(generateNextPassbookNo(updatedOrders));
    setOrderNotes('');

    setPlacedOrderSuccess(newOrder);

    if (andPrint) {
      setOrderToPrint(newOrder);
      setIsPrintModalOpen(true);
    }
  };

  // Reset Order Form
  const handleResetForm = () => {
    if (window.confirm('Reset the order form to defaults?')) {
      if (activeCustomers.length > 0) {
        setSelectedCustomerId(activeCustomers[0].id);
        setSelectedCenterCode(formatCenterCode(activeCustomers[0].center_code || 'C001'));
        setSelectedBranchCode(activeCustomers[0].branch_code || 'MHG');
        setDeliveryAddress(activeCustomers[0].address || '');
      }
      if (products.length > 0) {
        setSelectedProductId(products[0].id);
        setUnitPrice(products[0].selling_price || 0);
        setQuantity(1);
        setDownPayment(Math.round((products[0].selling_price || 0) * 0.2));
      }
      setPaymentType('installment');
      setLoanFrequency('monthly');
      setLoanTerms(12);
      setOrderNotes('');
      setPlacedOrderSuccess(null);
    }
  };

  // Filtered orders list for History view
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
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

      // Status filter
      if (historyStatusFilter === 'active' && Number(order.balance_due) <= 0) return false;
      if (historyStatusFilter === 'paid' && Number(order.balance_due) > 0) return false;

      // Header Center filter
      if (headerCenter && headerCenter !== 'all') {
        const parts = headerCenter.split('/');
        if (parts.length === 2 && formatCenterCode(order.center_code) !== formatCenterCode(parts[1])) {
          return false;
        }
      }

      return true;
    });
  }, [orders, historySearchQuery, historyStatusFilter, headerCenter]);

  // Selected Order object for separate display in History
  const activeDisplayedOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0] || null;
  }, [orders, selectedOrderId, filteredOrders]);

  // Record Installment Payment
  const handleRecordInstallment = (e) => {
    e.preventDefault();
    if (!activeDisplayedOrder) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amt > activeDisplayedOrder.balance_due) {
      alert(`Amount exceeds outstanding balance of ${formatLKR(activeDisplayedOrder.balance_due)}.`);
      return;
    }

    const newBal = Math.max(0, activeDisplayedOrder.balance_due - amt);
    const newPaidCount = (activeDisplayedOrder.installments_paid || 0) + 1;
    const newStatus = newBal <= 0 ? 'Fully Paid' : 'Active Loan';

    const updatedOrders = orders.map((o) => {
      if (o.id === activeDisplayedOrder.id) {
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
      if (c.nic === activeDisplayedOrder.customer_nic || c.id === activeDisplayedOrder.customer_id) {
        return {
          ...c,
          outstanding_balance: Math.max(0, (c.outstanding_balance || 0) - amt),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    alert(`Installment payment of ${formatLKR(amt)} recorded! Remaining balance: ${formatLKR(newBal)}`);
  };

  // Delete / Cancel Order
  const handleDeleteOrder = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to cancel order "${contractNo}"?`)) {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrders(updated);
      saveOrdersToStorage(updated);
      if (selectedOrderId === orderId) {
        setSelectedOrderId(updated.length > 0 ? updated[0].id : null);
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

  const activeLoansCount = orders.filter((o) => Number(o.balance_due) > 0).length;
  const settledCount = orders.filter((o) => Number(o.balance_due) <= 0).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* =========================================================
          TOP NAVIGATION BAR: 2 DEDICATED WORKSPACES
          1. Place Order (Admin Desk)
          2. Placed Orders & Contracts (Separate View)
          ========================================================= */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--ash-200)',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* TAB 1: Place New Order (Admin Desk) */}
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: activeTab === 'create' ? '2px solid var(--primary)' : '1px solid var(--ash-200)',
              background: activeTab === 'create' ? 'var(--primary)' : '#fff',
              color: activeTab === 'create' ? '#fff' : 'var(--ash-700)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'create' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
            }}
          >
            <ShoppingCart size={17} /> Place Order (Admin Desk)
          </button>

          {/* TAB 2: Placed Orders Ledger */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: activeTab === 'history' ? '2px solid var(--primary)' : '1px solid var(--ash-200)',
              background: activeTab === 'history' ? 'var(--primary)' : '#fff',
              color: activeTab === 'history' ? '#fff' : 'var(--ash-700)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'history' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
            }}
          >
            <FileText size={17} /> Placed Orders & Contracts ({orders.length})
          </button>
        </div>

        {/* Global Quick Summary Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.82rem', color: 'var(--ash-600)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            Total Orders: <strong style={{ color: 'var(--ash-900)' }}>{orders.length}</strong>
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }}></span>
            Active Loans: <strong style={{ color: '#D97706' }}>{activeLoansCount}</strong>
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }}></span>
            Fully Settled: <strong style={{ color: '#16A34A' }}>{settledCount}</strong>
          </span>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* =========================================================
          VIEW 1: ADMIN ORDER PLACEMENT DESK (PROFESSIONAL WORKSPACE)
          ========================================================= */}
      {activeTab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Order Placement Success Banner */}
          {placedOrderSuccess && (
            <div
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={22} color="#059669" />
                <div>
                  <div style={{ fontWeight: 800, color: '#065F46', fontSize: '0.92rem' }}>
                    Order Placed Successfully! Contract No: <strong>{placedOrderSuccess.contract_no}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                    Client: <strong>{placedOrderSuccess.customer_name}</strong> (NIC: {placedOrderSuccess.customer_nic}) • Item: {placedOrderSuccess.item_name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setOrderToPrint(placedOrderSuccess);
                    setIsPrintModalOpen(true);
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Printer size={14} /> Print Agreement
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedOrderId(placedOrderSuccess.id);
                    setActiveTab('history');
                  }}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  View in Orders Ledger <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPlacedOrderSuccess(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065F46' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* 2-Column POS Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(500px, 1.45fr) minmax(360px, 1fr)',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* LEFT COLUMN: 3-Step Interactive Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* STEP 1: ACTIVE CLIENT SELECTION */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid var(--ash-200)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                      }}
                    >
                      1
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--ash-900)' }}>
                      Select Active Client
                    </h3>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ShieldCheck size={12} /> Active Clients Only
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQuickRegister(!showQuickRegister)}
                    style={{
                      background: 'transparent',
                      border: '1px dashed var(--primary)',
                      color: 'var(--primary)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <UserPlus size={13} /> {showQuickRegister ? 'Cancel Quick Add' : '+ Quick Register Client'}
                  </button>
                </div>

                {/* Quick Register Inline Form */}
                {showQuickRegister && (
                  <div
                    style={{
                      background: 'var(--ash-50)',
                      border: '1px solid var(--primary-border)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
                      ⚡ Quick Register New Walk-in Client
                    </div>
                    <div className="form-grid" style={{ gap: '8px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>First Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Sunil"
                          value={quickClient.first_name}
                          onChange={(e) => setQuickClient({ ...quickClient, first_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Last Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Perera"
                          value={quickClient.last_name}
                          onChange={(e) => setQuickClient({ ...quickClient, last_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>NIC (National Identity Card) *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 198512345678"
                          value={quickClient.nic}
                          onChange={(e) => setQuickClient({ ...quickClient, nic: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Phone Number *</label>
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
                      style={{ marginTop: '8px', padding: '5px 14px', fontSize: '0.76rem', fontWeight: 700 }}
                      onClick={handleQuickRegisterClient}
                    >
                      Save & Select Client
                    </button>
                  </div>
                )}

                {/* Customer Dropdown */}
                <div className="form-group" style={{ margin: 0 }}>
                  <select
                    className="form-select-full"
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    style={{ fontWeight: 600, fontSize: '0.88rem', padding: '10px 12px' }}
                  >
                    <option value="">-- Choose Registered Active Client ({activeCustomers.length}) --</option>
                    {activeCustomers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} — NIC: {cust.nic || cust.customer_id} (📞 {cust.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Client Card Details */}
                {activeSelectedCustomer && (
                  <div
                    style={{
                      marginTop: '12px',
                      background: 'var(--ash-50)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--ash-200)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '10px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Client Name</span>
                      <div style={{ fontWeight: 800, color: 'var(--ash-900)', fontSize: '0.92rem' }}>{activeSelectedCustomer.name}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>National Identity Card</span>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>
                        🆔 {activeSelectedCustomer.nic || activeSelectedCustomer.customer_id}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Contact Phone</span>
                      <div style={{ fontWeight: 700, color: 'var(--ash-800)' }}>📞 {activeSelectedCustomer.phone}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Distribution Center</span>
                      <div style={{ fontWeight: 700, color: 'var(--ash-800)' }}>
                        📍 {selectedBranchCode}/{selectedCenterCode}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: FURNITURE ITEM SELECTION & PRICING */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid var(--ash-200)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                      }}
                    >
                      2
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--ash-900)' }}>
                      Furniture Item & Price
                    </h3>
                  </div>

                  {/* Category Pills */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { id: 'all', label: 'All Items' },
                      { id: 'wood', label: 'Wood (WD)' },
                      { id: 'melamine', label: 'Melamine (MEL)' },
                      { id: 'electrical_item', label: 'Electric (ELC)' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setItemCategoryFilter(cat.id)}
                        style={{
                          border: 'none',
                          background: itemCategoryFilter === cat.id ? 'var(--primary)' : 'var(--ash-100)',
                          color: itemCategoryFilter === cat.id ? '#fff' : 'var(--ash-600)',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid" style={{ gap: '12px' }}>
                  {/* Select by Item Code */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                      Select by Item Code (WD / MEL / ELC) *
                    </label>
                    <select
                      className="form-select-full"
                      value={selectedProduct ? selectedProduct.item_code : ''}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Choose Item Code --</option>
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.item_code}>
                          {p.item_code} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select by Item Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                      Or Select by Furniture Name *
                    </label>
                    <select
                      className="form-select-full"
                      value={selectedProduct ? selectedProduct.id : ''}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      style={{ fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      <option value="">-- Choose Furniture Name --</option>
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.item_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Item Pricing & Quantity Details */}
                {selectedProduct && (
                  <div
                    style={{
                      marginTop: '14px',
                      background: 'var(--ash-50)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--ash-200)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                        Item Value / Unit Price (LKR) *
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                        style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}
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
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ fontWeight: 800, fontSize: '0.95rem' }}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Total Gross Value
                      </span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--ash-900)' }}>
                        {formatLKR(totalOrderValue)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: CONTRACT & REPAYMENT SCHEME */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid var(--ash-200)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                      }}
                    >
                      3
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--ash-900)' }}>
                      Contract & Payment Terms
                    </h3>
                  </div>

                  {/* Payment Type Toggle */}
                  <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentType('installment')}
                      style={{
                        border: 'none',
                        background: paymentType === 'installment' ? 'var(--primary)' : 'transparent',
                        color: paymentType === 'installment' ? '#fff' : 'var(--ash-700)',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      💼 Installment Loan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('cash');
                        setDownPayment(totalOrderValue);
                      }}
                      style={{
                        border: 'none',
                        background: paymentType === 'cash' ? 'var(--primary)' : 'transparent',
                        color: paymentType === 'cash' ? '#fff' : 'var(--ash-700)',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      💵 Full Cash Sale
                    </button>
                  </div>
                </div>

                {/* Contract Number Display Banner */}
                <div
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase' }}>
                      OFFICIAL CONTRACT NUMBER (pn / center code / item code)
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#1D4ED8', fontSize: '1.05rem', marginTop: '2px' }}>
                      📜 {currentContractNumber}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.74rem', color: '#1E40AF', fontWeight: 600 }}>Passbook No:</label>
                    <input
                      type="text"
                      value={passbookNo}
                      onChange={(e) => setPassbookNo(e.target.value)}
                      style={{
                        width: '90px',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        borderRadius: '4px',
                        border: '1px solid #93C5FD',
                        background: '#fff',
                      }}
                    />
                  </div>
                </div>

                {/* Installment Loan Configuration */}
                {paymentType === 'installment' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-grid" style={{ gap: '12px' }}>
                      {/* Down Payment with Quick Percent Buttons */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700, margin: 0 }}>
                            Down Payment / Advance (LKR)
                          </label>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[10, 20, 30, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => handleSetDownPaymentPercent(pct)}
                                style={{
                                  border: '1px solid var(--ash-300)',
                                  background: '#fff',
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
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
                          value={downPayment}
                          onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))}
                          style={{ fontWeight: 700, fontSize: '0.9rem' }}
                        />
                      </div>

                      {/* Loan Frequency */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                          Repayment Frequency *
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className={`btn ${loanFrequency === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700 }}
                            onClick={() => handleFrequencyChange('monthly')}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            className={`btn ${loanFrequency === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700 }}
                            onClick={() => handleFrequencyChange('weekly')}
                          >
                            Weekly
                          </button>
                        </div>
                      </div>

                      {/* Loan Terms */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                          Installment Terms ({loanFrequency === 'weekly' ? 'Weeks' : 'Months'}) *
                        </label>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number"
                            className="form-input"
                            min="1"
                            value={loanTerms}
                            onChange={(e) => setLoanTerms(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            style={{ fontWeight: 700, fontSize: '0.9rem', width: '80px' }}
                          />
                          {[6, 12, 16, 24].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setLoanTerms(t)}
                              style={{
                                border: '1px solid var(--ash-300)',
                                background: loanTerms === t ? 'var(--primary)' : '#fff',
                                color: loanTerms === t ? '#fff' : 'var(--ash-700)',
                                fontSize: '0.72rem',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              {t}T
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* First Due Date */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                          First Due Date *
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          value={firstDueDate}
                          onChange={(e) => setFirstDueDate(e.target.value)}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Auto-calculated Installment Banner */}
                    <div
                      style={{
                        background: '#FEF9C3',
                        border: '1px solid #FEF08A',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#854D0E', fontWeight: 700, textTransform: 'uppercase' }}>
                          AUTO-CALCULATED REPAYMENT VALUE
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#A16207', marginTop: '2px' }}>
                          {formatLKR(calculatedInstallmentValue)} / {loanFrequency === 'weekly' ? 'week' : 'month'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#713F12', marginTop: '2px' }}>
                          {loanTerms} installments • Starting {formatDate(firstDueDate)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: '#854D0E', fontWeight: 700 }}>TOTAL LOAN BALANCE</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#DC2626', marginTop: '2px' }}>
                          {formatLKR(loanBalance)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#DCFCE7',
                      border: '1px solid #86EFAC',
                      borderRadius: '8px',
                      padding: '14px',
                      color: '#166534',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Full Cash Sale (No Installments Required)</span>
                    <span style={{ fontSize: '1.1rem' }}>{formatLKR(totalOrderValue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE REAL-TIME CONTRACT & BILL VOUCHER PREVIEW */}
            <div style={{ position: 'sticky', top: '20px' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid var(--ash-300)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Paper Bill Header */}
                <div style={{ borderBottom: '2px solid var(--ash-900)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--ash-900)', letterSpacing: '0.5px' }}>
                        D&S FURNITURE WORKSHOP
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                        Hire-Purchase Agreement & Order Voucher
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                        Regional Center: <strong>{selectedBranchCode}/{selectedCenterCode}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: paymentType === 'installment' ? '#FEF3C7' : '#DCFCE7',
                          color: paymentType === 'installment' ? '#B45309' : '#15803D',
                        }}
                      >
                        {paymentType === 'installment' ? 'HIRE PURCHASE' : 'CASH SALE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contract Number Callout */}
                <div style={{ background: 'var(--ash-50)', padding: '10px 12px', borderRadius: '8px', border: '1px dashed var(--ash-300)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                    OFFICIAL CONTRACT NO (PN / CENTER / ITEM)
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: 'var(--primary)', marginTop: '2px' }}>
                    📜 {currentContractNumber}
                  </div>
                </div>

                {/* Client Profile Box */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                    ACTIVE CLIENT
                  </div>
                  {activeSelectedCustomer ? (
                    <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--ash-900)' }}>{activeSelectedCustomer.name}</div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700, fontSize: '0.82rem' }}>
                        🆔 NIC: {activeSelectedCustomer.nic || activeSelectedCustomer.customer_id}
                      </div>
                      <div style={{ color: 'var(--ash-600)', fontSize: '0.78rem' }}>
                        📞 {activeSelectedCustomer.phone}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#DC2626', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '4px' }}>
                      Please select an active client
                    </div>
                  )}
                </div>

                {/* Selected Item Breakdown Table */}
                <div style={{ borderTop: '1px solid var(--ash-200)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                    ITEM BREAKDOWN
                  </div>
                  {selectedProduct ? (
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '4px 0', fontWeight: 700 }}>
                            {selectedProduct.name}
                            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--ash-500)', fontFamily: 'monospace' }}>
                              Code: {selectedProduct.item_code}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '4px' }}>x{quantity}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700 }}>
                            {formatLKR(totalOrderValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ color: '#DC2626', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      No item selected
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div
                  style={{
                    borderTop: '1px solid var(--ash-200)',
                    paddingTop: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ash-600)' }}>Gross Order Total:</span>
                    <strong style={{ color: 'var(--ash-900)' }}>{formatLKR(totalOrderValue)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ash-600)' }}>Advance / Down Payment:</span>
                    <strong style={{ color: '#16A34A' }}>
                      {formatLKR(paymentType === 'installment' ? downPayment : totalOrderValue)}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px dashed var(--ash-300)',
                      paddingTop: '6px',
                      fontSize: '0.92rem',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--ash-900)' }}>Balance to Finance:</span>
                    <strong style={{ color: Number(loanBalance) > 0 ? '#DC2626' : '#16A34A' }}>
                      {formatLKR(loanBalance)}
                    </strong>
                  </div>

                  {paymentType === 'installment' && Number(loanBalance) > 0 && (
                    <div
                      style={{
                        background: '#FEF3C7',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        marginTop: '4px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: '#854D0E', fontWeight: 700 }}>
                        {loanTerms} x {loanFrequency === 'weekly' ? 'Weekly' : 'Monthly'}:
                      </span>
                      <strong style={{ color: '#92400E' }}>
                        {formatLKR(calculatedInstallmentValue)} / {loanFrequency === 'weekly' ? 'wk' : 'mo'}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Big Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handlePlaceOrder(false)}
                    disabled={!activeSelectedCustomer || !selectedProduct}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '8px',
                    }}
                  >
                    <CheckCircle size={18} /> Confirm & Place Order
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handlePlaceOrder(true)}
                    disabled={!activeSelectedCustomer || !selectedProduct}
                    style={{
                      width: '100%',
                      padding: '9px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Printer size={15} color="var(--accent-gold)" /> Place & Print Agreement
                  </button>

                  <button
                    type="button"
                    onClick={handleResetForm}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ash-500)',
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      marginTop: '4px',
                    }}
                  >
                    <RotateCcw size={13} /> Reset Form
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: PLACED ORDERS & CONTRACTS (DEDICATED VIEW)
          "oerder krpu tika wenama view karala"
          ========================================================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sub Header for Placed Orders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                placeholder="Search by client name, NIC, contract (PN/Center/Item), or item code..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
              />
              {historySearchQuery && (
                <button
                  type="button"
                  onClick={() => setHistorySearchQuery('')}
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

            {/* Quick Status Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn ${historyStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                onClick={() => setHistoryStatusFilter('all')}
              >
                All Orders ({orders.length})
              </button>
              <button
                type="button"
                className={`btn ${historyStatusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                onClick={() => setHistoryStatusFilter('active')}
              >
                Active Loans ({activeLoansCount})
              </button>
              <button
                type="button"
                className={`btn ${historyStatusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                onClick={() => setHistoryStatusFilter('paid')}
              >
                Fully Settled ({settledCount})
              </button>
            </div>

            {/* View Mode Toggle: Split / Table */}
            <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setHistoryViewMode('split')}
                style={{
                  border: 'none',
                  background: historyViewMode === 'split' ? '#fff' : 'transparent',
                  color: historyViewMode === 'split' ? 'var(--primary)' : 'var(--ash-600)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: historyViewMode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <LayoutGrid size={14} /> Detail View
              </button>
              <button
                type="button"
                onClick={() => setHistoryViewMode('table')}
                style={{
                  border: 'none',
                  background: historyViewMode === 'table' ? '#fff' : 'transparent',
                  color: historyViewMode === 'table' ? 'var(--primary)' : 'var(--ash-600)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: historyViewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <List size={14} /> Table View
              </button>
            </div>

            {/* Quick Button to go back to Place Order */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveTab('create')}
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Place New Order
            </button>
          </div>

          {/* SPLIT MASTER-DETAIL VIEW */}
          {historyViewMode === 'split' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(340px, 420px) 1fr',
                gap: '18px',
                alignItems: 'start',
              }}
            >
              {/* LEFT LIST: Orders List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ash-600)', padding: '0 4px' }}>
                  CUSTOMER ORDERS ({filteredOrders.length})
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: 'calc(100vh - 280px)',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {filteredOrders.length === 0 ? (
                    <div
                      style={{
                        padding: '30px',
                        textAlign: 'center',
                        background: '#fff',
                        borderRadius: '10px',
                        border: '1px dashed var(--ash-300)',
                        color: 'var(--ash-500)',
                      }}
                    >
                      No orders match your search.
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const isSelected = activeDisplayedOrder && activeDisplayedOrder.id === order.id;
                      const isPaid = Number(order.balance_due) <= 0;

                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          style={{
                            padding: '12px 14px',
                            background: '#fff',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--ash-200)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.12)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.74rem',
                                color: 'var(--primary)',
                                background: 'var(--primary-tint)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              📜 {order.contract_no}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                              {formatDate(order.date)}
                            </span>
                          </div>

                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                            {order.customer_name}
                          </div>

                          <div style={{ fontSize: '0.76rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                            🆔 NIC: <strong style={{ color: 'var(--ash-800)' }}>{order.customer_nic || order.customer_id}</strong>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--ash-700)', marginTop: '4px', fontWeight: 600 }}>
                            🛋️ {order.item_name} ({order.item_code})
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '8px',
                              paddingTop: '6px',
                              borderTop: '1px dashed var(--ash-200)',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>Value: </span>
                              <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>{formatLKR(order.gross_amount)}</span>
                            </div>
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
                              {isPaid ? 'Settled' : `Bal: ${formatLKR(order.balance_due)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: SELECTED ORDER DISPLAYED SEPARATELY */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ash-600)', padding: '0 4px', marginBottom: '10px' }}>
                  ORDER & CONTRACT DETAILS
                </div>

                {activeDisplayedOrder ? (
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '12px',
                      border: '1px solid var(--ash-200)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--ash-200)', paddingBottom: '14px' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                          OFFICIAL CONTRACT NUMBER
                        </span>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                          📜 {activeDisplayedOrder.contract_no}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                          Invoice: <strong>{activeDisplayedOrder.invoice_no}</strong> • Date: <strong>{formatDate(activeDisplayedOrder.date)}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            background: Number(activeDisplayedOrder.balance_due) <= 0 ? '#DCFCE7' : '#FEF3C7',
                            color: Number(activeDisplayedOrder.balance_due) <= 0 ? '#15803D' : '#B45309',
                            border: Number(activeDisplayedOrder.balance_due) <= 0 ? '1px solid #86EFAC' : '1px solid #FDE68A',
                          }}
                        >
                          {Number(activeDisplayedOrder.balance_due) <= 0 ? '✅ Fully Settled' : '⏳ Active Loan'}
                        </span>
                      </div>
                    </div>

                    {/* 2-Column Info: Customer & Item */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Customer Card */}
                      <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                          ACTIVE CLIENT DETAILS
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ash-900)', marginTop: '4px' }}>
                          {activeDisplayedOrder.customer_name}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                            🆔 NIC: {activeDisplayedOrder.customer_nic || activeDisplayedOrder.customer_id}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} color="var(--ash-500)" /> {activeDisplayedOrder.customer_phone}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="var(--ash-500)" /> {activeDisplayedOrder.customer_address || 'No address specified'}
                          </span>
                          <span style={{ color: 'var(--ash-600)' }}>
                            📍 Center: <strong>{activeDisplayedOrder.branch_code}/{activeDisplayedOrder.center_code}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Furniture Item Card */}
                      <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                          FURNITURE ITEM PURCHASED
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ash-900)', marginTop: '4px' }}>
                          {activeDisplayedOrder.item_name}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--ash-700)' }}>
                            Item Code: {activeDisplayedOrder.item_code}
                          </span>
                          <span>
                            Quantity: <strong>{activeDisplayedOrder.quantity} Unit(s)</strong>
                          </span>
                          <span>
                            Unit Price: <strong>{formatLKR(activeDisplayedOrder.unit_price)}</strong>
                          </span>
                          <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                            Total Value: {formatLKR(activeDisplayedOrder.gross_amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financial & Installment Terms Box */}
                    <div style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.74rem', color: '#854D0E', fontWeight: 700, textTransform: 'uppercase' }}>
                            PAYMENT & REPAYMENT TERMS
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#A16207', marginTop: '2px' }}>
                            {activeDisplayedOrder.payment_type === 'installment'
                              ? `${formatLKR(activeDisplayedOrder.installment_value)} / ${activeDisplayedOrder.loan_frequency === 'weekly' ? 'week' : 'month'}`
                              : 'Full Cash Sale'}
                          </div>
                          {activeDisplayedOrder.payment_type === 'installment' && (
                            <div style={{ fontSize: '0.78rem', color: '#713F12', marginTop: '2px' }}>
                              Plan: {activeDisplayedOrder.loan_terms} installments ({activeDisplayedOrder.loan_frequency}) • Advance: {formatLKR(activeDisplayedOrder.advance_paid)}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.76rem', color: '#854D0E', fontWeight: 700 }}>REMAINING BALANCE</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: Number(activeDisplayedOrder.balance_due) > 0 ? '#DC2626' : '#16A34A' }}>
                            {formatLKR(activeDisplayedOrder.balance_due)}
                          </div>
                          {activeDisplayedOrder.first_due_date && Number(activeDisplayedOrder.balance_due) > 0 && (
                            <div style={{ fontSize: '0.74rem', color: '#713F12', marginTop: '2px' }}>
                              Next Due: <strong>{formatDate(activeDisplayedOrder.first_due_date)}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--ash-200)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                        onClick={() => handleDeleteOrder(activeDisplayedOrder.id, activeDisplayedOrder.contract_no)}
                      >
                        <Trash2 size={14} /> Cancel Order
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {Number(activeDisplayedOrder.balance_due) > 0 && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              setPaymentAmount(activeDisplayedOrder.installment_value || '');
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            <CreditCard size={15} /> Record Payment
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                          onClick={() => {
                            setOrderToPrint(activeDisplayedOrder);
                            setIsPrintModalOpen(true);
                          }}
                        >
                          <Printer size={15} color="var(--accent-gold)" /> Print Bill / Contract
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '60px', background: '#fff', borderRadius: '12px', border: '1px dashed var(--ash-300)', textAlign: 'center', color: 'var(--ash-500)' }}>
                    Select an order from the list or click "Place New Order" above.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="table-responsive" style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Contract No (pn/center/item)</th>
                    <th>Client Name & NIC</th>
                    <th>Furniture Item</th>
                    <th>Total Value</th>
                    <th>Payment Plan</th>
                    <th>Balance Due</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isPaid = Number(order.balance_due) <= 0;
                    return (
                      <tr key={order.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)' }}>
                            {order.contract_no}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{order.customer_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--ash-600)' }}>🆔 {order.customer_nic}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.item_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontFamily: 'monospace' }}>{order.item_code}</div>
                        </td>
                        <td style={{ fontWeight: 800 }}>{formatLKR(order.gross_amount)}</td>
                        <td style={{ fontSize: '0.78rem' }}>
                          {order.payment_type === 'installment'
                            ? `${formatLKR(order.installment_value)} / ${order.loan_frequency}`
                            : 'Cash'}
                        </td>
                        <td style={{ fontWeight: 800, color: isPaid ? '#16A34A' : '#DC2626' }}>
                          {formatLKR(order.balance_due)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: isPaid ? '#DCFCE7' : '#FEF3C7',
                              color: isPaid ? '#15803D' : '#B45309',
                            }}
                          >
                            {isPaid ? 'Settled' : 'Active Loan'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setHistoryViewMode('split');
                            }}
                          >
                            View Order
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          MODAL: RECORD INSTALLMENT PAYMENT
          ========================================================= */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={activeDisplayedOrder ? `Pay Installment - ${activeDisplayedOrder.contract_no}` : 'Record Payment'}
      >
        {activeDisplayedOrder && (
          <form onSubmit={handleRecordInstallment}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.84rem' }}>
                <div>Client: <strong>{activeDisplayedOrder.customer_name}</strong></div>
                <div>NIC: <strong>{activeDisplayedOrder.customer_nic}</strong></div>
                <div>Remaining Balance: <strong style={{ color: '#DC2626' }}>{formatLKR(activeDisplayedOrder.balance_due)}</strong></div>
                <div>Installment Due: <strong>{formatLKR(activeDisplayedOrder.installment_value)}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  min="1"
                  max={activeDisplayedOrder.balance_due}
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
          MODAL: PRINT BILL / CONTRACT RECEIPT
          ========================================================= */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={orderToPrint ? `Print Bill - ${orderToPrint.contract_no}` : 'Print Bill'}
      >
        {orderToPrint && (
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
                    Center: {orderToPrint.branch_code}/{orderToPrint.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>CONTRACT RECEIPT</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 900, color: '#2563eb' }}>
                    {orderToPrint.contract_no}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div>
                  <div>Customer: <strong>{orderToPrint.customer_name}</strong></div>
                  <div>NIC: <strong>{orderToPrint.customer_nic}</strong></div>
                  <div>Phone: {orderToPrint.customer_phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Date: {formatDate(orderToPrint.date)}</div>
                  <div>Invoice No: <strong>{orderToPrint.invoice_no}</strong></div>
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
                      {orderToPrint.item_name} ({orderToPrint.item_code})
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{orderToPrint.quantity}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{formatLKR(orderToPrint.unit_price)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800 }}>{formatLKR(orderToPrint.gross_amount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Financials */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <div style={{ width: '250px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Amount:</span>
                    <strong>{formatLKR(orderToPrint.gross_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Advance Received:</span>
                    <strong>{formatLKR(orderToPrint.advance_paid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', color: '#dc2626', fontWeight: 900 }}>
                    <span>Remaining Balance:</span>
                    <span>{formatLKR(orderToPrint.balance_due)}</span>
                  </div>
                  {orderToPrint.payment_type === 'installment' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', fontSize: '0.78rem' }}>
                      <span>Installment Plan:</span>
                      <strong>{formatLKR(orderToPrint.installment_value)} / {orderToPrint.loan_frequency}</strong>
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
