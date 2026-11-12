import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Users,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  Search,
  Receipt,
  Printer,
  Download,
  CheckCircle,
  Clock,
  ArrowRight,
  Edit2,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Wallet,
  ChevronRight,
  X,
  RotateCcw,
  FileText,
  MessageCircle,
  Building,
  Check,
  AlertTriangle,
  Sparkles,
  Camera,
} from 'lucide-react';
import Modal from '../components/Modal';
import { loadSavedCustomers, saveCustomersToStorage } from '../utils/customersData';
import { loadSavedOrders, saveOrdersToStorage } from '../utils/ordersData';
import { loadSavedPayments, savePaymentsToStorage, generateNextReceiptNo } from '../utils/paymentsData';
import { loadSavedCenters, formatCenterCode } from '../utils/centersData';
import { formatLKR, formatDate } from '../utils/formatters';

export default function CustomerOverviewPage({ selectedCenter = 'all', onNavigate }) {
  // Master Data
  const [customers, setCustomers] = useState(() => loadSavedCustomers());
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [payments, setPayments] = useState(() => loadSavedPayments());
  const [centers] = useState(() => loadSavedCenters());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    const list = loadSavedCustomers();
    // Default to the first customer who has an outstanding balance, or the very first customer
    const withDebt = list.find((c) => Number(c.outstanding_balance) > 0);
    return withDebt ? withDebt.id : list[0]?.id || null;
  });

  // Filter mode for customer selector list: 'all' | 'with-loans' | 'settled'
  const [clientFilterMode, setClientFilterMode] = useState('all');

  // Modals State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [targetOrderForPayment, setTargetOrderForPayment] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payType, setPayType] = useState('Installment Loan');
  const [payRefNo, setPayRefNo] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');

  // Print Statement Modal
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Edit Customer Modal
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Sync with localStorage
  useEffect(() => {
    const handleStorage = () => {
      setCustomers(loadSavedCustomers());
      setOrders(loadSavedOrders());
      setPayments(loadSavedPayments());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filtered customer list for the search & selector strip
  const filteredCustomerList = useMemo(() => {
    return customers.filter((c) => {
      // Center filter
      if (selectedCenter && selectedCenter !== 'all') {
        const parts = selectedCenter.split('/');
        if (parts.length === 2) {
          const cCenter = `${c.branch_code}/${c.center_code}`.toLowerCase();
          const selClean = selectedCenter.toLowerCase();
          if (cCenter !== selClean && c.center_code?.toLowerCase() !== parts[1].toLowerCase()) {
            return false;
          }
        }
      }

      // Debt filter mode
      if (clientFilterMode === 'with-loans') {
        const custOrders = orders.filter(
          (o) =>
            o.customer_id === c.id ||
            o.customer_id === c.nic ||
            o.customer_nic === c.nic ||
            (c.customer_id && o.customer_id === c.customer_id)
        );
        const hasDebt = custOrders.some((o) => Number(o.balance_due) > 0) || Number(c.outstanding_balance) > 0;
        if (!hasDebt) return false;
      }
      if (clientFilterMode === 'settled') {
        const custOrders = orders.filter(
          (o) =>
            o.customer_id === c.id ||
            o.customer_id === c.nic ||
            o.customer_nic === c.nic ||
            (c.customer_id && o.customer_id === c.customer_id)
        );
        const hasDebt = custOrders.some((o) => Number(o.balance_due) > 0) || Number(c.outstanding_balance) > 0;
        if (hasDebt) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q) || `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q);
        const matchNic = c.nic?.toLowerCase().includes(q) || c.customer_id?.toLowerCase().includes(q);
        const matchPhone = c.phone?.includes(q) || c.whatsapp?.includes(q);
        const matchCity = c.city?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q);
        return matchName || matchNic || matchPhone || matchCity;
      }

      return true;
    });
  }, [customers, orders, selectedCenter, clientFilterMode, searchQuery]);

  // The actively selected customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return filteredCustomerList[0] || customers[0] || null;
    return (
      customers.find((c) => c.id === selectedCustomerId || c.nic === selectedCustomerId || c.customer_id === selectedCustomerId) ||
      customers[0] ||
      null
    );
  }, [customers, selectedCustomerId, filteredCustomerList]);

  // All orders belonging to the active customer
  const customerOrders = useMemo(() => {
    if (!activeCustomer) return [];
    return orders.filter((o) => {
      const matchId = o.customer_id === activeCustomer.id || o.customer_id === activeCustomer.customer_id;
      const matchNic = o.customer_nic && activeCustomer.nic && o.customer_nic === activeCustomer.nic;
      const matchName = o.customer_name && activeCustomer.name && o.customer_name.trim().toLowerCase() === activeCustomer.name.trim().toLowerCase();
      return matchId || matchNic || matchName;
    });
  }, [orders, activeCustomer]);

  // All payments logged for the active customer
  const customerPayments = useMemo(() => {
    if (!activeCustomer) return [];
    const custContractNos = new Set(customerOrders.map((o) => o.contract_no));
    const custOrderIds = new Set(customerOrders.map((o) => o.id));

    return payments.filter((p) => {
      const matchContract = custContractNos.has(p.contract_no);
      const matchOrderId = custOrderIds.has(p.order_id);
      const matchNic = p.customer_nic && activeCustomer.nic && p.customer_nic === activeCustomer.nic;
      const matchCustId = p.customer_id === activeCustomer.id || p.customer_id === activeCustomer.customer_id;
      const matchName = p.customer_name && activeCustomer.name && p.customer_name.trim().toLowerCase() === activeCustomer.name.trim().toLowerCase();
      return matchContract || matchOrderId || matchNic || matchCustId || matchName;
    });
  }, [payments, customerOrders, activeCustomer]);

  // Financial calculations for active customer
  const clientFinancials = useMemo(() => {
    if (!activeCustomer) {
      return { totalGross: 0, totalAdvance: 0, totalBalance: 0, activeLoans: 0, settledLoans: 0, progressPct: 100 };
    }

    const totalGross = customerOrders.reduce((acc, o) => acc + (Number(o.gross_amount) || 0), 0);
    const totalAdvance = customerOrders.reduce((acc, o) => acc + (Number(o.advance_paid) || 0), 0);
    const totalBalance = customerOrders.reduce((acc, o) => acc + (Number(o.balance_due) || 0), 0);
    const activeLoans = customerOrders.filter((o) => Number(o.balance_due) > 0).length;
    const settledLoans = customerOrders.filter((o) => Number(o.balance_due) <= 0).length;

    const progressPct = totalGross > 0 ? Math.min(100, Math.round((totalAdvance / totalGross) * 100)) : 100;

    return {
      totalGross,
      totalAdvance,
      totalBalance,
      activeLoans,
      settledLoans,
      progressPct,
    };
  }, [customerOrders, activeCustomer]);

  // Overall Global Stats for the top ribbon
  const globalStats = useMemo(() => {
    const totalClients = customers.length;
    const clientsWithDebt = customers.filter((c) => {
      const custOrders = orders.filter((o) => o.customer_nic === c.nic || o.customer_id === c.id);
      return custOrders.some((o) => Number(o.balance_due) > 0) || Number(c.outstanding_balance) > 0;
    }).length;
    const totalPortfolioOutstanding = orders.reduce((acc, o) => acc + (Number(o.balance_due) || 0), 0);
    const totalAdvancesCollected = orders.reduce((acc, o) => acc + (Number(o.advance_paid) || 0), 0);

    return {
      totalClients,
      clientsWithDebt,
      totalPortfolioOutstanding,
      totalAdvancesCollected,
    };
  }, [customers, orders]);

  // Open Payment Modal for a specific contract
  const handleOpenPaymentForOrder = (order) => {
    setTargetOrderForPayment(order);
    const defAmt = order.installment_value && order.installment_value > 0
      ? Math.min(Number(order.installment_value), Number(order.balance_due))
      : Number(order.balance_due);
    setPayAmount(defAmt);
    setPayMethod('Cash');
    setPayType(order.payment_type === 'installment' ? 'Installment Loan' : 'Full Settlement');
    setPayRefNo('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes(`Payment for ${order.contract_no}`);
    setIsRecordPaymentModalOpen(true);
  };

  // Submit payment from this overview page
  const handleSubmitPayment = () => {
    if (!targetOrderForPayment) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    const curBal = Number(targetOrderForPayment.balance_due) || 0;
    if (amt > curBal) {
      alert(`Amount exceeds current balance of ${formatLKR(curBal)}`);
      return;
    }

    const nextBal = Math.max(0, curBal - amt);
    const receiptNo = generateNextReceiptNo(payments);

    const newPayment = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      receipt_no: receiptNo,
      date: payDate || new Date().toISOString().slice(0, 10),
      order_id: targetOrderForPayment.id,
      contract_no: targetOrderForPayment.contract_no,
      customer_id: activeCustomer.id,
      customer_name: activeCustomer.name,
      customer_nic: activeCustomer.nic,
      customer_phone: activeCustomer.phone,
      branch_code: targetOrderForPayment.branch_code || activeCustomer.branch_code || 'MHG',
      center_code: targetOrderForPayment.center_code || activeCustomer.center_code || 'C001',
      payment_type: payType,
      amount: amt,
      previous_balance: curBal,
      new_balance: nextBal,
      payment_method: payMethod,
      reference_no: payRefNo || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      collected_by: 'Showroom Cashier',
      notes: payNotes,
      created_at: new Date().toISOString(),
    };

    // Update Payments
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    savePaymentsToStorage(updatedPayments);

    // Update Orders
    const updatedOrders = orders.map((o) => {
      if (o.id === targetOrderForPayment.id) {
        return {
          ...o,
          balance_due: nextBal,
          advance_paid: (Number(o.advance_paid) || 0) + amt,
          installments_paid: (o.installments_paid || 0) + 1,
          status: nextBal <= 0 ? 'Fully Paid' : 'Active Loan',
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // Update Customers outstanding balance
    const updatedCustomers = customers.map((c) => {
      if (c.id === activeCustomer.id || c.nic === activeCustomer.nic) {
        return {
          ...c,
          outstanding_balance: Math.max(0, (Number(c.outstanding_balance) || 0) - amt),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    setIsRecordPaymentModalOpen(false);
    alert(`Payment of ${formatLKR(amt)} logged successfully! Receipt: ${receiptNo}`);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = () => {
    if (!activeCustomer) return;
    setEditFormData({
      ...activeCustomer,
      first_name: activeCustomer.first_name || activeCustomer.name?.split(' ')[0] || '',
      last_name: activeCustomer.last_name || activeCustomer.name?.split(' ').slice(1).join(' ') || '',
    });
    setIsEditCustomerModalOpen(true);
  };

  // Save Edited Customer
  const handleSaveEditCustomer = (e) => {
    e.preventDefault();
    if (!editFormData.name && !editFormData.first_name) {
      alert('Please enter client name.');
      return;
    }
    const fullName = `${editFormData.first_name || ''} ${editFormData.last_name || ''}`.trim() || editFormData.name;
    const updated = customers.map((c) => {
      if (c.id === activeCustomer.id) {
        return {
          ...c,
          ...editFormData,
          name: fullName,
        };
      }
      return c;
    });
    setCustomers(updated);
    saveCustomersToStorage(updated);
    setIsEditCustomerModalOpen(false);
    alert('Customer personal details updated successfully!');
  };

  // Print Official Customer Statement & Loan Portfolio as PDF
  const handlePrintStatementPDF = () => {
    if (!activeCustomer) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening the print window. Please allow popups.');
      return;
    }

    const contractsHtml = customerOrders
      .map(
        (o) => `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #1E4D8C;">${o.contract_no}</td>
          <td style="padding: 8px 10px;">${o.item_name} (${o.item_code})</td>
          <td style="padding: 8px 10px; text-align: right;">Rs. ${(Number(o.gross_amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; text-align: right; color: #16A34A; font-weight: 700;">Rs. ${(Number(o.advance_paid) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; text-align: right; color: ${Number(o.balance_due) > 0 ? '#DC2626' : '#16A34A'}; font-weight: 800;">
            Rs. ${(Number(o.balance_due) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${Number(o.balance_due) <= 0 ? '#DCFCE7' : '#FEF3C7'}; color: ${Number(o.balance_due) <= 0 ? '#15803D' : '#B45309'};">
              ${Number(o.balance_due) <= 0 ? 'Settled' : 'Active Loan'}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    const paymentsHtml = customerPayments
      .map(
        (p) => `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 7px 10px; font-family: monospace; font-weight: 700; color: #2563EB;">${p.receipt_no}</td>
          <td style="padding: 7px 10px;">${formatDate(p.date)}</td>
          <td style="padding: 7px 10px; font-family: monospace;">${p.contract_no}</td>
          <td style="padding: 7px 10px;">${p.payment_type} (${p.payment_method})</td>
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
          <title>D N S Home Solutions - Customer Statement - ${activeCustomer.name}</title>
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
                <div class="doc-type">Official Customer Statement & Loan Portfolio</div>
              </td>
              <td class="meta-text">
                <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div><strong>Center Hub:</strong> ${activeCustomer.branch_code}/${activeCustomer.center_code}</div>
                <div><strong>Customer ID:</strong> ${activeCustomer.customer_id || activeCustomer.id}</div>
              </td>
            </tr>
          </table>

          <div class="info-card">
            <div>
              <div style="font-size: 9.5px; font-weight: 800; color: #64748B; text-transform: uppercase;">Client Profile</div>
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 3px 0 2px;">${activeCustomer.name}</div>
              <div><strong>NIC / ID:</strong> ${activeCustomer.nic || 'N/A'}</div>
              <div><strong>Phone:</strong> ${activeCustomer.phone} ${activeCustomer.whatsapp ? `• WA: ${activeCustomer.whatsapp}` : ''}</div>
              <div><strong>Delivery Address:</strong> ${activeCustomer.address || 'Showroom Pickup'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 9.5px; font-weight: 800; color: #64748B; text-transform: uppercase;">Portfolio Summary</div>
              <div style="font-size: 11px; margin-top: 3px;">Total Invoiced: <strong>Rs. ${clientFinancials.totalGross.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></div>
              <div style="font-size: 11px; color: #16A34A;">Total Advances Paid: <strong>Rs. ${clientFinancials.totalAdvance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></div>
              <div style="font-size: 13px; font-weight: 900; color: ${clientFinancials.totalBalance > 0 ? '#DC2626' : '#16A34A'}; margin-top: 4px;">
                Balance Due: Rs. ${clientFinancials.totalBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
              <div style="font-size: 9.5px; color: #64748B; margin-top: 2px;">
                Status: <strong>${clientFinancials.totalBalance <= 0 ? 'Zero Debt (Fully Settled)' : `${clientFinancials.activeLoans} Active Loan(s)`}</strong>
              </div>
            </div>
          </div>

          <div class="section-title">Active Furniture Contracts (${customerOrders.length})</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Contract Code</th>
                <th>Item Description</th>
                <th style="text-align: right;">Gross Value</th>
                <th style="text-align: right;">Advance Paid</th>
                <th style="text-align: right;">Balance Due</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${contractsHtml || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748B;">No contracts on record</td></tr>'}
            </tbody>
          </table>

          ${customerPayments.length > 0 ? `
            <div class="section-title">Payment Receipts History (${customerPayments.length})</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Date</th>
                  <th>Contract</th>
                  <th>Payment Type</th>
                  <th style="text-align: right;">Amount Paid</th>
                  <th style="text-align: right;">Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsHtml}
              </tbody>
            </table>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Customer Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Authorized Manager (D N S Home Solutions)</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* =========================================================
          1. HEADER & EXECUTIVE STATS RIBBON
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
            <Users size={24} color="var(--primary)" /> Customer Overview & Loan Portfolio
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.82rem', color: 'var(--ash-500)' }}>
            <span>Total Registered Clients: <strong style={{ color: 'var(--ash-900)' }}>{globalStats.totalClients}</strong></span>
            <span>•</span>
            <span style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D97706' }}></span>
              Active Borrowers: <strong>{globalStats.clientsWithDebt}</strong>
            </span>
            <span>•</span>
            <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626' }}></span>
              Island-Wide Balance Due: <strong>{formatLKR(globalStats.totalPortfolioOutstanding)}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {activeCustomer && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsStatementModalOpen(true)}
              style={{ padding: '9px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Printer size={15} /> Print Full Client Statement
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('customers')}
              style={{ padding: '9px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Users size={14} /> Open Customer Directory
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          2. QUICK CUSTOMER SELECTOR & SEARCH BAR
          ========================================================= */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--ash-200)',
          padding: '14px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '0.86rem' }}
              placeholder="Search client by Name, NIC, Mobile, or Town..."
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

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${clientFilterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setClientFilterMode('all')}
            >
              All Clients ({customers.length})
            </button>
            <button
              type="button"
              className={`btn ${clientFilterMode === 'with-loans' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setClientFilterMode('with-loans')}
            >
              Pending Balances ({globalStats.clientsWithDebt})
            </button>
            <button
              type="button"
              className={`btn ${clientFilterMode === 'settled' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => setClientFilterMode('settled')}
            >
              Zero Debt / Settled
            </button>
          </div>
        </div>

        {/* Customer Select Strip (Horizontal Quick Pick Pills) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
          {filteredCustomerList.map((cust) => {
            const isSelected = activeCustomer?.id === cust.id;
            const debt = Number(cust.outstanding_balance) || 0;

            return (
              <button
                key={cust.id}
                type="button"
                onClick={() => setSelectedCustomerId(cust.id)}
                style={{
                  background: isSelected ? 'var(--primary-tint)' : '#F8FAFC',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--ash-200)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                {/* Photo / Avatar */}
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : '#E2E8F0',
                    color: isSelected ? '#fff' : 'var(--ash-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {cust.photo || cust.image_url ? (
                    <img src={cust.photo || cust.image_url} alt={cust.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{(cust.name || 'C').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? 'var(--primary)' : 'var(--ash-900)', whiteSpace: 'nowrap' }}>
                    {cust.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--ash-500)', whiteSpace: 'nowrap' }}>
                    <span>NIC: {cust.nic || cust.customer_id}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 700, color: debt > 0 ? '#DC2626' : '#16A34A' }}>
                      {debt > 0 ? `Due: ${formatLKR(debt)}` : '✓ Settled'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          3. MAIN CUSTOMER 360 OVERVIEW CARD
          ========================================================= */}
      {activeCustomer ? (
        <>
          {/* Executive Top Banner Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid var(--ash-200)',
              padding: '20px 24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            {/* Left: Customer Profile Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  border: '3px solid #BFDBFE',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                  flexShrink: 0,
                }}
              >
                {activeCustomer.photo || activeCustomer.image_url ? (
                  <img
                    src={activeCustomer.photo || activeCustomer.image_url}
                    alt={activeCustomer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{(activeCustomer.name || 'C').charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--ash-900)' }}>
                    {activeCustomer.name}
                  </h1>
                  <span
                    style={{
                      background: '#EFF6FF',
                      color: 'var(--primary)',
                      border: '1px solid #BFDBFE',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}
                  >
                    🆔 NIC: {activeCustomer.nic || activeCustomer.customer_id}
                  </span>
                  <span
                    style={{
                      background: '#F1F5F9',
                      color: 'var(--ash-700)',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    Center: {activeCustomer.branch_code}/{activeCustomer.center_code}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px', fontSize: '0.82rem', color: 'var(--ash-600)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={14} color="var(--primary)" /> {activeCustomer.phone}
                  </span>
                  {activeCustomer.whatsapp && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16A34A', fontWeight: 700 }}>
                      <MessageCircle size={14} /> WhatsApp: {activeCustomer.whatsapp}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="#D97706" /> {activeCustomer.city || 'Colombo'}
                  </span>
                </div>

                {/* Direct Action Chips */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <a
                    href={`tel:${activeCustomer.phone}`}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Phone size={12} /> Call Client
                  </a>

                  {activeCustomer.whatsapp && (
                    <a
                      href={`https://wa.me/94${activeCustomer.whatsapp.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.72rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', color: '#16A34A', borderColor: '#86EFAC' }}
                    >
                      <MessageCircle size={12} /> Send WhatsApp
                    </a>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleOpenEditCustomer}
                    style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={12} /> Edit Details
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Key Loan & Repayment Progress Health */}
            <div style={{ background: '#F8FAFC', border: '1px solid var(--ash-200)', borderRadius: '10px', padding: '14px 18px', minWidth: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--ash-500)', textTransform: 'uppercase' }}>
                  Portfolio Standing
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: clientFinancials.totalBalance <= 0 ? '#DCFCE7' : '#FEF3C7',
                    color: clientFinancials.totalBalance <= 0 ? '#15803D' : '#B45309',
                  }}
                >
                  {clientFinancials.totalBalance <= 0 ? '✓ Debt Free / Settled' : `${clientFinancials.activeLoans} Active Loan(s)`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)' }}>Remaining Balance:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: clientFinancials.totalBalance <= 0 ? '#16A34A' : '#DC2626' }}>
                    {formatLKR(clientFinancials.totalBalance)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)' }}>Advances Paid:</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16A34A' }}>
                    {formatLKR(clientFinancials.totalAdvance)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--ash-600)', marginBottom: '3px' }}>
                  <span>Settlement Progress</span>
                  <strong>{clientFinancials.progressPct}%</strong>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${clientFinancials.progressPct}%`,
                      height: '100%',
                      background: clientFinancials.progressPct === 100 ? '#16A34A' : '#2563EB',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              4. SPLIT 2-COLUMN VIEW:
                 COLUMN A: PERSONAL DETAILS
                 COLUMN B: LOAN DETAILS
              ========================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.35fr)', gap: '20px', alignItems: 'start' }}>
            {/* ----------------------------------------------------
                COLUMN A: PERSONAL DETAILS
                ---------------------------------------------------- */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid var(--ash-200)',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ash-200)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="var(--primary)" /> Personal & Profile Information
                </h3>
                <button
                  type="button"
                  onClick={handleOpenEditCustomer}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit2 size={13} /> Edit
                </button>
              </div>

              {/* Personal Data Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                {/* Full Name */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>Full Name:</span>
                  <strong style={{ color: 'var(--ash-900)' }}>{activeCustomer.name}</strong>
                </div>

                {/* NIC */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>NIC / Identification:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{activeCustomer.nic || activeCustomer.customer_id}</strong>
                </div>

                {/* Primary Phone */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>Phone (Primary):</span>
                  <strong style={{ color: 'var(--ash-900)' }}>{activeCustomer.phone}</strong>
                </div>

                {/* WhatsApp */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>WhatsApp Mobile:</span>
                  <strong style={{ color: '#15803D' }}>{activeCustomer.whatsapp || activeCustomer.phone}</strong>
                </div>

                {/* Civil Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>Civil Status:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ash-800)' }}>{activeCustomer.civil_status || 'Single'}</span>
                </div>

                {/* Date of Birth */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>Date of Birth:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ash-800)' }}>{activeCustomer.dob ? formatDate(activeCustomer.dob) : 'Not specified'}</span>
                </div>

                {/* City / Town */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>City / Town:</span>
                  <strong style={{ color: 'var(--ash-900)' }}>{activeCustomer.city || 'Maharagama'}</strong>
                </div>

                {/* Delivery Address */}
                <div style={{ padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Full Delivery Address:</span>
                  <div style={{ color: 'var(--ash-900)', fontWeight: 700, background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--ash-200)', lineHeight: 1.4 }}>
                    📍 {activeCustomer.address || 'Showroom Direct Collection'}
                  </div>
                </div>

                {/* Assigned Center */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>Assigned Center:</span>
                  <strong style={{ color: 'var(--primary)' }}>
                    {activeCustomer.branch_code}/{activeCustomer.center_code}
                  </strong>
                </div>

                {/* Customer Category */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ash-100)' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600 }}>Client Category:</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--ash-800)' }}>
                    {activeCustomer.category?.replace('_', ' ') || 'Custom Furniture'}
                  </span>
                </div>

                {/* Preferences & Workshop Notes */}
                <div style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--ash-500)', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Wood Preferences & Notes:</span>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: '8px', color: '#92400E', fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.45 }}>
                    "{activeCustomer.notes || 'No special wood or delivery requests recorded.'}"
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                COLUMN B: LOAN DETAILS & REPAYMENT TERMS
                ---------------------------------------------------- */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid var(--ash-200)',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ash-200)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="var(--primary)" /> Furniture Loans & Repayment Portfolio
                </h3>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ash-600)' }}>
                  Total Orders: {customerOrders.length}
                </span>
              </div>

              {/* Active Contracts List */}
              {customerOrders.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', color: 'var(--ash-500)' }}>
                  <CreditCard size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700 }}>No loan contracts or furniture orders on file</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ash-400)', marginTop: '2px' }}>
                    Orders placed for this client in "Orders & Invoices" will appear here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {customerOrders.map((ord) => {
                    const isSettled = Number(ord.balance_due) <= 0;
                    const paidTerms = ord.installments_paid || (isSettled ? ord.loan_terms || 1 : 0);
                    const totalTerms = ord.loan_terms || 1;
                    const installmentPct = Math.min(100, Math.round((paidTerms / totalTerms) * 100));

                    return (
                      <div
                        key={ord.id}
                        style={{
                          background: isSettled ? '#F8FAFC' : '#FFFDF5',
                          border: `1px solid ${isSettled ? 'var(--ash-200)' : '#FDE68A'}`,
                          borderRadius: '10px',
                          padding: '14px 16px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {/* Contract Top Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                color: 'var(--primary)',
                                background: '#EFF6FF',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid #BFDBFE',
                              }}
                            >
                              📜 {ord.contract_no}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                              Inv: {ord.invoice_no} • {formatDate(ord.date)}
                            </span>
                          </div>

                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              background: isSettled ? '#DCFCE7' : '#FEF3C7',
                              color: isSettled ? '#15803D' : '#B45309',
                            }}
                          >
                            {isSettled ? '✓ Fully Settled' : 'Active Loan'}
                          </span>
                        </div>

                        {/* Item Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--ash-200)' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)' }}>
                              🛋️ {ord.item_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '1px' }}>
                              Code: {ord.item_code} • Qty: {ord.quantity || 1} Unit(s)
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--ash-400)', textTransform: 'uppercase' }}>Gross Total</span>
                            <div style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--ash-900)' }}>
                              {formatLKR(ord.gross_amount)}
                            </div>
                          </div>
                        </div>

                        {/* Financial Figures: Advance & Balance Due */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.66rem', color: '#166534', fontWeight: 700 }}>ADVANCE PAID</span>
                            <div style={{ fontWeight: 800, color: '#15803D', fontSize: '0.86rem', marginTop: '1px' }}>
                              {formatLKR(ord.advance_paid)}
                            </div>
                          </div>

                          <div style={{ background: isSettled ? '#F8FAFC' : '#FEF2F2', border: `1px solid ${isSettled ? '#E2E8F0' : '#FECACA'}`, padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.66rem', color: isSettled ? '#64748B' : '#991B1B', fontWeight: 700 }}>BALANCE DUE</span>
                            <div style={{ fontWeight: 900, color: isSettled ? '#15803D' : '#DC2626', fontSize: '0.86rem', marginTop: '1px' }}>
                              {formatLKR(ord.balance_due)}
                            </div>
                          </div>

                          <div style={{ background: '#FEF9C3', border: '1px solid #FEF08A', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.66rem', color: '#854D0E', fontWeight: 700 }}>REPAYMENT PLAN</span>
                            <div style={{ fontWeight: 800, color: '#A16207', fontSize: '0.82rem', marginTop: '1px' }}>
                              {ord.payment_type === 'installment'
                                ? `${formatLKR(ord.installment_value)} / ${ord.loan_frequency === 'weekly' ? 'wk' : 'mo'}`
                                : 'Cash'}
                            </div>
                          </div>
                        </div>

                        {/* Installment Repayment Progress Bar */}
                        {ord.payment_type === 'installment' && (
                          <div style={{ marginTop: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--ash-600)', marginBottom: '3px' }}>
                              <span>Installments Paid: <strong>{paidTerms} of {totalTerms}</strong> ({ord.loan_frequency || 'monthly'})</span>
                              <span>{installmentPct}% Completed</span>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${installmentPct}%`,
                                  height: '100%',
                                  background: isSettled ? '#16A34A' : '#D97706',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Bottom Actions for Contract */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--ash-100)', paddingTop: '8px', marginTop: '2px' }}>
                          {!isSettled && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}
                              onClick={() => handleOpenPaymentForOrder(ord)}
                            >
                              <CreditCard size={12} /> Settle / Pay Installment
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => setIsStatementModalOpen(true)}
                          >
                            <Printer size={12} /> Passbook
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* =========================================================
              5. BOTTOM SECTION: PAYMENT RECEIPTS & TRANSACTION HISTORY
              ========================================================= */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid var(--ash-200)',
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} color="var(--primary)" /> Payment Receipts & Settlement Ledger ({customerPayments.length})
              </h3>
              {onNavigate && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigate('payments')}
                  style={{ padding: '5px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CreditCard size={13} /> Open Payments & Advances
                </button>
              )}
            </div>

            {customerPayments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', color: 'var(--ash-500)', fontSize: '0.82rem' }}>
                No individual payment receipts recorded for this customer yet.
              </div>
            ) : (
              <div className="table-responsive" style={{ margin: 0 }}>
                <table className="custom-table" style={{ margin: 0, width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Receipt No</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Contract No</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Payment Purpose</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Method</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount Paid</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerPayments.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--ash-100)' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#2563EB' }}>
                          🧾 {p.receipt_no}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{formatDate(p.date)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          📜 {p.contract_no}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.payment_type}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {p.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#16A34A', fontSize: '0.88rem' }}>
                          +{formatLKR(p.amount)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: Number(p.new_balance) <= 0 ? '#16A34A' : '#DC2626' }}>
                          {formatLKR(p.new_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed var(--ash-300)' }}>
          <User size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>Please select a customer from above to view their overview</div>
        </div>
      )}

      {/* =========================================================
          6. MODAL: RECORD PAYMENT FOR ACTIVE LOAN
          ========================================================= */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title={targetOrderForPayment ? `💳 Pay Installment - ${targetOrderForPayment.contract_no}` : 'Record Payment'}
      >
        {targetOrderForPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800 }}>CONTRACT</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#1D4ED8', fontSize: '1rem' }}>
                    📜 {targetOrderForPayment.contract_no}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#1E40AF', marginTop: '2px' }}>
                    {targetOrderForPayment.item_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 800 }}>CURRENT BALANCE DUE</span>
                  <div style={{ fontWeight: 900, color: '#DC2626', fontSize: '1.15rem' }}>
                    {formatLKR(targetOrderForPayment.balance_due)}
                  </div>
                </div>
              </div>
            </div>

            {/* Amount input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8rem' }}>Payment Amount (LKR) *</label>
              <input
                type="number"
                className="form-input"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ fontWeight: 900, fontSize: '1.1rem', color: '#16A34A' }}
              />
            </div>

            {/* Method & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>Payment Method</label>
                <select className="form-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>Payment Date</label>
                <input type="date" className="form-input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsRecordPaymentModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubmitPayment} style={{ fontWeight: 800 }}>
                Confirm & Issue Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: PRINT COMPREHENSIVE CUSTOMER STATEMENT
          ========================================================= */}
      <Modal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        title={activeCustomer ? `Customer Statement - ${activeCustomer.name}` : 'Statement'}
      >
        {activeCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              id="printable-customer-statement"
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
                    Customer Profile & Furniture Loan Portfolio Statement • Center: {activeCustomer.branch_code}/{activeCustomer.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>STATEMENT DATE</div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                    {formatDate(new Date().toISOString().slice(0, 10))}
                  </div>
                </div>
              </div>

              {/* Customer Personal Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '14px 0', fontSize: '0.84rem' }}>
                <div>
                  <div>Customer Name: <strong style={{ color: '#0f172a' }}>{activeCustomer.name}</strong></div>
                  <div>NIC / ID: <strong style={{ fontFamily: 'monospace' }}>{activeCustomer.nic || activeCustomer.customer_id}</strong></div>
                  <div>Phone: {activeCustomer.phone}</div>
                  <div>Delivery Address: {activeCustomer.address || 'Showroom Pickup'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Total Invoiced: <strong>{formatLKR(clientFinancials.totalGross)}</strong></div>
                  <div>Total Advances Paid: <strong style={{ color: '#16a34a' }}>{formatLKR(clientFinancials.totalAdvance)}</strong></div>
                  <div>Outstanding Balance: <strong style={{ color: clientFinancials.totalBalance > 0 ? '#dc2626' : '#16a34a' }}>{formatLKR(clientFinancials.totalBalance)}</strong></div>
                  <div>Status: <strong>{clientFinancials.totalBalance > 0 ? 'Payment Pending' : 'Zero Debt (Fully Settled)'}</strong></div>
                </div>
              </div>

              {/* Loans Table */}
              <div style={{ margin: '14px 0' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>Active Furniture Contracts</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: '6px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Contract Code</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Item</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Gross Value</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Adv Paid</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 700 }}>{o.contract_no}</td>
                        <td style={{ padding: '6px' }}>{o.item_name}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{formatLKR(o.gross_amount)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{formatLKR(o.advance_paid)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: Number(o.balance_due) > 0 ? '#dc2626' : '#16a34a', fontWeight: 800 }}>
                          {formatLKR(o.balance_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '35px', paddingTop: '10px', fontSize: '0.76rem', color: '#64748b' }}>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Customer Signature
                </div>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Authorized Manager
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setIsStatementModalOpen(false)}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrintStatementPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                <Printer size={15} /> Download / Print PDF Statement
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          8. MODAL: EDIT CUSTOMER PERSONAL DETAILS
          ========================================================= */}
      <Modal
        isOpen={isEditCustomerModalOpen}
        onClose={() => setIsEditCustomerModalOpen(false)}
        title="✏️ Edit Customer Personal Details"
      >
        {editFormData && (
          <form onSubmit={handleSaveEditCustomer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.first_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.last_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">WhatsApp Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.whatsapp || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">NIC *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.nic || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, nic: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">City / Town</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.city || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Delivery Address</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Furniture Preferences & Notes</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditCustomerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

