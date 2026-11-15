import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Search,
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Share2,
  DollarSign,
  TrendingUp,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  ArrowRight,
  X,
  Plus,
  Check,
  FileText,
  ExternalLink,
  Wallet
} from 'lucide-react';
import Modal from '../components/Modal';
import { loadSavedOrders, saveOrdersToStorage } from '../utils/ordersData';
import {
  loadSavedPayments,
  savePaymentsToStorage,
  generateNextReceiptNo
} from '../utils/paymentsData';
import { loadSavedCenters } from '../utils/centersData';
import { loadSavedCustomers } from '../utils/customersData';
import { formatLKR, formatDate, formatDateTime } from '../utils/formatters';
import { printHtmlDocument } from '../utils/printUtils';
import { apiRequest } from '../services/api';
import { getAuthenticatedUser } from '../utils/authData';
import { addLiveNotification } from '../utils/notificationsData';
import { calculateNextPaymentDetails } from './PaymentsPage';

export default function SingleCustomerPaymentsPage({ selectedCenter = 'all', onNavigate }) {
  // Master data
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [payments, setPayments] = useState(() => loadSavedPayments());
  const [centers] = useState(() => loadSavedCenters());
  const [customers] = useState(() => loadSavedCustomers());
  const currentUser = getAuthenticatedUser();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'due_today' | 'settled'

  // Selected Order / Customer Account for Cash Payment
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('installment'); // 'installment' | 'advance' | 'partial' | 'settlement'
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState(() => generateNextReceiptNo(payments));
  const [collectedBy, setCollectedBy] = useState(() => currentUser?.name || 'Showroom Executive');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastPaymentRecord, setLastPaymentRecord] = useState(null);

  // Sync fresh data from API / Supabase on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch Orders
    apiRequest('/orders')
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setOrders(data);
          saveOrdersToStorage(data);
        }
      })
      .catch((err) => console.warn('Could not sync orders from API:', err));

    // 2. Fetch Payments
    apiRequest('/payments')
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setPayments(res.data);
          savePaymentsToStorage(res.data);
        }
      })
      .catch((err) => console.warn('Could not sync payments from API:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Update receipt number when payments update
  useEffect(() => {
    setReceiptNo(generateNextReceiptNo(payments));
  }, [payments]);

  // When a customer/order is selected, prefill installment amount
  useEffect(() => {
    if (selectedOrder) {
      const nextDetails = calculateNextPaymentDetails(
        selectedOrder,
        payments.filter((p) => p.order_id === selectedOrder.id || p.contract_no === selectedOrder.contract_no)
      );
      if (nextDetails && nextDetails.nextDueAmount > 0) {
        setPaymentAmount(String(nextDetails.nextDueAmount));
      } else if (Number(selectedOrder.balance_due) > 0) {
        setPaymentAmount(String(selectedOrder.balance_due));
      } else {
        setPaymentAmount('');
      }
    } else {
      setPaymentAmount('');
      setPaymentNotes('');
    }
  }, [selectedOrder, payments]);

  // Overall Financial Statistics
  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => (Number(o.balance_due) || 0) > 0);
    const totalOutstanding = orders.reduce((sum, o) => sum + (Number(o.balance_due) || 0), 0);
    
    // Today's collections
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPayments = payments.filter((p) => String(p.date || '').slice(0, 10) === todayStr);
    const todayCollected = todayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Overdue or due today count
    let dueSoonCount = 0;
    activeOrders.forEach((o) => {
      const ordReceipts = payments.filter((p) => p.order_id === o.id || p.contract_no === o.contract_no);
      const details = calculateNextPaymentDetails(o, ordReceipts);
      if (details && (details.statusType === 'today' || details.statusType === 'overdue')) {
        dueSoonCount += 1;
      }
    });

    const settledCount = orders.filter((o) => (Number(o.balance_due) || 0) <= 0).length;

    return {
      totalOutstanding,
      activeClientsCount: activeOrders.length,
      todayCollected,
      todayPaymentsCount: todayPayments.length,
      dueSoonCount,
      settledCount,
    };
  }, [orders, payments]);

  // Filtered Orders List
  const filteredAccounts = useMemo(() => {
    return orders.filter((order) => {
      // Center filter
      if (selectedCenter !== 'all') {
        const centerMatch =
          order.center_code === selectedCenter ||
          order.branch_code === selectedCenter ||
          order.id?.includes(selectedCenter);
        if (!centerMatch) return false;
      }

      // Status filter
      const balanceVal = Number(order.balance_due) || 0;
      if (statusFilter === 'active' && balanceVal <= 0) return false;
      if (statusFilter === 'settled' && balanceVal > 0) return false;

      // Due Today / Overdue filter
      if (statusFilter === 'due_today') {
        if (balanceVal <= 0) return false;
        const ordReceipts = payments.filter((p) => p.order_id === order.id || p.contract_no === order.contract_no);
        const details = calculateNextPaymentDetails(order, ordReceipts);
        if (!details || (details.statusType !== 'today' && details.statusType !== 'overdue')) {
          return false;
        }
      }

      // Live search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = order.customer_name?.toLowerCase().includes(q);
        const matchNic = (order.customer_nic || order.customer_id)?.toLowerCase().includes(q);
        const matchPhone = order.customer_phone?.toLowerCase().includes(q);
        const matchContract = order.contract_no?.toLowerCase().includes(q);
        const matchInvoice = order.invoice_no?.toLowerCase().includes(q);
        const matchItem = order.item_name?.toLowerCase().includes(q);
        const matchCenter = order.center_code?.toLowerCase().includes(q);

        if (!matchName && !matchNic && !matchPhone && !matchContract && !matchInvoice && !matchItem && !matchCenter) {
          return false;
        }
      }

      return true;
    });
  }, [orders, payments, selectedCenter, statusFilter, searchQuery]);

  // Next payment details for currently selected order
  const currentNextDetails = useMemo(() => {
    if (!selectedOrder) return null;
    const ordReceipts = payments.filter(
      (p) => p.order_id === selectedOrder.id || p.contract_no === selectedOrder.contract_no
    );
    return calculateNextPaymentDetails(selectedOrder, ordReceipts);
  }, [selectedOrder, payments]);

  // Receipts history for currently selected order
  const selectedOrderReceipts = useMemo(() => {
    if (!selectedOrder) return [];
    return payments
      .filter((p) => p.order_id === selectedOrder.id || p.contract_no === selectedOrder.contract_no)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [selectedOrder, payments]);

  // -------------------------------------------------------------
  // Collect Cash & Generate Official Receipt Handler
  // -------------------------------------------------------------
  const handleCollectCashPayment = async (e) => {
    e?.preventDefault();
    if (!selectedOrder) {
      alert('Please select a customer account first.');
      return;
    }

    const payAmt = Number(paymentAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      alert('Please enter a valid payment amount greater than Rs. 0.');
      return;
    }

    const currentBal = Number(selectedOrder.balance_due) || 0;
    if (paymentType !== 'advance' && payAmt > currentBal + 0.01) {
      const confirmOverpay = window.confirm(
        `The payment amount (Rs. ${formatLKR(payAmt)}) exceeds the current balance due (Rs. ${formatLKR(currentBal)}).\nDo you want to proceed and settle the account in full?`
      );
      if (!confirmOverpay) return;
    }

    setIsSubmitting(true);

    try {
      const nextBal = Math.max(0, currentBal - payAmt);
      const newPaidInstallments = (selectedOrder.installments_paid || 0) + 1;
      const newTotalAdvance = (Number(selectedOrder.advance_paid) || 0) + payAmt;
      const isSettled = nextBal <= 0;

      // 1. Create Receipt Object
      const newPayment = {
        id: `pay-${Date.now()}`,
        receipt_no: receiptNo || generateNextReceiptNo(payments),
        date: paymentDate || new Date().toISOString().slice(0, 10),
        amount: payAmt,
        order_id: selectedOrder.id,
        contract_no: selectedOrder.contract_no,
        invoice_no: selectedOrder.invoice_no,
        passbook_no: selectedOrder.passbook_no,
        customer_name: selectedOrder.customer_name,
        customer_phone: selectedOrder.customer_phone,
        customer_nic: selectedOrder.customer_nic || selectedOrder.customer_id,
        center_code: selectedOrder.center_code || 'C001',
        branch_code: selectedOrder.branch_code || 'MHG',
        payment_method: paymentMethod || 'Cash',
        payment_type: paymentType,
        collected_by: collectedBy || currentUser?.name || 'Showroom Executive',
        notes: paymentNotes || `Single customer payment for contract ${selectedOrder.contract_no}`,
        balance_after: nextBal,
        created_at: new Date().toISOString(),
      };

      // 2. Update Local Payments State
      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      savePaymentsToStorage(updatedPayments);

      // 3. Update Local Orders State
      const updatedOrder = {
        ...selectedOrder,
        balance_due: nextBal,
        advance_paid: newTotalAdvance,
        installments_paid: newPaidInstallments,
        status: isSettled ? 'Fully Paid' : 'Active Loan',
      };

      const updatedOrders = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
      setOrders(updatedOrders);
      saveOrdersToStorage(updatedOrders);
      setSelectedOrder(updatedOrder);

      // 4. Persist to API / Supabase (Monthly Payments table + Unified Payments table)
      apiRequest('/payments/monthly', {
        method: 'POST',
        body: JSON.stringify({
          ...newPayment,
          payment_date: newPayment.date,
          payment_month: (newPayment.date || new Date().toISOString()).slice(0, 7),
          installment_term: newPaidInstallments,
        }),
      }).catch((e) => console.warn('Monthly payment DB persist notice:', e));

      apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(newPayment),
      }).catch((e) => console.warn('Unified payment DB persist notice:', e));

      // 5. Update Order in Supabase
      if (selectedOrder.id) {
        apiRequest(`/orders/${selectedOrder.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            balance_due: nextBal,
            advance_paid: newTotalAdvance,
            installments_paid: newPaidInstallments,
            status: isSettled ? 'Fully Paid' : 'Active Loan',
          }),
        }).catch((e) => console.warn('Order DB update balance notice:', e));
      }

      // 6. Live Notification
      addLiveNotification({
        title: `Cash Collected: ${formatLKR(payAmt)}`,
        desc: `Receipt #${newPayment.receipt_no} issued to ${newPayment.customer_name}. Remaining Balance: ${formatLKR(nextBal)}.`,
        category: 'payments',
        type: 'success',
        targetTab: 'single-customer-payments',
      });

      // 7. Show Success Modal with WhatsApp and Print actions
      setLastPaymentRecord(newPayment);
      setIsSuccessModalOpen(true);
      setPaymentNotes('');
    } catch (err) {
      console.error('Error recording cash payment:', err);
      alert('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Print Single Customer Receipt Slip
  // -------------------------------------------------------------
  const handlePrintReceipt = (receipt) => {
    if (!receipt) return;
    const orderRef = orders.find((o) => o.id === receipt.order_id || o.contract_no === receipt.contract_no) || selectedOrder;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Official Cash Receipt - ${receipt.receipt_no}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0F172A; margin: 0; padding: 12px; font-size: 11px; }
            .receipt-box { border: 2px solid #1E4D8C; border-radius: 8px; padding: 16px; background: #fff; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #1E4D8C; padding-bottom: 10px; margin-bottom: 12px; }
            .brand-title { font-size: 20px; font-weight: 900; color: #1E4D8C; margin: 0; }
            .brand-sub { font-size: 9.5px; color: #64748B; font-weight: 700; text-transform: uppercase; }
            .receipt-badge { font-size: 14px; font-weight: 900; color: #15803D; text-transform: uppercase; text-align: right; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; font-size: 10.5px; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            .data-table th { background: #F1F5F9; color: #1E293B; padding: 8px 10px; text-align: left; border-bottom: 1.5px solid #CBD5E1; }
            .data-table td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
            .amount-highlight { font-size: 16px; font-weight: 900; color: #15803D; }
            .signatures { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 10px; }
            .sig-box { width: 40%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 32px; margin-bottom: 4px; }
            .sig-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand-title">D N S HOME SOLUTIONS</div>
                  <div class="brand-sub">Workshop & Showroom • Official Customer Payment Receipt</div>
                  <div style="font-size: 9.5px; color: #64748B; margin-top: 2px;">Hotline: 0772345671 • Center: ${receipt.center_code || 'C001'}</div>
                </td>
                <td style="text-align: right;">
                  <div class="receipt-badge">OFFICIAL CASH RECEIPT</div>
                  <div style="font-family: monospace; font-size: 13px; font-weight: 900; color: #1E4D8C; margin-top: 3px;">
                    #${receipt.receipt_no}
                  </div>
                  <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Date: ${formatDate(receipt.date)}</div>
                </td>
              </tr>
            </table>

            <div class="meta-row">
              <div>
                <strong>Received From (Customer):</strong> ${receipt.customer_name}<br />
                <span style="color: #64748B;">NIC: ${receipt.customer_nic || 'N/A'} • Phone: ${receipt.customer_phone || 'N/A'}</span>
              </div>
              <div style="text-align: right;">
                <strong>Contract No:</strong> <span style="font-family: monospace; color: #2563EB;">${receipt.contract_no || 'N/A'}</span><br />
                <strong>Invoice Ref:</strong> ${receipt.invoice_no || 'N/A'} • Center: ${receipt.center_code || 'C001'}
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th>Description / Payment Particulars</th>
                  <th>Payment Mode</th>
                  <th style="text-align: right;">Amount Paid (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Customer Installment / Balance Settlement</strong>
                    <div style="font-size: 9.5px; color: #64748B;">Item: ${orderRef?.item_name || 'Furniture Item'} • Term Payment</div>
                  </td>
                  <td>${receipt.payment_method || 'Cash'}</td>
                  <td style="text-align: right;" class="amount-highlight">${formatLKR(receipt.amount)}</td>
                </tr>
                <tr style="background: #F8FAFC;">
                  <td colspan="2" style="font-weight: 700; color: #475569;">
                    Remaining Balance Due on Account:
                  </td>
                  <td style="text-align: right; font-weight: 900; color: ${receipt.balance_after > 0 ? '#DC2626' : '#16A34A'}; font-size: 12px;">
                    ${formatLKR(receipt.balance_after)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 14px; font-size: 9px; color: #64748B; background: #FFFBEB; border: 1px solid #FDE68A; padding: 6px 10px; border-radius: 4px;">
              * Computer-generated official receipt issued by D N S Home Solutions Central System. Retain for warranty & passbook validation.
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Customer Signature</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Collected By: ${receipt.collected_by || 'Authorized Officer'}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: `DNS_Receipt_${receipt.receipt_no}` });
  };

  // -------------------------------------------------------------
  // Send WhatsApp Receipt Message to Customer
  // -------------------------------------------------------------
  const handleSendWhatsAppReceipt = (receipt) => {
    if (!receipt) return;
    const phone = receipt.customer_phone;
    if (!phone) {
      alert('Customer mobile phone number is missing.');
      return;
    }

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '94' + cleanPhone.slice(1);
    else if (!cleanPhone.startsWith('94')) cleanPhone = '94' + cleanPhone;

    const baseUrl = typeof window !== 'undefined' && window.location ? window.location.origin : '';
    const invoiceUrl = receipt.invoice_no ? `${baseUrl}/?invoice=${encodeURIComponent(receipt.invoice_no)}` : '';

    const text = `🛋️ *D N S HOME SOLUTIONS*
*Official Customer Cash Payment Receipt*
───────────────────────────
🧾 *Receipt No:* #${receipt.receipt_no}
📅 *Payment Date:* ${formatDate(receipt.date)}
👤 *Customer:* ${receipt.customer_name}
📜 *Contract No:* ${receipt.contract_no || 'N/A'}
📄 *Invoice No:* ${receipt.invoice_no || 'N/A'}

💰 *PAYMENT CONFIRMATION:*
• Amount Paid: *${formatLKR(receipt.amount)}*
• Payment Mode: ${receipt.payment_method || 'Cash'}
• Remaining Balance Due: *${formatLKR(receipt.balance_after)}*
• Collected By: ${receipt.collected_by || 'Authorized Officer'}
${invoiceUrl ? `
───────────────────────────
📄 *VIEW & DOWNLOAD OFFICIAL PDF AGREEMENT:*
👉 ${invoiceUrl}` : ''}

───────────────────────────
✨ *Thank you for your payment with D N S Home Solutions!*
📞 For inquiries: 0772345671`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="single-customer-payments-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* 1. Header Banner & Action Bar */}
      <div
        className="panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, var(--ash-200))',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={24} color="var(--primary)" /> Single Customer Cash Payments
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.82rem', color: 'var(--ash-500)' }}>
            <span>Search customer accounts, collect individual cash installments, view balances, and issue official receipts</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Quick Switch to Center Cash Payments */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate && onNavigate('center-cash-payments')}
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            title="Switch to regional center collection desk"
          >
            <Building2 size={14} color="#1E4D8C" /> Switch to Center Cash Payments
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Portfolio Balance Due</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>{formatLKR(stats.totalOutstanding)}</div>
            <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '2px' }}>{stats.activeClientsCount} active credit clients</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Collected Today</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>{formatLKR(stats.todayCollected)}</div>
            <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>{stats.todayPaymentsCount} receipts issued today</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Due Today / Overdue</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#D97706', marginTop: '2px' }}>{stats.dueSoonCount} Clients</div>
            <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '2px' }}>Pending installment recovery</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Fully Settled Accounts</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>{stats.settledCount} Clients</div>
            <div style={{ fontSize: '0.72rem', color: '#1D4ED8', marginTop: '2px' }}>Zero outstanding balance</div>
          </div>
        </div>
      </div>

      {/* 3. Live Customer Search Bar */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94A3B8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '0.88rem' }}
              placeholder="🔍 Search customer by Name, NIC, Mobile Phone, Contract No (e.g. PN/C003/...), or Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Status Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setStatusFilter('active')}
            >
              Active Balances ({stats.activeClientsCount})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'due_today' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setStatusFilter('due_today')}
            >
              Due Today / Overdue ({stats.dueSoonCount})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setStatusFilter('all')}
            >
              All Clients ({orders.length})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'settled' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setStatusFilter('settled')}
            >
              Settled ({stats.settledCount})
            </button>
          </div>
        </div>

        {/* Live Search Quick Results Dropdown when typing */}
        {searchQuery.trim().length > 1 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
              Matching Customers ({filteredAccounts.length}):
            </div>
            {filteredAccounts.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#94A3B8', padding: '8px 0' }}>
                No customer accounts found matching "{searchQuery}".
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {filteredAccounts.slice(0, 6).map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setSelectedOrder(ord);
                      setSearchQuery('');
                    }}
                    style={{
                      background: selectedOrder?.id === ord.id ? '#EFF6FF' : '#F8FAFC',
                      border: selectedOrder?.id === ord.id ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{ord.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        NIC: {ord.customer_nic || ord.customer_id} • 📞 {ord.customer_phone}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#2563EB', fontFamily: 'monospace' }}>
                        {ord.contract_no}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 900, color: Number(ord.balance_due) > 0 ? '#DC2626' : '#16A34A' }}>
                        {formatLKR(ord.balance_due)}
                      </div>
                      <span style={{ fontSize: '0.65rem', background: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Select & Pay
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Active Customer Cash Payment Desk (Main Workstation) */}
      {selectedOrder ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #2563EB', padding: '24px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)' }}>
          {/* Top Bar of Active Desk */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8', fontWeight: 900, fontSize: '1.2rem' }}>
                {selectedOrder.customer_name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
                    {selectedOrder.customer_name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                    Center {selectedOrder.center_code || 'C001'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span><strong>NIC:</strong> {selectedOrder.customer_nic || selectedOrder.customer_id}</span>
                  <span>•</span>
                  <span><strong>Phone:</strong> {selectedOrder.customer_phone}</span>
                  <span>•</span>
                  <span><strong>Delivery:</strong> {selectedOrder.customer_address || 'Showroom Direct'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <a
                href={`tel:${selectedOrder.customer_phone}`}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Phone size={13} /> Call
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={14} /> Clear Selection
              </button>
            </div>
          </div>

          {/* 2-Column Desk: Contract Specs & Cash Collection Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {/* Left Column: Contract & Installment Breakdown */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                  📜 Active Contract & Loan Breakdown
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                  {selectedOrder.item_name}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                  Contract: {selectedOrder.contract_no} • Invoice: {selectedOrder.invoice_no}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>GROSS CONTRACT VALUE</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                      {formatLKR(selectedOrder.gross_amount)}
                    </div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700 }}>ADVANCE / PAID SO FAR</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#16A34A', marginTop: '2px' }}>
                      {formatLKR(selectedOrder.advance_paid)}
                    </div>
                  </div>
                </div>

                {/* Outstanding Balance Highlight Box */}
                <div style={{ marginTop: '12px', background: Number(selectedOrder.balance_due) > 0 ? '#FEF2F2' : '#F0FDF4', border: Number(selectedOrder.balance_due) > 0 ? '1.5px solid #FECACA' : '1.5px solid #BBF7D0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: Number(selectedOrder.balance_due) > 0 ? '#991B1B' : '#166534', textTransform: 'uppercase' }}>
                      Remaining Balance Due:
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: Number(selectedOrder.balance_due) > 0 ? '#DC2626' : '#15803D' }}>
                      {formatLKR(selectedOrder.balance_due)}
                    </span>
                  </div>
                </div>

                {/* Installment Schedule & Due Status */}
                {currentNextDetails && (
                  <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#334155', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                    <div>
                      • <strong>Monthly Installment Due:</strong> <span style={{ color: '#1E4D8C', fontWeight: 800 }}>{formatLKR(currentNextDetails.nextDueAmount)}</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      • <strong>Terms Paid:</strong> {selectedOrder.installments_paid || 0} of {selectedOrder.loan_terms || 12} Installments
                    </div>
                    {currentNextDetails.nextDueDate && (
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        • <strong>Next Due Date:</strong> {formatDate(currentNextDetails.nextDueDate)}
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: currentNextDetails.statusType === 'overdue' ? '#FEE2E2' : currentNextDetails.statusType === 'today' ? '#FEF3C7' : '#EFF6FF',
                          color: currentNextDetails.statusType === 'overdue' ? '#DC2626' : currentNextDetails.statusType === 'today' ? '#B45309' : '#1D4ED8',
                        }}>
                          {currentNextDetails.statusLabel}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View Customer Agreement Online Link */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Official Digital Agreement:</span>
                <a
                  href={`/?invoice=${encodeURIComponent(selectedOrder.invoice_no || selectedOrder.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.74rem', color: '#2563EB', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={13} /> Open Agreement PDF
                </a>
              </div>
            </div>

            {/* Right Column: Cash Collection Entry Form */}
            <form onSubmit={handleCollectCashPayment} style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                <div style={{ fontWeight: 900, color: '#1E4D8C', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={18} /> Collect Cash & Issue Receipt
                </div>
                <span style={{ fontSize: '0.74rem', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                  Receipt #{receiptNo}
                </span>
              </div>

              {/* Payment Amount Input + Quick Chips */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Payment Amount to Collect (LKR) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 800, color: '#64748B', fontSize: '0.85rem' }}>Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    className="form-input"
                    style={{ paddingLeft: '44px', fontSize: '1.1rem', fontWeight: 900, color: '#15803D' }}
                    placeholder="Enter amount..."
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>

                {/* Quick 1-Click Amount Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {currentNextDetails?.nextDueAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(currentNextDetails.nextDueAmount))}
                      style={{ fontSize: '0.72rem', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Exact Installment: {formatLKR(currentNextDetails.nextDueAmount)}
                    </button>
                  )}
                  {Number(selectedOrder.balance_due) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(selectedOrder.balance_due))}
                      style={{ fontSize: '0.72rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Full Balance: {formatLKR(selectedOrder.balance_due)}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('1000')}
                    style={{ fontSize: '0.72rem', background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Rs. 1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('2000')}
                    style={{ fontSize: '0.72rem', background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Rs. 2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('5000')}
                    style={{ fontSize: '0.72rem', background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Rs. 5,000
                  </button>
                </div>
              </div>

              {/* Payment Type & Method */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Type
                  </label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.82rem' }}
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option value="installment">Monthly Installment</option>
                    <option value="partial">Partial Installment</option>
                    <option value="settlement">Full Settlement</option>
                    <option value="advance">Advance Payment</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Method
                  </label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.82rem' }}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash (Showroom / Desk)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online Deposit">Online Deposit</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Payment Date & Collecting Officer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    style={{ fontSize: '0.82rem' }}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Collecting Officer
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ fontSize: '0.82rem' }}
                    value={collectedBy}
                    onChange={(e) => setCollectedBy(e.target.value)}
                  />
                </div>
              </div>

              {/* Memo / Notes */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Special Notes / Receipt Remarks (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.82rem' }}
                  placeholder="e.g. Cash received at Maharagama showroom, passbook stamped..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  padding: '12px 20px',
                  fontWeight: 800,
                  fontSize: '0.94rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                <CheckCircle size={18} /> {isSubmitting ? 'Recording Payment...' : 'Collect Cash & Issue Official Receipt'}
              </button>
            </form>
          </div>

          {/* Customer Past Payments History */}
          {selectedOrderReceipts.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E4D8C', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={15} /> Payment History for this Customer Account ({selectedOrderReceipts.length} Receipts)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#F8FAFC', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1.5px solid #CBD5E1' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Receipt #</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Remaining Balance</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Mode</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Officer</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrderReceipts.map((rcp) => (
                    <tr key={rcp.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1E4D8C' }}>
                        #{rcp.receipt_no}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{formatDate(rcp.date)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#15803D' }}>
                        {formatLKR(rcp.amount)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {formatLKR(rcp.balance_after)}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{rcp.payment_method || 'Cash'}</td>
                      <td style={{ padding: '8px 12px' }}>{rcp.collected_by || 'Officer'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(rcp)}
                            style={{ background: '#fff', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Print receipt"
                          >
                            <Printer size={12} /> Print
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppReceipt(rcp)}
                            style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="WhatsApp receipt"
                          >
                            <Share2 size={12} /> WA
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Prompt to select a customer if none currently active */
        <div
          style={{
            background: '#EFF6FF',
            border: '1.5px dashed #93C5FD',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            color: '#1E40AF',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👤</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>No Customer Account Currently Selected</div>
          <div style={{ fontSize: '0.82rem', color: '#3B82F6', marginTop: '4px' }}>
            Use the search bar above or choose a customer from the table below to collect cash installment and issue an official receipt.
          </div>
        </div>
      )}

      {/* 5. Directory Table of Customer Credit Accounts */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#2563EB" /> Customer Credit Accounts Directory ({filteredAccounts.length})
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
              Click <strong>"Collect Cash"</strong> on any row to open the cash collection desk above
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', color: '#1E293B' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '36px' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Customer Name & NIC</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Furniture Item & Contract</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Center Hub</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Value</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Advance Paid</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Balance Due</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Monthly Due</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                    No customer accounts match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((ord, idx) => {
                  const bal = Number(ord.balance_due) || 0;
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <tr
                      key={ord.id}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        background: isSelected ? '#EFF6FF' : idx % 2 === 0 ? '#fff' : '#F8FAFC',
                      }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{ord.customer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                          NIC: {ord.customer_nic || ord.customer_id} • 📞 {ord.customer_phone}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#334155' }}>{ord.item_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#2563EB', fontFamily: 'monospace', marginTop: '2px' }}>
                          Ref: {ord.contract_no}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                          {ord.center_code || 'C001'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatLKR(ord.gross_amount)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#16A34A', fontWeight: 700 }}>
                        {formatLKR(ord.advance_paid)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: bal > 0 ? '#DC2626' : '#16A34A', fontSize: '0.9rem' }}>
                        {formatLKR(ord.balance_due)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#1E4D8C' }}>
                        {formatLKR(ord.installment_value || 0)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(ord);
                            window.scrollTo({ top: 120, behavior: 'smooth' });
                          }}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <DollarSign size={13} /> {isSelected ? 'Active Desk' : 'Collect Cash'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Payment Success Modal with 1-Click WhatsApp & Print */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="🎉 Payment Collected Successfully!"
      >
        {lastPaymentRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <div style={{ fontWeight: 900, color: '#065F46', fontSize: '1.1rem' }}>
                  Cash Received: {formatLKR(lastPaymentRecord.amount)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '2px' }}>
                  Official Receipt <strong>#{lastPaymentRecord.receipt_no}</strong> has been generated and logged into the central database.
                </div>
              </div>
            </div>

            {/* Receipt Summary Details */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Customer:</span>
                <strong>{lastPaymentRecord.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Contract No:</span>
                <strong style={{ fontFamily: 'monospace', color: '#2563EB' }}>{lastPaymentRecord.contract_no}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Payment Mode:</span>
                <span>{lastPaymentRecord.payment_method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: '6px' }}>
                <span style={{ fontWeight: 800 }}>Remaining Balance Due:</span>
                <strong style={{ color: lastPaymentRecord.balance_after > 0 ? '#DC2626' : '#16A34A', fontSize: '0.94rem' }}>
                  {formatLKR(lastPaymentRecord.balance_after)}
                </strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReceipt(lastPaymentRecord)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#25D366',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)',
                  }}
                >
                  <Share2 size={16} /> Send WhatsApp Receipt
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintReceipt(lastPaymentRecord)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Printer size={15} /> Print Official Receipt
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="btn btn-primary"
                style={{ padding: '9px 22px', fontWeight: 800 }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
