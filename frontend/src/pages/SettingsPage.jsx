import React, { useState } from 'react';
import {
  Store,
  FileText,
  CreditCard,
  Save,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

const SETTINGS_STORAGE_KEY = 'ds_furniture_store_settings_v2';

const DEFAULT_SETTINGS = {
  business_name: 'D&S Furniture (Pvt) Ltd',
  business_name_si: 'D&S Furniture (Showroom & Workshop)',
  tagline: 'Handcrafted Luxury Teak & Mahogany Woodcraft • Showroom & Workshop',
  br_number: 'PV-00289145',
  vat_number: '',
  phone_hotline: '077 123 4567',
  phone_landline: '011 284 5678',
  whatsapp_number: '077 123 4567',
  email: 'sales@dsfurniture.lk',
  showroom_address: 'No. 120, High Level Road, Maharagama',
  workshop_address: 'No. 88, Galle Road, Rawathawatta, Moratuwa',
  invoice_prefix: 'DS-INV-',
  order_prefix: 'DS-ORD-',
  currency_code: 'LKR',
  currency_symbol: 'Rs.',
  low_stock_limit: 2,
  warranty_text: '10-Year Solid Teak & Treated Mahogany Wood Structure Warranty against borer & termite decay.',
  invoice_terms_si: 'Goods once sold are non-refundable. Please report any defects within 3 days of delivery.',
  bank_name: 'Commercial Bank of Ceylon PLC',
  bank_branch: 'Maharagama Branch',
  account_name: 'D&S Furniture (Pvt) Ltd',
  account_number: '8004 9128 3401',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [toastMessage, setToastMessage] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setIsDirty(false);
      showToast('Store settings & invoice configurations saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Error saving settings.');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all showroom configurations to system factory defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      setIsDirty(false);
      showToast('Settings reset to factory defaults.');
    }
  };

  return (
    <div className="settings-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Navigation & Actions */}
      <div
        className="tabs-nav-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.88rem', fontWeight: 600 }}
            onClick={() => setActiveTab('profile')}
          >
            <Store size={16} />
            <span>Showroom & Workshop Profile</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'billing' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.88rem', fontWeight: 600 }}
            onClick={() => setActiveTab('billing')}
          >
            <FileText size={16} />
            <span>Invoice & Warranty Terms</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'banking' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.88rem', fontWeight: 600 }}
            onClick={() => setActiveTab('banking')}
          >
            <CreditCard size={16} />
            <span>Bank & Payment Accounts</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
            onClick={handleResetDefaults}
          >
            <RefreshCw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }}
            disabled={!isDirty}
            onClick={handleSave}
          >
            <Save size={15} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'flex-start' }}>
        {/* Main Settings Form */}
        <div className="panel" style={{ padding: '24px' }}>
          {/* TAB 1: SHOWROOM PROFILE */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  Showroom & Carpentry Workshop Profile
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  These business details are displayed on customer invoices, contracts, and delivery receipts.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Business Legal Name
                  </label>
                  <input
                    type="text"
                    value={settings.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Secondary Trade Name / Brand Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.business_name_si}
                    onChange={(e) => handleChange('business_name_si', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tagline & Subtitle
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Business Reg (BR) Number
                  </label>
                  <input
                    type="text"
                    value={settings.br_number}
                    onChange={(e) => handleChange('br_number', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Showroom Hotline
                  </label>
                  <input
                    type="text"
                    value={settings.phone_hotline}
                    onChange={(e) => handleChange('phone_hotline', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    WhatsApp Orders Mobile
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp_number}
                    onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Main Showroom Address (Maharagama)
                </label>
                <input
                  type="text"
                  value={settings.showroom_address}
                  onChange={(e) => handleChange('showroom_address', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Carpentry Workshop & Factory Address (Moratuwa)
                </label>
                <input
                  type="text"
                  value={settings.workshop_address}
                  onChange={(e) => handleChange('workshop_address', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: INVOICE & WARRANTY */}
          {activeTab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  Invoice Formatting & Warranty Terms
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Customize the legal terms, wood guarantee statements, and prefixes for printed invoices.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.invoice_prefix}
                    onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Order Ref Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.order_prefix}
                    onChange={(e) => handleChange('order_prefix', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.low_stock_limit}
                    onChange={(e) => handleChange('low_stock_limit', Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Solid Wood Warranty Statement (10-Year Guarantee)
                </label>
                <textarea
                  rows="3"
                  value={settings.warranty_text}
                  onChange={(e) => handleChange('warranty_text', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.4' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Invoice Terms & Return Disclaimer
                </label>
                <textarea
                  rows="3"
                  value={settings.invoice_terms_si}
                  onChange={(e) => handleChange('invoice_terms_si', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.4' }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: BANK & WIRE ACCOUNTS */}
          {activeTab === 'banking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  Showroom Bank Account for Customer Deposits
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Printed on sales quotations and advance receipts so clients can make bank deposits or online transfers.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Branch
                  </label>
                  <input
                    type="text"
                    value={settings.bank_branch}
                    onChange={(e) => handleChange('bank_branch', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={settings.account_name}
                    onChange={(e) => handleChange('account_name', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.account_number}
                    onChange={(e) => handleChange('account_number', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--ash-50)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Save Button */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetDefaults}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!isDirty}
              onClick={handleSave}
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Live Invoice Preview Mockup */}
        <div
          className="panel"
          style={{
            padding: '20px',
            background: 'var(--card-bg)',
            border: '1.5px solid var(--border-subtle)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>
              📄 Live Bill Mockup
            </span>
            <span style={{ fontSize: '0.7rem', background: 'var(--primary-tint)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              Official Print
            </span>
          </div>

          {/* Mock invoice card */}
          <div
            style={{
              background: '#FFFFFF',
              color: '#1E293B',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              fontSize: '0.78rem',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1.5px solid #1E293B', paddingBottom: '10px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E4D8C' }}>
                {settings.business_name}
              </h4>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                {settings.business_name_si}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '2px' }}>
                {settings.tagline}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '4px' }}>
                📍 {settings.showroom_address} • 📞 {settings.phone_hotline}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94A3B8' }}>
                BR: {settings.br_number}
              </div>
            </div>

            {/* Bill Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.7rem' }}>
              <span>INV: <strong>{settings.invoice_prefix}0084</strong></span>
              <span>Date: <strong>10 Nov 2026</strong></span>
            </div>

            {/* Sample Item Row */}
            <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Teak 6-Seater Dining Table</span>
                <span>Rs. 85,000.00</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B' }}>
                100% Solid Teak Wood (10-Yr Warranty)
              </div>
            </div>

            {/* Warranty Pill */}
            <div
              style={{
                background: '#ECFDF5',
                border: '1px dashed #059669',
                padding: '6px',
                borderRadius: '4px',
                color: '#065F46',
                fontSize: '0.65rem',
                marginBottom: '8px',
                lineHeight: '1.3',
              }}
            >
              🛡️ <strong>Warranty:</strong> {settings.warranty_text}
            </div>

            {/* Bank Deposit Box */}
            <div style={{ background: '#F1F5F9', padding: '6px', borderRadius: '4px', fontSize: '0.63rem', color: '#334155', marginBottom: '8px' }}>
              <strong>Bank Deposit:</strong> {settings.bank_name} ({settings.bank_branch})<br />
              A/C: <strong>{settings.account_number}</strong> ({settings.account_name})
            </div>

            {/* Terms & Return Disclaimer */}
            <div style={{ fontSize: '0.6rem', color: '#64748B', textAlign: 'center', fontStyle: 'italic', borderTop: '1px dotted #CBD5E1', paddingTop: '6px' }}>
              {settings.invoice_terms_si}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
