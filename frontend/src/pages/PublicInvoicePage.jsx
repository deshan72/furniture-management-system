import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  ShieldCheck, 
  ArrowLeft, 
  Building2, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Award,
  AlertCircle
} from 'lucide-react';
import { loadSavedOrders, formatLKR, formatDate } from '../utils/ordersData';
import { apiRequest } from '../services/api';
import { getAuthenticatedUser } from '../utils/authData';

export default function PublicInvoicePage({ invoiceNo: propInvoiceNo }) {
  const getIdentifier = () => {
    if (propInvoiceNo) return propInvoiceNo;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('invoice') || searchParams.get('inv');
      if (q) return q;
      if (window.location.hash && window.location.hash.startsWith('#/invoice/')) {
        return window.location.hash.replace('#/invoice/', '').trim();
      }
    } catch {}
    return '';
  };

  const invoiceIdentifier = getIdentifier();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const currentUser = getAuthenticatedUser();

  useEffect(() => {
    if (!invoiceIdentifier) {
      setLoading(false);
      return;
    }

    const cleanNeedle = decodeURIComponent(invoiceIdentifier).trim().toLowerCase();

    try {
      const localOrders = loadSavedOrders();
      const localMatch = localOrders.find((o) => {
        return (
          String(o.invoice_no || '').toLowerCase() === cleanNeedle ||
          String(o.contract_no || '').toLowerCase() === cleanNeedle ||
          String(o.id || '').toLowerCase() === cleanNeedle ||
          String(o.customer_nic || '').toLowerCase() === cleanNeedle
        );
      });

      if (localMatch) {
        setOrder(localMatch);
      }
    } catch (err) {
      console.warn('Error reading local orders:', err);
    }

    apiRequest('/orders')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const apiMatch = data.find((o) => {
            return (
              String(o.invoice_no || '').toLowerCase() === cleanNeedle ||
              String(o.contract_no || '').toLowerCase() === cleanNeedle ||
              String(o.id || '').toLowerCase() === cleanNeedle ||
              String(o.customer_nic || '').toLowerCase() === cleanNeedle
            );
          });
          if (apiMatch) {
            setOrder(apiMatch);
          }
        }
      })
      .catch((err) => {
        console.warn('API fetch orders error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invoiceIdentifier]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const text = `📄 D N S Home Solutions - Official Sales Invoice & Agreement\n` +
      `Invoice No: ${order.invoice_no || 'N/A'}\n` +
      `Contract No: ${order.contract_no || 'N/A'}\n` +
      `Customer: ${order.customer_name || 'Customer'}\n` +
      `Amount: ${formatLKR(order.gross_amount || 0)}\n\n` +
      `View & Download PDF: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleReturnToSystem = () => {
    window.location.href = window.location.origin + window.location.pathname + '#/orders';
  };

  if (loading && !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📄</div>
          <h2 style={{ margin: 0, color: '#1E293B', fontSize: '1.25rem' }}>Loading Official Invoice...</h2>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '6px' }}>
            Fetching verified sales agreement details from D N S Home Solutions
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '36px 28px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '1.3rem' }}>Invoice Document Not Found</h2>
          <p style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: '1.6', margin: '0 0 20px' }}>
            We could not locate an official invoice matching reference <strong>"{invoiceIdentifier || 'Unknown'}"</strong>. Please verify the link received via WhatsApp or contact our customer support desk.
          </p>
          <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.84rem', color: '#334155', marginBottom: '20px' }}>
            📞 <strong>Customer Support Hotline:</strong> 0772345671 / 0771234567<br />
            🏢 <strong>D N S Home Solutions (Pvt) Ltd</strong>
          </div>
          {currentUser && (
            <button
              onClick={handleReturnToSystem}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1E4D8C', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Return to Orders Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const isInstallment = order.payment_type === 'installment';
  const orderDate = order.date ? formatDate(order.date) : new Date().toLocaleDateString('en-GB');

  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{
        item_name: order.item_name || 'Handcrafted Furniture Item',
        item_code: order.item_code || 'FUR-001',
        category: order.category || 'Solid Timber Woodcraft',
        quantity: Number(order.quantity) || 1,
        unit_price: Number(order.unit_price) || (Number(order.gross_amount) - (Number(order.document_charge) || 0)) / (Number(order.quantity) || 1) || 0,
        total: ((Number(order.unit_price) || (Number(order.gross_amount) - (Number(order.document_charge) || 0)) / (Number(order.quantity) || 1)) * (Number(order.quantity) || 1)) || 0
      }];

  return (
    <div className="public-invoice-wrapper" style={{ background: '#F1F5F9', minHeight: '100vh', padding: '0 0 60px', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: '#0F172A' }}>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 10mm 12mm 10mm;
        }
        @media print {
          body, html {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .public-invoice-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .invoice-paper {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar */}
      <header className="no-print" style={{ background: '#0F172A', color: '#fff', position: 'sticky', top: 0, zIndex: 999, borderBottom: '1px solid #1E293B', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/ds-logo.png" 
              alt="D N S Logo" 
              style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#fff', padding: '2px', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.3px', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                D N S HOME SOLUTIONS
                <span style={{ fontSize: '0.65rem', background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> Certified Document
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                Official Sales Invoice & Hire-Purchase Agreement Bill
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {currentUser && (
              <button
                type="button"
                onClick={handleReturnToSystem}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#E2E8F0',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} /> Back to System
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: copied ? '#10B981' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Link Copied!' : 'Copy Link'}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#25D366',
                color: '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
              }}
            >
              <Share2 size={14} /> Share
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563EB',
                color: '#ffffff',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Download size={14} /> Download / Save PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Paper Container */}
      <main style={{ maxWidth: '840px', margin: '28px auto 0', padding: '0 14px' }}>
        <div 
          className="invoice-paper"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            padding: '36px 36px 40px',
            position: 'relative'
          }}
        >
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #1E4D8C', paddingBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <img 
                src="/ds-logo.png" 
                alt="D N S Home Solutions Logo" 
                style={{ width: '68px', height: '68px', objectFit: 'contain', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '3px', background: '#fff' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#1E4D8C', letterSpacing: '-0.5px' }}>
                  D N S HOME SOLUTIONS
                </h1>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
                  Handcrafted Solid Teak & Luxury Woodcraft
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px', lineHeight: '1.4' }}>
                  Workshop & Main Showroom: Maharagama / Homagama, Sri Lanka<br />
                  Hotline / Inquiries: <strong>0772345671</strong> / <strong>0771234567</strong> • Reg: PV-0029381
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E4D8C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                OFFICIAL CUSTOMER BILL
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: '2px', textTransform: 'uppercase' }}>
                Sales Invoice & Agreement
              </div>

              <div style={{ marginTop: '10px', display: 'inline-flex', flexDirection: 'column', gap: '3px', textAlign: 'right', fontSize: '0.78rem', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: '6px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Invoice No: </span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#1E4D8C' }}>{order.invoice_no || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Contract No: </span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.86rem', color: '#2563EB' }}>{order.contract_no || 'N/A'}</strong>
                </div>
                {order.passbook_no && (
                  <div>
                    <span style={{ color: '#64748B' }}>Passbook Ref: </span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#475569' }}>{order.passbook_no}</strong>
                  </div>
                )}
                <div>
                  <span style={{ color: '#64748B' }}>Issue Date: </span>
                  <strong style={{ color: '#0F172A' }}>{orderDate}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Center Hub: </span>
                  <strong style={{ color: '#0F172A' }}>{order.center_code || 'C001'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Agreement Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '22px 0 20px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                <User size={13} color="#1E4D8C" /> Billed To (Customer Details)
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', textTransform: 'capitalize' }}>
                {order.customer_name || 'Valued Customer'}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#334155' }}>
                <div>
                  <span style={{ color: '#64748B' }}>National ID (NIC): </span>
                  <strong style={{ fontFamily: 'monospace', color: '#1E4D8C' }}>{order.customer_nic || order.customer_id || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Contact Phone: </span>
                  <strong>{order.customer_phone || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Delivery Address: </span>
                  <span>{order.customer_address || 'Showroom Direct Collection'}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                <CreditCard size={13} color="#1E4D8C" /> Agreement & Payment Terms
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: isInstallment ? '#1E4D8C' : '#15803D' }}>
                  {isInstallment ? 'Installment Hire-Purchase' : 'Full Cash Settlement'}
                </span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  padding: '3px 8px', 
                  borderRadius: '12px',
                  background: isInstallment ? '#EFF6FF' : '#DCFCE7',
                  color: isInstallment ? '#1E40AF' : '#166534',
                }}>
                  {order.status || (isInstallment ? 'Active Loan' : 'Settled')}
                </span>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#334155' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Regional Center: </span>
                  <strong>{order.center_code || 'C001'}</strong>
                </div>
                {isInstallment && (
                  <div>
                    <span style={{ color: '#64748B' }}>Repayment Plan: </span>
                    <strong style={{ color: '#1E4D8C' }}>{formatLKR(order.installment_value || 0)}</strong> / {order.loan_frequency || 'Monthly'} ({order.loan_terms || 12} terms)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Item Table */}
          <div style={{ marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #CBD5E1' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '36px' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Item Code</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', width: '120px' }}>Unit Price</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', width: '130px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800 }}>{it.item_name}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace' }}>{it.item_code}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatLKR(it.unit_price)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800 }}>{formatLKR(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Balance summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <div style={{ width: '280px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Gross Total:</span>
                <strong>{formatLKR(order.gross_amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#16A34A' }}>
                <span>Advance Paid:</span>
                <strong>{formatLKR(order.advance_paid)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: '1.5px solid #CBD5E1', fontSize: '1rem', fontWeight: 900 }}>
                <span>Balance Due:</span>
                <span style={{ color: Number(order.balance_due) > 0 ? '#DC2626' : '#16A34A' }}>
                  {formatLKR(order.balance_due)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
