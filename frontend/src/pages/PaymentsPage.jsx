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
  FileText,
  Check,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
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

  // Active Sub-view: 'accounts' (Active Loan Accounts & Advances) vs 'ledger' (Payment Receipts Ledger)
  const [activeSubView, setActiveSubView] = useState('accounts');

  // Filter & Search State for Accounts Tab (The requested table view)
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all'); // 'all' | 'active' | 'paid'

  // Filter & Search State for Receipts Ledger Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [methodFilter, setMethodFilter] = useState('all'); // 'all' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'Installment Loan' | 'Order Advance' | 'Full Settlement'

  // Modals State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState(null);

  // Contract Details & Statement Modals
  const [isContractViewModalOpen, setIsContractViewModalOpen] = useState(false);
  const [selectedContractForView, setSelectedContractForView] = useState(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedContractForStatement, setSelectedContractForStatement] = useState(null);

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

  // Open the record payment modal (supports preselecting an order directly from the Accounts Table)
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
      collected_by: formCollectedBy || 'D N S Cashier',
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

  // Delete payment record from ledger
  const handleDeletePayment = (paymentId, receiptNo) => {
    if (window.confirm(`Are you sure you want to delete payment receipt ${receiptNo}?`)) {
      const updated = payments.filter((p) => p.id !== paymentId);
      setPayments(updated);
      savePaymentsToStorage(updated);
    }
  };

  // Delete/Cancel contract account
  const handleDeleteContract = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to remove contract record "${contractNo}"?`)) {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrders(updated);
      saveOrdersToStorage(updated);
      if (selectedContractForView && selectedContractForView.id === orderId) {
        setIsContractViewModalOpen(false);
      }
    }
  };

  // Filtered Accounts (Customer loan contracts and balances)
  const filteredAccounts = useMemo(() => {
    return orders.filter((order) => {
      // 1. Center filter
      if (selectedCenter && selectedCenter !== 'all') {
        const parts = selectedCenter.split('/');
        if (parts.length === 2) {
          const ordCenter = `${order.branch_code}/${order.center_code}`.toLowerCase();
          const selClean = selectedCenter.toLowerCase();
          if (ordCenter !== selClean && order.center_code?.toLowerCase() !== parts[1].toLowerCase()) {
            return false;
          }
        }
      }

      // 2. Status filter
      if (accountStatusFilter === 'active' && Number(order.balance_due) <= 0) return false;
      if (accountStatusFilter === 'paid' && Number(order.balance_due) > 0) return false;

      // 3. Search query
      if (accountSearchQuery.trim()) {
        const q = accountSearchQuery.toLowerCase().trim();
        const matchInvoice = order.invoice_no?.toLowerCase().includes(q);
        const matchContract = order.contract_no?.toLowerCase().includes(q);
        const matchCust = order.customer_name?.toLowerCase().includes(q);
        const matchNic = (order.customer_nic || order.customer_id)?.toLowerCase().includes(q);
        const matchItem = (order.item_name || order.items_summary)?.toLowerCase().includes(q);
        const matchCode = order.item_code?.toLowerCase().includes(q);
        const matchPhone = order.customer_phone?.includes(q);
        if (!matchInvoice && !matchContract && !matchCust && !matchNic && !matchItem && !matchCode && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedCenter, accountStatusFilter, accountSearchQuery]);

  const activeLoansCount = orders.filter((o) => Number(o.balance_due) > 0).length;
  const settledCount = orders.filter((o) => Number(o.balance_due) <= 0).length;

  const totalFilteredAccountsBalance = useMemo(() => {
    return filteredAccounts.reduce((acc, o) => acc + (Number(o.balance_due) || 0), 0);
  }, [filteredAccounts]);

  const totalFilteredAccountsAdvances = useMemo(() => {
    return filteredAccounts.reduce((acc, o) => acc + (Number(o.advance_paid) || 0), 0);
  }, [filteredAccounts]);

  // Export Accounts to CSV
  const handleExportAccountsCSV = () => {
    if (!filteredAccounts.length) {
      alert('No account records to export.');
      return;
    }
    const headers = [
      'Contract No',
      'Date',
      'Invoice No',
      'Customer Name',
      'NIC',
      'Phone',
      'Center',
      'Furniture Item',
      'Item Code',
      'Gross Amount',
      'Advance Paid',
      'Balance Due',
      'Installment Value',
      'Frequency',
      'Status',
    ];
    const rows = filteredAccounts.map((o) => [
      `"${o.contract_no}"`,
      `"${o.date}"`,
      `"${o.invoice_no}"`,
      `"${o.customer_name}"`,
      `"${o.customer_nic || ''}"`,
      `"${o.customer_phone || ''}"`,
      `"${o.branch_code}/${o.center_code}"`,
      `"${o.item_name}"`,
      `"${o.item_code}"`,
      o.gross_amount,
      o.advance_paid,
      o.balance_due,
      o.installment_value || 0,
      `"${o.loan_frequency || 'cash'}"`,
      `"${Number(o.balance_due) <= 0 ? 'Fully Paid' : 'Active Loan'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `customer_accounts_and_advances_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Receipts Ledger to CSV
  const handleExportReceiptsCSV = () => {
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
    link.setAttribute('download', `payments_receipts_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Payments List for Ledger
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

  // Overall KPI Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = todayStr.slice(0, 7);

    const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const collectedToday = payments
      .filter((p) => p.date === todayStr)
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const collectedThisMonth = payments
      .filter((p) => p.date.startsWith(thisMonthPrefix))
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const outstandingTotal = orders.reduce((acc, o) => acc + (Number(o.balance_due) || 0), 0);
    const advancesTotal = orders.reduce((acc, o) => acc + (Number(o.advance_paid) || 0), 0);

    return {
      totalCollected,
      collectedToday,
      collectedThisMonth,
      outstandingTotal,
      advancesTotal,
      totalCount: payments.length,
    };
  }, [payments, orders]);

  // Find receipts corresponding to a selected contract
  const contractReceiptsHistory = useMemo(() => {
    if (!selectedContractForView) return [];
    return payments.filter(
      (p) =>
        p.contract_no === selectedContractForView.contract_no ||
        p.order_id === selectedContractForView.id
    );
  }, [payments, selectedContractForView]);

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
            <span>Total Accounts: <strong style={{ color: 'var(--ash-900)' }}>{orders.length}</strong></span>
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
            onClick={activeSubView === 'accounts' ? handleExportAccountsCSV : handleExportReceiptsCSV}
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

        {/* Card 3: Total Advances Collected */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Cumulative Advances Paid</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6D28D9', marginTop: '1px' }}>
              {formatLKR(stats.advancesTotal)}
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
          3. SUB-VIEW SWITCHER RIBBON
          ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveSubView('accounts')}
            style={{
              border: 'none',
              background: activeSubView === 'accounts' ? '#fff' : 'transparent',
              color: activeSubView === 'accounts' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '8px 18px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeSubView === 'accounts' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <CreditCard size={15} /> Active Loan Accounts & Advances ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('ledger')}
            style={{
              border: 'none',
              background: activeSubView === 'ledger' ? '#fff' : 'transparent',
              color: activeSubView === 'ledger' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '8px 18px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeSubView === 'ledger' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Receipt size={15} /> Payment Receipts Ledger ({payments.length})
          </button>
        </div>
      </div>

      {/* =========================================================
          VIEW 1: ACTIVE LOAN ACCOUNTS & REPAYMENT PLANS TABLE
          (THE EXACT TABLE VIEW REQUESTED BY USER)
          ========================================================= */}
      {activeSubView === 'accounts' ? (
        <>
          {/* Search & Filter Bar for Accounts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                placeholder="Search by client name, NIC, contract (PN/Center/Item), invoice, or item code..."
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
              />
              {accountSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAccountSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ash-400)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn ${accountStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => setAccountStatusFilter('all')}
              >
                All Accounts ({orders.length})
              </button>
              <button
                type="button"
                className={`btn ${accountStatusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => setAccountStatusFilter('active')}
              >
                Active Loans ({activeLoansCount})
              </button>
              <button
                type="button"
                className={`btn ${accountStatusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => setAccountStatusFilter('paid')}
              >
                Fully Settled ({settledCount})
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          {filteredAccounts.length === 0 ? (
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
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>No accounts found matching your filter</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
                All clients are fully paid up or search query had no match.
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
                        Contract & Date
                      </th>
                      <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Client Profile & NIC
                      </th>
                      <th style={{ width: '16%', minWidth: '155px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Furniture Item
                      </th>
                      <th style={{ width: '12%', minWidth: '120px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Order Value
                      </th>
                      <th style={{ width: '13%', minWidth: '130px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Repayment Plan
                      </th>
                      <th style={{ width: '11%', minWidth: '115px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Balance Due
                      </th>
                      <th style={{ width: '7%', minWidth: '95px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Status
                      </th>
                      <th style={{ width: '8%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((order, idx) => {
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
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: 'var(--primary)',
                                fontSize: '0.78rem',
                                background: '#EFF6FF',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #BFDBFE',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              📜 {order.contract_no}
                            </span>
                            <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              📅 {formatDate(order.date)} • {order.invoice_no}
                            </div>
                          </td>

                          {/* 2. Client Profile & NIC */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)', whiteSpace: 'nowrap', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.customer_name}>
                              {order.customer_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                🆔 {order.customer_nic || order.customer_id}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                              📞 {order.customer_phone} • {order.branch_code}/{order.center_code}
                            </div>
                          </td>

                          {/* 3. Furniture Item */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                color: 'var(--ash-900)',
                                whiteSpace: 'nowrap',
                                maxWidth: '160px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={order.item_name}
                            >
                              🛋️ {order.item_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: '#F1F5F9',
                                  color: 'var(--ash-700)',
                                  border: '1px solid var(--ash-200)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {order.item_code}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--ash-500)', whiteSpace: 'nowrap' }}>
                                Qty: {order.quantity || 1}
                              </span>
                            </div>
                          </td>

                          {/* 4. Order Value & Advance */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)', whiteSpace: 'nowrap' }}>
                              {formatLKR(order.gross_amount)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600, marginTop: '1px', whiteSpace: 'nowrap' }}>
                              Adv: {formatLKR(order.advance_paid)}
                            </div>
                            {Number(order.document_charge) > 0 && (
                              <div style={{ fontSize: '0.64rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                Doc Fee: {formatLKR(order.document_charge)}
                              </div>
                            )}
                          </td>

                          {/* 5. Repayment Plan */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {order.payment_type === 'installment' ? (
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#A16207', whiteSpace: 'nowrap' }}>
                                  {formatLKR(order.installment_value)} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>/{order.loan_frequency === 'weekly' ? 'wk' : 'mo'}</span>
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                  {order.loan_terms} {order.loan_frequency === 'weekly' ? 'weeks' : 'months'}
                                </div>
                              </div>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: '#F1F5F9',
                                  color: 'var(--ash-700)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Full Cash Sale
                              </span>
                            )}
                          </td>

                          {/* 6. Balance Due */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: '0.9rem',
                                color: isPaid ? '#16A34A' : '#DC2626',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatLKR(order.balance_due)}
                            </div>
                            {isPaid && (
                              <div style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700, marginTop: '1px', whiteSpace: 'nowrap' }}>
                                ✓ Fully Settled
                              </div>
                            )}
                          </td>

                          {/* 7. Status */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: isPaid ? '#DCFCE7' : '#FEF3C7',
                                color: isPaid ? '#15803D' : '#B45309',
                                border: isPaid ? '1px solid #86EFAC' : '1px solid #FDE68A',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: isPaid ? '#16A34A' : '#D97706',
                                  flexShrink: 0,
                                }}
                              />
                              {isPaid ? 'Fully Paid' : 'Active Loan'}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                                title="View Contract Details & Payment History"
                                onClick={() => {
                                  setSelectedContractForView(order);
                                  setIsContractViewModalOpen(true);
                                }}
                              >
                                <Eye size={12} /> View
                              </button>

                              {/* PROMINENT PAY BUTTON FOR COLLECTING INSTALLMENTS */}
                              {Number(order.balance_due) > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                  }}
                                  title="Record Installment or Advance Payment"
                                  onClick={() => handleOpenRecordPaymentModal(order)}
                                >
                                  <CreditCard size={12} /> Pay
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}
                                title="Print Passbook / Agreement Statement"
                                onClick={() => {
                                  setSelectedContractForStatement(order);
                                  setIsStatementModalOpen(true);
                                }}
                              >
                                <Printer size={12} /> Print
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
                                title="Remove Contract Entry"
                                onClick={() => handleDeleteContract(order.id, order.contract_no)}
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
                      );
                    })}
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
                  Showing <strong>{filteredAccounts.length}</strong> of <strong>{orders.length}</strong> loan accounts
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span>
                    Advances Collected: <strong style={{ color: '#16A34A' }}>{formatLKR(totalFilteredAccountsAdvances)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Active Balance Due: <strong style={{ color: '#DC2626', fontSize: '0.9rem' }}>{formatLKR(totalFilteredAccountsBalance)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* =========================================================
            VIEW 2: PAYMENT RECEIPTS LEDGER (HISTORICAL RECEIPTS)
            ========================================================= */
        <>
          {/* Search & Advanced Filter Bar for Receipts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                placeholder="Search receipts by slip no, contract code, client name, NIC, or reference..."
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

          {/* Transactions Ledger Table */}
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
              <Receipt size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>No payment receipts found</div>
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
                  Total Filtered Collections: <strong style={{ color: '#16A34A', fontSize: '0.9rem' }}>{formatLKR(filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0))}</strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================
          4. MODAL: RECORD NEW PAYMENT TRANSACTION
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
                    Code: {selectedOrder.item_code} • Qty: {selectedOrder.quantity || 1}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Repayment Plan</span>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#A16207', marginTop: '1px' }}>
                    {selectedOrder.payment_type === 'installment'
                      ? `${formatLKR(selectedOrder.installment_value)} / ${selectedOrder.loan_frequency === 'weekly' ? 'wk' : 'mo'}`
                      : 'Full Cash Sale'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3B82F6' }}>
                    Paid: {selectedOrder.installments_paid || 0} of {selectedOrder.loan_terms || 1} terms
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Remaining Balance</span>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#DC2626', marginTop: '1px' }}>
                    {formatLKR(selectedOrder.balance_due)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600 }}>
                    Adv Paid: {formatLKR(selectedOrder.advance_paid)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: PAYMENT DETAILS FORM */}
          <div style={{ background: '#fff', border: '1px solid var(--ash-200)', borderRadius: '10px', padding: '16px' }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: '0.86rem', marginBottom: '12px', display: 'block' }}>
              2. Payment Collection Details
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Amount */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                    Payment Amount (LKR) *
                  </label>
                  {selectedOrder && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setFormAmount(selectedOrder.installment_value || '')}
                        style={{ border: '1px solid var(--ash-300)', background: '#fff', fontSize: '0.66rem', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        1 Installment
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
          5. MODAL: CONTRACT DETAILS & PAYMENT HISTORY
          ========================================================= */}
      <Modal
        isOpen={isContractViewModalOpen}
        onClose={() => setIsContractViewModalOpen(false)}
        title={selectedContractForView ? `Contract Account - ${selectedContractForView.contract_no}` : 'Contract Account'}
      >
        {selectedContractForView && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header Ribbon */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700 }}>OFFICIAL CONTRACT CODE</span>
                <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: '#1D4ED8' }}>
                  📜 {selectedContractForView.contract_no}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1E40AF', marginTop: '2px' }}>
                  Invoice: {selectedContractForView.invoice_no} • Date: {formatDate(selectedContractForView.date)}
                </div>
              </div>

              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: Number(selectedContractForView.balance_due) <= 0 ? '#DCFCE7' : '#FEF3C7',
                  color: Number(selectedContractForView.balance_due) <= 0 ? '#15803D' : '#B45309',
                }}
              >
                {Number(selectedContractForView.balance_due) <= 0 ? 'Fully Paid' : 'Active Loan'}
              </span>
            </div>

            {/* 2-Column Info: Customer & Item */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Client Information</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {selectedContractForView.customer_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    🆔 NIC: {selectedContractForView.customer_nic || selectedContractForView.customer_id}
                  </span>
                  <span>📞 {selectedContractForView.customer_phone}</span>
                  <span>📍 Center: {selectedContractForView.branch_code}/{selectedContractForView.center_code}</span>
                  <span>🏠 Address: {selectedContractForView.customer_address || 'Showroom Delivery'}</span>
                </div>
              </div>

              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Furniture Item</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {selectedContractForView.item_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Code: {selectedContractForView.item_code}</span>
                  <span>Quantity: {selectedContractForView.quantity || 1} Unit(s)</span>
                  <span>Total Order Value: <strong>{formatLKR(selectedContractForView.gross_amount)}</strong></span>
                </div>
              </div>
            </div>

            {/* Financial & Repayment Breakdown */}
            <div style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 700 }}>GROSS AMOUNT</span>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#713F12' }}>
                    {formatLKR(selectedContractForView.gross_amount)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 700 }}>ADVANCE COLLECTED</span>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#15803D' }}>
                    {formatLKR(selectedContractForView.advance_paid)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 700 }}>REMAINING BALANCE</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: Number(selectedContractForView.balance_due) <= 0 ? '#15803D' : '#DC2626' }}>
                    {formatLKR(selectedContractForView.balance_due)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 700 }}>REPAYMENT PLAN</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#A16207' }}>
                    {selectedContractForView.payment_type === 'installment'
                      ? `${formatLKR(selectedContractForView.installment_value)} / ${selectedContractForView.loan_frequency === 'weekly' ? 'wk' : 'mo'}`
                      : 'Full Cash Sale'}
                  </div>
                  {selectedContractForView.payment_type === 'installment' && (
                    <div style={{ fontSize: '0.7rem', color: '#854D0E' }}>
                      {selectedContractForView.loan_terms} terms
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History for this Contract */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-800)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={16} color="var(--primary)" /> Payment Receipts History for this Contract ({contractReceiptsHistory.length})
              </div>

              {contractReceiptsHistory.length === 0 ? (
                <div style={{ padding: '14px', background: 'var(--ash-50)', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ash-500)' }}>
                  No installment receipts logged yet. Click "Record Payment" below to log the first payment.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--ash-200)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--ash-200)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Receipt No</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Method</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Amount Paid</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>New Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractReceiptsHistory.map((rcpt) => (
                        <tr key={rcpt.id} style={{ borderBottom: '1px solid var(--ash-100)' }}>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                            {rcpt.receipt_no}
                          </td>
                          <td style={{ padding: '8px' }}>{formatDate(rcpt.date)}</td>
                          <td style={{ padding: '8px' }}>{rcpt.payment_method}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#16A34A' }}>
                            +{formatLKR(rcpt.amount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: Number(rcpt.new_balance) <= 0 ? '#16A34A' : '#DC2626' }}>
                            {formatLKR(rcpt.new_balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsContractViewModalOpen(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedContractForStatement(selectedContractForView);
                  setIsStatementModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Passbook
              </button>

              {Number(selectedContractForView.balance_due) > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsContractViewModalOpen(false);
                    handleOpenRecordPaymentModal(selectedContractForView);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <CreditCard size={15} /> Record Payment
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: PRINT OFFICIAL PAYMENT RECEIPT
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

      {/* =========================================================
          7. MODAL: PRINT CONTRACT PASSBOOK / STATEMENT
          ========================================================= */}
      <Modal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        title={selectedContractForStatement ? `Passbook Statement - ${selectedContractForStatement.contract_no}` : 'Contract Statement'}
      >
        {selectedContractForStatement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              id="printable-passbook"
              style={{
                background: '#fff',
                padding: '24px',
                border: '1px solid var(--ash-300)',
                borderRadius: '8px',
                color: '#1e293b',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                    D N S HOME SOLUTIONS
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Furniture Installment Agreement & Customer Passbook • Center: {selectedContractForStatement.branch_code}/{selectedContractForStatement.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>CONTRACT NO</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: '#2563eb' }}>
                    {selectedContractForStatement.contract_no}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '14px 0', fontSize: '0.84rem' }}>
                <div>
                  <div>Client: <strong style={{ color: '#0f172a' }}>{selectedContractForStatement.customer_name}</strong></div>
                  <div>NIC: <strong style={{ fontFamily: 'monospace' }}>{selectedContractForStatement.customer_nic}</strong></div>
                  <div>Phone: {selectedContractForStatement.customer_phone}</div>
                  <div>Delivery Address: {selectedContractForStatement.customer_address || 'Showroom'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Contract Date: <strong>{formatDate(selectedContractForStatement.date)}</strong></div>
                  <div>Invoice Ref: <strong>{selectedContractForStatement.invoice_no}</strong></div>
                  <div>Payment Frequency: <strong style={{ textTransform: 'capitalize' }}>{selectedContractForStatement.loan_frequency || 'Cash'}</strong></div>
                  <div>Terms: <strong>{selectedContractForStatement.loan_terms || 1} installments</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', margin: '12px 0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Furniture Item</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Gross Value</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Advance Paid</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>
                      <strong>{selectedContractForStatement.item_name}</strong> ({selectedContractForStatement.item_code})
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{selectedContractForStatement.quantity || 1}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>{formatLKR(selectedContractForStatement.gross_amount)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{formatLKR(selectedContractForStatement.advance_paid)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: Number(selectedContractForStatement.balance_due) <= 0 ? '#16a34a' : '#dc2626', fontWeight: 900 }}>
                      {formatLKR(selectedContractForStatement.balance_due)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Terms summary box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', margin: '12px 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span>Agreed Repayment Installment: <strong style={{ color: '#2563eb' }}>{formatLKR(selectedContractForStatement.installment_value)} / {selectedContractForStatement.loan_frequency === 'weekly' ? 'week' : 'month'}</strong></span>
                <span>Current Status: <strong style={{ color: Number(selectedContractForStatement.balance_due) <= 0 ? '#16a34a' : '#d97706' }}>{Number(selectedContractForStatement.balance_due) <= 0 ? 'Fully Settled' : 'Active Installment Loan'}</strong></span>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '10px', fontSize: '0.76rem', color: '#64748b' }}>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Client Signature
                </div>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Center Manager
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsStatementModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Printer size={15} /> Print Statement
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
