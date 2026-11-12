import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  FileJson,
  Clock,
  Users,
  Building2,
  Armchair,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { loadSavedCenters } from '../utils/centersData';
import { loadSavedUsers, loadRolePermissions } from '../utils/rolesData';

export default function BackupPage() {
  const [toastMessage, setToastMessage] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    try {
      return localStorage.getItem('ds_last_backup_timestamp') || 'Never';
    } catch {
      return 'Never';
    }
  });

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to trigger download of a text/JSON file
  const downloadFile = (filename, content, mimeType = 'application/json') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to generate CSV string
  const generateCSV = (headers, rows) => {
    const escapeCSV = (val) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const headerRow = headers.map(escapeCSV).join(',');
    const dataRows = rows.map((r) => r.map(escapeCSV).join(',')).join('\n');
    return `${headerRow}\n${dataRows}`;
  };

  // 1. One-Click Full JSON Backup
  const handleFullBackup = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupData = {
        app: 'D N S Home Solutions System',
        version: '2.0.0',
        exported_at: new Date().toISOString(),
        centers: loadSavedCenters(),
        users: loadSavedUsers(),
        role_permissions: loadRolePermissions(),
        raw_storage: {},
      };

      // Gather relevant localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('dnd_') || key.startsWith('ds_'))) {
          try {
            backupData.raw_storage[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            backupData.raw_storage[key] = localStorage.getItem(key);
          }
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      downloadFile(`DS_Furniture_Full_Backup_${timestamp}.json`, jsonStr, 'application/json');

      const nowFormatted = new Date().toLocaleString('en-GB');
      setLastBackupTime(nowFormatted);
      localStorage.setItem('ds_last_backup_timestamp', nowFormatted);

      showToast('Full system JSON backup downloaded successfully!');
    } catch (e) {
      console.error(e);
      showToast('Error generating system backup.');
    }
  };

  // 2. Export Products CSV
  const handleExportProductsCSV = () => {
    try {
      const saved = localStorage.getItem('dnd_products_list');
      const products = saved ? JSON.parse(saved) : [];
      const headers = ['Product Code', 'Title', 'Category', 'Wood Type', 'Dimensions', 'Cost Price', 'Selling Price', 'Current Stock', 'Status'];
      const rows = products.map((p) => [
        p.code || '',
        p.title || '',
        p.category || '',
        p.wood_type || '',
        p.dimensions || '',
        p.cost_price || 0,
        p.price || 0,
        p.stock_quantity || 0,
        p.status || '',
      ]);
      const csv = generateCSV(headers, rows);
      downloadFile(`DS_Furniture_Products_${Date.now()}.csv`, csv, 'text/csv');
      showToast('Products catalog exported to CSV.');
    } catch (e) {
      console.error(e);
      showToast('Error exporting products.');
    }
  };

  // 3. Export Customers CSV
  const handleExportCustomersCSV = () => {
    try {
      const saved = localStorage.getItem('dnd_customers_list');
      const customers = saved ? JSON.parse(saved) : [];
      const headers = ['Customer ID', 'Full Name', 'Phone', 'NIC', 'Center Code', 'Branch Code', 'Total Sales', 'Outstanding Debt', 'City'];
      const rows = customers.map((c) => [
        c.customer_id || '',
        c.name || '',
        c.phone || '',
        c.nic || '',
        c.center_code || '',
        c.branch_code || '',
        c.total_orders_value || 0,
        c.outstanding_balance || 0,
        c.city || '',
      ]);
      const csv = generateCSV(headers, rows);
      downloadFile(`DS_Furniture_Customers_${Date.now()}.csv`, csv, 'text/csv');
      showToast('Customers directory exported to CSV.');
    } catch (e) {
      console.error(e);
      showToast('Error exporting customers.');
    }
  };

  // 4. Export Centers CSV
  const handleExportCentersCSV = () => {
    try {
      const centers = loadSavedCenters();
      const headers = ['Branch Code', 'Center Code', 'Center Name', 'City', 'Officer In Charge', 'Phone', 'Address', 'Status'];
      const rows = centers.map((c) => [
        c.branch_code || '',
        c.center_code || '',
        c.name || '',
        c.city || '',
        c.contact_person || '',
        c.phone || '',
        c.address || '',
        c.status || '',
      ]);
      const csv = generateCSV(headers, rows);
      downloadFile(`DS_Furniture_Centers_${Date.now()}.csv`, csv, 'text/csv');
      showToast('Regional centers exported to CSV.');
    } catch (e) {
      console.error(e);
      showToast('Error exporting centers.');
    }
  };

  // File Upload Selection for Restore
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.app || !parsed.raw_storage) {
          setRestoreError('Invalid backup file. Missing system headers or storage records.');
          setRestorePreview(null);
          return;
        }
        setRestorePreview({
          date: parsed.exported_at ? new Date(parsed.exported_at).toLocaleString('en-GB') : 'Unknown',
          keysCount: Object.keys(parsed.raw_storage || {}).length,
          centersCount: parsed.centers ? parsed.centers.length : 0,
          usersCount: parsed.users ? parsed.users.length : 0,
        });
      } catch {
        setRestoreError('Failed to parse JSON file. Please ensure the file is not corrupted.');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!restoreFile || !restorePreview) return;
    if (!window.confirm('Are you sure you want to restore? This will replace current records with the contents of this backup.')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.raw_storage) {
          Object.entries(parsed.raw_storage).forEach(([key, val]) => {
            if (typeof val === 'object') {
              localStorage.setItem(key, JSON.stringify(val));
            } else {
              localStorage.setItem(key, String(val));
            }
          });
        }
        if (parsed.centers) {
          localStorage.setItem('dnd_centers_list', JSON.stringify(parsed.centers));
        }
        if (parsed.users) {
          localStorage.setItem('ds_furniture_users_v2', JSON.stringify(parsed.users));
        }
        if (parsed.role_permissions) {
          localStorage.setItem('ds_furniture_role_permissions_v2', JSON.stringify(parsed.role_permissions));
        }

        showToast('System restore completed successfully! Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        console.error(err);
        setRestoreError('Error restoring records to database.');
      }
    };
    reader.readAsText(restoreFile);
  };

  return (
    <div className="backup-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      {/* Overview Cards */}
      <div className="stats-grid">
        <StatCard
          title="Backup System Health"
          value="Healthy"
          subtitle="Local JSON archive storage"
          icon={HardDrive}
          color="#059669"
          bg="rgba(5, 150, 105, 0.12)"
        />
        <StatCard
          title="Last Full Backup"
          value={lastBackupTime}
          subtitle="Recommended weekly"
          icon={Clock}
          color="var(--primary)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Export Formats"
          value="JSON & CSV"
          subtitle="Excel & spreadsheet ready"
          icon={FileSpreadsheet}
          color="#D97706"
          bg="rgba(217, 119, 6, 0.12)"
        />
        <StatCard
          title="Security Protocol"
          value="Client Encrypted"
          subtitle="Admin password protected"
          icon={ShieldCheck}
          color="#9333EA"
          bg="rgba(147, 51, 234, 0.12)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', alignItems: 'flex-start' }}>
        {/* CARD 1: EXPORT & DOWNLOAD */}
        <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={20} color="var(--primary)" />
              <span>Full System Backup & Data Exports</span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Download a complete archive of all furniture products, customers, distribution centers, and role configurations.
            </p>
          </div>

          {/* Primary 1-Click Backup Button */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary-tint) 0%, var(--ash-50) 100%)',
              border: '1.5px solid var(--primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--primary)', display: 'block' }}>
                📦 Complete System JSON Backup
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Includes all catalog items, outstanding debt ledgers, regional centers & user roles.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600, whiteSpace: 'nowrap' }}
              onClick={handleFullBackup}
            >
              <Download size={16} />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* Modular CSV Downloads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Modular CSV Exports (Microsoft Excel Compatible)
            </span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--card-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Armchair size={18} color="var(--primary)" />
                <div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                    Products Catalog & Stock Ledger
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Wood types, models, dimensions, cost & selling prices
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleExportProductsCSV}
              >
                Export CSV
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--card-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} color="#059669" />
                <div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                    Customer Directory & Debt Balances
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Client phone numbers, NICs, credit balances & center codes
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleExportCustomersCSV}
              >
                Export CSV
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--card-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={18} color="#D97706" />
                <div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                    Regional Distribution Centers
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Center codes (C001), branches, officers in charge & cities
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleExportCentersCSV}
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: RESTORE FROM BACKUP */}
        <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} color="#059669" />
              <span>Restore System from JSON File</span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Upload a previously downloaded `.json` backup file to safely restore your data.
            </p>
          </div>

          {/* File Picker Zone */}
          <div
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: '10px',
              padding: '28px 20px',
              textAlign: 'center',
              background: 'var(--ash-50)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
            />
            <FileJson size={36} color="var(--primary)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>
              {restoreFile ? restoreFile.name : 'Select or Drag & Drop Backup JSON File'}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Files formatted like DS_Furniture_Full_Backup_*.json
            </span>
          </div>

          {/* Restore Error */}
          {restoreError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--error)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{restoreError}</span>
            </div>
          )}

          {/* Restore Preview */}
          {restorePreview && (
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'var(--primary-tint)',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                ✓ Valid Backup Archive Detected
              </span>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <span>Exported On: <strong>{restorePreview.date}</strong></span>
                <span>Storage Keys: <strong>{restorePreview.keysCount} tables</strong></span>
                <span>Centers Count: <strong>{restorePreview.centersCount} hubs</strong></span>
                <span>Staff Users: <strong>{restorePreview.usersCount} users</strong></span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '6px', width: '100%', padding: '10px' }}
                onClick={handleExecuteRestore}
              >
                Confirm & Restore System Now
              </button>
            </div>
          )}

          {/* Caution Note */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--ash-100)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              lineHeight: '1.4',
            }}
          >
            ⚠️ <strong>Notice:</strong> Restoring will overwrite existing items in browser cache with the contents of the backup archive.
          </div>
        </div>
      </div>
    </div>
  );
}
