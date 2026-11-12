import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  Printer,
  Trash2,
  CheckCircle,
  X,
  RotateCcw,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Building,
  User,
  Clock,
} from 'lucide-react';
import Modal from '../components/Modal';
import {
  loadSavedPayments,
  savePaymentsToStorage,
  generateNextReceiptNo,
} from '../utils/paymentsData';
import {
  loadSavedOrders,
  saveOrdersToStorage,
} from '../utils/ordersData';
import { formatLKR, formatDate } from '../utils/formatters';

export default function PaymentsPage({ selectedCenter = 'all', onNavigate }) {
  // Master Data State
  const [payments, setPayments] = useState(() => loadSavedPayments());
  const [orders, setOrders] = useState(() => loadSavedOrders());

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [methodFilter, setMethodFilter] = useState('all'); // 'all' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'Installment Loan' | 'Order Advance' | 'Full Settlement'

  // Modals State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState(null);

  // Form State for Recording Payment
  const [formContractSearch, setFormContractSearch] = useState('');
  const [isContractDropdownOpen, setIsContractDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentType, setFormPaymentType] = useState('Installment Loan');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formReferenceNo, setFormReferenceNo] = useState('');
  const [formPaymentDate, setFormPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formCollectedBy, setFormCollectedBy] = useState('D N S Showroom Cashier');
  const [formNotes, setFormNotes] = useState('');

  // Sync with localStorage
  useEffect(() => {
    const handleStorage = () => {
      setPayments(loadSavedPayments());
      setOrders(loadSavedOrders());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filter orders that have an outstanding balance for recording payments
  const payableOrders = useMemo(() => {
    return orders.filter((o) => Number(o.balance_due) > 0);
  }, [orders]);

  // Suggestions for order search in the Record Payment modal
  const orderSuggestions = useMemo(() => {
    const q = formContractSearch.toLowerCase().trim();
    if (!q) return payableOrders;
    return payableOrders.filter(
      (o) =>
        o.contract_no?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_nic?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.item_name?.toLowerCase().includes(q) ||
        o.item_code?.toLowerCase().includes(q)
    );
  }, [payableOrders, formContractSearch]);

  // Handle selecting an order from autocomplete
  const handleSelectOrder = (order) => {
    if (order) {
      setSelectedOrder(order);
      setFormContractSearch(`${order.contract_no} — ${order.customer_name}`);
      // Default amount to either installment value or balance due
      const defAmt = order.installment_value && order.installment_value > 0
        ? Math.min(Number(order.installment_value), Number(order.balance_due))
        : Number(order.balance_due);
      setFormAmount(defAmt);
      setFormPaymentType(order.payment_type === 'installment' ? 'Installment Loan' : 'Full Settlement');
    } else {
      setSelectedOrder(null);
      setFormContractSearch('');
      setFormAmount('');
    }
    setIsContractDropdownOpen(false);
  };

  // Open the record payment modal
  const handleOpenRecordPaymentModal = (preselectedOrder = null) => {
    if (preselectedOrder) {
      handleSelectOrder(preselectedOrder);
    } else {
      setSelectedOrder(null);
      setFormContractSearch('');
      setFormAmount('');
      setFormPaymentType('Installment Loan');
    }
    setFormPaymentMethod('Cash');
    setFormReferenceNo('');
    setFormPaymentDate(new Date().toISOString().slice(0, 10));
    setFormCollectedBy('D N S Showroom Cashier');
    setFormNotes('');
    setIsContractDropdownOpen(false);
    setIsRecordPaymentModalOpen(true);
  };

  // Submit and save new payment
  const handleSubmitPayment = (andPrint = false) => {
    if (!selectedOrder) {
      alert('Please select an active order or contract to record the payment.');
      return;
    }
    const payAmt = Number(formAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }
    const currentBal = Number(selectedOrder.balance_due) || 0;
    if (payAmt > currentBal) {
      alert(`Payment amount (${formatLKR(payAmt)}) exceeds the remaining balance of ${formatLKR(currentBal)}.`);
      return;
    }

    const nextBal = Math.max(0, currentBal - payAmt);
    const receiptNo = generateNextReceiptNo(payments);

    const newPayment = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      receipt_no: receiptNo,
      date: formPaymentDate || new Date().toISOString().slice(0, 10),
      order_id: selectedOrder.id,
      contract_no: selectedOrder.contract_no,
      customer_id: selectedOrder.customer_id || selectedOrder.customer_nic,
      customer_name: selectedOrder.customer_name,
      customer_nic: selectedOrder.customer_nic || selectedOrder.customer_id,
      customer_phone: selectedOrder.customer_phone,
      branch_code: selectedOrder.branch_code || 'MHG',
      center_code: selectedOrder.center_code || 'C001',
      payment_type: formPaymentType,
      amount: payAmt,
      previous_balance: currentBal,
      new_balance: nextBal,
      payment_method: formPaymentMethod,
      reference_no: formReferenceNo || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      collected_by: formCollectedBy || 'Showroom Cashier',
      notes: formNotes || `Installment payment for ${selectedOrder.contract_no}`,
      created_at: new Date().toISOString(),
    };

    // 1. Update payments ledger
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    savePaymentsToStorage(updatedPayments);

    // 2. Critically: Update Order balance & status in orders data store
    const updatedOrders = orders.map((o) => {
      if (o.id === selectedOrder.id) {
        const newPaidInstallments = (o.installments_paid || 0) + 1;
        const newTotalAdvance = (Number(o.advance_paid) || 0) + payAmt;
        return {
          ...o,
          balance_due: nextBal,
          advance_paid: newTotalAdvance,
          installments_paid: newPaidInstallments,
          status: nextBal <= 0 ? 'Fully Paid' : 'Active Loan',
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    setIsRecordPaymentModalOpen(false);

    if (andPrint) {
      setActiveReceiptPayment(newPayment);
      setIsReceiptModalOpen(true);
    }
  };

  // Delete payment record
  const handleDeletePayment = (paymentId, receiptNo) => {
    if (window.confirm(`Are you sure you want to delete payment receipt ${receiptNo}?`)) {
      const updated = payments.filter((p) => p.id !== paymentId);
      setPayments(updated);
      savePaymentsToStorage(updated);
    }
  };

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert('No payment records to export.');
      return;
    }
    const headers = [
      'Receipt No',
      'Date',
      'Contract No',
      'Customer Name',
      'Customer NIC',
      'Customer Phone',
      'Branch/Center',
      'Payment Type',
      'Payment Method',
      'Amount (LKR)',
      'Previous Balance',
      'New Balance',
      'Collected By',
      'Reference No',
      'Notes',
    ];
    const rows = filteredPayments.map((p) => [
      `"${p.receipt_no}"`,
      `"${p.date}"`,
      `"${p.contract_no}"`,
      `"${p.customer_name}"`,
      `"${p.customer_nic || ''}"`,
      `"${p.customer_phone || ''}"`,
      `"${p.branch_code}/${p.center_code}"`,
      `"${p.payment_type}"`,
      `"${p.payment_method}"`,
      p.amount,
      p.previous_balance,
      p.new_balance,
      `"${p.collected_by || ''}"`,
      `"${p.reference_no || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `payments_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Center filter from Header
      if (selectedCenter !== 'all') {
        const centerClean = selectedCenter.replace('/', '').toLowerCase();
        const pCenter = `${p.branch_code}${p.center_code}`.toLowerCase();
        if (pCenter !== centerClean) return false;
      }

      // 2. Method filter
      if (methodFilter !== 'all' && p.payment_method !== methodFilter) {
        return false;
      }

      // 3. Type filter
      if (typeFilter !== 'all' && p.payment_type !== typeFilter) {
        return false;
      }

      // 4. Date filter
      if (dateFilter !== 'all') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (dateFilter === 'today' && p.date !== todayStr) return false;
        if (dateFilter === 'month') {
          const thisMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
          if (!p.date.startsWith(thisMonthPrefix)) return false;
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReceipt = p.receipt_no?.toLowerCase().includes(q);
        const matchContract = p.contract_no?.toLowerCase().includes(q);
        const matchCust = p.customer_name?.toLowerCase().includes(q);
        const matchNic = p.customer_nic?.toLowerCase().includes(q);
        const matchPhone = p.customer_phone?.includes(q);
        const matchRef = p.reference_no?.toLowerCase().includes(q);
        return matchReceipt || matchContract || matchCust || matchNic || matchPhone || matchRef;
      }

      return true;
    });
  }, [payments, selectedCenter, methodFilter, typeFilter, dateFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = todayStr.slice(0, 7);

    const totalCollected = filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const collectedToday = payments
      .filter((p) => p.date === todayStr)
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const collectedThisMonth = payments
      .filter((p) => p.date.startsWith(thisMonthPrefix))
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const outstandingTotal = orders.reduce((acc, o) => acc + (Number(o.balance_due) || 0), 0);

    return {
      totalCollected,
      collectedToday,
      collectedThisMonth,
      outstandingTotal,
      totalCount: payments.length,
    };
  }, [filteredPayments, payments, orders]);

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* =========================================================
          1. HEADER WITH STATS & ACTION BUTTONS
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
            <CreditCard size={24} color="var(--primary)" /> Payments & Customer Advances
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.82rem', color: 'var(--ash-500)' }}>
            <span>Total Logged Receipts: <strong style={{ color: 'var(--ash-900)' }}>{payments.length}</strong></span>
            <span>•</span>
            <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A' }}></span>
              This Month: <strong>{formatLKR(stats.collectedThisMonth)}</strong>
            </span>
            <span>•</span>
            <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626' }}></span>
              Portfolio Balance: <strong>{formatLKR(stats.outstandingTotal)}</strong>
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

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenRecordPaymentModal()}
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
            <Plus size={18} strokeWidth={2.5} /> Record New Payment
          </button>
        </div>
      </div>

      {/* =========================================================
          2. KPI SUMMARY STAT CARDS (4 COLUMNS)
          ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {/* Card 1: Today's Collection */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Collections Today</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803D', marginTop: '1px' }}>
              {formatLKR(stats.collectedToday)}
            </div>
          </div>
        </div>

        {/* Card 2: This Month's Collections */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Collected This Month</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1D4ED8', marginTop: '1px' }}>
              {formatLKR(stats.collectedThisMonth)}
            </div>
          </div>
        </div>

        {/* Card 3: Total Logged Receipts */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Receipts Logged</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6D28D9', marginTop: '1px' }}>
              {payments.length} Transactions
            </div>
          </div>
        </div>

        {/* Card 4: Total Portfolio Balance Due */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Total Balance Due</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#DC2626', marginTop: '1px' }}>
              {formatLKR(stats.outstandingTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. SEARCH & ADVANCED FILTER BAR
          ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            placeholder="Search by receipt no, contract code, client name, NIC, or slip reference..."
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

        {/* Filters Group */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date Filter */}
          <select
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '0.78rem', width: 'auto', fontWeight: 600 }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="month">This Month</option>
          </select>

          {/* Payment Method Filter */}
          <select
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '0.78rem', width: 'auto', fontWeight: 600 }}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Card">Card</option>
          </select>

          {/* Payment Type Filter */}
          <select
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '0.78rem', width: 'auto', fontWeight: 600 }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Installment Loan">Installment Payments</option>
            <option value="Order Advance">Order Advances</option>
            <option value="Full Settlement">Full Settlements</option>
          </select>
        </div>
      </div>

      {/* =========================================================
          4. TRANSACTIONS LEDGER TABLE (FITTED 100% TO PAGE)
          ========================================================= */}
      {filteredPayments.length === 0 ? (
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
          <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>No payment transactions found</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
            Click "+ Record New Payment" above to record an advance or installment payment.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid var(--ash-200)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div className="table-responsive" style={{ margin: 0, width: '100%', overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0, width: '100%', minWidth: '1060px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '1px solid var(--ash-200)' }}>
                  <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Receipt & Date
                  </th>
                  <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Contract Code
                  </th>
                  <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Client Profile & NIC
                  </th>
                  <th style={{ width: '13%', minWidth: '130px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Payment Type
                  </th>
                  <th style={{ width: '10%', minWidth: '100px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Method
                  </th>
                  <th style={{ width: '12%', minWidth: '120px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Amount Collected
                  </th>
                  <th style={{ width: '10%', minWidth: '100px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    New Balance
                  </th>
                  <th style={{ width: '7%', minWidth: '95px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((pay, idx) => (
                  <tr
                    key={pay.id}
                    style={{
                      borderBottom: '1px solid var(--ash-100)',
                      background: idx % 2 === 0 ? '#fff' : 'var(--ash-50)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : 'var(--ash-50)')}
                  >
                    {/* 1. Receipt & Date */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: '#2563EB',
                          fontSize: '0.78rem',
                          background: '#EFF6FF',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #BFDBFE',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        🧾 {pay.receipt_no}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        📅 {formatDate(pay.date)} • Ref: {pay.reference_no || 'N/A'}
                      </div>
                    </td>

                    {/* 2. Contract Code */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: 'var(--primary)',
                          fontSize: '0.78rem',
                          background: '#F1F5F9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--ash-200)',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📜 {pay.contract_no}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        Center: {pay.branch_code}/{pay.center_code}
                      </div>
                    </td>

                    {/* 3. Client Profile & NIC */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)', whiteSpace: 'nowrap', maxWidth: '175px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={pay.customer_name}>
                        {pay.customer_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          🆔 {pay.customer_nic || pay.customer_id}
                        </span>
                        {pay.customer_phone && (
                          <span style={{ color: 'var(--ash-500)' }}>• 📞 {pay.customer_phone}</span>
                        )}
                      </div>
                    </td>

                    {/* 4. Payment Type */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: pay.payment_type === 'Installment Loan' ? '#FEF3C7' : pay.payment_type === 'Full Settlement' ? '#DCFCE7' : '#EFF6FF',
                          color: pay.payment_type === 'Installment Loan' ? '#B45309' : pay.payment_type === 'Full Settlement' ? '#15803D' : '#1D4ED8',
                          border: `1px solid ${pay.payment_type === 'Installment Loan' ? '#FDE68A' : pay.payment_type === 'Full Settlement' ? '#86EFAC' : '#BFDBFE'}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pay.payment_type}
                      </span>
                    </td>

                    {/* 5. Payment Method */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: 'var(--ash-700)',
                          border: '1px solid var(--ash-200)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        💳 {pay.payment_method}
                      </span>
                    </td>

                    {/* 6. Amount Collected */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#16A34A', whiteSpace: 'nowrap' }}>
                        +{formatLKR(pay.amount)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--ash-400)', whiteSpace: 'nowrap' }}>
                        Prev: {formatLKR(pay.previous_balance)}
                      </div>
                    </td>

                    {/* 7. New Balance */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          color: Number(pay.new_balance) <= 0 ? '#16A34A' : '#DC2626',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatLKR(pay.new_balance)}
                      </div>
                      {Number(pay.new_balance) <= 0 && (
                        <div style={{ fontSize: '0.64rem', color: '#16A34A', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ✓ Settled
                        </div>
                      )}
                    </td>

                    {/* 8. Actions */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                          title="View & Print Official Receipt"
                          onClick={() => {
                            setActiveReceiptPayment(pay);
                            setIsReceiptModalOpen(true);
                          }}
                        >
                          <Printer size={12} /> Receipt
                        </button>

                        <button
                          type="button"
                          style={{
                            border: '1px solid var(--ash-200)',
                            background: '#fff',
                            color: 'var(--ash-400)',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                          }}
                          title="Delete Payment Entry"
                          onClick={() => handleDeletePayment(pay.id, pay.receipt_no)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#DC2626';
                            e.currentTarget.style.borderColor = '#FCA5A5';
                            e.currentTarget.style.background = '#FEF2F2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--ash-400)';
                            e.currentTarget.style.borderColor = 'var(--ash-200)';
                            e.currentTarget.style.background = '#fff';
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
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
              Showing <strong>{filteredPayments.length}</strong> of <strong>{payments.length}</strong> recorded payment transactions
            </div>
            <div>
              Total Filtered Collections: <strong style={{ color: '#16A34A', fontSize: '0.9rem' }}>{formatLKR(stats.totalCollected)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          5. MODAL: RECORD NEW PAYMENT TRANSACTION
          ========================================================= */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title="💳 Record Payment / Installment Collection"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STEP 1: SELECT ACTIVE ORDER / CONTRACT */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)', position: 'relative' }}>
            {isContractDropdownOpen && (
              <div
                onClick={() => setIsContractDropdownOpen(false)}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55, background: 'transparent' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                1. Select Active Order / Contract Code *
              </label>
              {selectedOrder && (
                <button
                  type="button"
                  onClick={() => handleSelectOrder(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={12} /> Clear / Change
                </button>
              )}
            </div>

            <div style={{ position: 'relative', zIndex: 60 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search active loan contracts by Code, Client Name, NIC, or Phone..."
                value={formContractSearch}
                onFocus={() => setIsContractDropdownOpen(true)}
                onChange={(e) => {
                  setFormContractSearch(e.target.value);
                  setIsContractDropdownOpen(true);
                }}
                style={{ paddingLeft: '36px', fontWeight: 700, fontSize: '0.88rem' }}
              />

              {/* Suggestions Popover */}
              {isContractDropdownOpen && (
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
                  {orderSuggestions.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ash-500)' }}>
                      No active orders found with remaining balance.
                    </div>
                  ) : (
                    orderSuggestions.map((ord) => (
                      <div
                        key={ord.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectOrder(ord);
                        }}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--ash-100)',
                          cursor: 'pointer',
                          background: selectedOrder?.id === ord.id ? 'var(--primary-tint)' : '#fff',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedOrder?.id === ord.id ? 'var(--primary-tint)' : '#fff')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)', fontSize: '0.8rem' }}>
                              📜 {ord.contract_no}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--ash-900)', fontSize: '0.84rem' }}>
                              {ord.customer_name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                            🛋️ {ord.item_name} • NIC: {ord.customer_nic || ord.customer_id} • 📞 {ord.customer_phone}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 700 }}>BALANCE DUE</span>
                          <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#DC2626' }}>
                            {formatLKR(ord.balance_due)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Order Summary Banner */}
            {selectedOrder && (
              <div
                style={{
                  marginTop: '12px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Client Profile</span>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E3A8A', marginTop: '1px' }}>
                    {selectedOrder.customer_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3B82F6' }}>
                    NIC: {selectedOrder.customer_nic} • {selectedOrder.branch_code}/{selectedOrder.center_code}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Furniture Item</span>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1E3A8A', marginTop: '1px' }}>
                    {selectedOrder.item_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3B82F6' }}>
                    Order Value: {formatLKR(selectedOrder.gross_amount)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Installment Due</span>
                  <div style={{ fontWeight: 900, fontSize: '0.98rem', color: '#A16207', marginTop: '1px' }}>
                    {formatLKR(selectedOrder.installment_value || 0)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#A16207' }}>
                    per {selectedOrder.loan_frequency || 'month'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 800, textTransform: 'uppercase' }}>Current Balance</span>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#DC2626', marginTop: '1px' }}>
                    {formatLKR(selectedOrder.balance_due)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700 }}>
                    Paid so far: {formatLKR(selectedOrder.advance_paid)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: PAYMENT DETAILS FORM */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
            <label className="form-label" style={{ fontWeight: 800, marginBottom: '10px', fontSize: '0.86rem' }}>
              2. Payment Collection & Method Details *
            </label>

            <div className="form-grid" style={{ gap: '12px' }}>
              {/* Payment Amount */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, margin: 0 }}>
                    Payment Amount (LKR) *
                  </label>
                  {selectedOrder && (
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button
                        type="button"
                        onClick={() => setFormAmount(selectedOrder.installment_value || '')}
                        style={{ border: '1px solid var(--ash-300)', background: '#fff', fontSize: '0.66rem', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Installment
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormAmount(selectedOrder.balance_due || '')}
                        style={{ border: '1px solid var(--ash-300)', background: '#fff', fontSize: '0.66rem', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Full Balance
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount..."
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  style={{ fontWeight: 800, fontSize: '1rem', color: '#16A34A' }}
                />
                {selectedOrder && Number(formAmount) > 0 && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--ash-600)', marginTop: '2px', display: 'block' }}>
                    Remaining balance after payment: <strong>{formatLKR(Math.max(0, Number(selectedOrder.balance_due) - Number(formAmount)))}</strong>
                  </span>
                )}
              </div>

              {/* Payment Type */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Payment Purpose / Type *
                </label>
                <select
                  className="form-input"
                  value={formPaymentType}
                  onChange={(e) => setFormPaymentType(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="Installment Loan">Monthly / Weekly Installment Payment</option>
                  <option value="Order Advance">Order Advance Deposit</option>
                  <option value="Full Settlement">Full Balance Settlement</option>
                  <option value="Late Fee / Penalty">Late Fee / Charge</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Payment Method *
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['Cash', 'Bank Transfer', 'Cheque', 'Card'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn ${formPaymentMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '7px 4px', fontSize: '0.74rem', fontWeight: 700 }}
                      onClick={() => setFormPaymentMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slip / Bank Reference */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Reference No / Bank Slip Ref
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BOC-TX-9912 or Cheque #"
                  value={formReferenceNo}
                  onChange={(e) => setFormReferenceNo(e.target.value)}
                />
              </div>

              {/* Payment Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formPaymentDate}
                  onChange={(e) => setFormPaymentDate(e.target.value)}
                />
              </div>

              {/* Collected By */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Collected By / Cashier
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formCollectedBy}
                  onChange={(e) => setFormCollectedBy(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                Remarks / Payment Notes
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional notes e.g. Paid at Maharagama showroom..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRecordPaymentModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSubmitPayment(true)}
              disabled={!selectedOrder || !formAmount}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Printer size={15} /> Save & Print Receipt
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSubmitPayment(false)}
              disabled={!selectedOrder || !formAmount}
              style={{ fontWeight: 800, padding: '9px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={16} /> Confirm Payment
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================
          6. MODAL: OFFICIAL PRINTABLE RECEIPT / VOUCHER
          ========================================================= */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={activeReceiptPayment ? `Receipt - ${activeReceiptPayment.receipt_no}` : 'Official Receipt'}
      >
        {activeReceiptPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              id="printable-payment-receipt"
              style={{
                background: '#fff',
                padding: '22px',
                border: '1px solid var(--ash-300)',
                borderRadius: '8px',
                color: '#1e293b',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    D N S HOME SOLUTIONS
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Official Payment & Installment Receipt • Center: {activeReceiptPayment.branch_code}/{activeReceiptPayment.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>OFFICIAL RECEIPT</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 900, color: '#2563eb' }}>
                    {activeReceiptPayment.receipt_no}
                  </div>
                </div>
              </div>

              {/* Meta Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div>
                  <div>Received From: <strong style={{ color: '#0f172a' }}>{activeReceiptPayment.customer_name}</strong></div>
                  <div>NIC: <strong style={{ fontFamily: 'monospace' }}>{activeReceiptPayment.customer_nic}</strong></div>
                  <div>Phone: {activeReceiptPayment.customer_phone || 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Date: <strong>{formatDate(activeReceiptPayment.date)}</strong></div>
                  <div>Contract No: <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{activeReceiptPayment.contract_no}</strong></div>
                  <div>Cashier: {activeReceiptPayment.collected_by || 'Cashier'}</div>
                </div>
              </div>

              {/* Payment Details Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', margin: '12px 0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Payment Description</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Method</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Ref / Slip No</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <strong>{activeReceiptPayment.payment_type}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {activeReceiptPayment.notes || `Contract: ${activeReceiptPayment.contract_no}`}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{activeReceiptPayment.payment_method}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{activeReceiptPayment.reference_no}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 900, fontSize: '0.98rem', color: '#16a34a' }}>
                      {formatLKR(activeReceiptPayment.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Balance Summary Box */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <div style={{ width: '270px', fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Previous Balance Due:</span>
                    <strong>{formatLKR(activeReceiptPayment.previous_balance)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                    <span>Amount Received Today:</span>
                    <span>-{formatLKR(activeReceiptPayment.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '6px', marginTop: '2px', fontWeight: 900, fontSize: '0.96rem', color: Number(activeReceiptPayment.new_balance) <= 0 ? '#16a34a' : '#dc2626' }}>
                    <span>Remaining Balance:</span>
                    <span>{formatLKR(activeReceiptPayment.new_balance)}</span>
                  </div>
                  {Number(activeReceiptPayment.new_balance) <= 0 && (
                    <div style={{ textAlign: 'right', fontSize: '0.74rem', color: '#16a34a', fontWeight: 800 }}>
                      ✓ LOAN FULLY SETTLED
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '35px', paddingTop: '10px', fontSize: '0.76rem', color: '#64748b' }}>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Customer Signature
                </div>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Authorized Cashier
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
