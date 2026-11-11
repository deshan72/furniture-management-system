import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Printer,
  X,
  CreditCard,
  Users,
  LayoutGrid,
  List,
  Trash2,
  FileText,
  UserPlus,
  CheckCircle,
  Phone,
  MapPin,
  Calendar,
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

  // Selected Order for separate display (Master-Detail view)
  const [selectedOrderId, setSelectedOrderId] = useState(() => {
    const list = loadSavedOrders();
    return list.length > 0 ? list[0].id : null;
  });

  // Simple search & quick filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paid'
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'table'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Quick register client drawer inside modal
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

  // New Order Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCenterCode, setSelectedCenterCode] = useState('C001');
  const [selectedBranchCode, setSelectedBranchCode] = useState('MHG');

  // Product selection (dual search by Code or Name)
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
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [deliveryAddress, setDeliveryAddress] = useState('');
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

  // Filter for active customers only
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => c && c.status !== 'inactive');
  }, [customers]);

  const activeSelectedCustomer = useMemo(() => {
    return activeCustomers.find((c) => c.id === selectedCustomerId || (c.nic && c.nic === selectedCustomerId)) || null;
  }, [activeCustomers, selectedCustomerId]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId || p.item_code === selectedProductId) || null;
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
    const item = selectedProduct ? selectedProduct.item_code : 'ITEM';
    return buildContractNumber(pn, center, item);
  }, [passbookNo, selectedCenterCode, selectedProduct]);

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

      // Quick filter
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

  // Selected Order object for separate display
  const activeDisplayedOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0] || null;
  }, [orders, selectedOrderId, filteredOrders]);

  // Open Place Order Modal
  const handleOpenPlaceOrder = () => {
    const nextPn = generateNextPassbookNo(orders);
    setPassbookNo(nextPn);

    const firstCust = activeCustomers[0] || null;
    setSelectedCustomerId(firstCust ? firstCust.id : '');
    setSelectedCenterCode(firstCust?.center_code || 'C001');
    setSelectedBranchCode(firstCust?.branch_code || 'MHG');
    setDeliveryAddress(firstCust?.address || '');

    const firstProd = products[0] || null;
    setSelectedProductId(firstProd ? firstProd.id : '');
    setQuantity(1);
    setUnitPrice(firstProd ? firstProd.selling_price : 0);

    setPaymentType('installment');
    const calcTotal = firstProd ? firstProd.selling_price : 20000;
    setDownPayment(Math.round(calcTotal * 0.2));
    setLoanFrequency('monthly');
    setLoanTerms(12);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setFirstDueDate(nextMonth.toISOString().slice(0, 10));

    setPaymentMethod('Cash');
    setOrderNotes('');
    setShowQuickRegister(false);
    setIsAddModalOpen(true);
  };

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
    } else {
      setSelectedProductId('');
      setUnitPrice(0);
    }
  };

  // When frequency changes
  const handleFrequencyChange = (freq) => {
    setLoanFrequency(freq);
    if (freq === 'weekly') {
      setLoanTerms(12);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFirstDueDate(nextWeek.toISOString().slice(0, 10));
    } else {
      setLoanTerms(12);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setFirstDueDate(nextMonth.toISOString().slice(0, 10));
    }
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
  const handlePlaceOrder = (e) => {
    e.preventDefault();

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
      notes: orderNotes || `Order for ${selectedProduct.name}`,
      created_at: new Date().toISOString(),
    };

    // 1. Save order
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // 2. Update Customer ledger
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

    // 3. Update Product stock
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

    // Close modal and immediately select this newly placed order for separate display!
    setIsAddModalOpen(false);
    setSelectedOrderId(newOrder.id);
  };

  // Record Installment Payment
  const handleRecordInstallment = (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0 || !activeDisplayedOrder) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const currentBal = Number(activeDisplayedOrder.balance_due) || 0;
    const newBal = Math.max(0, currentBal - amt);
    const newAdvance = (Number(activeDisplayedOrder.advance_paid) || 0) + amt;
    const paidCount = (activeDisplayedOrder.installments_paid || 0) + 1;
    const newStatus = newBal <= 0 ? 'Fully Paid' : 'Active Loan';

    const updatedOrder = {
      ...activeDisplayedOrder,
      advance_paid: newAdvance,
      balance_due: newBal,
      installments_paid: paidCount,
      status: newStatus,
    };

    const updatedOrders = orders.map((o) => (o.id === activeDisplayedOrder.id ? updatedOrder : o));
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    const updatedCustomers = customers.map((c) => {
      if (c.nic === activeDisplayedOrder.customer_nic || c.id === activeDisplayedOrder.customer_id) {
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
    alert(`Installment payment of ${formatLKR(amt)} recorded! Remaining balance: ${formatLKR(newBal)}`);
  };

  // Delete Order
  const handleDeleteOrder = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to remove order "${contractNo}"?`)) {
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
    const headers = ['Invoice No', 'Contract No', 'Date', 'Customer Name', 'NIC', 'Phone', 'Center', 'Item Code', 'Item Name', 'Total', 'Balance', 'Status'];
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
      o.balance_due,
      `"${o.status}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
      {/* 1. SIMPLE TOP ACTION HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={22} color="var(--primary)" /> Orders & Invoices
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', fontSize: '0.8rem', color: 'var(--ash-500)' }}>
            <span>Total Orders: <strong>{orders.length}</strong></span>
            <span>•</span>
            <span style={{ color: '#D97706' }}>Active Loans: <strong>{activeLoansCount}</strong></span>
            <span>•</span>
            <span style={{ color: '#16A34A' }}>Fully Settled: <strong>{settledCount}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              style={{
                border: 'none',
                background: viewMode === 'split' ? '#fff' : 'transparent',
                color: viewMode === 'split' ? 'var(--primary)' : 'var(--ash-600)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: viewMode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <LayoutGrid size={14} /> Detail View
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

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export CSV
          </button>

          {/* Prominent Place Order Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenPlaceOrder}
            style={{ padding: '9px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <Plus size={16} /> Place New Order
          </button>
        </div>
      </div>

      {/* 2. SIMPLE SEARCH & STATUS PILLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            placeholder="Search by client name, NIC, contract (PN/Center/Item), or item code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ash-400)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => setStatusFilter('all')}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => setStatusFilter('active')}
          >
            Active Loans ({activeLoansCount})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => setStatusFilter('paid')}
          >
            Fully Settled ({settledCount})
          </button>
        </div>
      </div>

      {/* 3. MAIN ORDERS VIEW: SPLIT MASTER-DETAIL (Separate Order Display) */}
      {viewMode === 'split' ? (
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#fff', borderRadius: '10px', border: '1px dashed var(--ash-300)', color: 'var(--ash-500)' }}>
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
                            fontWeight: 700,
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

                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                        {order.customer_name}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                        🆔 NIC: <strong style={{ color: 'var(--ash-800)' }}>{order.customer_nic || order.customer_id}</strong>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--ash-700)', marginTop: '4px', fontWeight: 600 }}>
                        🛋️ {order.item_name} ({order.item_code})
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--ash-200)' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>Value: </span>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{formatLKR(order.gross_amount)}</span>
                        </div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
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
                    <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                      OFFICIAL CONTRACT NUMBER
                    </span>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
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
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: Number(activeDisplayedOrder.balance_due) > 0 ? '#DC2626' : '#16A34A' }}>
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
                      onClick={() => setIsPrintModalOpen(true)}
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
        /* TABLE VIEW (Alternative clean table view) */
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
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {order.contract_no}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{order.customer_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--ash-600)' }}>🆔 {order.customer_nic}</div>
                    </td>
                    <td>
                      <div>{order.item_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>{order.item_code}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatLKR(order.gross_amount)}</td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {order.payment_type === 'installment'
                        ? `${formatLKR(order.installment_value)} / ${order.loan_frequency}`
                        : 'Cash'}
                    </td>
                    <td style={{ fontWeight: 700, color: isPaid ? '#16A34A' : '#DC2626' }}>
                      {formatLKR(order.balance_due)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isPaid ? '#DCFCE7' : '#FEF3C7',
                        color: isPaid ? '#15803D' : '#B45309',
                      }}>
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
                          setViewMode('split');
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

      {/* =========================================================
          4. MODAL: PLACE NEW ORDER (Clean & Straightforward)
          ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Place New Furniture Order"
      >
        <form onSubmit={handlePlaceOrder}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. SELECT ACTIVE CLIENT */}
            <div style={{ background: 'var(--ash-50)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--ash-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  1. Select Active Customer *
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickRegister(!showQuickRegister)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {showQuickRegister ? 'Cancel' : '+ Quick Add Client'}
                </button>
              </div>

              {showQuickRegister && (
                <div style={{ background: '#fff', border: '1px solid var(--primary-border)', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                  <div className="form-grid" style={{ gap: '8px' }}>
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
                        placeholder="e.g. Perera"
                        value={quickClient.last_name}
                        onChange={(e) => setQuickClient({ ...quickClient, last_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">NIC *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 198512345678"
                        value={quickClient.nic}
                        onChange={(e) => setQuickClient({ ...quickClient, nic: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
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
                    style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.78rem' }}
                    onClick={handleQuickRegisterClient}
                  >
                    Save & Select Customer
                  </button>
                </div>
              )}

              <select
                className="form-select-full"
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                required
                style={{ fontWeight: 600 }}
              >
                <option value="">-- Choose Active Client ({activeCustomers.length}) --</option>
                {activeCustomers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} — NIC: {cust.nic || cust.customer_id} (📞 {cust.phone})
                  </option>
                ))}
              </select>

              {activeSelectedCustomer && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#166534', background: '#DCFCE7', padding: '6px 10px', borderRadius: '6px', display: 'flex', gap: '12px' }}>
                  <span>🆔 NIC: <strong>{activeSelectedCustomer.nic}</strong></span>
                  <span>📍 Center: <strong>{selectedBranchCode}/{selectedCenterCode}</strong></span>
                </div>
              )}
            </div>

            {/* 2. SELECT FURNITURE ITEM (Code or Name) */}
            <div style={{ background: 'var(--ash-50)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--ash-200)' }}>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                2. Select Furniture Item (By Code or Name) *
              </label>

              <div className="form-grid" style={{ gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Select by Item Code</label>
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

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Select by Item Name</label>
                  <select
                    className="form-select-full"
                    value={selectedProduct ? selectedProduct.id : ''}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="">-- Choose Item Name --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.item_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProduct && (
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Unit Price (LKR) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                      style={{ fontWeight: 700, color: 'var(--primary)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Quantity *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. CONTRACT NUMBER (pn/center code/item code) */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#1E40AF', fontWeight: 700 }}>
                  CONTRACT NUMBER (pn/center code/item code)
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1D4ED8', fontSize: '0.9rem' }}>
                  {currentContractNumber}
                </span>
              </div>
            </div>

            {/* 4. PAYMENT TERMS & INSTALLMENT CALCULATION */}
            <div style={{ background: 'var(--ash-50)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--ash-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  3. Payment Terms & Loan Frequency
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn ${paymentType === 'installment' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                    onClick={() => setPaymentType('installment')}
                  >
                    Installment Loan
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentType === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                    onClick={() => {
                      setPaymentType('cash');
                      setDownPayment(totalOrderValue);
                    }}
                  >
                    Full Cash
                  </button>
                </div>
              </div>

              {paymentType === 'installment' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-grid" style={{ gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Down Payment (Advance LKR)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={downPayment}
                        onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Loan Frequency *</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className={`btn ${loanFrequency === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '6px', fontSize: '0.76rem' }}
                          onClick={() => handleFrequencyChange('monthly')}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          className={`btn ${loanFrequency === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '6px', fontSize: '0.76rem' }}
                          onClick={() => handleFrequencyChange('weekly')}
                        >
                          Weekly
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>
                        Terms ({loanFrequency === 'weekly' ? 'Weeks' : 'Months'})
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={loanTerms}
                        onChange={(e) => setLoanTerms(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>First Due Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 700 }}>
                      Auto Installment: <strong>{formatLKR(calculatedInstallmentValue)} / {loanFrequency}</strong>
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#78350F' }}>
                      Loan Balance: <strong>{formatLKR(loanBalance)}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                  Full Cash Payment: {formatLKR(totalOrderValue)}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
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
                style={{ fontWeight: 700 }}
              >
                Confirm & Place Order
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          5. MODAL: RECORD INSTALLMENT PAYMENT
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
                  Confirm Payment
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: PRINT BILL / CONTRACT RECEIPT
          ========================================================= */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={activeDisplayedOrder ? `Print Bill - ${activeDisplayedOrder.contract_no}` : 'Print Bill'}
      >
        {activeDisplayedOrder && (
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
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>D&S FURNITURE WORKSHOP</h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Center: {activeDisplayedOrder.branch_code}/{activeDisplayedOrder.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>CONTRACT RECEIPT</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 800, color: '#2563eb' }}>
                    {activeDisplayedOrder.contract_no}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div>
                  <div>Customer: <strong>{activeDisplayedOrder.customer_name}</strong></div>
                  <div>NIC: <strong>{activeDisplayedOrder.customer_nic}</strong></div>
                  <div>Phone: {activeDisplayedOrder.customer_phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Date: {formatDate(activeDisplayedOrder.date)}</div>
                  <div>Invoice No: <strong>{activeDisplayedOrder.invoice_no}</strong></div>
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
                    <td style={{ padding: '6px' }}>{activeDisplayedOrder.item_name} ({activeDisplayedOrder.item_code})</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{activeDisplayedOrder.quantity}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{formatLKR(activeDisplayedOrder.unit_price)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{formatLKR(activeDisplayedOrder.gross_amount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Financials */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <div style={{ width: '250px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Amount:</span>
                    <strong>{formatLKR(activeDisplayedOrder.gross_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Advance Received:</span>
                    <strong>{formatLKR(activeDisplayedOrder.advance_paid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', color: '#dc2626', fontWeight: 800 }}>
                    <span>Remaining Balance:</span>
                    <span>{formatLKR(activeDisplayedOrder.balance_due)}</span>
                  </div>
                  {activeDisplayedOrder.payment_type === 'installment' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', fontSize: '0.78rem' }}>
                      <span>Installment Plan:</span>
                      <strong>{formatLKR(activeDisplayedOrder.installment_value)} / {activeDisplayedOrder.loan_frequency}</strong>
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
