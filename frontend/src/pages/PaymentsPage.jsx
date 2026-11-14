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
  LayoutGrid,
  List,
  MapPin,
  Phone,
  MessageSquare,
  Send,
  Target,
  CheckCircle2,
  Share2,
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
import { loadSavedCenters, formatCenterCode } from '../utils/centersData';
import {
  calculateCenterCollectionStats,
  isCenterScheduledForDate,
  generateWhatsAppReminderLink,
  generateFieldCollectionSheetHtml,
} from '../utils/collectionUtils';
import { addLiveNotification } from '../utils/notificationsData';
import { printHtmlDocument } from '../utils/printUtils';
import { formatLKR, formatDate } from '../utils/formatters';
import { apiRequest } from '../services/api';

// Helper to calculate next payment due date, next installment amount, and repayment schedule
export const calculateNextPaymentDetails = (order, receipts = []) => {
  if (!order) return null;
  const balanceDue = Number(order.balance_due) || 0;
  const isSettled = balanceDue <= 0;

  if (isSettled) {
    return {
      isSettled: true,
      nextDueAmount: 0,
      nextDueDate: null,
      installmentNumber: Number(order.loan_terms) || receipts.length,
      totalTerms: Number(order.loan_terms) || receipts.length,
      remainingInstallments: 0,
      statusLabel: 'Fully Settled',
      statusType: 'settled',
      frequencyLabel: order.loan_frequency === 'weekly' ? 'Weekly' : 'Monthly',
    };
  }

  // Installment value agreed upon
  const installmentVal = Number(order.installment_value) || 0;
  const nextDueAmount = installmentVal > 0 ? Math.min(installmentVal, balanceDue) : balanceDue;

  // Count how many installment payments were already made
  const installmentsPaid = Number(order.installments_paid) || receipts.length;
  const nextInstallmentNumber = installmentsPaid + 1;
  const totalTerms = Number(order.loan_terms) || Math.max(nextInstallmentNumber, 12);
  const isWeekly = order.loan_frequency === 'weekly';

  // Base date: find the latest receipt date or first_due_date or order.date
  let baseDate = null;
  if (receipts && receipts.length > 0) {
    const dates = receipts
      .map((r) => (r.date ? new Date(r.date) : null))
      .filter((d) => d && !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    if (dates.length > 0) {
      baseDate = new Date(dates[0]);
    }
  }

  let nextDueDate = null;
  if (baseDate) {
    nextDueDate = new Date(baseDate.getTime());
    if (isWeekly) {
      nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
  } else if (order.first_due_date) {
    nextDueDate = new Date(order.first_due_date);
  } else if (order.date) {
    nextDueDate = new Date(order.date);
    if (isWeekly) {
      nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
  } else {
    nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (isWeekly ? 7 : 30));
  }

  // Calculate days difference from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDueDate = new Date(nextDueDate);
  compareDueDate.setHours(0, 0, 0, 0);

  const diffTime = compareDueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let statusLabel = '';
  let statusType = 'upcoming';

  if (diffDays < 0) {
    statusLabel = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
    statusType = 'overdue';
  } else if (diffDays === 0) {
    statusLabel = 'Due Today';
    statusType = 'today';
  } else if (diffDays === 1) {
    statusLabel = 'Due Tomorrow';
    statusType = 'upcoming';
  } else {
    statusLabel = `Due in ${diffDays} days`;
    statusType = 'upcoming';
  }

  return {
    isSettled: false,
    nextDueAmount,
    nextDueDate: nextDueDate.toISOString().slice(0, 10),
    installmentNumber: nextInstallmentNumber,
    totalTerms,
    remainingInstallments: Math.ceil(balanceDue / (nextDueAmount || 1)),
    isWeekly,
    loanFrequency: order.loan_frequency || 'monthly',
    frequencyLabel: isWeekly ? 'Weekly' : 'Monthly',
    statusLabel,
    statusType,
    diffDays,
  };
};

export default function PaymentsPage({ selectedCenter = 'all', onNavigate }) {
  // Master Data State
  const [payments, setPayments] = useState(() => loadSavedPayments());
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [centers, setCenters] = useState(() => loadSavedCenters());
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_customers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Active Sub-view: 'collection_day' (Daily Center Collection) vs 'accounts' vs 'ledger'
  const [activeSubView, setActiveSubView] = useState(() => {
    return localStorage.getItem('dnd_active_payments_subview') || 'collection_day';
  });

  // Center Collection Mode State
  const [selectedCollectionCenterId, setSelectedCollectionCenterId] = useState(() => {
    const stored = localStorage.getItem('dnd_active_collection_center');
    if (stored) return stored;
    if (selectedCenter && selectedCenter !== 'all') return selectedCenter;
    const today = new Date().toISOString().slice(0, 10);
    const allCenters = loadSavedCenters();
    const scheduled = allCenters.find((c) => isCenterScheduledForDate(c, today));
    if (scheduled) return scheduled.id || scheduled.center_code;
    return allCenters[0]?.id || allCenters[0]?.center_code || 'cntr-1';
  });

  const [collectionDate, setCollectionDate] = useState(() => {
    const storedDate = localStorage.getItem('dnd_active_collection_date');
    if (storedDate) return storedDate;
    const allCenters = loadSavedCenters();
    const target = allCenters[0];
    return target?.cash_collect_date || new Date().toISOString().slice(0, 10);
  });

  const [collectionClientTab, setCollectionClientTab] = useState('pending'); // 'pending' | 'confirmed'
  const [collectionSearch, setCollectionSearch] = useState('');

  // Quick Collect Modal State
  const [quickCollectItem, setQuickCollectItem] = useState(null);
  const [quickCollectAmount, setQuickCollectAmount] = useState('');
  const [quickCollectMethod, setQuickCollectMethod] = useState('Cash');
  const [quickCollectOfficer, setQuickCollectOfficer] = useState('');
  const [quickCollectNote, setQuickCollectNote] = useState('');

  // View Mode toggle: 'table' | 'cards' (Cards View vs Table View)
  const [viewMode, setViewMode] = useState('table');

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

  // Sync with localStorage and fetch latest payments & orders from database
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch payments from database
    apiRequest('/payments')
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setPayments((prev) => {
            const dbPayments = res.data;
            const dbIds = new Set(dbPayments.map((d) => d.id));
            const dbRcps = new Set(
              dbPayments.map((d) => (d.receipt_no || '').trim().toUpperCase()).filter(Boolean)
            );
            const localOnly = prev.filter(
              (p) =>
                !dbIds.has(p.id) &&
                !dbRcps.has((p.receipt_no || '').trim().toUpperCase())
            );
            const merged = [...dbPayments, ...localOnly];
            savePaymentsToStorage(merged);
            return merged;
          });
        }
      })
      .catch((err) => {
        console.warn('Payments fetch notice:', err);
      });

    // 2. Fetch orders from database
    apiRequest('/orders')
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setOrders((prev) => {
            const dbOrders = res.data;
            const dbIds = new Set(dbOrders.map((d) => d.id));
            const dbContracts = new Set(
              dbOrders.map((d) => (d.contract_no || '').trim().toUpperCase()).filter(Boolean)
            );
            const localOnly = prev.filter(
              (p) =>
                !dbIds.has(p.id) &&
                !dbContracts.has((p.contract_no || '').trim().toUpperCase())
            );
            const merged = [...dbOrders, ...localOnly];
            saveOrdersToStorage(merged);
            return merged;
          });
        }
      })
      .catch((err) => {
        console.warn('Orders fetch notice:', err);
      });

    const handleStorage = () => {
      setPayments(loadSavedPayments());
      setOrders(loadSavedOrders());
      setCenters(loadSavedCenters());
      try {
        const savedCust = localStorage.getItem('dnd_customers_list');
        if (savedCust) {
          const parsed = JSON.parse(savedCust);
          if (Array.isArray(parsed)) setCustomers(parsed);
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Filter orders that have an outstanding balance for recording payments
  const payableOrders = useMemo(() => {
    return orders.filter((o) => Number(o.balance_due) > 0);
  }, [orders]);

  // Active Center Object for Center-Wise Collection
  const activeCenterObj = useMemo(() => {
    if (!centers || centers.length === 0) return null;
    return (
      centers.find(
        (c) =>
          c.id === selectedCollectionCenterId ||
          c.center_code === selectedCollectionCenterId ||
          formatCenterCode(c.center_code) === formatCenterCode(selectedCollectionCenterId) ||
          `${c.branch_code}/${formatCenterCode(c.center_code)}` === selectedCollectionCenterId
      ) || centers[0]
    );
  }, [centers, selectedCollectionCenterId]);

  // Automatically sync collectionDate to activeCenterObj's cash_collect_date
  useEffect(() => {
    if (activeCenterObj?.cash_collect_date) {
      setCollectionDate(activeCenterObj.cash_collect_date);
    }
  }, [activeCenterObj?.id, activeCenterObj?.center_code, activeCenterObj?.cash_collect_date]);

  // Keep center cash_collect_date updated if modified
  const handleUpdateCenterCollectDate = (newDate) => {
    setCollectionDate(newDate);
    if (!activeCenterObj) return;

    const updatedCenters = centers.map((c) =>
      c.id === activeCenterObj.id || c.center_code === activeCenterObj.center_code
        ? { ...c, cash_collect_date: newDate }
        : c
    );
    setCenters(updatedCenters);
    try {
      localStorage.setItem('dnd_centers_list', JSON.stringify(updatedCenters));
      localStorage.setItem('dnd_active_collection_date', newDate);
      if (activeCenterObj.id) {
        apiRequest(`/centers/${activeCenterObj.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ cash_collect_date: newDate }),
        }).catch(() => {});
      }
    } catch {}
  };

  // Center-Wise Collection Stats (Target, Collected, Shortfall, Pending vs Confirmed)
  const centerStats = useMemo(() => {
    return calculateCenterCollectionStats({
      center: activeCenterObj,
      dateStr: collectionDate,
      orders,
      payments,
      customers,
    });
  }, [activeCenterObj, collectionDate, orders, payments, customers]);

  const filteredPendingClients = useMemo(() => {
    if (!collectionSearch.trim()) return centerStats.pendingList;
    const q = collectionSearch.toLowerCase().trim();
    return centerStats.pendingList.filter(
      (c) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.customerNic?.toLowerCase().includes(q) ||
        c.customerPhone?.includes(q) ||
        c.contractNo?.toLowerCase().includes(q) ||
        c.customerAddress?.toLowerCase().includes(q) ||
        c.itemName?.toLowerCase().includes(q)
    );
  }, [centerStats.pendingList, collectionSearch]);

  const filteredConfirmedClients = useMemo(() => {
    if (!collectionSearch.trim()) return centerStats.confirmedList;
    const q = collectionSearch.toLowerCase().trim();
    return centerStats.confirmedList.filter(
      (c) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.customerNic?.toLowerCase().includes(q) ||
        c.customerPhone?.includes(q) ||
        c.contractNo?.toLowerCase().includes(q) ||
        c.latestReceiptNo?.toLowerCase().includes(q) ||
        c.itemName?.toLowerCase().includes(q)
    );
  }, [centerStats.confirmedList, collectionSearch]);

  const handleOpenQuickCollect = (clientItem) => {
    setQuickCollectItem(clientItem);
    setQuickCollectAmount(clientItem.installmentDue || clientItem.balanceDue || '');
    setQuickCollectMethod('Cash');
    setQuickCollectOfficer(activeCenterObj?.contact_person || 'Field Collection Officer');
    setQuickCollectNote(`Center field cash collection for ${clientItem.contractNo}`);
  };

  const handleConfirmQuickCollect = (andPrint = false) => {
    if (!quickCollectItem || !quickCollectItem.order) {
      alert('Order details not found.');
      return;
    }
    const payAmt = Number(quickCollectAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    const currentBal = Number(quickCollectItem.order.balance_due) || 0;
    if (payAmt > currentBal) {
      alert(`Payment amount (${formatLKR(payAmt)}) exceeds remaining balance of ${formatLKR(currentBal)}.`);
      return;
    }

    const nextBal = Math.max(0, currentBal - payAmt);
    const receiptNo = generateNextReceiptNo(payments);

    const newPayment = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      receipt_no: receiptNo,
      date: activeCenterObj?.cash_collect_date || collectionDate || new Date().toISOString().slice(0, 10),
      order_id: quickCollectItem.order.id,
      contract_no: quickCollectItem.order.contract_no,
      customer_id: quickCollectItem.order.customer_id || quickCollectItem.order.customer_nic,
      customer_name: quickCollectItem.customerName,
      customer_nic: quickCollectItem.customerNic,
      customer_phone: quickCollectItem.customerPhone,
      branch_code: quickCollectItem.order.branch_code || activeCenterObj?.branch_code || '',
      center_code: quickCollectItem.order.center_code || activeCenterObj?.center_code || 'C001',
      payment_type: nextBal <= 0 ? 'Full Settlement' : 'Installment Loan',
      amount: payAmt,
      previous_balance: currentBal,
      new_balance: nextBal,
      payment_method: quickCollectMethod,
      reference_no: `COL-${Math.floor(1000 + Math.random() * 9000)}`,
      collected_by: quickCollectOfficer || activeCenterObj?.contact_person || 'Field Officer',
      notes: quickCollectNote || `Center field cash collection`,
      created_at: new Date().toISOString(),
    };

    // 1. Update payments
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    savePaymentsToStorage(updatedPayments);

    // 2. Update orders
    const newPaidInstallments = (quickCollectItem.order.installments_paid || 0) + 1;
    const newTotalAdvance = (Number(quickCollectItem.order.advance_paid) || 0) + payAmt;
    const updatedOrders = orders.map((o) => {
      if (o.id === quickCollectItem.order.id) {
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

    // 3. Persist to API / Supabase
    try {
      apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(newPayment),
      }).then((res) => {
        if (res && res.data && res.data.id) {
          const merged = { ...newPayment, ...res.data };
          setPayments((prev) => prev.map((p) => (p.id === newPayment.id ? merged : p)));
          const fresh = loadSavedPayments().map((p) => (p.id === newPayment.id ? merged : p));
          savePaymentsToStorage(fresh);
        }
      }).catch((e) => console.warn('Payment DB persist notice:', e));

      if (quickCollectItem.order.id) {
        apiRequest(`/orders/${quickCollectItem.order.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            advance_paid: newTotalAdvance,
            balance_due: nextBal,
            status: nextBal <= 0 ? 'Fully Paid' : 'Active Loan',
          }),
        }).catch((e) => console.warn('Order DB update notice:', e));
      }
    } catch {}

    // 4. Notification
    addLiveNotification({
      title: `Cash Collected: ${formatLKR(payAmt)} ✅`,
      desc: `Receipt ${newPayment.receipt_no}: ${formatLKR(payAmt)} collected from ${newPayment.customer_name} (${activeCenterObj?.name || 'Center'}).`,
      category: 'payments',
      type: 'payment',
      targetTab: 'payments',
    });

    setQuickCollectItem(null);

    if (andPrint) {
      setActiveReceiptPayment(newPayment);
      setIsReceiptModalOpen(true);
    }
  };

  const handlePrintFieldSheet = () => {
    const html = generateFieldCollectionSheetHtml(centerStats);
    printHtmlDocument(html, {
      title: `Field_Sheet_${centerStats.centerCode}_${centerStats.dateStr}`,
    });
  };

  const handleSendWhatsAppReminder = (clientItem) => {
    const link = generateWhatsAppReminderLink(clientItem, activeCenterObj, clientItem.installmentDue);
    if (!link) {
      alert('Valid mobile number not found for this client.');
      return;
    }
    window.open(link, '_blank');
  };

  const handleSendWhatsAppReceipt = (p) => {
    if (!p) return;
    const phone = String(p.customer_phone || '').replace(/\D/g, '');
    const formattedPhone = phone.startsWith('0') ? `94${phone.slice(1)}` : phone;
    const text = `Official Payment Receipt - D N S Home Solutions\n\nDear ${p.customer_name},\nWe have received your payment of ${formatLKR(p.amount)} for contract ${p.contract_no}.\n• Receipt No: ${p.receipt_no}\n• Date: ${formatDate(p.date)}\n• Payment Method: ${p.payment_method}\n• Remaining Balance: ${formatLKR(p.new_balance)}\n\nThank you for choosing D N S Home Solutions!`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportCollectionCSV = () => {
    const allRows = [
      ...centerStats.pendingList.map((r) => ({ ...r, status: 'Pending Collection' })),
      ...centerStats.confirmedList.map((r) => ({ ...r, status: 'Paid & Confirmed' })),
    ];
    if (!allRows.length) {
      alert('No client records to export for this center.');
      return;
    }
    const headers = [
      'Index',
      'Customer Name',
      'NIC',
      'Phone',
      'Address',
      'Contract No',
      'Item',
      'Due Amount',
      'Amount Paid',
      'Status',
      'Receipt No',
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...allRows.map((r, i) =>
          [
            i + 1,
            `"${(r.customerName || '').replace(/"/g, '""')}"`,
            `"${(r.customerNic || '').replace(/"/g, '""')}"`,
            `"${(r.customerPhone || '').replace(/"/g, '""')}"`,
            `"${(r.customerAddress || '').replace(/"/g, '""')}"`,
            `"${(r.contractNo || '').replace(/"/g, '""')}"`,
            `"${(r.itemName || '').replace(/"/g, '""')}"`,
            r.installmentDue || 0,
            r.amountPaidToday || 0,
            `"${r.status}"`,
            `"${r.latestReceiptNo || ''}"`,
          ].join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Collection_Sheet_${centerStats.centerCode}_${centerStats.dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

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

    // Persist payment & order balance to database
    try {
      apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(newPayment),
      })
        .then((res) => {
          if (res && res.data && res.data.id) {
            const merged = { ...newPayment, ...res.data };
            setPayments((prev) => prev.map((p) => (p.id === newPayment.id ? merged : p)));
            const fresh = loadSavedPayments().map((p) => (p.id === newPayment.id ? merged : p));
            savePaymentsToStorage(fresh);
          }
        })
        .catch((dbErr) => {
          console.warn('Payment DB persist notice:', dbErr);
        });

      if (selectedOrder.id) {
        apiRequest(`/orders/${selectedOrder.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            advance_paid: newTotalAdvance,
            balance_due: nextBal,
            status: nextBal <= 0 ? 'Fully Paid' : 'Active Loan',
          }),
        }).catch((e) => console.warn('Order DB update notice:', e));
      }
    } catch {}

    // Broadcast live payment notification
    const isFullSettlement = nextBal <= 0;
    addLiveNotification({
      title: isFullSettlement ? `Loan Fully Settled! 🎉` : `Payment Received: ${formatLKR(payAmt)}`,
      desc: `Receipt ${newPayment.receipt_no}: ${formatLKR(payAmt)} collected from ${newPayment.customer_name} (${newPayment.contract_no}) via ${newPayment.payment_method}.${isFullSettlement ? ' Account is now cleared!' : ` Remaining balance: ${formatLKR(nextBal)}`}`,
      category: isFullSettlement ? 'collections' : 'payments',
      type: isFullSettlement ? 'collection' : 'payment',
      targetTab: 'payments',
    });

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

      apiRequest(`/payments/${paymentId}`, { method: 'DELETE' }).catch((err) => {
        console.warn('Payment DB delete notice:', err);
      });

      addLiveNotification({
        title: `Payment Receipt Voided`,
        desc: `Receipt ${receiptNo} was deleted from the payments ledger.`,
        category: 'alerts',
        type: 'warning',
        targetTab: 'payments',
      });
    }
  };

  // Delete/Cancel contract account
  const handleDeleteContract = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to remove contract record "${contractNo}"?`)) {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrders(updated);
      saveOrdersToStorage(updated);

      apiRequest(`/orders/${orderId}`, { method: 'DELETE' }).catch((err) => {
        console.warn('Order DB delete notice:', err);
      });
      if (selectedContractForView && selectedContractForView.id === orderId) {
        setIsContractViewModalOpen(false);
      }

      addLiveNotification({
        title: `Contract Account Removed`,
        desc: `Contract record "${contractNo}" was removed from the system.`,
        category: 'alerts',
        type: 'warning',
        targetTab: 'payments',
      });
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

  // Export Active Loan Accounts & Advances to PDF
  const handleExportAccountsPDF = () => {
    if (!filteredAccounts.length) {
      alert('No account records to export.');
      return;
    }

    const totalGross = filteredAccounts.reduce((sum, o) => sum + (Number(o.gross_amount) || 0), 0);
    const totalAdvances = filteredAccounts.reduce((sum, o) => sum + (Number(o.advance_paid) || 0), 0);
    const totalBalance = filteredAccounts.reduce((sum, o) => sum + (Number(o.balance_due) || 0), 0);
    const activeCount = filteredAccounts.filter((o) => Number(o.balance_due) > 0).length;
    const settled = filteredAccounts.filter((o) => Number(o.balance_due) <= 0).length;

    const rowsHtml = filteredAccounts
      .map((o, idx) => {
        const isSettled = Number(o.balance_due) <= 0;
        return `
          <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-size: 10px;">${idx + 1}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-family: monospace; font-weight: 700; color: #2563EB; font-size: 10.5px;">
              ${o.contract_no}<br>
              <span style="color: #64748B; font-size: 9.5px; font-weight: normal;">Inv: ${o.invoice_no} • ${formatDate(o.date)}</span>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px;">
              <strong style="color: #0F172A;">${o.customer_name}</strong>
              <div style="color: #64748B; font-size: 9.5px; font-family: monospace;">NIC: ${o.customer_nic || 'N/A'} • ${o.customer_phone || ''}</div>
              <div style="color: #D97706; font-size: 9px; font-weight: 700;">Center: ${o.branch_code}/${o.center_code}</div>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px;">
              <strong style="color: #0F172A;">🛋️ ${o.item_name}</strong>
              <div style="color: #64748B; font-size: 9.5px;">Code: ${o.item_code}</div>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; font-size: 11px; color: #0F172A; white-space: nowrap;">
              Rs. ${(Number(o.gross_amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; font-size: 11px; color: #16A34A; white-space: nowrap;">
              Rs. ${(Number(o.advance_paid) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 900; font-size: 11px; color: ${isSettled ? '#16A34A' : '#DC2626'}; white-space: nowrap;">
              Rs. ${(Number(o.balance_due) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10px; color: #A16207; font-weight: 700; white-space: nowrap;">
              ${o.payment_type === 'installment' ? `Rs. ${(Number(o.installment_value) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} / ${o.loan_frequency || 'mo'}` : 'Cash Sale'}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; background: ${isSettled ? '#DCFCE7' : '#FEF3C7'}; color: ${isSettled ? '#15803D' : '#B45309'}; border: 1px solid ${isSettled ? '#86EFAC' : '#FDE68A'}; white-space: nowrap;">
                ${isSettled ? '✓ Fully Settled' : 'Active Loan'}
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
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Active Loan Accounts & Advances Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2.5px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 10.5px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 2px; }
            .report-title { font-size: 15px; font-weight: 800; color: #0F172A; margin-top: 6px; }
            .meta-text { font-size: 10.5px; color: #64748B; text-align: right; line-height: 1.5; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 16px; }
            .summary-card { border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 14px; background: #F8FAFC; flex: 1; }
            .summary-label { font-size: 9.5px; color: #64748B; text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; }
            .summary-val { font-size: 17px; font-weight: 900; color: #0F172A; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px; }
            table.data-table th { background: #F1F5F9; color: #1E293B; padding: 9px 10px; text-align: left; font-weight: 800; border-bottom: 2px solid #CBD5E1; font-size: 10px; text-transform: uppercase; }
            .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding-top: 14px; border-top: 1px dashed #CBD5E1; }
            .sig-box { width: 28%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 35px; margin-bottom: 6px; }
            .sig-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
            .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 9.5px; color: #94A3B8; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:52px;width:52px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;border-radius:6px;border:1px solid #CBD5E1;padding:2px;background:#fff;" />
                <div class="brand-title">D N S HOME SOLUTIONS</div>
                <div class="brand-sub">Furniture Workshop & Showroom Ledger</div>
                <div class="report-title">Active Loan Accounts & Advances Audit Report</div>
              </td>
              <td class="meta-text">
                <div><strong>Generated Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
                <div><strong>Center Scope:</strong> ${selectedCenter && selectedCenter !== 'all' ? selectedCenter : 'All Island Centers'}</div>
                <div><strong>Total Accounts:</strong> ${filteredAccounts.length} Account(s)</div>
              </td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Accounts</div>
              <div class="summary-val">${filteredAccounts.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Active Loans</div>
              <div class="summary-val" style="color: #D97706;">${activeCount}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Fully Settled</div>
              <div class="summary-val" style="color: #16A34A;">${settled}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Advances Collected</div>
              <div class="summary-val" style="color: #16A34A;">Rs. ${totalAdvances.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Balance Due</div>
              <div class="summary-val" style="color: #DC2626;">Rs. ${totalBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Contract & Date</th>
                <th>Client Profile & Center</th>
                <th>Furniture Item</th>
                <th style="text-align: right;">Gross Value</th>
                <th style="text-align: right;">Advance Paid</th>
                <th style="text-align: right;">Balance Due</th>
                <th>Repayment Plan</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #E2E8F0; font-weight: 900;">
                <td colspan="4" style="padding: 10px; text-align: right; font-size: 11px;">PORTFOLIO TOTALS:</td>
                <td style="padding: 10px; text-align: right; font-size: 11.5px;">Rs. ${totalGross.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 10px; text-align: right; font-size: 11.5px; color: #16A34A;">Rs. ${totalAdvances.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 10px; text-align: right; font-size: 12px; color: #DC2626;">Rs. ${totalBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Prepared By (Showroom Cashier)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Verified By (Accounts Officer)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Approved By (Managing Director)</div>
            </div>
          </div>

          <div class="footer">
            <span>D N S Home Solutions System • Official Client Loan & Advances Ledger</span>
            <span>Printed via Furniture Management System Web Application</span>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: 'DNS_Loan_Accounts_Report' });
  };

  // Export Payment Receipts Ledger to PDF
  const handleExportReceiptsPDF = () => {
    if (!filteredPayments.length) {
      alert('No payment records to export.');
      return;
    }

    const totalCollected = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const rowsHtml = filteredPayments
      .map((p, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-size: 10px;">${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-family: monospace; font-weight: 800; color: #2563EB; font-size: 11px;">
            ${p.receipt_no}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px; white-space: nowrap;">
            ${formatDate(p.date)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-family: monospace; font-weight: 700; color: #1E4D8C; font-size: 10.5px;">
            ${p.contract_no}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px;">
            <strong style="color: #0F172A;">${p.customer_name}</strong>
            <div style="color: #64748B; font-size: 9.5px; font-family: monospace;">NIC: ${p.customer_nic || 'N/A'} • ${p.customer_phone || ''}</div>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10px; font-weight: 700; color: #D97706;">
            ${p.branch_code}/${p.center_code}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px; font-weight: 600;">
            ${p.payment_type}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10px;">
            <span style="background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${p.payment_method}</span>
            ${p.reference_no ? `<div style="font-family: monospace; color: #64748B; font-size: 9px; margin-top: 1px;">Ref: ${p.reference_no}</div>` : ''}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 900; font-size: 11.5px; color: #16A34A; white-space: nowrap;">
            +Rs. ${(Number(p.amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; font-size: 11px; color: ${Number(p.new_balance) <= 0 ? '#16A34A' : '#DC2626'}; white-space: nowrap;">
            Rs. ${(Number(p.new_balance) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Payment Receipts Ledger</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2.5px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 10.5px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 2px; }
            .report-title { font-size: 15px; font-weight: 800; color: #0F172A; margin-top: 6px; }
            .meta-text { font-size: 10.5px; color: #64748B; text-align: right; line-height: 1.5; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 16px; }
            .summary-card { border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 14px; background: #F8FAFC; flex: 1; }
            .summary-label { font-size: 9.5px; color: #64748B; text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; }
            .summary-val { font-size: 17px; font-weight: 900; color: #0F172A; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px; }
            table.data-table th { background: #F1F5F9; color: #1E293B; padding: 9px 10px; text-align: left; font-weight: 800; border-bottom: 2px solid #CBD5E1; font-size: 10px; text-transform: uppercase; }
            .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding-top: 14px; border-top: 1px dashed #CBD5E1; }
            .sig-box { width: 28%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 35px; margin-bottom: 6px; }
            .sig-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
            .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 9.5px; color: #94A3B8; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:52px;width:52px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;border-radius:6px;border:1px solid #CBD5E1;padding:2px;background:#fff;" />
                <div class="brand-title">D N S HOME SOLUTIONS</div>
                <div class="brand-sub">Furniture Workshop & Showroom Ledger</div>
                <div class="report-title">Official Payment Receipts & Cash Collections Ledger</div>
              </td>
              <td class="meta-text">
                <div><strong>Generated Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
                <div><strong>Center Scope:</strong> ${selectedCenter && selectedCenter !== 'all' ? selectedCenter : 'All Island Centers'}</div>
                <div><strong>Total Receipts:</strong> ${filteredPayments.length} Receipt(s)</div>
              </td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Receipts Logged</div>
              <div class="summary-val">${filteredPayments.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Collections Today</div>
              <div class="summary-val" style="color: #16A34A;">Rs. ${stats.collectedToday.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Collections This Month</div>
              <div class="summary-val" style="color: #2563EB;">Rs. ${stats.collectedThisMonth.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Filtered Collections Total</div>
              <div class="summary-val" style="color: #1E4D8C;">Rs. ${totalCollected.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Contract</th>
                <th>Customer Profile</th>
                <th>Center</th>
                <th>Purpose</th>
                <th>Method</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #E2E8F0; font-weight: 900;">
                <td colspan="8" style="padding: 10px; text-align: right; font-size: 11px;">TOTAL CASH & BANK RECEIPTS COLLECTED:</td>
                <td style="padding: 10px; text-align: right; font-size: 12px; color: #16A34A;">
                  Rs. ${totalCollected.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Collected By (Cashier)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Verified By (Accounts Officer)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Approved By (Managing Director)</div>
            </div>
          </div>

          <div class="footer">
            <span>D N S Home Solutions System • Official Payment Audit Trail</span>
            <span>Printed via Furniture Management System Web Application</span>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: 'DNS_Receipts_Ledger' });
  };

  // Print Single Official Payment Receipt as PDF
  const handlePrintSingleReceiptPDF = (p) => {
    if (!p) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Payment Receipt ${p.receipt_no}</title>
          <style>
            @page { size: A5 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0F172A; margin: 0; padding: 16px; font-size: 11px; }
            .receipt-box { border: 2px solid #1E4D8C; border-radius: 8px; padding: 16px; background: #fff; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #1E4D8C; padding-bottom: 10px; }
            .brand-title { font-size: 20px; font-weight: 900; color: #1E4D8C; margin: 0; }
            .brand-sub { font-size: 9.5px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-top: 1px; }
            .receipt-title { font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 4px; }
            .meta-text { font-size: 10.5px; color: #475569; text-align: right; line-height: 1.5; }
            .details-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
            .section-label { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 4px; }
            .field-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #E2E8F0; }
            .amount-box { background: #DCFCE7; border: 2px solid #86EFAC; border-radius: 6px; padding: 10px 14px; text-align: center; margin: 12px 0; }
            .amount-label { font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase; }
            .amount-val { font-size: 22px; font-weight: 900; color: #15803D; margin-top: 2px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 10px; }
            .sig-box { width: 40%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 30px; margin-bottom: 4px; }
            .sig-label { font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <table class="header-table">
              <tr>
                <td>
                  <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:44px;width:44px;object-fit:contain;vertical-align:middle;margin-right:10px;float:left;border-radius:4px;border:1px solid #CBD5E1;padding:2px;background:#fff;" />
                  <div class="brand-title">D N S HOME SOLUTIONS</div>
                  <div class="brand-sub">Furniture Workshop & Showroom Ledger</div>
                  <div class="receipt-title">Official Cash / Deposit Receipt</div>
                </td>
                <td class="meta-text">
                  <div><strong>Receipt No:</strong> <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #1E4D8C;">${p.receipt_no}</span></div>
                  <div><strong>Date:</strong> ${formatDate(p.date)}</div>
                  <div><strong>Center:</strong> ${p.branch_code}/${p.center_code}</div>
                  <div><strong>Collected By:</strong> ${p.collected_by || 'Showroom Cashier'}</div>
                </td>
              </tr>
            </table>

            <div class="details-grid">
              <div>
                <div class="section-label">Received From (Customer Details)</div>
                <div style="font-size: 12px; font-weight: 800; color: #0F172A;">${p.customer_name}</div>
                <div style="font-size: 10px; color: #475569; margin-top: 2px;">NIC: <strong>${p.customer_nic || 'N/A'}</strong> • Phone: <strong>${p.customer_phone || 'N/A'}</strong></div>
                <div style="font-size: 10px; color: #1E4D8C; font-family: monospace; font-weight: 700; margin-top: 4px;">Contract Ref: ${p.contract_no}</div>
              </div>
              <div>
                <div class="section-label">Payment Breakdown</div>
                <div class="field-row"><span>Payment Purpose:</span> <strong>${p.payment_type}</strong></div>
                <div class="field-row"><span>Payment Method:</span> <strong>${p.payment_method}</strong></div>
                ${p.reference_no ? `<div class="field-row"><span>Reference No:</span> <strong style="font-family: monospace;">${p.reference_no}</strong></div>` : ''}
                <div class="field-row"><span>Previous Balance:</span> <strong>Rs. ${(Number(p.previous_balance) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></div>
                <div class="field-row" style="color: ${Number(p.new_balance) <= 0 ? '#16A34A' : '#DC2626'}; font-weight: 800;">
                  <span>New Balance Due:</span> <span>Rs. ${(Number(p.new_balance) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-label">Amount Received In Full</div>
              <div class="amount-val">Rs. ${(Number(p.amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
              ${p.notes ? `<div style="font-size: 9.5px; color: #166534; font-style: italic; margin-top: 2px;">"${p.notes}"</div>` : ''}
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Customer Signature</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Cashier (D N S Home Solutions)</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: `DNS_Receipt_${p.receipt_no}` });
  };

  // Print Contract Passbook Statement as PDF
  const handlePrintPassbookPDF = (contract) => {
    if (!contract) return;

    const receipts = payments.filter((p) => p.contract_no === contract.contract_no || p.order_id === contract.id);

    const receiptsHtml = receipts
      .map(
        (p) => `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 7px 10px; font-family: monospace; font-weight: 700; color: #2563EB;">${p.receipt_no}</td>
          <td style="padding: 7px 10px;">${formatDate(p.date)}</td>
          <td style="padding: 7px 10px;">${p.payment_type}</td>
          <td style="padding: 7px 10px;">${p.payment_method}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #16A34A;">+Rs. ${(Number(p.amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: ${Number(p.new_balance) <= 0 ? '#16A34A' : '#DC2626'};">
            Rs. ${(Number(p.new_balance) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Passbook - ${contract.contract_no}</title>
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2.5px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 10.5px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 2px; }
            .doc-type { font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 6px; }
            .meta-text { font-size: 10.5px; color: #475569; text-align: right; line-height: 1.6; }
            .info-card { background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1E4D8C; margin: 16px 0 6px; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px; }
            table.data-table th { background: #F1F5F9; color: #1E293B; padding: 8px 10px; text-align: left; font-weight: 800; border-bottom: 2px solid #CBD5E1; font-size: 10px; text-transform: uppercase; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 14px; border-top: 1px dashed #CBD5E1; }
            .sig-box { width: 35%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 35px; margin-bottom: 6px; }
            .sig-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:52px;width:52px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;border-radius:6px;border:1px solid #CBD5E1;padding:2px;background:#fff;" />
                <div class="brand-title">D N S HOME SOLUTIONS</div>
                <div class="brand-sub">Furniture Workshop & Showroom Ledger</div>
                <div class="doc-type">Official Contract Passbook & Repayment Statement</div>
              </td>
              <td class="meta-text">
                <div><strong>Contract No:</strong> <span style="font-family: monospace; font-size: 12px; font-weight: 800; color: #2563EB;">${contract.contract_no}</span></div>
                <div><strong>Invoice No:</strong> ${contract.invoice_no}</div>
                <div><strong>Center Hub:</strong> ${contract.branch_code}/${contract.center_code}</div>
                <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </td>
            </tr>
          </table>

          <div class="info-card">
            <div>
              <div style="font-size: 9.5px; font-weight: 800; color: #64748B; text-transform: uppercase;">Customer Information</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 3px 0 2px;">${contract.customer_name}</div>
              <div><strong>NIC:</strong> ${contract.customer_nic || 'N/A'}</div>
              <div><strong>Phone:</strong> ${contract.customer_phone || 'N/A'}</div>
              <div><strong>Item:</strong> 🛋️ ${contract.item_name} (${contract.item_code})</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 9.5px; font-weight: 800; color: #64748B; text-transform: uppercase;">Financial Summary</div>
              <div style="font-size: 11px; margin-top: 3px;">Gross Value: <strong>Rs. ${(Number(contract.gross_amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></div>
              <div style="font-size: 11px; color: #16A34A;">Advance Paid: <strong>Rs. ${(Number(contract.advance_paid) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></div>
              <div style="font-size: 13px; font-weight: 900; color: ${Number(contract.balance_due) > 0 ? '#DC2626' : '#16A34A'}; margin-top: 4px;">
                Balance Due: Rs. ${(Number(contract.balance_due) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
              ${contract.payment_type === 'installment' ? `
                <div style="font-size: 10px; color: #A16207; font-weight: 700; margin-top: 2px;">
                  Plan: Rs. ${(Number(contract.installment_value) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} / ${contract.loan_frequency || 'mo'}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="section-title">Installment & Advance Payments Ledger (${receipts.length})</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Payment Type</th>
                <th>Method</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Remaining Balance</th>
              </tr>
            </thead>
            <tbody>
              ${receiptsHtml || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748B;">No payment receipts recorded for this contract yet.</td></tr>'}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Customer Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Authorized Officer (D N S Home Solutions)</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: `DNS_Passbook_${contract.contract_no}` });
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

  // Calculate next payment due date, next installment amount, and repayment schedule
  const nextPaymentDetails = useMemo(() => {
    if (!selectedContractForView) return null;
    return calculateNextPaymentDetails(selectedContractForView, contractReceiptsHistory);
  }, [selectedContractForView, contractReceiptsHistory]);

  return (
    <div className="payments-page-container" style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* =========================================================
          1. HEADER WITH STATS & ACTION BUTTONS
          ========================================================= */}
      <div
        className="payments-header-card"
        style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, var(--ash-200))',
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
            onClick={
              activeSubView === 'collection_day'
                ? handleExportCollectionCSV
                : activeSubView === 'accounts'
                ? handleExportAccountsCSV
                : handleExportReceiptsCSV
            }
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Download CSV spreadsheet"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={
              activeSubView === 'collection_day'
                ? handlePrintFieldSheet
                : activeSubView === 'accounts'
                ? handleExportAccountsPDF
                : handleExportReceiptsPDF
            }
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title={
              activeSubView === 'collection_day'
                ? 'Print field collection sheet as PDF'
                : activeSubView === 'accounts'
                ? 'Download active loan accounts as PDF'
                : 'Download payment receipts ledger as PDF'
            }
          >
            <Printer size={14} /> {activeSubView === 'collection_day' ? 'Print Field Sheet' : 'Download PDF'}
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
        <div className="payments-kpi-card" style={{ background: 'var(--bg-card, #fff)', borderRadius: '10px', border: '1px solid var(--border-subtle, var(--ash-200))', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <div className="payments-kpi-card" style={{ background: 'var(--bg-card, #fff)', borderRadius: '10px', border: '1px solid var(--border-subtle, var(--ash-200))', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <div className="payments-kpi-card" style={{ background: 'var(--bg-card, #fff)', borderRadius: '10px', border: '1px solid var(--border-subtle, var(--ash-200))', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <div className="payments-kpi-card" style={{ background: 'var(--bg-card, #fff)', borderRadius: '10px', border: '1px solid var(--border-subtle, var(--ash-200))', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <div className="subview-ribbon-bar" style={{ display: 'flex', background: 'var(--ash-100, #F1F5F9)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            type="button"
            className={`subview-ribbon-btn ${activeSubView === 'collection_day' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubView('collection_day');
              localStorage.setItem('dnd_active_payments_subview', 'collection_day');
            }}
            style={{
              border: 'none',
              background: activeSubView === 'collection_day' ? 'var(--bg-card, #fff)' : 'transparent',
              color: activeSubView === 'collection_day' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '8px 18px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeSubView === 'collection_day' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Building size={15} /> 🏢 Daily Center Collection ({centerStats.totalClientsCount} Clients • {formatLKR(centerStats.targetAmount)})
          </button>
          <button
            type="button"
            className={`subview-ribbon-btn ${activeSubView === 'accounts' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubView('accounts');
              localStorage.setItem('dnd_active_payments_subview', 'accounts');
            }}
            style={{
              border: 'none',
              background: activeSubView === 'accounts' ? 'var(--bg-card, #fff)' : 'transparent',
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
            className={`subview-ribbon-btn ${activeSubView === 'ledger' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubView('ledger');
              localStorage.setItem('dnd_active_payments_subview', 'ledger');
            }}
            style={{
              border: 'none',
              background: activeSubView === 'ledger' ? 'var(--bg-card, #fff)' : 'transparent',
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
          VIEW 0: DAILY CENTER CASH COLLECTION HUB & FIELD DESK
          (Center-wise daily cash collection, target, separate paid vs unpaid lists, WhatsApp reminder, 1-click collect)
          ========================================================= */}
      {activeSubView === 'collection_day' ? (
        <>
          {/* 1. Center Selection & Date Header Card */}
          <div
            className="center-collection-header-card"
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-subtle, var(--ash-300))',
              borderRadius: '14px',
              padding: '18px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {/* Left: Center Switcher & Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1E4D8C 0%, #0F2E59 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(30,77,140,0.3)',
                }}
              >
                <Building size={24} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--ash-500)', letterSpacing: '0.04em' }}>
                    Select Regional Collection Center:
                  </label>
                  {centerStats.isScheduledToday && (
                    <span
                      style={{
                        background: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        borderRadius: '20px',
                        padding: '2px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }}></span>
                      📅 Scheduled Cash Collection Today
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <select
                    className="form-input"
                    value={activeCenterObj?.id || activeCenterObj?.center_code || selectedCollectionCenterId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCollectionCenterId(newId);
                      localStorage.setItem('dnd_active_collection_center', newId);
                      const target = centers.find(
                        (c) =>
                          c.id === newId ||
                          c.center_code === newId ||
                          formatCenterCode(c.center_code) === formatCenterCode(newId)
                      );
                      if (target?.cash_collect_date) {
                        setCollectionDate(target.cash_collect_date);
                        localStorage.setItem('dnd_active_collection_date', target.cash_collect_date);
                      }
                    }}
                    style={{
                      fontWeight: 800,
                      fontSize: '0.94rem',
                      padding: '7px 12px',
                      minWidth: '280px',
                      borderColor: 'var(--primary)',
                      background: 'var(--bg-card, #fff)',
                      color: 'var(--text-main, #0F172A)',
                    }}
                  >
                    {centers.map((c) => {
                      const isSch = isCenterScheduledForDate(c, collectionDate);
                      return (
                        <option key={c.id || c.center_code} value={c.id || c.center_code}>
                          {c.branch_code ? `${c.branch_code}/` : ''}{c.center_code} — {c.name}{c.cash_collect_date ? ` [📅 ${c.cash_collect_date}]` : ''} {isSch ? '⭐ (Scheduled)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 800 }}>💵 Center Cash Collect Date:</span>
                    <input
                      type="date"
                      className="form-input"
                      value={collectionDate}
                      onChange={(e) => handleUpdateCenterCollectDate(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        color: '#15803D',
                        background: '#F0FDF4',
                        borderColor: '#86EFAC',
                        borderRadius: '7px',
                      }}
                      title="This is the center's official cash collection date. Cash installments are collected on this day."
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--ash-500)', marginTop: '4px' }}>
                  👤 Officer in Charge: <strong>{centerStats.officerInCharge}</strong> • 📞 Hotline:{' '}
                  <strong>{centerStats.officerPhone || '077XXXXXXX'}</strong> • Location:{' '}
                  <strong>{activeCenterObj?.city || 'Regional Area'}</strong>
                </div>
              </div>
            </div>

            {/* Right: Quick Field Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrintFieldSheet}
                style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                title="Print official field collection sheet with client signature rows"
              >
                <Printer size={15} /> Print Field Sheet
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleOpenRecordPaymentModal()}
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Plus size={15} /> Add Custom Payment
              </button>
            </div>
          </div>

          {/* 2. Center Collection Daily KPI Cards (4 Pillars) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginTop: '16px' }}>
            {/* Card 1: Daily Target for Center */}
            <div className="payments-kpi-card" style={{ background: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#B45309', textTransform: 'uppercase', fontWeight: 800 }}>
                  Daily Center Target
                </span>
                <div style={{ fontSize: '1.32rem', fontWeight: 900, color: '#92400E', marginTop: '1px' }}>
                  {formatLKR(centerStats.targetAmount)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '2px' }}>
                  {centerStats.totalClientsCount} active installment clients
                </div>
              </div>
            </div>

            {/* Card 2: Cash Collected Today */}
            <div className="payments-kpi-card" style={{ background: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#15803D', textTransform: 'uppercase', fontWeight: 800 }}>
                  Collected Today
                </span>
                <div style={{ fontSize: '1.32rem', fontWeight: 900, color: '#166534', marginTop: '1px' }}>
                  {formatLKR(centerStats.collectedToday)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803D', marginTop: '2px' }}>
                  {centerStats.confirmedCount} payment receipts issued
                </div>
              </div>
            </div>

            {/* Card 3: Pending Shortfall */}
            <div className="payments-kpi-card" style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#DC2626', textTransform: 'uppercase', fontWeight: 800 }}>
                  Pending Shortfall
                </span>
                <div style={{ fontSize: '1.32rem', fontWeight: 900, color: '#991B1B', marginTop: '1px' }}>
                  {formatLKR(centerStats.pendingShortfall)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '2px' }}>
                  {centerStats.pendingCount} client(s) pending collection
                </div>
              </div>
            </div>

            {/* Card 4: Target Recovery Progress */}
            <div className="payments-kpi-card" style={{ background: 'var(--bg-card, #fff)', borderRadius: '12px', border: '1px solid var(--border-subtle, var(--ash-200))', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Target Achievement
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: centerStats.achievementRate >= 100 ? '#16A34A' : 'var(--primary)' }}>
                  {centerStats.achievementRate}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${centerStats.achievementRate}%`,
                    background: centerStats.achievementRate >= 100 ? '#16A34A' : 'linear-gradient(90deg, #2563EB 0%, #10B981 100%)',
                    borderRadius: '10px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{centerStats.confirmedCount} of {centerStats.totalClientsCount} clients paid</span>
                <span>{centerStats.achievementRate >= 100 ? '🎯 Target Met!' : 'In Progress'}</span>
              </div>
            </div>
          </div>

          {/* 3. Dual Tab Client Navigation (Pending vs Confirmed) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '20px',
              borderBottom: '2px solid var(--ash-200)',
              paddingBottom: '12px',
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCollectionClientTab('pending')}
                style={{
                  border: 'none',
                  background: collectionClientTab === 'pending' ? '#DC2626' : 'var(--ash-100)',
                  color: collectionClientTab === 'pending' ? '#ffffff' : 'var(--ash-700)',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Clock size={16} /> ⏳ Pending Collection ({centerStats.pendingCount})
              </button>

              <button
                type="button"
                onClick={() => setCollectionClientTab('confirmed')}
                style={{
                  border: 'none',
                  background: collectionClientTab === 'confirmed' ? '#16A34A' : 'var(--ash-100)',
                  color: collectionClientTab === 'confirmed' ? '#ffffff' : 'var(--ash-700)',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <CheckCircle2 size={16} /> ✅ Confirmed Payments ({centerStats.confirmedCount})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--ash-400)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '34px', fontSize: '0.82rem', width: '100%' }}
                placeholder={`Search ${collectionClientTab === 'pending' ? 'pending clients' : 'confirmed receipts'}...`}
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 4. Tab 1: PENDING COLLECTION CLIENTS LIST */}
          {collectionClientTab === 'pending' && (
            <div style={{ marginTop: '16px' }}>
              {filteredPendingClients.length === 0 ? (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px dashed #86EFAC',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#166534', fontWeight: 800, fontSize: '1.05rem' }}>
                    All Clear! No Pending Installments For This Center
                  </h4>
                  <p style={{ margin: 0, color: '#15803D', fontSize: '0.84rem' }}>
                    Every active client in <strong>{centerStats.centerName}</strong> has either paid their installment today or has settled in full.
                  </p>
                </div>
              ) : (
                <div
                  className="payments-table-card"
                  style={{
                    background: 'var(--bg-card, #fff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle, var(--ash-200))',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--ash-200)' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'center', width: '40px' }}>#</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Customer Details</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Contract & Item</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Due Today (LKR)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Loan Balance</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', width: '260px' }}>Field Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPendingClients.map((client, idx) => (
                        <tr
                          key={client.orderId || client.contractNo}
                          style={{
                            borderBottom: '1px solid var(--ash-100)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--ash-400)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main, #0F172A)', fontSize: '0.88rem' }}>
                              {client.customerName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                                NIC: {client.customerNic}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--ash-500)' }}>
                                📍 {client.customerAddress}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                              📞 {client.customerPhone}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                              {client.contractNo}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--ash-600)' }}>
                              {client.itemName}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--ash-400)', marginTop: '2px' }}>
                              Terms: {client.installmentsPaid} / {client.loanTerms} paid ({client.frequency})
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, color: '#DC2626', fontSize: '0.94rem' }}>
                              {formatLKR(client.installmentDue)}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#B91C1C', fontWeight: 700, background: '#FEF2F2', padding: '1px 6px', borderRadius: '4px' }}>
                              Collection Due
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: 'var(--ash-700)', fontSize: '0.86rem' }}>
                              {formatLKR(client.balanceDue)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--ash-400)' }}>
                              Outstanding
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {/* 1-Click Collect Cash & Confirm Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenQuickCollect(client)}
                                className="btn"
                                style={{
                                  background: '#16A34A',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                                }}
                                title="Collect cash from this client and confirm in system"
                              >
                                <Wallet size={13} /> Collect & Confirm
                              </button>

                              {/* WhatsApp Reminder Button */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(client)}
                                className="btn"
                                style={{
                                  background: '#25D366',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.76rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                }}
                                title="Send WhatsApp payment due reminder"
                              >
                                <Share2 size={13} /> WhatsApp
                              </button>

                              {/* Direct Phone Call */}
                              {client.customerPhone && (
                                <a
                                  href={`tel:${client.customerPhone}`}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 8px', borderRadius: '6px' }}
                                  title={`Call ${client.customerPhone}`}
                                >
                                  <Phone size={13} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. Tab 2: CONFIRMED PAYMENTS LIST */}
          {collectionClientTab === 'confirmed' && (
            <div style={{ marginTop: '16px' }}>
              {filteredConfirmedClients.length === 0 ? (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px dashed var(--ash-300)',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                  }}
                >
                  <Receipt size={32} style={{ color: 'var(--ash-400)', marginBottom: '8px' }} />
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--ash-700)', fontWeight: 800, fontSize: '1.05rem' }}>
                    No Payments Confirmed Yet Today
                  </h4>
                  <p style={{ margin: 0, color: 'var(--ash-500)', fontSize: '0.84rem' }}>
                    Switch to the <strong>⏳ Pending Collection</strong> tab and click <strong>Collect & Confirm</strong> as cash arrives from clients.
                  </p>
                </div>
              ) : (
                <div
                  className="payments-table-card"
                  style={{
                    background: 'var(--bg-card, #fff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle, var(--ash-200))',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--ash-200)' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Receipt #</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Customer Details</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Contract & Item</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount Paid (LKR)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Remaining Balance</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Method & Time</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', width: '180px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConfirmedClients.map((client) => {
                        const topPayment = client.paymentsToday[0] || null;
                        return (
                          <tr
                            key={client.latestReceiptNo || client.orderId}
                            style={{
                              borderBottom: '1px solid var(--ash-100)',
                              background: '#F0FDF4',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  border: '1px solid #86EFAC',
                                }}
                              >
                                {client.latestReceiptNo || 'RECEIPT'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 800, color: 'var(--text-main, #0F172A)', fontSize: '0.88rem' }}>
                                {client.customerName}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                                NIC: {client.customerNic} • 📞 {client.customerPhone}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                {client.contractNo}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--ash-600)' }}>
                                {client.itemName}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ fontWeight: 900, color: '#15803D', fontSize: '0.98rem' }}>
                                {formatLKR(client.amountPaidToday)}
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>
                                Paid Today
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--ash-700)', fontSize: '0.86rem' }}>
                                {formatLKR(client.balanceDue)}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: client.balanceDue <= 0 ? '#16A34A' : 'var(--ash-400)' }}>
                                {client.balanceDue <= 0 ? '✓ Cleared' : 'Remaining'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--ash-700)' }}>
                                {topPayment?.payment_method || 'Cash'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--ash-400)' }}>
                                {client.paidAtTime ? new Date(client.paidAtTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span
                                style={{
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={12} strokeWidth={3} /> Confirmed
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {topPayment && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveReceiptPayment(topPayment);
                                        setIsReceiptModalOpen(true);
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                                      title="View payment receipt details"
                                    >
                                      <Eye size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePrintSingleReceiptPDF(topPayment)}
                                      className="btn btn-secondary"
                                      style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                                      title="Print receipt PDF"
                                    >
                                      <Printer size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSendWhatsAppReceipt(topPayment)}
                                      className="btn"
                                      style={{
                                        background: '#25D366',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '5px 8px',
                                        fontSize: '0.74rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                      }}
                                      title="WhatsApp receipt to client"
                                    >
                                      <Share2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
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
        </>
      ) : activeSubView === 'accounts' ? (
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

            {/* Quick Filter Buttons & View Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

              {/* View Switcher: Cards View vs Table View */}
              <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  style={{
                    border: 'none',
                    background: viewMode === 'cards' ? 'var(--bg-card, #fff)' : 'transparent',
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
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutGrid size={14} /> Cards View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    border: 'none',
                    background: viewMode === 'table' ? 'var(--bg-card, #fff)' : 'transparent',
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
                    transition: 'all 0.15s ease',
                  }}
                >
                  <List size={14} /> Table View
                </button>
              </div>
            </div>
          </div>

          {/* Accounts Content: Empty / Cards / Table */}
          {filteredAccounts.length === 0 ? (
            <div
              className="empty-state-box"
              style={{
                padding: '60px',
                textAlign: 'center',
                background: 'var(--bg-card, #fff)',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle, var(--ash-300))',
                color: 'var(--ash-500)',
              }}
            >
              <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>No accounts found matching your filter</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
                All clients are fully paid up or search query had no match.
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            /* =======================================================
               CARDS VIEW: RESPONSIVE CARDS GRID FOR ACTIVE LOANS
               ======================================================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                {filteredAccounts.map((order) => {
                  const isPaid = Number(order.balance_due) <= 0;
                  const grossVal = Number(order.gross_amount) || 0;
                  const balanceVal = Number(order.balance_due) || 0;
                  const advanceVal = Number(order.advance_paid) || 0;
                  const paidVal = Math.max(0, grossVal - balanceVal);
                  const progressPercent = grossVal > 0 ? Math.min(100, Math.round((paidVal / grossVal) * 100)) : 100;

                  return (
                    <div
                      key={order.id}
                      className="payments-card-item"
                      style={{
                        background: 'var(--bg-card, #fff)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle, var(--ash-200))',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        {/* Header: Contract Code & Status Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              color: 'var(--primary)',
                              background: '#EFF6FF',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              border: '1px solid #BFDBFE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📜 {order.contract_no}
                          </span>

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
                        </div>

                        {/* Date & Invoice */}
                        <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginBottom: '8px' }}>
                          📅 {formatDate(order.date)} • Ref: {order.invoice_no}
                        </div>

                        {/* Customer Info */}
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ash-900)' }}>
                          {order.customer_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.78rem', color: 'var(--ash-600)', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            🆔 {order.customer_nic || order.customer_id}
                          </span>
                          <span>•</span>
                          <span>📞 {order.customer_phone}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                          📍 Center: {order.branch_code}/{order.center_code}
                        </div>

                        {/* Furniture Item Box */}
                        <div
                          className="card-sub-box"
                          style={{
                            background: 'var(--ash-50)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            marginTop: '10px',
                            border: '1px solid var(--border-subtle, var(--ash-200))',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)' }}>
                            🛋️ {order.item_name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--ash-600)', marginTop: '3px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Code: {order.item_code}</span>
                            <span>Qty: <strong>{order.quantity || 1} Unit(s)</strong></span>
                          </div>
                        </div>

                        {/* Financial Metrics 3-Column Box */}
                        <div
                          className="metrics-3col-box"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                            marginTop: '10px',
                            padding: '10px',
                            borderRadius: '8px',
                            background: 'var(--ash-100, #F8FAFC)',
                            border: '1px solid var(--border-subtle, #E2E8F0)',
                            textAlign: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--ash-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                              Order Value
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                              {formatLKR(order.gross_amount)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--ash-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                              Advance Paid
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#16A34A', marginTop: '2px' }}>
                              {formatLKR(order.advance_paid)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--ash-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                              Balance Due
                            </div>
                            <div style={{ fontWeight: 900, fontSize: '0.84rem', color: isPaid ? '#16A34A' : '#DC2626', marginTop: '2px' }}>
                              {formatLKR(order.balance_due)}
                            </div>
                          </div>
                        </div>

                        {/* Repayment Progress Bar */}
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--ash-600)', marginBottom: '3px' }}>
                            <span>Settlement Progress</span>
                            <strong style={{ color: isPaid ? '#16A34A' : 'var(--primary)' }}>{progressPercent}% Paid</strong>
                          </div>
                          <div style={{ height: '6px', width: '100%', background: 'var(--border-subtle, #E2E8F0)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                background: isPaid ? '#16A34A' : 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                                borderRadius: '999px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Repayment Plan Info */}
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--ash-600)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {order.payment_type === 'installment' ? (
                            <>
                              <span>Repayment Plan:</span>
                              <span style={{ fontWeight: 800, color: '#A16207' }}>
                                {formatLKR(order.installment_value)} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>/{order.loan_frequency === 'weekly' ? 'wk' : 'mo'}</span> ({order.loan_terms} {order.loan_frequency === 'weekly' ? 'wks' : 'mos'})
                              </span>
                            </>
                          ) : (
                            <>
                              <span>Plan:</span>
                              <span style={{ fontWeight: 700, color: 'var(--ash-700)' }}>Full Cash Sale</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-100)', paddingTop: '10px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="View Contract Details & History"
                            onClick={() => {
                              setSelectedContractForView(order);
                              setIsContractViewModalOpen(true);
                            }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Print Passbook / Agreement Statement"
                            onClick={() => {
                              setSelectedContractForStatement(order);
                              setIsStatementModalOpen(true);
                            }}
                          >
                            <Printer size={12} /> Print
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {Number(order.balance_due) > 0 && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
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
                            style={{
                              border: '1px solid var(--border-subtle, var(--ash-200))',
                              background: 'var(--bg-card, #fff)',
                              color: 'var(--ash-400)',
                              cursor: 'pointer',
                              padding: '5px 7px',
                              borderRadius: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
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
                              e.currentTarget.style.borderColor = 'var(--border-subtle, var(--ash-200))';
                              e.currentTarget.style.background = 'var(--bg-card, #fff)';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cards View Summary Bar */}
              <div
                className="summary-footer-bar"
                style={{
                  padding: '12px 18px',
                  background: 'var(--ash-100, #F8FAFC)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle, var(--ash-200))',
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
          ) : (
            <div
              className="payments-table-card"
              style={{
                background: 'var(--bg-card, #fff)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle, var(--ash-200))',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <div className="table-responsive" style={{ margin: 0, width: '100%', overflowX: 'auto' }}>
                <table className="custom-table" style={{ margin: 0, width: '100%', minWidth: '1060px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ background: 'var(--ash-100, #F8FAFC)', borderBottom: '1px solid var(--border-subtle, var(--ash-200))' }}>
                      <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Contract & Date
                      </th>
                      <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Client Profile & NIC
                      </th>
                      <th style={{ width: '16%', minWidth: '155px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Furniture Item
                      </th>
                      <th style={{ width: '12%', minWidth: '120px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Order Value
                      </th>
                      <th style={{ width: '13%', minWidth: '130px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Repayment Plan
                      </th>
                      <th style={{ width: '11%', minWidth: '115px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Balance Due
                      </th>
                      <th style={{ width: '7%', minWidth: '95px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Status
                      </th>
                      <th style={{ width: '8%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                            borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                            background: idx % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--ash-50)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover, #F1F5F9)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--ash-50)')}
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
                                  border: '1px solid var(--border-subtle, var(--ash-200))',
                                  background: 'var(--bg-card, #fff)',
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
                                  e.currentTarget.style.borderColor = 'var(--border-subtle, var(--ash-200))';
                                  e.currentTarget.style.background = 'var(--bg-card, #fff)';
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
                className="summary-footer-bar"
                style={{
                  padding: '12px 18px',
                  background: 'var(--ash-100, #F8FAFC)',
                  borderTop: '1px solid var(--border-subtle, var(--ash-200))',
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

              {/* View Switcher: Cards View vs Table View */}
              <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  style={{
                    border: 'none',
                    background: viewMode === 'cards' ? 'var(--bg-card, #fff)' : 'transparent',
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
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutGrid size={14} /> Cards View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    border: 'none',
                    background: viewMode === 'table' ? 'var(--bg-card, #fff)' : 'transparent',
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
                    transition: 'all 0.15s ease',
                  }}
                >
                  <List size={14} /> Table View
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Ledger Content: Empty / Cards / Table */}
          {filteredPayments.length === 0 ? (
            <div
              className="empty-state-box"
              style={{
                padding: '60px',
                textAlign: 'center',
                background: 'var(--bg-card, #fff)',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle, var(--ash-300))',
                color: 'var(--ash-500)',
              }}
            >
              <Receipt size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>No payment receipts found</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
                Click "+ Record New Payment" above to record an advance or installment payment.
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            /* =======================================================
               CARDS VIEW: RESPONSIVE CARDS GRID FOR PAYMENT RECEIPTS
               ======================================================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {filteredPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="payments-card-item"
                    style={{
                      background: 'var(--bg-card, #fff)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle, var(--ash-200))',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      {/* Top Bar: Receipt Number & Payment Type */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            color: '#2563EB',
                            background: '#EFF6FF',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          🧾 {pay.receipt_no}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: pay.payment_type === 'Installment Loan' ? '#FEF3C7' : pay.payment_type === 'Full Settlement' ? '#DCFCE7' : '#EFF6FF',
                            color: pay.payment_type === 'Installment Loan' ? '#B45309' : pay.payment_type === 'Full Settlement' ? '#15803D' : '#1D4ED8',
                            border: `1px solid ${pay.payment_type === 'Installment Loan' ? '#FDE68A' : pay.payment_type === 'Full Settlement' ? '#86EFAC' : '#BFDBFE'}`,
                          }}
                        >
                          {pay.payment_type}
                        </span>
                      </div>

                      {/* Date & Ref */}
                      <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginBottom: '8px' }}>
                        📅 {formatDate(pay.date)} • Ref: {pay.reference_no || 'N/A'}
                      </div>

                      {/* Client Profile */}
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--ash-900)' }}>
                        {pay.customer_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.78rem', color: 'var(--ash-600)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          🆔 {pay.customer_nic || pay.customer_id}
                        </span>
                        {pay.customer_phone && <span>• 📞 {pay.customer_phone}</span>}
                      </div>

                      {/* Contract & Center Info */}
                      <div className="card-sub-box" style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--ash-600)', background: 'var(--ash-100, #F8FAFC)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          📜 {pay.contract_no}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                          Center: {pay.branch_code}/{pay.center_code}
                        </span>
                      </div>

                      {/* Collection Metrics */}
                      <div
                        className="metrics-3col-box"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '8px',
                          marginTop: '10px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'var(--ash-50, #F0FDF4)',
                          border: '1px solid var(--border-subtle, #BBF7D0)',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.66rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                            Amount Collected
                          </div>
                          <div style={{ fontWeight: 900, fontSize: '1rem', color: '#15803D', marginTop: '2px' }}>
                            +{formatLKR(pay.amount)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#166534', marginTop: '1px' }}>
                            via {pay.payment_method}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--ash-600)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Remaining Balance
                          </div>
                          <div style={{ fontWeight: 900, fontSize: '1rem', color: Number(pay.new_balance) <= 0 ? '#16A34A' : '#DC2626', marginTop: '2px' }}>
                            {formatLKR(pay.new_balance)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--ash-500)', marginTop: '1px' }}>
                            Prev: {formatLKR(pay.previous_balance)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-100)', paddingTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          setActiveReceiptPayment(pay);
                          setIsReceiptModalOpen(true);
                        }}
                      >
                        <Printer size={13} /> View Receipt Slip
                      </button>

                      <button
                        type="button"
                        style={{
                          border: '1px solid var(--border-subtle, var(--ash-200))',
                          background: 'var(--bg-card, #fff)',
                          color: 'var(--ash-400)',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
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
                          e.currentTarget.style.borderColor = 'var(--border-subtle, var(--ash-200))';
                          e.currentTarget.style.background = 'var(--bg-card, #fff)';
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cards View Summary Bar */}
              <div
                className="summary-footer-bar"
                style={{
                  padding: '12px 18px',
                  background: 'var(--ash-100, #F8FAFC)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle, var(--ash-200))',
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
          ) : (
            <div
              className="payments-table-card"
              style={{
                background: 'var(--bg-card, #fff)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle, var(--ash-200))',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <div className="table-responsive" style={{ margin: 0, width: '100%', overflowX: 'auto' }}>
                <table className="custom-table" style={{ margin: 0, width: '100%', minWidth: '1060px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ background: 'var(--ash-100, #F8FAFC)', borderBottom: '1px solid var(--border-subtle, var(--ash-200))' }}>
                      <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Receipt & Date
                      </th>
                      <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Contract Code
                      </th>
                      <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Client Profile & NIC
                      </th>
                      <th style={{ width: '13%', minWidth: '130px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Payment Type
                      </th>
                      <th style={{ width: '10%', minWidth: '100px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Method
                      </th>
                      <th style={{ width: '12%', minWidth: '120px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Amount Collected
                      </th>
                      <th style={{ width: '10%', minWidth: '100px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        New Balance
                      </th>
                      <th style={{ width: '7%', minWidth: '95px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((pay, idx) => (
                      <tr
                        key={pay.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                          background: idx % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--ash-50)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover, #F1F5F9)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--ash-50)')}
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
                                border: '1px solid var(--border-subtle, var(--ash-200))',
                                background: 'var(--bg-card, #fff)',
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
                                e.currentTarget.style.borderColor = 'var(--border-subtle, var(--ash-200))';
                                e.currentTarget.style.background = 'var(--bg-card, #fff)';
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
                className="summary-footer-bar"
                style={{
                  padding: '12px 18px',
                  background: 'var(--ash-100, #F8FAFC)',
                  borderTop: '1px solid var(--border-subtle, var(--ash-200))',
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
                  className="dropdown-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-card, #fff)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, var(--primary-border))',
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
                        className="dropdown-popover-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectOrder(ord);
                        }}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                          cursor: 'pointer',
                          background: selectedOrder?.id === ord.id ? 'var(--primary-tint)' : 'var(--bg-card, #fff)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedOrder?.id === ord.id ? 'var(--primary-tint)' : 'var(--bg-card, #fff)')}
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
          <div className="form-section-card" style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-subtle, var(--ash-200))', borderRadius: '10px', padding: '16px' }}>
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
                        style={{ border: '1px solid var(--border-subtle, var(--ash-300))', background: 'var(--bg-card, #fff)', color: 'var(--text-main)', fontSize: '0.66rem', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        1 Installment
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormAmount(selectedOrder.balance_due || '')}
                        style={{ border: '1px solid var(--border-subtle, var(--ash-300))', background: 'var(--bg-card, #fff)', color: 'var(--text-main)', fontSize: '0.66rem', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
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
                  max={new Date().toISOString().slice(0, 10)}
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

            {/* NEXT INSTALLMENT COLLECTION DETAILS CARD */}
            {nextPaymentDetails && (
              <div
                style={{
                  background: nextPaymentDetails.isSettled
                    ? '#F0FDF4'
                    : nextPaymentDetails.statusType === 'overdue'
                    ? '#FEF2F2'
                    : 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                  border: `1px solid ${
                    nextPaymentDetails.isSettled
                      ? '#BBF7D0'
                      : nextPaymentDetails.statusType === 'overdue'
                      ? '#FECACA'
                      : '#BAE6FD'
                  }`,
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: nextPaymentDetails.isSettled
                        ? '#16A34A'
                        : nextPaymentDetails.statusType === 'overdue'
                        ? '#DC2626'
                        : '#0284C7',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {nextPaymentDetails.isSettled ? (
                      <CheckCircle size={22} />
                    ) : (
                      <Calendar size={22} />
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: nextPaymentDetails.isSettled
                          ? '#15803D'
                          : nextPaymentDetails.statusType === 'overdue'
                          ? '#991B1B'
                          : '#0369A1',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {nextPaymentDetails.isSettled
                        ? 'LOAN SETTLEMENT STATUS'
                        : 'NEXT PAYMENT COLLECTION SCHEDULE (ඊළඟ වාරිකය අය කරගත යුතු දිනය)'}
                    </div>

                    {nextPaymentDetails.isSettled ? (
                      <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.92rem', marginTop: '2px' }}>
                        ✓ Account Fully Settled — All installments cleared.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                          📅 {formatDate(nextPaymentDetails.nextDueDate)}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background:
                              nextPaymentDetails.statusType === 'overdue'
                                ? '#FEE2E2'
                                : nextPaymentDetails.statusType === 'today'
                                ? '#FEF3C7'
                                : '#DCFCE7',
                            color:
                              nextPaymentDetails.statusType === 'overdue'
                                ? '#DC2626'
                                : nextPaymentDetails.statusType === 'today'
                                ? '#B45309'
                                : '#15803D',
                            border: `1px solid ${
                              nextPaymentDetails.statusType === 'overdue'
                                ? '#FCA5A5'
                                : nextPaymentDetails.statusType === 'today'
                                ? '#FDE68A'
                                : '#86EFAC'
                            }`,
                          }}
                        >
                          {nextPaymentDetails.statusLabel}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                          • Installment #{nextPaymentDetails.installmentNumber} of {nextPaymentDetails.totalTerms} ({nextPaymentDetails.frequencyLabel})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!nextPaymentDetails.isSettled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                        NEXT DUE AMOUNT (අයවිය යුතු මුදල)
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284C7' }}>
                        {formatLKR(nextPaymentDetails.nextDueAmount)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                        {nextPaymentDetails.remainingInstallments} installment(s) remaining
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(2,132,199,0.3)',
                        background: '#0284C7',
                        borderColor: '#0284C7',
                      }}
                      onClick={() => {
                        setIsContractViewModalOpen(false);
                        handleOpenRecordPaymentModal(selectedContractForView);
                      }}
                    >
                      <CreditCard size={14} /> Collect Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Payment History for this Contract */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-800)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={16} color="var(--primary)" /> Payment Receipts History for this Contract ({contractReceiptsHistory.length})
              </div>

              {contractReceiptsHistory.length === 0 && nextPaymentDetails?.isSettled ? (
                <div style={{ padding: '14px', background: 'var(--ash-50)', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ash-500)' }}>
                  No installment receipts logged yet.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--ash-200)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--ash-200)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Receipt / Status</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Payment Method</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Amount Paid / Due</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Highlighted Next Scheduled Installment Row */}
                      {!nextPaymentDetails?.isSettled && (
                        <tr style={{ background: '#EFF6FF', borderBottom: '2px solid #BFDBFE' }}>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800, color: '#2563EB' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#DBEAFE', padding: '2px 7px', borderRadius: '4px', fontSize: '0.74rem' }}>
                              ⏳ Next Due (#{nextPaymentDetails.installmentNumber})
                            </span>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 800, color: '#1E3A8A' }}>
                            📅 {formatDate(nextPaymentDetails.nextDueDate)}
                            <span
                              style={{
                                display: 'inline-block',
                                marginLeft: '6px',
                                fontSize: '0.66rem',
                                padding: '1px 6px',
                                borderRadius: '999px',
                                fontWeight: 800,
                                background:
                                  nextPaymentDetails.statusType === 'overdue'
                                    ? '#FEE2E2'
                                    : nextPaymentDetails.statusType === 'today'
                                    ? '#FEF3C7'
                                    : '#DCFCE7',
                                color:
                                  nextPaymentDetails.statusType === 'overdue'
                                    ? '#DC2626'
                                    : nextPaymentDetails.statusType === 'today'
                                    ? '#B45309'
                                    : '#15803D',
                              }}
                            >
                              {nextPaymentDetails.statusLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', color: '#475569', fontWeight: 600 }}>
                            {nextPaymentDetails.frequencyLabel} Installment
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#2563EB', fontSize: '0.86rem' }}>
                            {formatLKR(nextPaymentDetails.nextDueAmount)} <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B' }}>due</span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#64748B' }}>
                            Est. {formatLKR(Math.max(0, Number(selectedContractForView.balance_due) - nextPaymentDetails.nextDueAmount))}
                          </td>
                        </tr>
                      )}

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

                      {contractReceiptsHistory.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: 'var(--ash-500)', fontSize: '0.78rem' }}>
                            No past installment payments logged yet. First installment is scheduled as shown above.
                          </td>
                        </tr>
                      )}
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
                onClick={() => handlePrintSingleReceiptPDF(activeSelectedPayment)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Printer size={15} /> Download / Print PDF Receipt
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

              {/* Terms summary box with Next Payment Schedule */}
              {(() => {
                const stmtNext = calculateNextPaymentDetails(
                  selectedContractForStatement,
                  payments.filter((p) => p.contract_no === selectedContractForStatement.contract_no || p.order_id === selectedContractForStatement.id)
                );
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', margin: '12px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.82rem' }}>
                    <span>Agreed Repayment: <strong style={{ color: '#2563eb' }}>{formatLKR(selectedContractForStatement.installment_value)} / {selectedContractForStatement.loan_frequency === 'weekly' ? 'week' : 'month'}</strong></span>
                    {!stmtNext?.isSettled && (
                      <span>Next Payment Due: <strong style={{ color: '#0f172a' }}>📅 {formatDate(stmtNext.nextDueDate)} ({formatLKR(stmtNext.nextDueAmount)})</strong></span>
                    )}
                    <span>Current Status: <strong style={{ color: Number(selectedContractForStatement.balance_due) <= 0 ? '#16a34a' : '#d97706' }}>{Number(selectedContractForStatement.balance_due) <= 0 ? 'Fully Settled' : 'Active Installment Loan'}</strong></span>
                  </div>
                );
              })()}

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
                onClick={() => handlePrintPassbookPDF(selectedContractForStatement)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Printer size={15} /> Download / Print PDF Statement
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          MODAL 5: QUICK 1-CLICK CASH COLLECTION & CONFIRMATION
          ========================================================= */}
      <Modal
        isOpen={!!quickCollectItem}
        onClose={() => setQuickCollectItem(null)}
        title="💰 Confirm Field Cash Collection"
      >
        {quickCollectItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--ash-500)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Customer Name
                </span>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                  {quickCollectItem.customerName}
                </div>
                <div style={{ color: 'var(--ash-600)', fontSize: '0.74rem' }}>
                  NIC: {quickCollectItem.customerNic} • 📞 {quickCollectItem.customerPhone}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--ash-500)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Contract & Item
                </span>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>
                  {quickCollectItem.contractNo}
                </div>
                <div style={{ color: 'var(--ash-600)', fontSize: '0.74rem' }}>
                  {quickCollectItem.itemName}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '4px' }}>
                <span>Scheduled Center: <strong>{activeCenterObj?.name} ({activeCenterObj?.center_code})</strong></span>
                <span>Outstanding Loan: <strong style={{ color: '#DC2626' }}>{formatLKR(quickCollectItem.balanceDue)}</strong></span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.84rem' }}>
                Cash Amount Collected (LKR) *
              </label>
              <input
                type="number"
                className="form-input"
                value={quickCollectAmount}
                onChange={(e) => setQuickCollectAmount(e.target.value)}
                style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803D' }}
                placeholder="Enter amount collected..."
                autoFocus
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '4px' }}>
                Defaulted to due installment: {formatLKR(quickCollectItem.installmentDue)}. You can adjust if partial or extra cash was received.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-input"
                  value={quickCollectMethod}
                  onChange={(e) => setQuickCollectMethod(e.target.value)}
                >
                  <option value="Cash">Cash (Center Field Collection)</option>
                  <option value="Bank Transfer">Bank Transfer / Slip</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Credit / Debit Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Collected By</label>
                <input
                  type="text"
                  className="form-input"
                  value={quickCollectOfficer}
                  onChange={(e) => setQuickCollectOfficer(e.target.value)}
                  placeholder="Officer name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Officer Notes / Reference (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={quickCollectNote}
                onChange={(e) => setQuickCollectNote(e.target.value)}
                placeholder="Center visit notes..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--ash-200)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setQuickCollectItem(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleConfirmQuickCollect(true)}
                style={{ fontWeight: 700 }}
              >
                <Printer size={15} /> Confirm & Print Receipt
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleConfirmQuickCollect(false)}
                style={{
                  background: '#16A34A',
                  borderColor: '#16A34A',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                }}
              >
                <Check size={16} strokeWidth={2.5} /> Confirm Cash Collection
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
